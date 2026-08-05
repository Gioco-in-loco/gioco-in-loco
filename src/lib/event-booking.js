import { cache } from 'react'
import { prisma } from './prisma'
import { getUserMainEventCartState } from './main-event-booking'

export const EVENT_CART_HOLD_MINUTES = 10
export const EVENT_CART_HOLD_STATUS = 'HOLD'
export const EVENT_ACTIVE_RESERVATION_STATUSES = ['PENDING', 'CONFIRMED', 'ATTENDED']

const globalForEventBooking = globalThis

const DAY_ORDER = ['Lunedi', 'Martedi', 'Mercoledi', 'Giovedi', 'Venerdi', 'Sabato', 'Domenica', 'Giovedì', 'Venerdì']

function sortSlots(left, right) {
  const dayIndexLeft = DAY_ORDER.indexOf(left.day)
  const dayIndexRight = DAY_ORDER.indexOf(right.day)

  if (dayIndexLeft !== dayIndexRight) {
    return (dayIndexLeft === -1 ? 999 : dayIndexLeft) - (dayIndexRight === -1 ? 999 : dayIndexRight)
  }

  if (left.slot !== right.slot) {
    return left.slot.localeCompare(right.slot)
  }

  return left.table.localeCompare(right.table, undefined, { numeric: true })
}

function normalizeDate(value) {
  return value ? value.toISOString() : null
}

// null bookingOpensAt = no restriction, bookings always allowed date-wise.
export function isBookingWindowOpen(event, now = new Date()) {
  return !event?.bookingOpensAt || now >= new Date(event.bookingOpensAt)
}

async function detectEventCartHoldSupport(db = prisma) {
  if (db === prisma && typeof globalForEventBooking.__eventCartHoldSupport === 'boolean') {
    return globalForEventBooking.__eventCartHoldSupport
  }

  try {
    const [columns, enumValues] = await Promise.all([
      db.$queryRaw`
        SELECT
          table_name AS "tableName",
          column_name AS "columnName"
        FROM information_schema.columns
        WHERE table_schema = current_schema()
          AND (
            (table_name = 'event_admissions' AND column_name = 'holdExpiresAt')
            OR (table_name = 'reservations' AND column_name = 'holdExpiresAt')
          )
      `,
      db.$queryRaw`
        SELECT enumlabel
        FROM pg_enum
        INNER JOIN pg_type ON pg_enum.enumtypid = pg_type.oid
        WHERE pg_type.typname = 'ReservationStatus'
          AND enumlabel IN ('HOLD', 'EXPIRED')
      `,
    ])

    const availableColumns = new Set(columns.map((column) => `${column.tableName}.${column.columnName}`))
    const availableEnumValues = new Set(enumValues.map((entry) => entry.enumlabel))
    const cartHoldsSupported = availableColumns.has('event_admissions.holdExpiresAt')
      && availableColumns.has('reservations.holdExpiresAt')
      && availableEnumValues.has('HOLD')
      && availableEnumValues.has('EXPIRED')

    if (db === prisma) {
      globalForEventBooking.__eventCartHoldSupport = cartHoldsSupported
    }

    return cartHoldsSupported
  } catch (error) {
    if (db === prisma && !globalForEventBooking.__eventCartHoldSupportErrorLogged) {
      console.warn('Failed to detect event cart hold support:', error?.message || error)
      globalForEventBooking.__eventCartHoldSupportErrorLogged = true
    }

    if (db === prisma) {
      globalForEventBooking.__eventCartHoldSupport = false
    }

    return false
  }
}

export async function supportsEventCartHolds({ db = prisma } = {}) {
  return detectEventCartHoldSupport(db)
}

export function normalizeSlotValue(value) {
  return String(value || '').trim().toLowerCase()
}

export function getSlotKey(slot) {
  return `${normalizeSlotValue(slot.day)}__${normalizeSlotValue(slot.slot)}`
}

export function getNextHoldExpiration() {
  return new Date(Date.now() + EVENT_CART_HOLD_MINUTES * 60 * 1000)
}

export function getActiveReservationFilter(now = new Date(), { cartHoldsSupported = true } = {}) {
  if (!cartHoldsSupported) {
    return {
      status: { in: EVENT_ACTIVE_RESERVATION_STATUSES },
    }
  }

  return {
    OR: [
      { status: { in: EVENT_ACTIVE_RESERVATION_STATUSES } },
      { status: { in: [EVENT_CART_HOLD_STATUS, 'INVITED'] }, holdExpiresAt: { gt: now } },
    ],
  }
}

