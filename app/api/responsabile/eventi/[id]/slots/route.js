import { NextResponse } from 'next/server'
import { requireResponsabileApi } from '../../../../../../src/lib/admin-guard'
import { listEventSlots } from '../../../../../../src/lib/event-slots-management'

export async function GET(_request, { params }) {
  const { error, status } = await requireResponsabileApi()
  if (error) return NextResponse.json({ error }, { status })

  const slots = await listEventSlots({ eventId: params.id })
  return NextResponse.json(slots)
}
