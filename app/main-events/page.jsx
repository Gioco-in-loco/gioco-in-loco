import MainEventsBookingPage from '../../src/components/pages/MainEventsBookingPage'
import { getPublicMainEvents } from '../../src/lib/main-event-booking'

export const dynamic = 'force-dynamic'

export const metadata = {
  title: 'Main Event | Gioco In Loco',
}

export default async function MainEventsRoute() {
  const mainEvents = await getPublicMainEvents()

  return <MainEventsBookingPage mainEvents={mainEvents} />
}