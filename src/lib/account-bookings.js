import { prisma } from './prisma'
import { cancelUserMainEventReservation } from './main-event-booking'
import { resolveBookingScheduleRange } from './booking-schedule'

const DAY_ORDER = ['Lunedi', 'Martedi', 'Mercoledi', 'Giovedi', 'Venerdi', 'Sabato', 'Domenica', 'Giovedì', 'Venerdì']
const ACCOUNT_BOOKING_VISIBLE_STATUSES = ['PENDING', 'CONFIRMED', 'ATTENDED', 'CANCELLED']
export const ACCOUNT_BOOKING_ACTIVE_STATUSES = ['PENDING', 'CONFIRMED', 'ATTENDED']

function getUpcomingEventWhere(now) {
  return {
    OR: [
      { endDate: { gte: now } },
      {
        AND: [
          { endDate: null },
          { startDate: { gte: now } },
        ],
      },
    ],
  }
}

function normalizeDate(value) {
  return value ? value.toISOString() : null
}

function getStatusSortOrder(status) {
  switch (status) {
    case 'CONFIRMED':
      return 0
    case 'PENDING':
      return 1
    case 'ATTENDED':
      return 2
    case 'CANCELLED':
      return 3
    default:
      return 9
  }
}

function sortSchedules(left, right) {
  const dayIndexLeft = DAY_ORDER.indexOf(left.day)
  const dayIndexRight = DAY_ORDER.indexOf(right.day)

  if (dayIndexLeft !== dayIndexRight) {
    return (dayIndexLeft === -1 ? 999 : dayIndexLeft) - (dayIndexRight === -1 ? 999 : dayIndexRight)
  }

  if (left.slot !== right.slot) {
    return String(left.slot || '').localeCompare(String(right.slot || ''))
  }

  return String(left.table || '').localeCompare(String(right.table || ''), undefined, { numeric: true })
}

function sortBookings(left, right) {
  const statusOrder = getStatusSortOrder(left.status) - getStatusSortOrder(right.status)
  if (statusOrder !== 0) return statusOrder

  const scheduleOrder = sortSchedules(left.schedule, right.schedule)
  if (scheduleOrder !== 0) return scheduleOrder

  return new Date(right.updatedAt || right.createdAt || 0).getTime() - new Date(left.updatedAt || left.createdAt || 0).getTime()
}

function createBookingError(message, status) {
  const error = new Error(message)
  error.status = status
  return error
}

function getCanCancelStatus(status) {
  return status === 'PENDING' || status === 'CONFIRMED'
}

function assertBookingCanBeCancelled(status) {
  if (status === 'CANCELLED') {
    throw createBookingError('La prenotazione è già stata cancellata.', 400)
  }

  if (status === 'ATTENDED') {
    throw createBookingError('Non puoi cancellare una prenotazione già registrata come partecipata.', 400)
  }

  if (status === 'HOLD' || status === 'EXPIRED') {
    throw createBookingError('Questa prenotazione non è gestibile dall\'area utente.', 400)
  }
}

function getEventSummary(event) {
  if (!event) {
    return null
  }

  return {
    id: event.id,
    name: event.name,
    externalId: event.externalId,
    location: event.location || null,
    startDate: normalizeDate(event.startDate),
    endDate: normalizeDate(event.endDate),
  }
}

function getUpcomingLinkedEvent(eventLinks) {
  const now = new Date()

  return eventLinks
    .map((link) => link.event)
    .find((event) => {
      if (!event) return false

      if (event.endDate) {
        return event.endDate >= now
      }

      if (event.startDate) {
        return event.startDate >= now
      }

      return false
    }) || null
}

function serializeCompanion(companion) {
  return {
    name: companion.playerName,
    email: companion.playerEmail,
    status: companion.status,
    holdExpiresAt: companion.holdExpiresAt ? companion.holdExpiresAt.toISOString() : null,
  }
}

