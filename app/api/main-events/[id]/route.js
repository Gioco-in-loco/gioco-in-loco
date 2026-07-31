import { NextResponse } from 'next/server'
import { getPublicMainEvent } from '../../../../src/lib/main-event-booking'

export async function GET(request, { params }) {
  const { searchParams } = new URL(request.url)
  const eventId = searchParams.get('event') || searchParams.get('eventId') || undefined
  const mainEvent = await getPublicMainEvent(params.id, { eventId })

  if (!mainEvent) {
    return NextResponse.json({ error: 'Main event non trovato.' }, { status: 404 })
  }

  return NextResponse.json(mainEvent)
}
