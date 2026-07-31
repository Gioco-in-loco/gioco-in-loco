import { DICE_FEST_EVENT_ID } from './event-constants'
import {
  EVENT_ACTIVE_RESERVATION_STATUSES,
  EVENT_CART_HOLD_MINUTES,
  EVENT_CART_HOLD_STATUS,
  getActiveReservationFilter,
  getNextHoldExpiration,
  getSlotKey,
  getUserEventCartState,
  normalizeSlotValue,
  refreshUserEventCartHolds,
  releaseExpiredEventHolds,
} from './event-booking'

export const DICE_FEST_CART_HOLD_MINUTES = EVENT_CART_HOLD_MINUTES
export const DICE_FEST_CART_HOLD_STATUS = EVENT_CART_HOLD_STATUS
export const DICE_FEST_ACTIVE_RESERVATION_STATUSES = EVENT_ACTIVE_RESERVATION_STATUSES

export { getActiveReservationFilter, getNextHoldExpiration, getSlotKey, normalizeSlotValue }

export function releaseExpiredDiceFestHolds(db, userId) {
  return releaseExpiredEventHolds({ eventId: DICE_FEST_EVENT_ID, db, userId })
}

export function getUserDiceFestCartState(userId, db) {
  return getUserEventCartState({ eventId: DICE_FEST_EVENT_ID, userId, db })
}

export function refreshUserDiceFestCartHolds(db, userId, holdExpiresAt) {
  return refreshUserEventCartHolds({ eventId: DICE_FEST_EVENT_ID, db, userId, holdExpiresAt })
}
