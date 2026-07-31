import { NextResponse } from 'next/server'
import { requireAuthenticatedApi } from '../../../../src/lib/admin-guard'
import { cancelUserMainEventReservation } from '../../../../src/lib/main-event-booking'

export async function DELETE(_request, { params }) {
  const { user, error, status } = await requireAuthenticatedApi()
  if (error) return NextResponse.json({ error }, { status })

  try {
    const reservation = await cancelUserMainEventReservation({ reservationId: params.id, userId: user.id })
    return NextResponse.json({ ok: true, reservation })
  } catch (reservationError) {
    return NextResponse.json(
      { error: reservationError.message || 'Impossibile cancellare la prenotazione.' },
      { status: reservationError.status || 400 },
    )
  }
}