// Resolves the real UTC start/end for a booking using the raw (un-serialized)
// event and schedule — must run before getEventSummary/normalizeDate turn
// the event's dates into ISO strings, since the resolver needs real Date
// objects. Shared by the timeline, the .ics export and the calendar email.
function getScheduleFields(event, schedule, dayCache) {
  const range = resolveBookingScheduleRange({ event, schedule }, { cache: dayCache })
  return {
    scheduleStart: range ? range.start.toISOString() : null,
    scheduleEnd: range ? range.end.toISOString() : null,
    scheduleAllDay: range ? range.allDay : false,
  }
}

function serializeOneShotBooking(reservation, { cancellationReason = null, companions = [], dayCache } = {}) {
  const event = getUpcomingLinkedEvent(reservation.slot.oneshot.eventLinks)
  const schedule = {
    day: reservation.slot.day,
    slot: reservation.slot.slot,
    table: reservation.slot.table,
  }

  return {
    id: reservation.id,
    bookingType: 'oneshot',
    bookingTypeLabel: 'One shot',
    status: reservation.status,
    canCancel: getCanCancelStatus(reservation.status),
    cancellationReason: reservation.status === 'CANCELLED' ? cancellationReason : null,
    createdAt: normalizeDate(reservation.createdAt),
    updatedAt: normalizeDate(reservation.updatedAt),
    event: getEventSummary(event),
    activity: {
      title: reservation.slot.oneshot.title,
      game: reservation.slot.oneshot.game,
      price: reservation.slot.oneshot.price ?? null,
      hostLabel: reservation.slot.oneshot.master ? `Master: ${reservation.slot.oneshot.master}` : null,
      associationName: reservation.slot.oneshot.association?.name || null,
    },
    schedule,
    ...getScheduleFields(event, schedule, dayCache),
    companions: companions.map(serializeCompanion),
  }
}

function serializeMainEventBooking(reservation, { cancellationReason = null, companions = [], dayCache } = {}) {
  const schedule = {
    day: reservation.day,
    slot: reservation.slot,
    table: null,
  }

  return {
    id: reservation.id,
    bookingType: 'main-event',
    bookingTypeLabel: 'Main event',
    status: reservation.status,
    canCancel: getCanCancelStatus(reservation.status),
    cancellationReason: reservation.status === 'CANCELLED' ? cancellationReason : null,
    createdAt: normalizeDate(reservation.createdAt),
    updatedAt: normalizeDate(reservation.updatedAt),
    event: getEventSummary(reservation.event),
    activity: {
      title: reservation.mainEvent.title,
      game: reservation.mainEvent.game || null,
      price: reservation.mainEvent.price ?? null,
      hostLabel: null,
      associationName: null,
    },
    schedule,
    ...getScheduleFields(reservation.event, schedule, dayCache),
    companions: companions.map(serializeCompanion),
  }
}

function serializeEventAdmissionBooking(admission, { hasOtherActiveBookings, cancellationReason = null, dayCache }) {
  const eventSummary = getEventSummary(admission.event)
  const canCancel = getCanCancelStatus(admission.status) && !hasOtherActiveBookings
  const schedule = {
    day: admission.day || null,
    slot: null,
    table: null,
  }

  return {
    id: admission.id,
    bookingType: 'event-admission',
    bookingTypeLabel: 'Pass giornaliero',
    status: admission.status,
    canCancel,
    cancellationBlockedReason: !canCancel && getCanCancelStatus(admission.status) && hasOtherActiveBookings
      ? 'Non puoi cancellare il pass finché hai altre prenotazioni attive per questo evento.'
      : null,
    cancellationReason: admission.status === 'CANCELLED' ? cancellationReason : null,
    createdAt: normalizeDate(admission.createdAt),
    updatedAt: normalizeDate(admission.updatedAt),
    event: eventSummary,
    activity: {
      title: 'Pass giornaliero',
      game: null,
      hostLabel: admission.pricePaid == null || admission.pricePaid <= 0 ? 'Ingresso gratuito' : `Importo: ${new Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR' }).format(admission.pricePaid)}`,
      associationName: null,
    },
    schedule,
    ...getScheduleFields(admission.event, schedule, dayCache),
  }
}

