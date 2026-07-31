import { NextResponse } from 'next/server'
import { prisma } from '../../../../../src/lib/prisma'
import { requireAdminApi } from '../../../../../src/lib/admin-guard'
import { createSupabaseServiceClient, isServiceRoleConfigured } from '../../../../../src/lib/supabase/service'

export async function GET(request, { params }) {
  const { error, status } = await requireAdminApi()
  if (error) return NextResponse.json({ error }, { status })

  const user = await prisma.user.findUnique({
    where: { id: params.id },
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

  if (!user) return NextResponse.json({ error: 'Utente non trovato' }, { status: 404 })

  let auth = null
  if (user.supabaseUserId && isServiceRoleConfigured()) {
    const admin = createSupabaseServiceClient()
    const { data } = await admin.auth.admin.getUserById(user.supabaseUserId)
    auth = data?.user || null
  }

  return NextResponse.json({
    ...user,
    email: auth?.email || null,
    name: auth?.user_metadata?.full_name || auth?.user_metadata?.name || null,
    phone: auth?.user_metadata?.phone || null,
    accountActivated: Boolean(auth?.email_confirmed_at),
  })
}

export async function PATCH(request, { params }) {
  const { error, status } = await requireAdminApi()
  if (error) return NextResponse.json({ error }, { status })

  const body = await request.json()
  const { email, name, phone, role, associationId, isAdmin } = body

  if (phone !== undefined && !phone?.trim()) {
    return NextResponse.json({ error: 'telefono è obbligatorio' }, { status: 400 })
  }

  const validRoles = ['USER', 'RESPONSABILE']

  try {
    const user = await prisma.user.update({
      where: { id: params.id },
      data: {
        ...(role !== undefined && validRoles.includes(role) && { role }),
        ...(isAdmin !== undefined && { isAdmin: Boolean(isAdmin) }),
        ...(associationId !== undefined && { associationId: associationId || null }),
      },
      select: { id: true, supabaseUserId: true, role: true, isAdmin: true, associationId: true },
    })

    if ((email !== undefined || name !== undefined || phone !== undefined) && user.supabaseUserId && isServiceRoleConfigured()) {
      const admin = createSupabaseServiceClient()
      await admin.auth.admin.updateUserById(user.supabaseUserId, {
        ...(email !== undefined && { email: email?.trim() || undefined }),
        user_metadata: {
          ...(name !== undefined && { full_name: name?.trim() || '' }),
          ...(phone !== undefined && { phone: phone?.trim() || '' }),
        },
      })
    }

    return NextResponse.json(user)
  } catch {
    return NextResponse.json({ error: 'Utente non trovato' }, { status: 404 })
  }
}

export async function DELETE(request, { params }) {
  const { error, status } = await requireAdminApi()
  if (error) return NextResponse.json({ error }, { status })

  try {
    const user = await prisma.user.findUnique({
      where: { id: params.id },
      select: { id: true, supabaseUserId: true },
    })

    if (!user) {
      return NextResponse.json({ error: 'Utente non trovato' }, { status: 404 })
    }

    await prisma.reservation.deleteMany({ where: { userId: user.id } })
    await prisma.mainEventReservation.deleteMany({ where: { userId: user.id } })
    await prisma.eventAdmission.deleteMany({ where: { userId: user.id } })
    await prisma.user.delete({ where: { id: user.id } })

    if (user.supabaseUserId && isServiceRoleConfigured()) {
      const admin = createSupabaseServiceClient()
      await admin.auth.admin.deleteUser(user.supabaseUserId)
    }

    return new NextResponse(null, { status: 204 })
  } catch {
    return NextResponse.json({ error: 'Errore eliminazione utente' }, { status: 500 })
  }
}
