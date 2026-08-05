import { NextResponse } from 'next/server'
import { requireAdminApi } from '../../../../../../../src/lib/admin-guard'
import { updateSlotsScope } from '../../../../../../../src/lib/event-slots-management'

export async function POST(request, { params }) {
  const { error, status } = await requireAdminApi()
  if (error) return NextResponse.json({ error }, { status })

  const body = await request.json().catch(() => null)
  const day = typeof body?.day === 'string' ? body.day.trim() : ''
  const slot = typeof body?.slot === 'string' ? body.slot.trim() : ''
  const bookingEnabled = typeof body?.bookingEnabled === 'boolean' ? body.bookingEnabled : undefined
  const isVisible = typeof body?.isVisible === 'boolean' ? body.isVisible : undefined

  try {
    const result = await updateSlotsScope({ eventId: params.id, day, slot: slot || null, bookingEnabled, isVisible })
    return NextResponse.json(result)
  } catch (caughtError) {
    return NextResponse.json({ error: caughtError.message || 'Operazione non riuscita' }, { status: caughtError.status || 500 })
  }
}
