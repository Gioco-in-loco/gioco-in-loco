import { NextResponse } from 'next/server'
import { prisma } from '../../../../../../src/lib/prisma'
import { requireAdminApi } from '../../../../../../src/lib/admin-guard'
import { createSupabaseServiceClient, isServiceRoleConfigured } from '../../../../../../src/lib/supabase/service'
import { sendPasswordResetEmail } from '../../../../../../src/lib/supabase/admin-onboarding'
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
    select: { supabaseUserId: true },
  })

  if (!user?.supabaseUserId) {
    return NextResponse.json({ error: 'Utente non trovato' }, { status: 404 })
  }

  const admin = createSupabaseServiceClient()
  const { data: authUserData, error: authUserError } = await admin.auth.admin.getUserById(user.supabaseUserId)

  if (authUserError || !authUserData?.user?.email) {
    return NextResponse.json({ error: authUserError?.message || 'Utente auth non trovato' }, { status: 404 })
  }

  if (!authUserData.user.email_confirmed_at) {
    return NextResponse.json({ error: 'L\'account non è ancora stato attivato.' }, { status: 409 })
  }

  const { error: resetError } = await sendPasswordResetEmail(authUserData.user.email, siteUrl)

  if (resetError) {
    return NextResponse.json({ error: resetError.message || 'Errore invio reset password' }, { status: 400 })
  }

  return NextResponse.json({ ok: true })
}