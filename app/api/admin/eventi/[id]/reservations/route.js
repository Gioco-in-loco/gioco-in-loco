import { NextResponse } from 'next/server'
import { requireAdminApi } from '../../../../../../src/lib/admin-guard'
import { getEventAllReservations } from '../../../../../../src/lib/event-reservations-overview'

export async function GET(_request, { params }) {
  const { error, status } = await requireAdminApi()
  if (error) return NextResponse.json({ error }, { status })

  const reservations = await getEventAllReservations({ eventId: params.id })
  return NextResponse.json(reservations)
}
