import { NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { prisma } from '../../../src/lib/prisma'
import { isSupabaseConfigured, getSupabaseConfig } from '../../../src/lib/supabase/config'
import { buildAbsoluteUrl, getRequestSiteUrl } from '../../../src/lib/site-url'
import { sanitizeRedirectTarget } from '../../../src/lib/safe-redirect'
import { NICKNAME_RE, resolveNickname } from '../../../src/lib/nicknames'

function copyCookies(fromResponse, toResponse) {
  fromResponse.cookies.getAll().forEach((cookie) => {
    toResponse.cookies.set(cookie)
  })
}

function resolveEmailChangeRedirect(origin, next, user, to) {
  const target = sanitizeRedirectTarget(next, '/auth/email-change-progress')
  const redirectUrl = new URL(target, origin)

  if (to) {
    redirectUrl.searchParams.set('to', to)
  }

  const isCompleted = Boolean(to && user?.email && user.email.toLowerCase() === to.toLowerCase())
  redirectUrl.searchParams.set('status', isCompleted ? 'done' : 'pending')

  return redirectUrl.toString()
}

function resolveRedirectTarget(origin, type, next) {
  if (type === 'signup') return buildAbsoluteUrl(sanitizeRedirectTarget(next, '/auth/welcome?notice=account_activated'), origin)
  return buildAbsoluteUrl(sanitizeRedirectTarget(next, '/'), origin)
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

      // The registration form's nickname reaches Supabase as user_metadata but
      // this callback (email confirmation / OAuth) is what actually creates
      // the Prisma User row for most sign-ups — it has to persist the nickname
      // itself rather than relying on a later /api/auth/sync call that may
      // never happen, or the row ends up permanently without one.
      const requestedNickname = typeof meta.nickname === 'string' && NICKNAME_RE.test(meta.nickname.trim()) ? meta.nickname.trim() : null
      const existingDbUser = await prisma.user.findUnique({ where: { supabaseUserId: user.id }, select: { nickname: true } })
      const nickname = await resolveNickname(prisma, { requestedNickname, existingNickname: existingDbUser?.nickname })

      const dbUser = await prisma.user.upsert({
        where: { supabaseUserId: user.id },
        update: { ...(consentGiven ? { consentGiven: true, consentDate } : {}), nickname },
        create: {
          supabaseUserId: user.id,
          role: 'USER',
          consentGiven,
          consentDate,
          nickname,
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
