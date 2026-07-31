import { NextResponse } from 'next/server'
import { requireAuthenticatedApi } from '../../../../../src/lib/admin-guard'
import { removeMainEventSessionFromCart } from '../../../../../src/lib/main-event-booking'

export async function DELETE(request) {
  const { user, error, status } = await requireAuthenticatedApi()
  if (error) return NextResponse.json({ error }, { status })

  const body = await request.json().catch(() => null)
  const mainEventId = typeof body?.mainEventId === 'string' ? body.mainEventId.trim() : ''
  const eventId = typeof body?.eventId === 'string' ? body.eventId.trim() : ''
  const day = typeof body?.day === 'string' ? body.day.trim() : ''
  const slot = typeof body?.slot === 'string' ? body.slot.trim() : ''

  if (!mainEventId || !eventId || !day || !slot) {
    return NextResponse.json({ error: 'Sessione non valida.' }, { status: 400 })
  }

  try {
    const cartState = await removeMainEventSessionFromCart({ userId: user.id, mainEventId, eventId, day, slot })
    return NextResponse.json(cartState)
  } catch (cartError) {
    return NextResponse.json(
      { error: cartError.message || 'Impossibile rimuovere la sessione dal tuo ordine.' },
      { status: cartError.status || 400 },
    )
  }
}
