import { NextResponse } from 'next/server'
import { requireAdminApi } from '../../../../../../../../src/lib/admin-guard'
import { createManualOneShotReservation } from '../../../../../../../../src/lib/event-slots-management'

export async function POST(request, { params }) {
  const { error, status } = await requireAdminApi()
  if (error) return NextResponse.json({ error }, { status })

  try {
    const body = await request.json()
    const detail = await createManualOneShotReservation({
      eventId: params.id,
      slotId: params.slotId,
      playerName: body?.playerName,
      playerEmail: body?.playerEmail,
      notes: body?.notes,
    })
    return NextResponse.json(detail, { status: 201 })
  } catch (caughtError) {
    return NextResponse.json({ error: caughtError.message || 'Aggiunta giocatore non riuscita' }, { status: caughtError.status || 500 })
  }
}
