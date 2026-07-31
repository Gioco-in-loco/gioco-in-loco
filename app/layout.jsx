import '../src/assets/main.css'
import AppShell from '../src/components/layout/AppShell'
import { getUpcomingEvent } from '../src/lib/events'

export const metadata = {
  title: 'Gioco In Loco',
  description: 'Gioco In Loco, rete di associazioni ludiche in Campania.',
}

export default async function RootLayout({ children }) {
  const upcomingEvent = await getUpcomingEvent()

  return (
    <html lang="it">
      <body>
        <AppShell upcomingEvent={upcomingEvent}>{children}</AppShell>
      </body>
    </html>
  )
}