import { NextResponse } from 'next/server'
import { requireAuthenticatedApi } from '../../../../../src/lib/admin-guard'
import { confirmMainEventCart } from '../../../../../src/lib/main-event-booking'

export async function POST() {
  const { user, error, status } = await requireAuthenticatedApi()
  if (error) return NextResponse.json({ error }, { status })

  try {
    const cartState = await confirmMainEventCart({ userId: user.id })
    return NextResponse.json(cartState)
  } catch (cartError) {
    return NextResponse.json(
      { error: cartError.message || 'Impossibile confermare il registro dell\'evento principale.' },
      { status: cartError.status || 400 },
    )
  }
}
