import { cache } from 'react'
import { DICE_FEST_EVENT_ID } from './event-constants'
import { getBookableEventData, getUserEventBookingStatus } from './event-booking'
import { getPublicMainEvents } from './main-event-booking'

export function getDiceFestEventData() {
  return getBookableEventData(DICE_FEST_EVENT_ID)
}

export function getDiceFestBookingStatus(userId) {
  return getUserEventBookingStatus({ eventId: DICE_FEST_EVENT_ID, userId })
}

export const getDiceFestBookableData = cache(async function getDiceFestBookableData() {
  const [event, mainEvents] = await Promise.all([
    getBookableEventData(DICE_FEST_EVENT_ID),
    getPublicMainEvents({ eventId: DICE_FEST_EVENT_ID }),
  ])

  if (!event) {
    return null
  }

  return { ...event, mainEvents: mainEvents || [] }
})
