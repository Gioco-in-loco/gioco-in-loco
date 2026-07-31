import { NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { prisma } from '../../../src/lib/prisma'
import { isSupabaseConfigured, getSupabaseConfig } from '../../../src/lib/supabase/config'
import { buildAbsoluteUrl, getRequestSiteUrl } from '../../../src/lib/site-url'

function loginErrorRedirect(origin, error) {
  const errType = error?.message?.toLowerCase().includes('expired') ? 'expired' : 'generic'
  return NextResponse.redirect(buildAbsoluteUrl(`/auth/login?auth_error=${errType}`, origin))
}

function resolveDestination(origin, type, user, to) {
  if (type === 'signup') return buildAbsoluteUrl('/auth/welcome?notice=account_activated', origin)
  if (type === 'recovery') return buildAbsoluteUrl('/auth/update-password', origin)
  if (type === 'invite') return buildAbsoluteUrl('/auth/complete-account', origin)
  if (type === 'email_change' || type === 'email') {
    if (to && user?.email && user.email.toLowerCase() === to.toLowerCase()) {
      return buildAbsoluteUrl('/auth/email-change-progress?status=done', origin)
    }
    const params = new URLSearchParams({ status: 'pending' })
    if (to) params.set('to', to)
    return buildAbsoluteUrl(`/auth/email-change-progress?${params.toString()}`, origin)
  }
  if (type === 'magiclink') return buildAbsoluteUrl('/account', origin)
  return buildAbsoluteUrl('/', origin)
}

async function syncSignupConsent(supabase) {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user?.id) return

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

export async function GET(request) {
  const { searchParams } = new URL(request.url)
  const origin = getRequestSiteUrl(request)
  const tokenHash = searchParams.get('token_hash')
  const type = searchParams.get('type')
  const to = searchParams.get('to')

  if (!isSupabaseConfigured()) {
    return NextResponse.redirect(buildAbsoluteUrl('/auth/login?auth_error=generic', origin))
  }

  if (!tokenHash || !type) {
    return NextResponse.redirect(buildAbsoluteUrl('/auth/login?auth_error=generic', origin))
  }

  const cookieStore = cookies()
  const { supabaseUrl, supabaseAnonKey } = getSupabaseConfig()

  const placeholderResponse = NextResponse.redirect(buildAbsoluteUrl('/', origin))

  const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll()
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value, options }) => {
          placeholderResponse.cookies.set(name, value, options)
        })
      },
    },
  })

  const { error } = await supabase.auth.verifyOtp({ type, token_hash: tokenHash })

  if (error) {
    return loginErrorRedirect(origin, error)
  }

  const { data: { user } } = await supabase.auth.getUser()

  if (type === 'signup') {
    await syncSignupConsent(supabase).catch(() => {})
  }

  const destination = resolveDestination(origin, type, user, to)

  const finalResponse = NextResponse.redirect(destination)
  placeholderResponse.cookies.getAll().forEach((c) => {
    finalResponse.cookies.set(c)
  })

  return finalResponse
}
