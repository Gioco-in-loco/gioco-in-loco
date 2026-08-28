import { NextResponse } from 'next/server'
import { requireAdminApi } from '../../../../../../../src/lib/admin-guard'
import { sendMissingReservationReminderEmails } from '../../../../../../../src/lib/event-missing-bookings'

export async function POST(request, { params }) {
  const { user, error, status } = await requireAdminApi()
  if (error) return NextResponse.json({ error }, { status })

  const body = await request.json().catch(() => null)
  const keys = Array.isArray(body?.keys) ? body.keys.filter((key) => typeof key === 'string') : []

  try {
    const result = await sendMissingReservationReminderEmails({ eventId: params.id, keys, sentBy: user.name || user.email || null })
    return NextResponse.json(result)
  } catch (notifyError) {
    return NextResponse.json({ error: notifyError.message || 'Impossibile inviare le email.' }, { status: notifyError.status || 400 })
  }
}
