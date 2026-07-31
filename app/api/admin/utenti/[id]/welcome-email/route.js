import { NextResponse } from 'next/server'
import { prisma } from '../../../../../../src/lib/prisma'
import { requireAdminApi } from '../../../../../../src/lib/admin-guard'
import { createSupabaseServiceClient, isServiceRoleConfigured } from '../../../../../../src/lib/supabase/service'
import { sendAccountInviteEmail } from '../../../../../../src/lib/supabase/admin-onboarding'
import { getRequestSiteUrl } from '../../../../../../src/lib/site-url'

export async function POST(request, { params }) {
  const { error, status } = await requireAdminApi()
  if (error) return NextResponse.json({ error }, { status })

  if (!isServiceRoleConfigured()) {
    return NextResponse.json({ error: 'Service role non configurato — impossibile inviare email.' }, { status: 503 })
  }

  const siteUrl = getRequestSiteUrl(request)

  const user = await prisma.user.findUnique({
    where: { id: params.id },
    select: { id: true, supabaseUserId: true },
  })

  if (!user?.supabaseUserId) {
    return NextResponse.json({ error: 'Utente non trovato' }, { status: 404 })
  }

  const admin = createSupabaseServiceClient()
  const { data: authUserData, error: authUserError } = await admin.auth.admin.getUserById(user.supabaseUserId)

  if (authUserError || !authUserData?.user?.email) {
    return NextResponse.json({ error: authUserError?.message || 'Utente auth non trovato' }, { status: 404 })
  }

  const authUser = authUserData.user
  if (authUser.email_confirmed_at) {
    return NextResponse.json({ error: 'L\'utente ha gia attivato l\'account.' }, { status: 409 })
  }

  const { error: deleteError } = await admin.auth.admin.deleteUser(user.supabaseUserId)

  if (deleteError) {
    return NextResponse.json({ error: deleteError.message || 'Errore preparazione nuovo invito' }, { status: 400 })
  }

  const fullName = authUser.user_metadata?.full_name || authUser.user_metadata?.name || ''
  const { data: invited, error: inviteError } = await sendAccountInviteEmail(
    admin,
    authUser.email,
    fullName,
    siteUrl,
  )

  if (inviteError || !invited?.user?.id) {
    return NextResponse.json({ error: inviteError?.message || 'Errore invio email di benvenuto' }, { status: 400 })
  }

  await prisma.user.update({
    where: { id: user.id },
    data: { supabaseUserId: invited.user.id },
  })

  return NextResponse.json({ ok: true })
}