import { DICE_FEST_BOOKING_CONFIG } from '../../../../../../src/lib/bookable-events'
import { handleRemoveEventCartSlot } from '../../../../../../src/lib/event-booking-routes'

export async function DELETE(_request, { params }) {
  const slotId = typeof params?.slotId === 'string' ? params.slotId.trim() : ''
  return handleRemoveEventCartSlot({ eventId: DICE_FEST_BOOKING_CONFIG.eventId, slotId })
}