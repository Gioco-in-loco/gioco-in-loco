import { NextResponse } from 'next/server'
import { createSupabaseServerClient } from '../../../../src/lib/supabase/server'
import { prisma } from '../../../../src/lib/prisma'
import { isSupabaseConfigured } from '../../../../src/lib/supabase/config'
import { NICKNAME_RE, generateAvailableNickname } from '../../../../src/lib/nicknames'

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

  // Il nickname arriva nei metadata solo quando l'utente lo imposta/cambia dal
  // form (registrazione o profilo) — altrimenti non va toccato qui, per non
  // sovrascrivere quello già salvato su Prisma (fonte di verità per
  // l'unicità, i metadata Supabase non sono affidabili per un vincolo unique).
  const requestedNickname = typeof meta.nickname === 'string' ? meta.nickname.trim() : null
  if (requestedNickname && !NICKNAME_RE.test(requestedNickname)) {
    return NextResponse.json({ error: 'Nickname non valido.' }, { status: 400 })
  }

  const existingDbUser = await prisma.user.findUnique({ where: { supabaseUserId: user.id }, select: { nickname: true } })

  // Account nuovo (o già esistente ma ancora senza nickname, es. login Google
  // che salta il form di registrazione): ogni utente deve avere un nickname,
  // quindi ne generiamo uno dal pool di personaggi se non ne è stato scelto
  // uno esplicitamente.
  const nickname = requestedNickname || existingDbUser?.nickname || await generateAvailableNickname(prisma)

  let dbUser
  try {
    dbUser = await prisma.user.upsert({
      where: { supabaseUserId: user.id },
      update: {
        ...(consentGiven ? { consentGiven: true, consentDate } : {}),
        newsletterOptIn,
        nickname,
      },
      create: {
        supabaseUserId: user.id,
        role: 'USER',
        consentGiven,
        consentDate,
        newsletterOptIn,
        nickname,
      },
    })
  } catch (error) {
    if (error?.code === 'P2002' && error?.meta?.target?.includes('nickname')) {
      return NextResponse.json({ error: 'Nickname già in uso, scegline un altro.' }, { status: 409 })
    }
    throw error
  }

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
