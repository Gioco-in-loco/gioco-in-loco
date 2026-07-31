import { NextResponse } from 'next/server'
import { requireAdminApi } from '../../../../../../../src/lib/admin-guard'
import { sendWaitlistNotifications } from '../../../../../../../src/lib/event-waitlist'

export async function POST(request, { params }) {
  const { error, status } = await requireAdminApi()
  if (error) return NextResponse.json({ error }, { status })

  const body = await request.json().catch(() => null)
  const day = typeof body?.day === 'string' ? body.day.trim() : ''

  try {
    const result = await sendWaitlistNotifications({ eventId: params.id, day })
    return NextResponse.json(result)
  } catch (waitlistError) {
    return NextResponse.json({ error: waitlistError.message || 'Impossibile inviare le notifiche.' }, { status: waitlistError.status || 400 })
  }
}
