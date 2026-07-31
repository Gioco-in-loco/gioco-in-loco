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

  if (!user?.id || !user.email) {
    return NextResponse.json({ error: 'Non autenticato' }, { status: 401 })
  }

  const [currentUser] = await prisma.$queryRaw`
    SELECT
      id::text AS id,
      email,
      email_change AS new_email
    FROM auth.users
    WHERE id = ${user.id}::uuid
    LIMIT 1
  `

  if (!currentUser?.id || !currentUser.email) {
    return NextResponse.json({ error: 'Utente non trovato' }, { status: 404 })
  }

  if (!currentUser.new_email || currentUser.new_email === currentUser.email) {
    return NextResponse.json({ ok: true })
  }

  await prisma.$transaction([
    prisma.$executeRaw`
      UPDATE auth.users
      SET
        email_change = '',
        email_change_token_current = '',
        email_change_token_new = '',
        email_change_sent_at = NULL,
        email_change_confirm_status = 0
      WHERE id = ${currentUser.id}::uuid
    `,
    prisma.$executeRaw`
      DELETE FROM auth.one_time_tokens
      WHERE user_id = ${currentUser.id}::uuid
        AND token_type IN ('email_change_token_current', 'email_change_token_new')
    `,
  ])

  const [updatedUser] = await prisma.$queryRaw`
    SELECT
      email,
      email_change AS new_email
    FROM auth.users
    WHERE id = ${currentUser.id}::uuid
    LIMIT 1
  `

  if (updatedUser?.new_email && updatedUser.new_email !== updatedUser.email) {
    return NextResponse.json({ error: 'Supabase non ha annullato il cambio email.' }, { status: 409 })
  }

  return NextResponse.json({ ok: true })
}
