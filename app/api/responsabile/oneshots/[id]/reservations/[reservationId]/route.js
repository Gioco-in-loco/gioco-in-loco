import { NextResponse } from 'next/server'
import { requireResponsabileApi } from '../../../../../../../src/lib/admin-guard'
import { updateManagedOneShotReservationStatus } from '../../../../../../../src/lib/oneshots-management'

export async function PATCH(request, { params }) {
  const { user, error, status } = await requireResponsabileApi()
  if (error) return NextResponse.json({ error }, { status })

  if (!user?.associationId) {
    return NextResponse.json({ error: 'Nessuna associazione assegnata' }, { status: 404 })
  }

  try {
    const body = await request.json()
    const nextStatus = typeof body?.status === 'string' ? body.status.trim().toUpperCase() : ''

    if (nextStatus !== 'ATTENDED' && nextStatus !== 'CONFIRMED') {
      return NextResponse.json({ error: 'Il responsabile puo solo segnare o rimuovere la presenza al tavolo.' }, { status: 403 })
    }

    const reservation = await updateManagedOneShotReservationStatus({
      oneshotId: params.id,
      reservationId: params.reservationId,
      status: nextStatus,
      managedAssociationId: user.associationId,
      actorName: user?.name || null,
      actorEmail: user?.email || null,
      actorUserId: user?.id || null,
    })

    return NextResponse.json(reservation)
  } catch (caughtError) {
    return NextResponse.json({ error: caughtError.message || 'Aggiornamento prenotazione non riuscito' }, { status: caughtError.status || 500 })
  }
}