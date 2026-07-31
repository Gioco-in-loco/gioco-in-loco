import { NextResponse } from 'next/server'
import { DICE_FEST_BOOKING_CONFIG } from '../../../../src/lib/bookable-events'
import { requireAuthenticatedApi } from '../../../../src/lib/admin-guard'
import { joinWaitlist, leaveWaitlist, getUserWaitlistDays } from '../../../../src/lib/event-waitlist'

export async function POST(request) {
  const { user, error, status } = await requireAuthenticatedApi()
  if (error) return NextResponse.json({ error }, { status })

  const body = await request.json().catch(() => null)
  const day = typeof body?.day === 'string' ? body.day.trim() : ''

  try {
    await joinWaitlist({ eventId: DICE_FEST_BOOKING_CONFIG.eventId, userId: user.id, day })
    const waitlistDays = await getUserWaitlistDays({ eventId: DICE_FEST_BOOKING_CONFIG.eventId, userId: user.id })
    return NextResponse.json({ waitlistDays })
  } catch (waitlistError) {
    return NextResponse.json({ error: waitlistError.message || 'Impossibile iscriverti alla lista d\'attesa.' }, { status: waitlistError.status || 400 })
  }
}

export async function DELETE(request) {
  const { user, error, status } = await requireAuthenticatedApi()
  if (error) return NextResponse.json({ error }, { status })

  const body = await request.json().catch(() => null)
  const day = typeof body?.day === 'string' ? body.day.trim() : ''

  try {
    await leaveWaitlist({ eventId: DICE_FEST_BOOKING_CONFIG.eventId, userId: user.id, day })
    const waitlistDays = await getUserWaitlistDays({ eventId: DICE_FEST_BOOKING_CONFIG.eventId, userId: user.id })
    return NextResponse.json({ waitlistDays })
  } catch (waitlistError) {
    return NextResponse.json({ error: waitlistError.message || 'Impossibile lasciare la lista d\'attesa.' }, { status: waitlistError.status || 400 })
  }
}
