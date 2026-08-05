import { NextResponse } from 'next/server'
import { requireAuthenticatedApi } from '../../../../../src/lib/admin-guard'
import { addMainEventSessionToCart } from '../../../../../src/lib/main-event-booking'
import { normalizeCompanions } from '../../../../../src/lib/invite-tokens'

export async function POST(request) {
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

  let companions
  try {
    companions = normalizeCompanions(body?.companions)
  } catch (validationError) {
    return NextResponse.json({ error: validationError.message }, { status: 400 })
  }

  try {
    const cartState = await addMainEventSessionToCart({
      userId: user.id,
      mainEventId,
      eventId,
      day,
      slot,
      userName: user.name,
      userEmail: user.email,
      companions,
    })

    return NextResponse.json(cartState, { status: 201 })
  } catch (cartError) {
    return NextResponse.json(
      { error: cartError.message || 'Impossibile aggiungere la sessione nel tuo ordine.' },
      { status: cartError.status || 400 },
    )
  }
}
