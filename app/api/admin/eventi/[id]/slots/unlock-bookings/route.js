import { NextResponse } from 'next/server'
import { requireAdminApi } from '../../../../../../../src/lib/admin-guard'
import { enableBookingForAllSlots } from '../../../../../../../src/lib/event-slots-management'

export async function POST(_request, { params }) {
  const { error, status } = await requireAdminApi()
  if (error) return NextResponse.json({ error }, { status })

  try {
    const result = await enableBookingForAllSlots({ eventId: params.id })
    return NextResponse.json(result)
  } catch (caughtError) {
    return NextResponse.json({ error: caughtError.message || 'Sblocco prenotazioni non riuscito' }, { status: caughtError.status || 500 })
  }
}
