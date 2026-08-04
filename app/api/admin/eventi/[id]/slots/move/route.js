import { NextResponse } from 'next/server'
import { requireAdminApi } from '../../../../../../../src/lib/admin-guard'
import { moveEventSlotAssignment } from '../../../../../../../src/lib/event-slots-management'

export async function POST(request, { params }) {
  const { error, status } = await requireAdminApi()
  if (error) return NextResponse.json({ error }, { status })

  try {
    const body = await request.json()
    const sourceSlotId = typeof body?.sourceSlotId === 'string' ? body.sourceSlotId.trim() : ''
    const targetSlotId = typeof body?.targetSlotId === 'string' ? body.targetSlotId.trim() : ''
    const result = await moveEventSlotAssignment({ eventId: params.id, sourceSlotId, targetSlotId })
    return NextResponse.json(result)
  } catch (caughtError) {
    return NextResponse.json({ error: caughtError.message || 'Spostamento non riuscito' }, { status: caughtError.status || 500 })
  }
}
