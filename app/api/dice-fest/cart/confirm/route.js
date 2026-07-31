import { DICE_FEST_BOOKING_CONFIG } from '../../../../../src/lib/bookable-events'
import { handleConfirmEventCart } from '../../../../../src/lib/event-booking-routes'

export async function POST() {
  return handleConfirmEventCart(DICE_FEST_BOOKING_CONFIG.eventId)
}