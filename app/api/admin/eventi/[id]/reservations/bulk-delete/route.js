import { NextResponse } from 'next/server'
import { requireAdminApi } from '../../../../../../../src/lib/admin-guard'
import { deleteEventReservationsBulk } from '../../../../../../../src/lib/event-reservations-overview'

export async function POST(request, { params }) {
  const { error, status } = await requireAdminApi()
  if (error) return NextResponse.json({ error }, { status })

  const body = await request.json().catch(() => null)
  const items = Array.isArray(body?.items)
    ? body.items
        .filter((item) => item && typeof item.reservationId === 'string' && typeof item.type === 'string')
        .map((item) => ({ type: item.type, reservationId: item.reservationId }))
    : []

  try {
    const result = await deleteEventReservationsBulk({ eventId: params.id, items })
    return NextResponse.json(result)
  } catch (caughtError) {
    return NextResponse.json({ error: caughtError.message || 'Eliminazione non riuscita' }, { status: caughtError.status || 500 })
  }
}
