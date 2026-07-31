import { NextResponse } from 'next/server'
import { requireResponsabileApi } from '../../../../../../../src/lib/admin-guard'
import { getSlotReservationsDetail } from '../../../../../../../src/lib/event-slots-management'

export async function GET(_request, { params }) {
  const { user, error, status } = await requireResponsabileApi()
  if (error) return NextResponse.json({ error }, { status })

  if (!user?.associationId) {
    return NextResponse.json({ error: 'Nessuna associazione assegnata' }, { status: 404 })
  }

  try {
    const detail = await getSlotReservationsDetail({ eventId: params.id, slotId: params.slotId, managedAssociationId: user.associationId })
    return NextResponse.json(detail)
  } catch (caughtError) {
    return NextResponse.json({ error: caughtError.message || 'Slot non trovato' }, { status: caughtError.status || 500 })
  }
}
