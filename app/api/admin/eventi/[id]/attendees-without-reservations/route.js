import { NextResponse } from 'next/server'
import { requireAdminApi } from '../../../../../../src/lib/admin-guard'
import { getEventAttendeesWithoutReservations, getLastMissingReservationReminderLog } from '../../../../../../src/lib/event-missing-bookings'

export async function GET(_request, { params }) {
  const { error, status } = await requireAdminApi()
  if (error) return NextResponse.json({ error }, { status })

  const [attendees, lastReminder] = await Promise.all([
    getEventAttendeesWithoutReservations({ eventId: params.id }),
    getLastMissingReservationReminderLog({ eventId: params.id }),
  ])
  return NextResponse.json({ attendees, lastReminder })
}
