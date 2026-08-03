import { NextResponse } from 'next/server'
import { requireAdminApi } from '../../../../../../../src/lib/admin-guard'
import { cancelEventReservation, deleteEventReservation } from '../../../../../../../src/lib/event-reservations-overview'

export async function PATCH(request, { params }) {
  const { user, error, status } = await requireAdminApi()
  if (error) return NextResponse.json({ error }, { status })

  const type = request.nextUrl.searchParams.get('type')

  try {
    const body = await request.json()
    const reservation = await cancelEventReservation({
      eventId: params.id,
      type,
      reservationId: params.reservationId,
      cancellationReason: body?.cancellationReason,
      actorName: user?.name || null,
      actorEmail: user?.email || null,
      actorUserId: user?.id || null,
    })
    return NextResponse.json(reservation)
  } catch (caughtError) {
    return NextResponse.json({ error: caughtError.message || 'Annullamento non riuscito' }, { status: caughtError.status || 500 })
  }
}

export async function DELETE(request, { params }) {
  const { error, status } = await requireAdminApi()
  if (error) return NextResponse.json({ error }, { status })

  const type = request.nextUrl.searchParams.get('type')

  try {
    await deleteEventReservation({ eventId: params.id, type, reservationId: params.reservationId })
    return new NextResponse(null, { status: 204 })
  } catch (caughtError) {
    return NextResponse.json({ error: caughtError.message || 'Eliminazione non riuscita' }, { status: caughtError.status || 500 })
  }
}
