import { NextResponse } from 'next/server'
import { prisma } from '../../../../src/lib/prisma'
import { requireAdminApi } from '../../../../src/lib/admin-guard'
import { createSupabaseServiceClient, isServiceRoleConfigured } from '../../../../src/lib/supabase/service'
import { sendAccountInviteEmail } from '../../../../src/lib/supabase/admin-onboarding'
import { getRequestSiteUrl } from '../../../../src/lib/site-url'

export async function GET() {
  const { error, status } = await requireAdminApi()
  if (error) return NextResponse.json({ error }, { status })

  const dbUsers = await prisma.user.findMany({
    orderBy: { createdAt: 'desc' },
    select: {
      id: true,
      supabaseUserId: true,
      role: true,
      isAdmin: true,
      associationId: true,
      consentGiven: true,
      createdAt: true,
      managedAssociation: { select: { id: true, name: true } },
    },
  })

  let authMap = new Map()
  if (isServiceRoleConfigured()) {
    const admin = createSupabaseServiceClient()
    const { data } = await admin.auth.admin.listUsers({ perPage: 1000 })
    if (data?.users) {
      authMap = new Map(data.users.map((u) => [u.id, u]))
    }
  }

  const users = dbUsers.map((u) => {
    const auth = u.supabaseUserId ? authMap.get(u.supabaseUserId) : null
    return {
      ...u,
      email: auth?.email || null,
      name: auth?.user_metadata?.full_name || auth?.user_metadata?.name || null,
      phone: auth?.user_metadata?.phone || null,
      accountActivated: Boolean(auth?.email_confirmed_at),
    }
  })

  return NextResponse.json(users)
}

export async function POST(request) {
  const { error, status } = await requireAdminApi()
  if (error) return NextResponse.json({ error }, { status })

  const siteUrl = getRequestSiteUrl(request)
  const body = await request.json()
  const { email, role, associationId, isAdmin } = body

  if (!email?.trim()) {
    return NextResponse.json({ error: 'email è obbligatoria' }, { status: 400 })
  }

  const validRoles = ['USER', 'RESPONSABILE']
  const userRole = validRoles.includes(role) ? role : 'USER'

  if (!isServiceRoleConfigured()) {
    return NextResponse.json({ error: 'Service role non configurato — impossibile creare utenti' }, { status: 503 })
  }

  const supabaseAdmin = createSupabaseServiceClient()
  const normalizedEmail = email.trim()
  const { data: created, error: supabaseError } = await sendAccountInviteEmail(
    supabaseAdmin,
    normalizedEmail,
    '',
    siteUrl,
  )

  if (supabaseError || !created?.user) {
    return NextResponse.json({ error: supabaseError?.message || 'Errore invio invito utente' }, { status: 400 })
  }

  const supabaseUserId = created.user.id

  const existing = await prisma.user.findUnique({ where: { supabaseUserId } })
  if (existing) {
    return NextResponse.json({ error: 'Utente già presente' }, { status: 409 })
  }

  let user

  try {
    user = await prisma.user.create({
      data: {
        supabaseUserId,
        role: userRole,
        isAdmin: Boolean(isAdmin),
        associationId: associationId || null,
        consentGiven: false,
      },
    })
  } catch (dbError) {
    await supabaseAdmin.auth.admin.deleteUser(supabaseUserId).catch(() => {})
    throw dbError
  }

  return NextResponse.json({
    ...user,
    email: created.user.email,
    name: created.user.user_metadata?.full_name || null,
  }, { status: 201 })
}
