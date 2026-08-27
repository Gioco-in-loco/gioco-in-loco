import { NextResponse } from 'next/server'
import { requireResponsabileApi } from '../../../../../../src/lib/admin-guard'
import { getEventAllReservations } from '../../../../../../src/lib/event-reservations-overview'

export async function GET(_request, { params }) {
  const { error, status } = await requireResponsabileApi()
  if (error) return NextResponse.json({ error }, { status })

  const reservations = await getEventAllReservations({ eventId: params.id, redactPlayerData: true })
  return NextResponse.json(reservations)
}
