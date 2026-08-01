import { NextResponse } from 'next/server'
import { requireAuthenticatedApi } from '../../../../src/lib/admin-guard'
import { getUserMainEventCartState } from '../../../../src/lib/main-event-booking'

export async function GET() {
  const { user, error, status } = await requireAuthenticatedApi()
  if (error) return NextResponse.json({ error }, { status })

  try {
    const cartState = await getUserMainEventCartState({ userId: user.id })
    return NextResponse.json(cartState)
  } catch (cartError) {
    return NextResponse.json(
      { error: cartError.message || 'Impossibile caricare le prenotazioni del Main Event.' },
      { status: cartError.status || 400 },
    )
  }
}
