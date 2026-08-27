import { NextResponse } from 'next/server'
import { requireResponsabileApi } from '../../../../../../src/lib/admin-guard'
import { getEventWaitlistOverview } from '../../../../../../src/lib/event-waitlist'

export async function GET(_request, { params }) {
  const { error, status } = await requireResponsabileApi()
  if (error) return NextResponse.json({ error }, { status })

  const groups = await getEventWaitlistOverview(params.id, true)
  return NextResponse.json(groups)
}
