import { NextResponse } from 'next/server'
import { requireAdminApi } from '../../../../../../../src/lib/admin-guard'
import { deleteOneShotReservation, updateManagedOneShotReservationStatus } from '../../../../../../../src/lib/oneshots-management'

export async function PATCH(request, { params }) {
  const { user, error, status } = await requireAdminApi()
  if (error) return NextResponse.json({ error }, { status })

  try {
    const body = await request.json()
    const reservation = await updateManagedOneShotReservationStatus({
      oneshotId: params.id,
      reservationId: params.reservationId,
      status: typeof body?.status === 'string' ? body.status.trim().toUpperCase() : '',
      cancellationReason: typeof body?.cancellationReason === 'string' ? body.cancellationReason : '',
      actorName: user?.name || null,
      actorEmail: user?.email || null,
      actorUserId: user?.id || null,
    })

    return NextResponse.json(reservation)
  } catch (caughtError) {
    return NextResponse.json({ error: caughtError.message || 'Aggiornamento prenotazione non riuscito' }, { status: caughtError.status || 500 })
  }
}

export async function DELETE(_request, { params }) {
  const { error, status } = await requireAdminApi()
  if (error) return NextResponse.json({ error }, { status })

  try {
    await deleteOneShotReservation({ oneshotId: params.id, reservationId: params.reservationId })
    return new NextResponse(null, { status: 204 })
  } catch (caughtError) {
    return NextResponse.json({ error: caughtError.message || 'Eliminazione prenotazione non riuscita' }, { status: caughtError.status || 500 })
  }
}