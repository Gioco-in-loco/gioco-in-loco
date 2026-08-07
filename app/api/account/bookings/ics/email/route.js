import { NextResponse } from 'next/server'
import { requireAuthenticatedApi } from '../../../../../../src/lib/admin-guard'
import { getUserAccountBookings, getIcsReadyBookings } from '../../../../../../src/lib/account-bookings'
import { buildBookingsIcs } from '../../../../../../src/lib/ics-generator'
import { isMailerConfigured } from '../../../../../../src/lib/mailer'
import { sendAccountBookingsIcsEmail } from '../../../../../../src/lib/account-bookings-notifications'

export async function POST() {
  const { user, error, status } = await requireAuthenticatedApi()
  if (error) return NextResponse.json({ error }, { status })

  if (!isMailerConfigured()) {
    return NextResponse.json({ error: 'Invio email non configurato.' }, { status: 503 })
  }

  const bookings = await getUserAccountBookings({ userId: user.id })
  const icsReady = getIcsReadyBookings(bookings)
  const icsContent = buildBookingsIcs(icsReady)

  try {
    await sendAccountBookingsIcsEmail({ user, bookings: icsReady.map((entry) => entry.booking), icsContent })
  } catch (mailError) {
    return NextResponse.json({ error: mailError.message || 'Impossibile inviare l\'email.' }, { status: 502 })
  }

  return NextResponse.json({ ok: true, count: icsReady.length })
}
