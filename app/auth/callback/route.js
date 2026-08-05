import { NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { prisma } from '../../../src/lib/prisma'
import { isSupabaseConfigured, getSupabaseConfig } from '../../../src/lib/supabase/config'
import { buildAbsoluteUrl, getRequestSiteUrl } from '../../../src/lib/site-url'

function copyCookies(fromResponse, toResponse) {
  fromResponse.cookies.getAll().forEach((cookie) => {
    toResponse.cookies.set(cookie)
  })
}

function resolveEmailChangeRedirect(origin, next, user, to) {
  const target = next || '/auth/email-change-progress'
  const redirectUrl = new URL(target, origin)

  if (to) {
    redirectUrl.searchParams.set('to', to)
  }

  const isCompleted = Boolean(to && user?.email && user.email.toLowerCase() === to.toLowerCase())
  redirectUrl.searchParams.set('status', isCompleted ? 'done' : 'pending')

  return redirectUrl.toString()
}

function resolveRedirectTarget(origin, type, next) {
  if (type === 'signup') return buildAbsoluteUrl(next || '/auth/welcome?notice=account_activated', origin)
  return buildAbsoluteUrl(next ?? '/', origin)
}

export async function GET(request) {
  const { searchParams } = new URL(request.url)
  const origin = getRequestSiteUrl(request)
  const code = searchParams.get('code')
  const errorDescription = searchParams.get('error_description')
  const type = searchParams.get('type')
  const next = searchParams.get('next')
  const to = searchParams.get('to')

  if (errorDescription) {
    const errType = errorDescription.toLowerCase().includes('expired') ? 'expired' : 'generic'
    return NextResponse.redirect(buildAbsoluteUrl(`/auth/login?auth_error=${errType}`, origin))
  }

  if (code && isSupabaseConfigured()) {
    const cookieStore = cookies()
    const { supabaseUrl, supabaseAnonKey } = getSupabaseConfig()

    // Create the redirect response first so we can attach session cookies to it.
    // NextResponse.redirect() is a separate Response object — cookies set via
    // cookies() from next/headers are NOT automatically transferred to it.
    const successResponse = NextResponse.redirect(resolveRedirectTarget(origin, type, next))

    const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            successResponse.cookies.set(name, value, options)
          })
        },
      },
    })

    const { error } = await supabase.auth.exchangeCodeForSession(code)

    if (error) {
      const errType = error.message?.toLowerCase().includes('expired') ? 'expired' : 'generic'
      return NextResponse.redirect(buildAbsoluteUrl(`/auth/login?auth_error=${errType}`, origin))
    }

    const { data: { user } } = await supabase.auth.getUser()

    if (user?.id) {
      const meta = user.user_metadata || {}
      const consentGiven = Boolean(meta.gdpr_consent_given)
      const consentDate = meta.gdpr_consent_at ? new Date(meta.gdpr_consent_at) : null

      const dbUser = await prisma.user.upsert({
        where: { supabaseUserId: user.id },
        update: consentGiven ? { consentGiven: true, consentDate } : {},
        create: {
          supabaseUserId: user.id,
          role: 'USER',
          consentGiven,
          consentDate,
        },
      })

      if (consentGiven && consentDate) {
        const alreadyLogged = await prisma.gdprAuditLog.findFirst({
          where: { userId: dbUser.id, action: 'CONSENT_GIVEN' },
        })
        if (!alreadyLogged) {
          await prisma.gdprAuditLog.create({
            data: {
              userId: dbUser.id,
              action: 'CONSENT_GIVEN',
              details: `Versione informativa: ${meta.gdpr_consent_version || '—'}`,
            },
          })
        }
      }
    }

    if (type === 'email_change' || type === 'email') {
      const emailChangeResponse = NextResponse.redirect(resolveEmailChangeRedirect(origin, next, user, to))
      copyCookies(successResponse, emailChangeResponse)
      return emailChangeResponse
    }

    return successResponse
  }

  if (type === 'email_change' || type === 'email') {
    return NextResponse.redirect(resolveEmailChangeRedirect(origin, next, null, to))
  }

  return NextResponse.redirect(resolveRedirectTarget(origin, type, next))
}
