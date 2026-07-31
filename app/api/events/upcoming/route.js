import { NextResponse } from 'next/server'
import { fetchUpcomingEvent } from '../../../../src/lib/events'

export const dynamic = 'force-dynamic'

export async function GET() {
  const event = await fetchUpcomingEvent()
  return NextResponse.json(event)
}