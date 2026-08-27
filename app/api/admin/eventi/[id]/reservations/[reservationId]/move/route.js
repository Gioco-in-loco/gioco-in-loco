import { NextResponse } from 'next/server'
import { requireAdminApi } from '../../../../../../../../src/lib/admin-guard'
import { moveEventReservationToSlot } from '../../../../../../../../src/lib/event-reservations-overview'

export async function POST(request, { params }) {
  const { error, status } = await requireAdminApi()
  if (error) return NextResponse.json({ error }, { status })

  const type = request.nextUrl.searchParams.get('type')

  try {
    const body = await request.json()
    const targetSlotId = typeof body?.targetSlotId === 'string' ? body.targetSlotId.trim() : ''
    const reservation = await moveEventReservationToSlot({ eventId: params.id, type, reservationId: params.reservationId, targetSlotId })
    return NextResponse.json(reservation)
  } catch (caughtError) {
    return NextResponse.json({ error: caughtError.message || 'Spostamento non riuscito' }, { status: caughtError.status || 500 })
  }
}
