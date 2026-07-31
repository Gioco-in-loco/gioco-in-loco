import { DICE_FEST_BOOKING_CONFIG } from '../../../../../src/lib/bookable-events'
import { handleAddEventCartSlot } from '../../../../../src/lib/event-booking-routes'

export async function POST(request) {
  return handleAddEventCartSlot(request, DICE_FEST_BOOKING_CONFIG)
}
