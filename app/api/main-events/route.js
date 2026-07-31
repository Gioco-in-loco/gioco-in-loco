import { NextResponse } from 'next/server'
import { getPublicMainEvents } from '../../../src/lib/main-event-booking'

export async function GET(request) {
  const { searchParams } = new URL(request.url)
  const eventId = searchParams.get('event') || searchParams.get('eventId') || undefined
  const mainEvents = await getPublicMainEvents({ eventId })
  return NextResponse.json(mainEvents)
}