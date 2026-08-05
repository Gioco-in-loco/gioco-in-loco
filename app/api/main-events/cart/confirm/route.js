import { NextResponse } from 'next/server'
import { requireAuthenticatedApi } from '../../../../../src/lib/admin-guard'
import { confirmMainEventCart } from '../../../../../src/lib/main-event-booking'
import { sendCompanionInviteEmails } from '../../../../../src/lib/event-booking-notifications'

export async function POST() {
  const { user, error, status } = await requireAuthenticatedApi()
  if (error) return NextResponse.json({ error }, { status })

  try {
    const { companionInvites, ...cartState } = await confirmMainEventCart({ userId: user.id })

    if (companionInvites?.length > 0) {
      try {
        await sendCompanionInviteEmails({ host: user, invites: companionInvites })
      } catch (notificationError) {
        console.error('Failed to send companion invite emails:', notificationError)
      }
    }

    return NextResponse.json(cartState)
  } catch (cartError) {
    return NextResponse.json(
      { error: cartError.message || 'Impossibile confermare le prenotazioni del Main Event.' },
      { status: cartError.status || 400 },
    )
  }
}
