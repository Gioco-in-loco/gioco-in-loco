import { DICE_FEST_BOOKING_CONFIG } from '../../../../../../src/lib/bookable-events'
import { handleRemoveEventCartMainEventSlot } from '../../../../../../src/lib/event-booking-routes'

export async function DELETE(request) {
  const body = await request.json().catch(() => null)
  const mainEventId = typeof body?.mainEventId === 'string' ? body.mainEventId.trim() : ''
  const day = typeof body?.day === 'string' ? body.day.trim() : ''
  const slot = typeof body?.slot === 'string' ? body.slot.trim() : ''

  return handleRemoveEventCartMainEventSlot({ eventId: DICE_FEST_BOOKING_CONFIG.eventId, mainEventId, day, slot })
}