export function isConfirmedReservationStatus(status) {
  return status !== EVENT_CART_HOLD_STATUS && status !== 'CANCELLED' && status !== 'EXPIRED'
}

export function getEventScopedSlotWhere(eventId) {
  return {
    slot: {
      oneshot: {
        eventLinks: {
          some: { eventId },
        },
      },
    },
  }
}

export async function releaseExpiredEventHolds({ eventId, db = prisma, userId }) {
  const cartHoldsSupported = await supportsEventCartHolds({ db })

  if (!cartHoldsSupported) {
    return
  }

  const now = new Date()

  // Companion daily passes (status INVITED, no userId of their own) expire
  // the same way as cart HOLDs — filtered by invitedByUserId, since userId is null.
  await db.eventAdmission.updateMany({
    where: {
      eventId,
      status: { in: [EVENT_CART_HOLD_STATUS, 'INVITED'] },
      holdExpiresAt: { lte: now },
      ...(userId ? { OR: [{ userId }, { invitedByUserId: userId }] } : {}),
    },
    data: {
      status: 'EXPIRED',
      holdExpiresAt: null,
    },
  })

  // Companion invites (status INVITED, no userId of their own) expire the same
  // way as cart HOLDs — filtered by invitedByUserId, since userId is null.
  const expiredReservations = await db.reservation.findMany({
    where: {
      status: { in: [EVENT_CART_HOLD_STATUS, 'INVITED'] },
      holdExpiresAt: { lte: now },
      ...(userId ? { OR: [{ userId }, { invitedByUserId: userId }] } : {}),
      ...getEventScopedSlotWhere(eventId),
    },
    select: { id: true },
  })

  if (expiredReservations.length > 0) {
    await db.reservation.updateMany({
      where: { id: { in: expiredReservations.map((reservation) => reservation.id) } },
      data: {
        status: 'EXPIRED',
        holdExpiresAt: null,
      },
    })
  }
}

