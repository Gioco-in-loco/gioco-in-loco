import { NextResponse } from 'next/server'
import { requireAuthenticatedApi } from '../../../src/lib/admin-guard'
import { getUserMainEventReservations } from '../../../src/lib/main-event-booking'

export async function GET(request) {
  const { user, error, status } = await requireAuthenticatedApi()
  if (error) return NextResponse.json({ error }, { status })

  const { searchParams } = new URL(request.url)
  const eventId = searchParams.get('event') || searchParams.get('eventId') || undefined
  const reservations = await getUserMainEventReservations({ userId: user.id, eventId })

  return NextResponse.json({ reservations })
}

export async function POST(request) {
  const { user, error, status } = await requireAuthenticatedApi()
  if (error) return NextResponse.json({ error }, { status })

  return NextResponse.json(
    {
      error: 'Le prenotazioni main event passano dalla pagina Prenotazioni. Usa il flusso dedicato prima della conferma finale.',
      cartPath: '/dice-fest/carrello',
    },
    { status: 410 },
  )
}