export async function getUserAccountBookings({ userId, db = prisma }) {
  const now = new Date()

  const [oneShotReservations, mainEventReservations, eventAdmissions] = await Promise.all([
    db.reservation.findMany({
      where: {
        userId,
        status: { in: ACCOUNT_BOOKING_VISIBLE_STATUSES },
        slot: {
          oneshot: {
            eventLinks: {
              some: {
                event: getUpcomingEventWhere(now),
              },
            },
          },
        },
      },
      select: {
        id: true,
        status: true,
        createdAt: true,
        updatedAt: true,
        slotId: true,
        slot: {
          select: {
            day: true,
            slot: true,
            table: true,
            oneshot: {
              select: {
                title: true,
                game: true,
                price: true,
                master: true,
                association: {
                  select: {
                    name: true,
                  },
                },
                eventLinks: {
                  select: {
                    event: {
                      select: {
                        id: true,
                        name: true,
                        externalId: true,
                        location: true,
                        startDate: true,
                        endDate: true,
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
    }),
    db.mainEventReservation.findMany({
      where: {
        userId,
        status: { in: ACCOUNT_BOOKING_VISIBLE_STATUSES },
        event: getUpcomingEventWhere(now),
      },
      select: {
        id: true,
        status: true,
        createdAt: true,
        updatedAt: true,
        day: true,
        slot: true,
        mainEventId: true,
        mainEvent: {
          select: {
            title: true,
            game: true,
            price: true,
          },
        },
        event: {
          select: {
            id: true,
            name: true,
            externalId: true,
            location: true,
            startDate: true,
            endDate: true,
          },
        },
      },
    }),
    db.eventAdmission.findMany({
      where: {
        userId,
        status: { in: ACCOUNT_BOOKING_VISIBLE_STATUSES },
        event: getUpcomingEventWhere(now),
      },
      select: {
        id: true,
        day: true,
        status: true,
        createdAt: true,
        updatedAt: true,
        pricePaid: true,
        event: {
          select: {
            id: true,
            name: true,
            externalId: true,
            location: true,
            startDate: true,
            endDate: true,
          },
        },
      },
    }),
  ])

  const activeBookingsByEventId = new Map()
  const activeBookingsByEventDay = new Map()

  for (const reservation of oneShotReservations) {
    const event = getUpcomingLinkedEvent(reservation.slot.oneshot.eventLinks)
    if (!event || !ACCOUNT_BOOKING_ACTIVE_STATUSES.includes(reservation.status)) continue
    activeBookingsByEventId.set(event.id, (activeBookingsByEventId.get(event.id) || 0) + 1)
    const dayKey = `${event.id}__${reservation.slot.day}`
    activeBookingsByEventDay.set(dayKey, (activeBookingsByEventDay.get(dayKey) || 0) + 1)
  }

  for (const reservation of mainEventReservations) {
    const eventId = reservation.event?.id
    if (!eventId || !ACCOUNT_BOOKING_ACTIVE_STATUSES.includes(reservation.status)) continue
    activeBookingsByEventId.set(eventId, (activeBookingsByEventId.get(eventId) || 0) + 1)
    const dayKey = `${eventId}__${reservation.day}`
    activeBookingsByEventDay.set(dayKey, (activeBookingsByEventDay.get(dayKey) || 0) + 1)
  }

  // Cancellation reasons live in UserFeedback (written by the admin panel),
  // not on the reservation rows themselves — only fetched for bookings that
  // are actually CANCELLED, to avoid a needless query otherwise.
  const cancelledOneShotIds = oneShotReservations.filter((r) => r.status === 'CANCELLED').map((r) => r.id)
  const cancelledMainEventIds = mainEventReservations.filter((r) => r.status === 'CANCELLED').map((r) => r.id)
  const cancelledAdmissionIds = eventAdmissions.filter((a) => a.status === 'CANCELLED').map((a) => a.id)

  const cancellationReasonByReservationId = new Map()
  const cancellationReasonByMainEventReservationId = new Map()
  const cancellationReasonByAdmissionId = new Map()

  if (cancelledOneShotIds.length + cancelledMainEventIds.length + cancelledAdmissionIds.length > 0) {
    const feedbackEntries = await db.userFeedback.findMany({
      where: {
        type: 'ADMIN_RESERVATION_CANCELLATION',
        OR: [
          ...(cancelledOneShotIds.length > 0 ? [{ reservationId: { in: cancelledOneShotIds } }] : []),
          ...(cancelledMainEventIds.length > 0 ? [{ mainEventReservationId: { in: cancelledMainEventIds } }] : []),
          ...(cancelledAdmissionIds.length > 0 ? [{ eventAdmissionId: { in: cancelledAdmissionIds } }] : []),
        ],
      },
      orderBy: { createdAt: 'desc' },
      select: { reservationId: true, mainEventReservationId: true, eventAdmissionId: true, message: true },
    })

    // Ordered desc, so the first entry seen per id is the most recent one.
    for (const entry of feedbackEntries) {
      if (entry.reservationId && !cancellationReasonByReservationId.has(entry.reservationId)) {
        cancellationReasonByReservationId.set(entry.reservationId, entry.message)
      }
      if (entry.mainEventReservationId && !cancellationReasonByMainEventReservationId.has(entry.mainEventReservationId)) {
        cancellationReasonByMainEventReservationId.set(entry.mainEventReservationId, entry.message)
      }
      if (entry.eventAdmissionId && !cancellationReasonByAdmissionId.has(entry.eventAdmissionId)) {
        cancellationReasonByAdmissionId.set(entry.eventAdmissionId, entry.message)
      }
    }
  }

  // Companions invited by this user on these same slots/sessions — friends who
  // haven't registered yet still show up as no-account rows with invitedByUserId.
  const oneshotSlotIds = oneShotReservations.map((r) => r.slotId)
  const mainEventKeys = mainEventReservations.map((r) => ({ mainEventId: r.mainEventId, eventId: r.event.id, day: r.day, slot: r.slot }))

  const [oneshotCompanions, mainEventCompanions] = await Promise.all([
    oneshotSlotIds.length > 0
      ? db.reservation.findMany({
          where: { invitedByUserId: userId, slotId: { in: oneshotSlotIds } },
          select: { slotId: true, playerName: true, playerEmail: true, status: true, holdExpiresAt: true },
        })
      : [],
    mainEventKeys.length > 0
      ? db.mainEventReservation.findMany({
          where: { invitedByUserId: userId, OR: mainEventKeys },
          select: { mainEventId: true, eventId: true, day: true, slot: true, playerName: true, playerEmail: true, status: true, holdExpiresAt: true },
        })
      : [],
  ])

  const companionsBySlotId = new Map()
  for (const companion of oneshotCompanions) {
    if (!companionsBySlotId.has(companion.slotId)) companionsBySlotId.set(companion.slotId, [])
    companionsBySlotId.get(companion.slotId).push(companion)
  }

  const companionsBySessionKey = new Map()
  for (const companion of mainEventCompanions) {
    const key = `${companion.mainEventId}__${companion.eventId}__${companion.day}__${companion.slot}`
    if (!companionsBySessionKey.has(key)) companionsBySessionKey.set(key, [])
    companionsBySessionKey.get(key).push(companion)
  }

  const dayCache = new Map()

  return [
    ...oneShotReservations.map((reservation) => serializeOneShotBooking(reservation, {
      cancellationReason: cancellationReasonByReservationId.get(reservation.id) || null,
      companions: companionsBySlotId.get(reservation.slotId) || [],
      dayCache,
    })),
    ...mainEventReservations.map((reservation) => serializeMainEventBooking(reservation, {
      cancellationReason: cancellationReasonByMainEventReservationId.get(reservation.id) || null,
      companions: companionsBySessionKey.get(`${reservation.mainEventId}__${reservation.event.id}__${reservation.day}__${reservation.slot}`) || [],
      dayCache,
    })),
    ...eventAdmissions.map((admission) => serializeEventAdmissionBooking(admission, {
      hasOtherActiveBookings: admission.day
        ? (activeBookingsByEventDay.get(`${admission.event.id}__${admission.day}`) || 0) > 0
        : (activeBookingsByEventId.get(admission.event.id) || 0) > 0,
      cancellationReason: cancellationReasonByAdmissionId.get(admission.id) || null,
      dayCache,
    })),
  ].sort(sortBookings)
}

// Bookings ready to become calendar events: active status + a resolvable
// real date. Used by both the .ics download and the calendar email — a
// cancelled or undated booking has no business being on a calendar.
export function getIcsReadyBookings(bookings) {
  return bookings
    .filter((booking) => ACCOUNT_BOOKING_ACTIVE_STATUSES.includes(booking.status) && booking.scheduleStart)
    .map((booking) => ({
      booking,
      schedule: {
        start: new Date(booking.scheduleStart),
        end: new Date(booking.scheduleEnd),
        allDay: booking.scheduleAllDay,
      },
    }))
}

export async function cancelUserAccountBooking({ bookingType, bookingId, userId, db = prisma }) {
  if (bookingType === 'oneshot') {
    const reservation = await db.reservation.findUnique({
      where: { id: bookingId },
      select: {
        id: true,
        userId: true,
        status: true,
        slot: {
          select: {
            oneshot: {
              select: {
                title: true,
              },
            },
          },
        },
      },
    })

    if (!reservation || reservation.userId !== userId) {
      throw createBookingError('Prenotazione non trovata.', 404)
    }

    assertBookingCanBeCancelled(reservation.status)

    await db.reservation.update({
      where: { id: reservation.id },
      data: {
        status: 'CANCELLED',
        holdExpiresAt: null,
      },
    })

    return {
      id: reservation.id,
      bookingType,
      title: reservation.slot.oneshot.title,
    }
  }

  if (bookingType === 'main-event') {
    const reservation = await cancelUserMainEventReservation({ reservationId: bookingId, userId, db })

    return {
      id: reservation.id,
      bookingType,
      title: reservation.title,
    }
  }

  if (bookingType === 'event-admission') {
    const admission = await db.eventAdmission.findUnique({
      where: { id: bookingId },
      select: {
        id: true,
        userId: true,
        status: true,
        eventId: true,
        day: true,
        event: {
          select: {
            name: true,
          },
        },
      },
    })

    if (!admission || admission.userId !== userId) {
      throw createBookingError('Prenotazione non trovata.', 404)
    }

    assertBookingCanBeCancelled(admission.status)

    // A day-scoped admission ("" = legacy whole-event pass) only blocks
    // cancellation on reservations for that SAME day — a user can drop their
    // Sabato pass while keeping a Domenica GDR booking.
    const [activeReservations, activeMainEventReservations] = await Promise.all([
      db.reservation.count({
        where: {
          userId,
          status: { in: ACCOUNT_BOOKING_ACTIVE_STATUSES },
          slot: {
            ...(admission.day ? { day: admission.day } : {}),
            oneshot: {
              eventLinks: {
                some: { eventId: admission.eventId },
              },
            },
          },
        },
      }),
      db.mainEventReservation.count({
        where: {
          userId,
          status: { in: ACCOUNT_BOOKING_ACTIVE_STATUSES },
          eventId: admission.eventId,
          ...(admission.day ? { day: admission.day } : {}),
        },
      }),
    ])

    if (activeReservations > 0 || activeMainEventReservations > 0) {
      throw createBookingError(
        admission.day
          ? 'Non puoi cancellare questo ingresso finché hai prenotazioni attive per questo giorno.'
          : 'Non puoi cancellare il pass finché hai altre prenotazioni attive per questo evento.',
        400,
      )
    }

    // The pass ("") carries the actual price — block cancelling it while
    // other day-tickets still exist for this event, so they never end up
    // referencing a pass that no longer exists.
    if (!admission.day) {
      const otherDayAdmissions = await db.eventAdmission.count({
        where: { userId, eventId: admission.eventId, day: { not: '' } },
      })

      if (otherDayAdmissions > 0) {
        throw createBookingError('Non puoi cancellare il pass finché hai altri giorni prenotati per questo evento.', 400)
      }
    }

    await db.eventAdmission.update({
      where: { id: admission.id },
      data: {
        status: 'CANCELLED',
        holdExpiresAt: null,
      },
    })

    return {
      id: admission.id,
      bookingType,
      title: admission.event?.name || 'Pass giornaliero',
    }
  }

  throw createBookingError('Tipo prenotazione non supportato.', 400)
}