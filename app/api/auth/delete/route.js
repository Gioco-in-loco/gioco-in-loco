import { NextResponse } from 'next/server'
import { createSupabaseServerClient } from '../../../../src/lib/supabase/server'
import { createSupabaseServiceClient, isServiceRoleConfigured } from '../../../../src/lib/supabase/service'
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

  const dbUser = await prisma.user.findUnique({ where: { supabaseUserId: user.id } })

  if (dbUser) {
    await prisma.reservation.deleteMany({ where: { userId: dbUser.id } })
    await prisma.mainEventReservation.deleteMany({ where: { userId: dbUser.id } })
    await prisma.eventAdmission.deleteMany({ where: { userId: dbUser.id } })

    await prisma.gdprAuditLog.create({
      data: {
        userId: dbUser.id,
        action: 'DATA_DELETED',
        details: "Account eliminato su richiesta dell'utente",
      },
    })

    await prisma.user.delete({ where: { id: dbUser.id } })
  }

  if (isServiceRoleConfigured()) {
    const serviceClient = createSupabaseServiceClient()
    await serviceClient.auth.admin.deleteUser(user.id)
  }

  return NextResponse.json({ ok: true })
}
