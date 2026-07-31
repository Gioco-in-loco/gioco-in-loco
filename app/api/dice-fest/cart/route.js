import { DICE_FEST_BOOKING_CONFIG } from '../../../../src/lib/bookable-events'
import { handleClearEventCart, handleGetEventCart } from '../../../../src/lib/event-booking-routes'

export async function GET() {
  return handleGetEventCart(DICE_FEST_BOOKING_CONFIG.eventId)
}

export async function DELETE() {
  return handleClearEventCart(DICE_FEST_BOOKING_CONFIG.eventId)
}