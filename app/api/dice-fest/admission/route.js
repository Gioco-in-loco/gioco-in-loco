import { DICE_FEST_BOOKING_CONFIG } from '../../../../src/lib/bookable-events'
import { handleCreateEventAdmission, handleDeleteEventAdmission } from '../../../../src/lib/event-booking-routes'

export async function POST(request) {
  return handleCreateEventAdmission(request, DICE_FEST_BOOKING_CONFIG.eventId, { displayName: DICE_FEST_BOOKING_CONFIG.displayName })
}

export async function DELETE(request) {
  return handleDeleteEventAdmission(request, DICE_FEST_BOOKING_CONFIG.eventId)
}
