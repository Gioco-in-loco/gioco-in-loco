import { DICE_FEST_BOOKING_CONFIG } from '../../../../../../src/lib/bookable-events'
import { handleRemoveEventCartCompanion } from '../../../../../../src/lib/event-booking-routes'

export async function DELETE(_request, { params }) {
  const reservationId = typeof params?.reservationId === 'string' ? params.reservationId.trim() : ''
  return handleRemoveEventCartCompanion({ eventId: DICE_FEST_BOOKING_CONFIG.eventId, reservationId })
}
