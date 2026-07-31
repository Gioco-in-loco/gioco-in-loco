import { NextResponse } from 'next/server'
import { requireAdminApi } from '../../../../../../src/lib/admin-guard'
import { createEventSlot, listEventSlots } from '../../../../../../src/lib/event-slots-management'

export async function GET(_request, { params }) {
  const { error, status } = await requireAdminApi()
  if (error) return NextResponse.json({ error }, { status })

  const slots = await listEventSlots({ eventId: params.id })
  return NextResponse.json(slots)
}

export async function POST(request, { params }) {
  const { error, status } = await requireAdminApi()
  if (error) return NextResponse.json({ error }, { status })

  try {
    const body = await request.json()
    const slot = await createEventSlot({ eventId: params.id, body })
    return NextResponse.json(slot, { status: 201 })
  } catch (caughtError) {
    return NextResponse.json({ error: caughtError.message || 'Creazione slot non riuscita' }, { status: caughtError.status || 500 })
  }
}
