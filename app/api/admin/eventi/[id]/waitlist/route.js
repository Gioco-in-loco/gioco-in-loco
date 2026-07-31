import { NextResponse } from 'next/server'
import { requireAdminApi } from '../../../../../../src/lib/admin-guard'
import { getEventWaitlistOverview } from '../../../../../../src/lib/event-waitlist'

export async function GET(_request, { params }) {
  const { error, status } = await requireAdminApi()
  if (error) return NextResponse.json({ error }, { status })

  const groups = await getEventWaitlistOverview(params.id)
  return NextResponse.json(groups)
}
