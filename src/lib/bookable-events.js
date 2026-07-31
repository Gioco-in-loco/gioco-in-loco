import { DICE_FEST_EVENT_ID, DICE_FEST_ROUTE } from './event-constants'

export const DICE_FEST_BOOKING_CONFIG = {
  key: 'dice-fest',
  eventId: DICE_FEST_EVENT_ID,
  displayName: 'DICE FEST',
  routeBasePath: DICE_FEST_ROUTE,
  apiBasePath: '/api/dice-fest',
  sessionLabelSingular: 'one shot',
  sessionLabelPlural: 'one shot',
  navLabelEvent: 'DICE FEST',
  navLabelBooking: 'Prenotazioni',
  navLabelCart: 'Prenotazioni',
}

const BOOKABLE_EVENT_CONFIGS = [DICE_FEST_BOOKING_CONFIG]

export function getBookableEventConfigByEventId(eventId) {
  return BOOKABLE_EVENT_CONFIGS.find((config) => config.eventId === eventId) || null
}

export function getBookableEventConfigByKey(key) {
  return BOOKABLE_EVENT_CONFIGS.find((config) => config.key === key) || null
}
