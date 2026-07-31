import { NextResponse } from 'next/server'
import { createSupabaseServerClient } from '../../../../src/lib/supabase/server'
import { prisma } from '../../../../src/lib/prisma'
import { isSupabaseConfigured } from '../../../../src/lib/supabase/config'

export async function POST() {
  if (!isSupabaseConfigured()) {
    return NextResponse.json({ error: 'Auth non configurata' }, { status: 503 })
  }

  const supabase = createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user?.id) {
    return NextResponse.json({ error: 'Non autenticato' }, { status: 401 })
  }

  const meta = user.user_metadata || {}
  const consentGiven = Boolean(meta.gdpr_consent_given)
  const consentDate = meta.gdpr_consent_at ? new Date(meta.gdpr_consent_at) : null
  const newsletterOptIn = Boolean(meta.newsletter_opt_in)

  const dbUser = await prisma.user.upsert({
    where: { supabaseUserId: user.id },
    update: {
      ...(consentGiven ? { consentGiven: true, consentDate } : {}),
      newsletterOptIn,
    },
    create: {
      supabaseUserId: user.id,
      role: 'USER',
      consentGiven,
      consentDate,
      newsletterOptIn,
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

  return NextResponse.json({ ok: true })
}