export async function getUserEventCartState({ eventId, userId, db = prisma }) {
  const now = new Date()
  const cartHoldsSupported = await supportsEventCartHolds({ db })

  if (cartHoldsSupported) {
    await releaseExpiredEventHolds({ eventId, db, userId })
  }

  const [admissions, reservations, mainEventCartState, companionReservations] = await Promise.all([
    db.eventAdmission.findMany({
      where: { userId, eventId },
      select: cartHoldsSupported
        ? {
            id: true,
            day: true,
            status: true,
            pricePaid: true,
            holdExpiresAt: true,
          }
        : {
            id: true,
            day: true,
            status: true,
            pricePaid: true,
          },
    }),
    db.reservation.findMany({
      where: {
        userId,
        ...getActiveReservationFilter(now, { cartHoldsSupported }),
        ...getEventScopedSlotWhere(eventId),
      },
      select: cartHoldsSupported
        ? {
            id: true,
            slotId: true,
            status: true,
            holdExpiresAt: true,
            slot: {
              select: {
                id: true,
                day: true,
                slot: true,
                table: true,
                maxPlayers: true,
                oneshot: {
                  select: {
                    id: true,
                    title: true,
                    price: true,
                  },
                },
              },
            },
          }
        : {
            id: true,
            slotId: true,
            status: true,
            slot: {
              select: {
                id: true,
                day: true,
                slot: true,
                table: true,
                maxPlayers: true,
                oneshot: {
                  select: {
                    id: true,
                    title: true,
                    price: true,
                  },
                },
              },
            },
          },
      orderBy: [
        { slot: { day: 'asc' } },
        { slot: { slot: 'asc' } },
      ],
    }),
    getUserMainEventCartState({ userId, eventId, db }),
    cartHoldsSupported
      ? db.reservation.findMany({
          where: {
            invitedByUserId: userId,
            status: EVENT_CART_HOLD_STATUS,
            holdExpiresAt: { gt: now },
            ...getEventScopedSlotWhere(eventId),
          },
          select: {
            id: true,
            playerName: true,
            playerEmail: true,
            slot: { select: { day: true, slot: true, table: true, oneshot: { select: { title: true } } } },
          },
        })
      : [],
  ])

  const confirmedReservations = cartHoldsSupported
    ? reservations.filter((reservation) => reservation.status !== EVENT_CART_HOLD_STATUS)
    : reservations
  const cartReservations = cartHoldsSupported
    ? reservations.filter((reservation) => reservation.status === EVENT_CART_HOLD_STATUS)
    : []
  const confirmedAdmissions = admissions.filter((admission) => isConfirmedReservationStatus(admission.status))
  const cartAdmissions = cartHoldsSupported
    ? admissions.filter((admission) => (
        admission.status === EVENT_CART_HOLD_STATUS
        && admission.holdExpiresAt
        && admission.holdExpiresAt > now
      ))
    : []

  const activeHoldDates = [
    ...cartAdmissions.map((admission) => admission.holdExpiresAt),
    ...cartReservations.map((reservation) => reservation.holdExpiresAt),
    mainEventCartState.holdExpiresAt,
  ].filter(Boolean)

  const holdExpiresAt = activeHoldDates.length > 0
    ? new Date(Math.max(...activeHoldDates.map((value) => new Date(value).getTime())))
    : null

  return {
    hasConfirmedAdmission: confirmedAdmissions.length > 0,
    hasCartAdmission: cartAdmissions.length > 0,
    confirmedAdmissionDays: confirmedAdmissions.map((admission) => admission.day).filter(Boolean),
    cartAdmissionDays: cartAdmissions.map((admission) => admission.day).filter(Boolean),
    cartAdmissions: cartAdmissions.map((admission) => ({
      day: admission.day,
      price: admission.pricePaid ?? null,
      holdExpiresAt: admission.holdExpiresAt ? admission.holdExpiresAt.toISOString() : null,
    })),
    confirmedSlotIds: confirmedReservations.map((reservation) => reservation.slotId),
    confirmedSlotKeys: confirmedReservations.map((reservation) => getSlotKey(reservation.slot)),
    cartSlotIds: cartReservations.map((reservation) => reservation.slotId),
    cartSlotKeys: cartReservations.map((reservation) => getSlotKey(reservation.slot)),
    cartSlots: cartReservations.map((reservation) => ({
      id: reservation.slot.id,
      reservationId: reservation.id,
      day: reservation.slot.day,
      slot: reservation.slot.slot,
      table: reservation.slot.table,
      maxPlayers: reservation.slot.maxPlayers,
      oneshotId: reservation.slot.oneshot.id,
      oneshotTitle: reservation.slot.oneshot.title,
      price: reservation.slot.oneshot.price ?? null,
      holdExpiresAt: reservation.holdExpiresAt ? reservation.holdExpiresAt.toISOString() : null,
    })),
    companionCartSlots: companionReservations.map((reservation) => ({
      reservationId: reservation.id,
      name: reservation.playerName,
      email: reservation.playerEmail,
      day: reservation.slot.day,
      slot: reservation.slot.slot,
      table: reservation.slot.table,
      oneshotTitle: reservation.slot.oneshot.title,
    })),
    mainEventConfirmedReservationIds: mainEventCartState.confirmedReservationIds,
    mainEventConfirmedSessionKeys: mainEventCartState.confirmedSessionKeys,
    mainEventConfirmedSlotKeys: mainEventCartState.confirmedSlotKeys,
    mainEventConfirmedReservations: mainEventCartState.confirmedReservations,
    mainEventCartReservationIds: mainEventCartState.cartReservationIds,
    mainEventCartSessionKeys: mainEventCartState.cartSessionKeys,
    mainEventCartSlotKeys: mainEventCartState.cartSlotKeys,
    mainEventCartSlots: mainEventCartState.cartSlots,
    mainEventCompanionCartSlots: mainEventCartState.companionCartSlots,
    holdExpiresAt: holdExpiresAt ? holdExpiresAt.toISOString() : null,
  }
}

export async function refreshUserEventCartHolds({ eventId, db, userId, holdExpiresAt }) {
  const cartHoldsSupported = await supportsEventCartHolds({ db })

  if (!cartHoldsSupported) {
    return
  }

  await db.eventAdmission.updateMany({
    where: {
      userId,
      eventId,
      status: EVENT_CART_HOLD_STATUS,
    },
    data: { holdExpiresAt },
  })

  const holdReservationIds = await db.reservation.findMany({
    where: {
      userId,
      status: EVENT_CART_HOLD_STATUS,
      ...getEventScopedSlotWhere(eventId),
    },
    select: { id: true },
  })

  if (holdReservationIds.length > 0) {
    await db.reservation.updateMany({
      where: { id: { in: holdReservationIds.map((reservation) => reservation.id) } },
      data: { holdExpiresAt },
    })
  }
}

export async function getUserEventBookingStatus({ eventId, userId, db = prisma }) {
  const cartState = await getUserEventCartState({ eventId, userId, db })

  return {
    hasAdmission: cartState.hasConfirmedAdmission || cartState.hasCartAdmission,
    reservedSlotIds: cartState.confirmedSlotIds,
    reservedSlotKeys: cartState.confirmedSlotKeys,
    cartSlotIds: cartState.cartSlotIds,
    cartSlotKeys: cartState.cartSlotKeys,
    mainEventReservedSessionKeys: cartState.mainEventConfirmedSessionKeys,
    mainEventReservedSlotKeys: cartState.mainEventConfirmedSlotKeys,
    mainEventCartSessionKeys: cartState.mainEventCartSessionKeys,
    mainEventCartSlotKeys: cartState.mainEventCartSlotKeys,
    holdExpiresAt: cartState.holdExpiresAt,
  }
}

