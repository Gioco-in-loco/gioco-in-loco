// Minimal RFC5545 (iCalendar) writer for a flat list of account bookings.
// No external dependency: a VCALENDAR with a handful of VEVENTs is simple
// enough to write by hand, and avoids pulling in a library just for this.
const SITE_DOMAIN = 'gioco-in-loco'
const CRLF = '\r\n'

function escapeIcsText(value) {
  return String(value ?? '')
    .replace(/\\/g, '\\\\')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,')
    .replace(/\n/g, '\\n')
}

// RFC5545 requires lines no longer than 75 octets, continued with a leading
// space on the next line ("folding"). Without this, long titles/locations
// produce a file some calendar apps reject outright.
function foldIcsLine(line) {
  const maxLen = 75
  if (line.length <= maxLen) return line

  const chunks = []
  let rest = line
  let first = true
  while (rest.length > 0) {
    const size = first ? maxLen : maxLen - 1
    chunks.push((first ? '' : ' ') + rest.slice(0, size))
    rest = rest.slice(size)
    first = false
  }
  return chunks.join(CRLF)
}

function formatIcsUtcDateTime(date) {
  return date.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z'
}

function formatIcsDate(date) {
  return date.toISOString().slice(0, 10).replace(/-/g, '')
}

function mapStatusToIcs(status) {
  if (status === 'PENDING') return 'TENTATIVE'
  return 'CONFIRMED'
}

function buildBookingVEvent({ booking, schedule }) {
  const lines = [
    'BEGIN:VEVENT',
    `UID:${booking.bookingType}-${booking.id}@${SITE_DOMAIN}`,
    `DTSTAMP:${formatIcsUtcDateTime(new Date())}`,
  ]

  if (schedule.allDay) {
    lines.push(`DTSTART;VALUE=DATE:${formatIcsDate(schedule.start)}`)
    lines.push(`DTEND;VALUE=DATE:${formatIcsDate(schedule.end)}`)
  } else {
    lines.push(`DTSTART:${formatIcsUtcDateTime(schedule.start)}`)
    lines.push(`DTEND:${formatIcsUtcDateTime(schedule.end)}`)
  }

  lines.push(`SUMMARY:${escapeIcsText(booking.activity?.title || booking.bookingTypeLabel)}`)

  if (booking.event?.location) {
    lines.push(`LOCATION:${escapeIcsText(booking.event.location)}`)
  }

  const descriptionParts = [
    booking.event?.name,
    booking.activity?.hostLabel,
    booking.activity?.associationName,
  ].filter(Boolean)
  if (descriptionParts.length > 0) {
    lines.push(`DESCRIPTION:${escapeIcsText(descriptionParts.join(' · '))}`)
  }

  lines.push(`STATUS:${mapStatusToIcs(booking.status)}`)
  lines.push('END:VEVENT')

  return lines
}

export function buildBookingsIcs(bookingsWithSchedule) {
  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Gioco In Loco//Prenotazioni//IT',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
  ]

  for (const { booking, schedule } of bookingsWithSchedule) {
    lines.push(...buildBookingVEvent({ booking, schedule }))
  }

  lines.push('END:VCALENDAR')

  return lines.map(foldIcsLine).join(CRLF) + CRLF
}
