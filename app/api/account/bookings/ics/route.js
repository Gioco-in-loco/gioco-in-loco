import { NextResponse } from 'next/server'
import { requireAuthenticatedApi } from '../../../../../src/lib/admin-guard'
import { getUserAccountBookings, getIcsReadyBookings } from '../../../../../src/lib/account-bookings'
import { buildBookingsIcs } from '../../../../../src/lib/ics-generator'

export async function GET() {
  const { user, error, status } = await requireAuthenticatedApi()
  if (error) return NextResponse.json({ error }, { status })

  const bookings = await getUserAccountBookings({ userId: user.id })
  const icsContent = buildBookingsIcs(getIcsReadyBookings(bookings))

  return new NextResponse(icsContent, {
    status: 200,
    headers: {
      'Content-Type': 'text/calendar; charset=utf-8',
      'Content-Disposition': 'attachment; filename="prenotazioni-gioco-in-loco.ics"',
    },
  })
}