export async function getConfirmedEventBookingSummary({
  eventId,
  userId,
  db = prisma,
  includeAdmission = true,
  reservationIds,
  mainEventReservationIds,
}) {
  const normalizedReservationIds = Array.isArray(reservationIds) ? reservationIds.filter(Boolean) : null
  const normalizedMainEventReservationIds = Array.isArray(mainEventReservationIds) ? mainEventReservationIds.filter(Boolean) : null
  const [event, admissions, reservations, mainEventReservations] = await Promise.all([
    db.event.findUnique({
      where: { id: eventId },
      select: {
        id: true,
        name: true,
        location: true,
        startDate: true,
        endDate: true,
        price: true,
      },
    }),
    db.eventAdmission.findMany({
      where: { userId, eventId, status: 'CONFIRMED' },
      select: {
        day: true,
        status: true,
        pricePaid: true,
      },
    }),
    db.reservation.findMany({
      where: {
        userId,
        status: 'CONFIRMED',
        ...(normalizedReservationIds ? { id: { in: normalizedReservationIds } } : {}),
        ...getEventScopedSlotWhere(eventId),
      },
      select: {
        id: true,
        slot: {
          select: {
            day: true,
            slot: true,
            table: true,
            oneshot: {
              select: {
                title: true,
                game: true,
                master: true,
                price: true,
                association: {
                  select: {
                    name: true,
                  },
                },
              },
            },
          },
        },
      },
      orderBy: [
        { slot: { day: 'asc' } },
        { slot: { slot: 'asc' } },
        { slot: { table: 'asc' } },
      ],
    }),
    db.mainEventReservation.findMany({
      where: {
        userId,
        status: 'PENDING',
        ...(normalizedMainEventReservationIds ? { id: { in: normalizedMainEventReservationIds } } : {}),
        eventId,
      },
      select: {
        id: true,
        day: true,
        slot: true,
        mainEvent: {
          select: {
            title: true,
            game: true,
            price: true,
          },
        },
      },
      orderBy: [
        { day: 'asc' },
        { slot: 'asc' },
      ],
    }),
  ])

  if (!event || admissions.length === 0) {
    return null
  }

  const formatter = new Intl.DateTimeFormat('it-IT', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })

  const startDateLabel = event.startDate ? formatter.format(event.startDate) : 'Data da definire'
  const endDateLabel = event.endDate ? formatter.format(event.endDate) : null
  const eventDateLabel = endDateLabel && endDateLabel !== startDateLabel
    ? `${startDateLabel} - ${endDateLabel}`
    : startDateLabel

  const slots = [
    ...reservations.map((reservation) => ({
      id: reservation.id,
      title: reservation.slot.oneshot.title,
      game: reservation.slot.oneshot.game,
      master: reservation.slot.oneshot.master,
      associationName: reservation.slot.oneshot.association?.name || null,
      day: reservation.slot.day,
      slot: reservation.slot.slot,
      table: reservation.slot.table,
      price: reservation.slot.oneshot.price ?? null,
    })),
    ...mainEventReservations.map((reservation) => ({
      id: reservation.id,
      title: reservation.mainEvent.title,
      game: reservation.mainEvent.game || 'Main Event',
      master: null,
      associationName: null,
      day: reservation.day,
      slot: reservation.slot,
      table: null,
      price: reservation.mainEvent.price ?? null,
    })),
  ]

  const admissionPrice = includeAdmission
    ? admissions.reduce((sum, admission) => sum + (admission.pricePaid ?? event.price ?? 0), 0)
    : 0
  const admissionDays = admissions.map((admission) => admission.day).filter(Boolean)
  const sessionsTotal = slots.reduce((sum, slot) => sum + (slot.price ?? 0), 0)

  if (!includeAdmission && slots.length === 0) {
    return null
  }

  return {
    event: {
      id: event.id,
      name: event.name,
      location: event.location || null,
      startDate: normalizeDate(event.startDate),
      endDate: normalizeDate(event.endDate),
      startDateLabel: eventDateLabel,
    },
    admissionPrice,
    admissionDays,
    slots,
    totalPrice: admissionPrice + sessionsTotal,
  }
}

