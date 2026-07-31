import { NextResponse } from 'next/server'
import { requireAdminApi } from '../../../../../../../src/lib/admin-guard'
import { deleteEventSlot, getSlotReservationsDetail, updateEventSlot } from '../../../../../../../src/lib/event-slots-management'

export async function GET(_request, { params }) {
  const { error, status } = await requireAdminApi()
  if (error) return NextResponse.json({ error }, { status })

  try {
    const detail = await getSlotReservationsDetail({ eventId: params.id, slotId: params.slotId })
    return NextResponse.json(detail)
  } catch (caughtError) {
    return NextResponse.json({ error: caughtError.message || 'Slot non trovato' }, { status: caughtError.status || 500 })
  }
}

export async function PATCH(request, { params }) {
  const { error, status } = await requireAdminApi()
  if (error) return NextResponse.json({ error }, { status })

  try {
    const body = await request.json()
    const slot = await updateEventSlot({ eventId: params.id, slotId: params.slotId, body })
    return NextResponse.json(slot)
  } catch (caughtError) {
    return NextResponse.json({ error: caughtError.message || 'Aggiornamento slot non riuscito' }, { status: caughtError.status || 500 })
  }
}

export async function DELETE(_request, { params }) {
  const { error, status } = await requireAdminApi()
  if (error) return NextResponse.json({ error }, { status })

  try {
    await deleteEventSlot({ eventId: params.id, slotId: params.slotId })
    return new NextResponse(null, { status: 204 })
  } catch (caughtError) {
    return NextResponse.json({ error: caughtError.message || 'Eliminazione slot non riuscita' }, { status: caughtError.status || 500 })
  }
}
