'use client'

import { BookingItemCard } from './bookingCard'

function formatDateHeading(scheduleStart) {
  return new Intl.DateTimeFormat('it-IT', { weekday: 'long', day: 'numeric', month: 'long', timeZone: 'Europe/Rome' }).format(new Date(scheduleStart))
}

// Civil-date grouping key in Rome time, so a booking at 23:30 and one the
// next morning don't get merged just because their UTC instants are close.
function getRomeDateKey(scheduleStart) {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Rome' }).format(new Date(scheduleStart))
}

export default function BookingsTimelineView({ bookings, pendingCancellationKey, onCancel }) {
  const dated = bookings.filter((booking) => booking.scheduleStart)
  const undated = bookings.filter((booking) => !booking.scheduleStart)

  const groups = new Map()
  for (const booking of dated) {
    const key = getRomeDateKey(booking.scheduleStart)
    if (!groups.has(key)) groups.set(key, [])
    groups.get(key).push(booking)
  }

  const sortedKeys = Array.from(groups.keys()).sort()
  for (const key of sortedKeys) {
    groups.get(key).sort((a, b) => new Date(a.scheduleStart).getTime() - new Date(b.scheduleStart).getTime())
  }

  return (
    <div className="space-y-6">
      {sortedKeys.map((key) => (
        <section key={key}>
          <h2 className="mb-2.5 font-elegant text-lg font-bold capitalize text-editorial-text">
            {formatDateHeading(groups.get(key)[0].scheduleStart)}
          </h2>
          <div className="space-y-2.5">
            {groups.get(key).map((booking) => (
              <BookingItemCard
                key={`${booking.bookingType}:${booking.id}`}
                booking={booking}
                pendingCancellationKey={pendingCancellationKey}
                onCancel={onCancel}
                showEventName
              />
            ))}
          </div>
        </section>
      ))}

      {undated.length > 0 ? (
        <section>
          <h2 className="mb-2.5 font-elegant text-lg font-bold text-editorial-text">Data da definire</h2>
          <div className="space-y-2.5">
            {undated.map((booking) => (
              <BookingItemCard
                key={`${booking.bookingType}:${booking.id}`}
                booking={booking}
                pendingCancellationKey={pendingCancellationKey}
                onCancel={onCancel}
                showEventName
              />
            ))}
          </div>
        </section>
      ) : null}
    </div>
  )
}