export const getBookableEventData = cache(async function getBookableEventData(eventId) {
  const cartHoldsSupported = await supportsEventCartHolds({ db: prisma })

  if (cartHoldsSupported) {
    await releaseExpiredEventHolds({ eventId, db: prisma })
  }

  const event = await prisma.event.findUnique({
    where: { id: eventId },
    select: {
      id: true,
      externalId: true,
      name: true,
      description: true,
      location: true,
      mapsUrl: true,
      price: true,
      dailyPrice: true,
      startDate: true,
      endDate: true,
      days: true,
      bookingOpensAt: true,
      visibility: true,
      oneShotLinks: {
        select: {
          oneShot: {
            select: {
              id: true,
              title: true,
              game: true,
              master: true,
              description: true,
              price: true,
              image: true,
              association: {
                select: {
                  id: true,
                  name: true,
                  logo: true,
                },
              },
              slots: {
                where: { isVisible: true },
                select: {
                  id: true,
                  day: true,
                  slot: true,
                  table: true,
                  maxPlayers: true,
                  bookingEnabled: true,
                },
              },
            },
          },
        },
      },
    },
  })

  if (!event) {
    return null
  }

  const bookingWindowOpen = isBookingWindowOpen(event)

  const slotIds = event.oneShotLinks.flatMap((link) => link.oneShot.slots.map((slot) => slot.id))
  const reservationCounts = slotIds.length > 0
    ? await prisma.reservation.groupBy({
        by: ['slotId'],
        where: {
          slotId: { in: slotIds },
          ...getActiveReservationFilter(new Date(), { cartHoldsSupported }),
        },
        _count: { _all: true },
      })
    : []

  const countsBySlotId = new Map(reservationCounts.map((entry) => [entry.slotId, entry._count._all]))

  // Coordinate grezze (giorno/fascia/tavolo) degli slot che l'admin ha
  // marcato non visibili — mai il contenuto (titolo, master, associazione):
  // servono solo alla UI pubblica per mostrare un placeholder "Presto in
  // arrivo" al posto di "Libero" su quel tavolo, senza svelare cosa ci sarà.
  const hiddenSlots = await prisma.eventSlot.findMany({
    where: { eventId, isVisible: false },
    select: { day: true, slot: true, table: true },
  })

  return {
    id: event.id,
    externalId: event.externalId,
    name: event.name,
    description: event.description,
    location: event.location,
    price: event.price,
    dailyPrice: event.dailyPrice,
    startDate: normalizeDate(event.startDate),
    endDate: normalizeDate(event.endDate),
    days: event.days || [],
    bookingOpensAt: normalizeDate(event.bookingOpensAt),
    visibility: event.visibility,
    hiddenSlots,
    oneshots: event.oneShotLinks
      .map((link) => ({
        id: link.oneShot.id,
        title: link.oneShot.title,
        game: link.oneShot.game,
        master: link.oneShot.master,
        description: link.oneShot.description,
        price: link.oneShot.price,
        image: link.oneShot.image,
        association: link.oneShot.association,
        slots: link.oneShot.slots
          .map((slot) => ({
            ...slot,
            currentReservations: countsBySlotId.get(slot.id) || 0,
            available: (countsBySlotId.get(slot.id) || 0) < slot.maxPlayers,
            bookable: slot.bookingEnabled && bookingWindowOpen,
          }))
          .sort(sortSlots),
      }))
      .sort((left, right) => {
        const leftSlot = left.slots[0]
        const rightSlot = right.slots[0]
        if (!leftSlot || !rightSlot) return left.title.localeCompare(right.title)
        return sortSlots(leftSlot, rightSlot)
      }),
  }
})

// True only when every one-shot slot for this event+day is at capacity. Used
// to decide whether to offer a waitlist signup for that day.
export async function isDayFullyBooked(eventId, day) {
  const cartHoldsSupported = await supportsEventCartHolds({ db: prisma })

  const slots = await prisma.eventSlot.findMany({
    where: {
      eventId,
      day,
      oneshotId: { not: null },
      isVisible: true,
    },
    select: { id: true, maxPlayers: true },
  })

  if (slots.length === 0) {
    return false
  }

  const slotIds = slots.map((slot) => slot.id)
  const reservationCounts = await prisma.reservation.groupBy({
    by: ['slotId'],
    where: {
      slotId: { in: slotIds },
      ...getActiveReservationFilter(new Date(), { cartHoldsSupported }),
    },
    _count: { _all: true },
  })

  const countsBySlotId = new Map(reservationCounts.map((entry) => [entry.slotId, entry._count._all]))

  return slots.every((slot) => (countsBySlotId.get(slot.id) || 0) >= slot.maxPlayers)
}