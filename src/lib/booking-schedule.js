// Resolves the real date/time of a booking from the free-text data the app
// stores today (Event.startDate/endDate are real DateTimes, but a booking's
// "day" — e.g. "Venerdì" — and "slot" — e.g. "17:00-19:00" — are just
// strings, not timestamps). This is the single source of truth shared by the
// account bookings timeline, the .ics export, and the calendar email — all
// three must agree on the same instant for the same booking.
import { TIME_SLOT_REGEX } from './event-slots-management'
import { zonedTimeToUtc } from './rome-datetime'

const ROME_TIME_ZONE = 'Europe/Rome'
const MAX_EVENT_SPAN_DAYS = 31

function normalizeDayName(day) {
  return String(day || '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .trim()
    .toLowerCase()
}

// Pure calendar-date arithmetic (no instant/timezone involved) — the day of
// the week for a civil date doesn't depend on which timezone you ask in, so
// 'UTC' is safe here as long as the {y,m,d} tuple was itself derived from
// Europe/Rome (done by getRomeCalendarDateParts below).
function getWeekdayName(y, m, d) {
  const date = new Date(Date.UTC(y, m - 1, d))
  return new Intl.DateTimeFormat('it-IT', { weekday: 'long', timeZone: 'UTC' }).format(date)
}

function getRomeCalendarDateParts(instant) {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: ROME_TIME_ZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(instant).reduce((acc, part) => {
    acc[part.type] = part.value
    return acc
  }, {})

  return { y: Number(parts.year), m: Number(parts.month), d: Number(parts.day) }
}

function addCalendarDays({ y, m, d }, amount) {
  // Date.UTC normalizes out-of-range day numbers (e.g. day 32 rolls into the
  // next month), so this is safe pure calendar arithmetic.
  const rolled = new Date(Date.UTC(y, m - 1, d + amount))
  return { y: rolled.getUTCFullYear(), m: rolled.getUTCMonth() + 1, d: rolled.getUTCDate() }
}

function compareCalendarDates(a, b) {
  return Date.UTC(a.y, a.m - 1, a.d) - Date.UTC(b.y, b.m - 1, b.d)
}

// Phase A: find which real calendar date, within the event's span, matches a
// given day name (e.g. "Venerdì" -> {y:2026,m:8,d:14}). Cached per event so
// repeated bookings on the same event don't redo the search.
function resolveEventDayCalendarDate(event, dayName, cache) {
  if (!event?.startDate) return null

  const cacheKey = event.id || event.startDate
  let byDay = cache?.get(cacheKey)
  if (!byDay) {
    byDay = new Map()
    cache?.set(cacheKey, byDay)

    const start = getRomeCalendarDateParts(new Date(event.startDate))
    const end = event.endDate ? getRomeCalendarDateParts(new Date(event.endDate)) : start

    let cursor = start
    for (let i = 0; i <= MAX_EVENT_SPAN_DAYS; i += 1) {
      const weekday = normalizeDayName(getWeekdayName(cursor.y, cursor.m, cursor.d))
      if (!byDay.has(weekday)) byDay.set(weekday, cursor)
      if (compareCalendarDates(cursor, end) >= 0) break
      cursor = addCalendarDays(cursor, 1)
    }
  }

  return byDay.get(normalizeDayName(dayName)) || null
}

// Resolves a serialized account booking (see account-bookings.js) into a
// real UTC start/end instant, or null if it can't be resolved (event has no
// startDate, or the day name doesn't match any date in the event's span).
export function resolveBookingScheduleRange(booking, { cache } = {}) {
  const event = booking?.event
  const day = booking?.schedule?.day
  const slot = booking?.schedule?.slot

  if (!event?.startDate) return null

  // Legacy whole-event day pass: all-day range spanning the entire event.
  if (day === '') {
    const start = getRomeCalendarDateParts(new Date(event.startDate))
    const end = event.endDate ? getRomeCalendarDateParts(new Date(event.endDate)) : start
    const exclusiveEnd = addCalendarDays(end, 1)
    return {
      start: new Date(Date.UTC(start.y, start.m - 1, start.d)),
      end: new Date(Date.UTC(exclusiveEnd.y, exclusiveEnd.m - 1, exclusiveEnd.d)),
      allDay: true,
    }
  }

  if (!day) return null

  const calendarDate = resolveEventDayCalendarDate(event, day, cache)
  if (!calendarDate) return null

  if (!slot || !TIME_SLOT_REGEX.test(slot)) {
    // Day pass scoped to a single day: all-day event on that date.
    const next = addCalendarDays(calendarDate, 1)
    return {
      start: new Date(Date.UTC(calendarDate.y, calendarDate.m - 1, calendarDate.d)),
      end: new Date(Date.UTC(next.y, next.m - 1, next.d)),
      allDay: true,
    }
  }

  const [, startH, startM, endH, endM] = slot.match(/^(\d{2}):(\d{2})-(\d{2}):(\d{2})$/)
  const start = zonedTimeToUtc(calendarDate.y, calendarDate.m, calendarDate.d, Number(startH), Number(startM))
  const end = zonedTimeToUtc(calendarDate.y, calendarDate.m, calendarDate.d, Number(endH), Number(endM))

  return { start, end, allDay: false }
}
