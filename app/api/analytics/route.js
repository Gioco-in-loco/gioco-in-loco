import { NextResponse } from 'next/server'
import { recordAnalyticsEvent } from '../../../src/lib/analytics/server'

export async function POST(request) {
  try {
    const payload = await request.json()
    const result = await recordAnalyticsEvent(payload)

    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: result.status })
    }

    return new NextResponse(null, { status: 204 })
  } catch {
    return NextResponse.json({ error: 'Impossibile registrare l\'evento analytics' }, { status: 400 })
  }
}