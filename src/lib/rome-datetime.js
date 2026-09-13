// Pure Europe/Rome timezone conversions for admin-entered event times.
// No server-only dependencies (e.g. Prisma), so this is safe to import from
// both API routes and client components (EventForm's datetime-local field).
const ROME_TIME_ZONE = 'Europe/Rome'

// Timezone offset (in minutes) that Europe/Rome has at a given instant —
// derived from the IANA database built into the JS runtime, so CET/CEST
// transitions are always correct without hardcoding DST dates.
export function getRomeOffsetMinutes(instant) {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: ROME_TIME_ZONE,
    hourCycle: 'h23',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  }).formatToParts(instant).reduce((acc, part) => {
    acc[part.type] = part.value
    return acc
  }, {})

  const asIfUtc = Date.UTC(parts.year, parts.month - 1, parts.day, parts.hour, parts.minute, parts.second)
  return (asIfUtc - instant.getTime()) / 60000
}

// Converts "HH:mm on {y,m,d}, Rome local time" into the real UTC instant.
// Two passes: the first guess (treating wall-clock as UTC) gives an offset
// close enough to compute a corrected instant, and re-deriving the offset
// from that corrected instant removes any residual error right at a DST
// transition.
export function zonedTimeToUtc(y, m, d, hh, mm) {
  const guess = Date.UTC(y, m - 1, d, hh, mm, 0)
  const offset1 = getRomeOffsetMinutes(new Date(guess))
  const corrected = guess - offset1 * 60000
  const offset2 = getRomeOffsetMinutes(new Date(corrected))
  return new Date(guess - offset2 * 60000)
}

// Converts a <input type="datetime-local"> value ("YYYY-MM-DDTHH:mm"),
// entered as Europe/Rome wall-clock time, into the real UTC instant. Plain
// `new Date(value)` instead interprets that string in the server's own
// timezone (UTC in production), which silently shifts admin-entered times
// by the Rome/UTC offset (1-2 hours).
export function parseRomeDateTimeLocal(value) {
  const match = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/.exec(value || '')
  if (!match) return null
  const [, y, m, d, hh, mm] = match
  return zonedTimeToUtc(Number(y), Number(m), Number(d), Number(hh), Number(mm))
}

// Start of "today" (Europe/Rome) expressed as UTC midnight of that calendar
// date — the same shape of Date that `new Date('YYYY-MM-DD')` produces for
// an admin-entered <input type="date"> value. Event start/end dates are
// date-only and stored that way, so checking them against this boundary
// (instead of the exact current instant) keeps the current day itself
// included: an event ending "today" stays valid for all of today, not just
// until midnight UTC.
export function getStartOfTodayUtc(now = new Date()) {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: ROME_TIME_ZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(now).reduce((acc, part) => {
    acc[part.type] = part.value
    return acc
  }, {})

  return new Date(Date.UTC(Number(parts.year), Number(parts.month) - 1, Number(parts.day)))
}

// Converts a stored UTC instant back into a "YYYY-MM-DDTHH:mm" string in
// Europe/Rome wall-clock time, for pre-filling a datetime-local input when
// editing — the counterpart to parseRomeDateTimeLocal.
export function formatRomeDateTimeLocal(dateInput) {
  if (!dateInput) return ''

  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: ROME_TIME_ZONE,
    hourCycle: 'h23',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).formatToParts(new Date(dateInput)).reduce((acc, part) => {
    acc[part.type] = part.value
    return acc
  }, {})

  return `${parts.year}-${parts.month}-${parts.day}T${parts.hour}:${parts.minute}`
}
