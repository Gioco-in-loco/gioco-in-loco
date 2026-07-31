import { DICE_FEST_BOOKING_CONFIG } from '../../../../../../src/lib/bookable-events'
import { handleAddEventCartMainEventSlot } from '../../../../../../src/lib/event-booking-routes'

export async function POST(request) {
  return handleAddEventCartMainEventSlot(request, DICE_FEST_BOOKING_CONFIG)
}
