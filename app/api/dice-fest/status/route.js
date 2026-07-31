import { DICE_FEST_BOOKING_CONFIG } from '../../../../src/lib/bookable-events'
import { handleGetEventBookingStatus } from '../../../../src/lib/event-booking-routes'

export async function GET() {
  return handleGetEventBookingStatus(DICE_FEST_BOOKING_CONFIG.eventId)
}
