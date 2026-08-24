import { prisma } from './prisma'

export const MAIN_EVENT_ACTIVE_STATUSES = ['PENDING', 'CONFIRMED', 'ATTENDED']
export const MAIN_EVENT_CART_HOLD_STATUS = 'HOLD'
const DAY_ORDER = ['Lunedi', 'Martedi', 'Mercoledi', 'Giovedi', 'Venerdi', 'Sabato', 'Domenica', 'Giovedì', 'Venerdì']

function normalizeDate(value) {
  return value ? value.toISOString() : null
}

function createHttpError(status, message) {
  const error = new Error(message)
  error.status = status
  return error
}

// La prenotazione ora si lega a (mainEvent, event) direttamente, non più a
// uno slot/tavolo preciso — un main event può occupare più tavoli nella
// stessa fascia, la capienza è aggregata su tutti i tavoli di quella sessione.
export function getMainEventScopeWhere(eventId) {
  return eventId ? { eventId } : {}
}

export function getActiveMainEventReservationFilter(now = new Date()) {
  return {
    OR: [
      { status: { in: MAIN_EVENT_ACTIVE_STATUSES } },
      { status: { in: [MAIN_EVENT_CART_HOLD_STATUS, 'INVITED'] }, holdExpiresAt: { gt: now } },
    ],
  }
}

// Companion invites (status INVITED, no userId of their own) expire the same
// way as cart HOLDs — filtered by invitedByUserId, since userId is null.
export async function releaseExpiredMainEventHolds({ db = prisma, userId, eventId } = {}) {
  await db.mainEventReservation.updateMany({
    where: {
      status: { in: [MAIN_EVENT_CART_HOLD_STATUS, 'INVITED'] },
      holdExpiresAt: { lte: new Date() },
      ...(userId ? { OR: [{ userId }, { invitedByUserId: userId }] } : {}),
      ...getMainEventScopeWhere(eventId),
    },
    data: {
      status: 'EXPIRED',
      holdExpiresAt: null,
    },
  })
}

export async function refreshUserMainEventCartHolds({ userId, holdExpiresAt, db = prisma, eventId } = {}) {
  const holdReservations = await db.mainEventReservation.findMany({
    where: {
      userId,
      status: MAIN_EVENT_CART_HOLD_STATUS,
      ...getMainEventScopeWhere(eventId),
    },
    select: { id: true },
  })

  if (holdReservations.length === 0) {
    return
  }

  await db.mainEventReservation.updateMany({
    where: { id: { in: holdReservations.map((reservation) => reservation.id) } },
    data: {
      holdExpiresAt,
    },
  })
}

function sortSessions(left, right) {
  const dayIndexLeft = DAY_ORDER.indexOf(left.day)
  const dayIndexRight = DAY_ORDER.indexOf(right.day)

  if (dayIndexLeft !== dayIndexRight) {
    return (dayIndexLeft === -1 ? 999 : dayIndexLeft) - (dayIndexRight === -1 ? 999 : dayIndexRight)
  }

  return left.slot.localeCompare(right.slot)
}

// Un main event non prenota più un tavolo preciso: la "sessione" prenotabile è
// il gruppo giorno+fascia. La capienza NON è più la somma dei posti dei
// tavoli assegnati: è il maxPlayers fisso del main event stesso, uguale per
// ogni sessione in cui viene schedulato — i tavoli servono solo a indicare
// dove si gioca fisicamente.
function groupSlotsIntoSessions(slots) {
  const groups = new Map()

  for (const slot of slots) {
    const key = `${slot.day}__${slot.slot}`
    if (!groups.has(key)) groups.set(key, { day: slot.day, slot: slot.slot, allBookingEnabled: true })
    const group = groups.get(key)
    // A main event session spans every table assigned to it in that day+slot —
    // it's only bookable once ALL of those tables have booking turned on.
    group.allBookingEnabled = group.allBookingEnabled && slot.bookingEnabled
  }

  return Array.from(groups.values()).sort(sortSessions)
}

function serializeMainEventForEvent(mainEvent, event, countsByKey) {
  const bookingWindowOpen = !event.bookingOpensAt || new Date() >= new Date(event.bookingOpensAt)

  const sessions = groupSlotsIntoSessions(mainEvent.slots).map((session) => {
    const key = `${mainEvent.id}__${event.id}__${session.day}__${session.slot}`
    const currentReservations = countsByKey.get(key) || 0

    return {
      day: session.day,
      slot: session.slot,
      maxPlayers: mainEvent.maxPlayers,
      currentReservations,
      available: currentReservations < mainEvent.maxPlayers,
      bookable: session.allBookingEnabled && bookingWindowOpen,
    }
  })

  // Per-table breakdown of the same sessions, needed to place a main event on
  // a table×slot grid. A reservation isn't tied to one specific table, so
  // every physical table sharing a day+slot repeats that session's pooled
  // capacity/count — that's intentional, not a bug.
  const sessionByKey = new Map(sessions.map((session) => [`${session.day}__${session.slot}`, session]))
  const tables = mainEvent.slots.map((slot) => {
    const session = sessionByKey.get(`${slot.day}__${slot.slot}`)
    return {
      day: slot.day,
      slot: slot.slot,
      table: slot.table,
      maxPlayers: session?.maxPlayers ?? slot.maxPlayers,
      currentReservations: session?.currentReservations ?? 0,
      available: session?.available ?? true,
      bookable: session?.bookable ?? (slot.bookingEnabled && bookingWindowOpen),
    }
  })

  return {
    id: mainEvent.id,
    title: mainEvent.title,
    description: mainEvent.description,
    game: mainEvent.game,
    image: mainEvent.image,
    tags: mainEvent.tags || [],
    price: mainEvent.price,
    eventId: event.id,
    eventExternalId: event.externalId || null,
    eventName: event.name || null,
    eventLocation: event.location || null,
    eventStartDate: normalizeDate(event.startDate),
    eventEndDate: normalizeDate(event.endDate),
    sessions,
    tables,
  }
}

async function loadEventsById(db, eventIds) {
  if (eventIds.size === 0) return new Map()

  const events = await db.event.findMany({
    where: { id: { in: Array.from(eventIds) } },
    select: { id: true, externalId: true, name: true, location: true, startDate: true, endDate: true, bookingOpensAt: true },
  })

  return new Map(events.map((event) => [event.id, event]))
}

async function loadReservationCounts(db, mainEventIds) {
  if (mainEventIds.length === 0) return new Map()

  const reservationCounts = await db.mainEventReservation.groupBy({
    by: ['mainEventId', 'eventId', 'day', 'slot'],
    where: {
      mainEventId: { in: mainEventIds },
      ...getActiveMainEventReservationFilter(),
    },
    _count: { _all: true },
  })

  return new Map(reservationCounts.map((entry) => [`${entry.mainEventId}__${entry.eventId}__${entry.day}__${entry.slot}`, entry._count._all]))
}

// eventId è opzionale: senza, la libreria pubblica elenca un main event una
// volta per ogni evento in cui ha almeno un tavolo assegnato (un main event è
// riutilizzabile su più eventi).
export async function getPublicMainEvents({ eventId, db = prisma } = {}) {
  await releaseExpiredMainEventHolds({ db, eventId })

  const mainEvents = await db.mainEvent.findMany({
    where: { slots: { some: { isVisible: true, ...(eventId ? { eventId } : {}) } } },
    include: {
      slots: {
        where: { isVisible: true, ...(eventId ? { eventId } : {}) },
        select: { day: true, slot: true, table: true, maxPlayers: true, eventId: true, bookingEnabled: true },
      },
    },
    orderBy: [{ title: 'asc' }],
  })

  const eventIdsNeeded = new Set()
  for (const mainEvent of mainEvents) {
    for (const slot of mainEvent.slots) eventIdsNeeded.add(slot.eventId)
  }

  const eventsById = await loadEventsById(db, eventIdsNeeded)
  const countsByKey = await loadReservationCounts(db, mainEvents.map((mainEvent) => mainEvent.id))

  const items = []
  for (const mainEvent of mainEvents) {
    const slotsByEventId = new Map()
    for (const slot of mainEvent.slots) {
      if (!slotsByEventId.has(slot.eventId)) slotsByEventId.set(slot.eventId, [])
      slotsByEventId.get(slot.eventId).push(slot)
    }

    for (const [slotEventId, slots] of slotsByEventId) {
      const event = eventsById.get(slotEventId)
      if (!event) continue
      items.push(serializeMainEventForEvent({ ...mainEvent, slots }, event, countsByKey))
    }
  }

  return items.sort((left, right) => {
    if (left.eventStartDate !== right.eventStartDate) {
      return String(left.eventStartDate || '').localeCompare(String(right.eventStartDate || ''))
    }

    const leftSession = left.sessions[0]
    const rightSession = right.sessions[0]

    if (leftSession && rightSession) {
      const order = sortSessions(leftSession, rightSession)
      if (order !== 0) return order
    }

    return left.title.localeCompare(right.title)
  })
}

function serializeMainEventReservation(reservation, userId) {
  return {
    id: reservation.id,
    userId,
    status: reservation.status,
    createdAt: normalizeDate(reservation.createdAt),
    updatedAt: normalizeDate(reservation.updatedAt),
    day: reservation.day,
    slot: reservation.slot,
    mainEventId: reservation.mainEvent.id,
    mainEventTitle: reservation.mainEvent.title,
    game: reservation.mainEvent.game,
    price: reservation.mainEvent.price ?? null,
    eventId: reservation.event.id,
    eventName: reservation.event?.name || null,
  }
}

export async function getUserMainEventCartState({ userId, eventId, db = prisma }) {
  const now = new Date()
  await releaseExpiredMainEventHolds({ db, userId, eventId })

  const [reservations, companionReservations] = await Promise.all([
    db.mainEventReservation.findMany({
      where: {
        userId,
        ...getActiveMainEventReservationFilter(now),
        ...getMainEventScopeWhere(eventId),
      },
      select: {
        id: true,
        status: true,
        day: true,
        slot: true,
        createdAt: true,
        updatedAt: true,
        holdExpiresAt: true,
        mainEvent: { select: { id: true, title: true, game: true, price: true } },
        event: { select: { id: true, name: true } },
      },
      orderBy: [{ updatedAt: 'desc' }],
    }),
    db.mainEventReservation.findMany({
      where: {
        invitedByUserId: userId,
        status: MAIN_EVENT_CART_HOLD_STATUS,
        holdExpiresAt: { gt: now },
        ...getMainEventScopeWhere(eventId),
      },
      select: {
        id: true,
        day: true,
        slot: true,
        playerName: true,
        playerEmail: true,
        mainEvent: { select: { title: true } },
      },
    }),
  ])

  const sessionKey = (reservation) => `${reservation.mainEvent.id}__${reservation.event.id}__${reservation.day}__${reservation.slot}`
  // Chiave generica giorno+fascia (stesso formato di getSlotKey in
  // event-booking.js) usata per rilevare conflitti tra tipi di prenotazione
  // diversi (one-shot vs main event) sulla stessa fascia oraria.
  const daySlotKey = (reservation) => `${String(reservation.day || '').trim().toLowerCase()}__${String(reservation.slot || '').trim().toLowerCase()}`

  const confirmedReservations = reservations.filter((reservation) => reservation.status !== MAIN_EVENT_CART_HOLD_STATUS)
  const cartReservations = reservations.filter((reservation) => reservation.status === MAIN_EVENT_CART_HOLD_STATUS)
  const holdExpiresAt = cartReservations.length > 0
    ? new Date(Math.max(...cartReservations.map((reservation) => new Date(reservation.holdExpiresAt).getTime())))
    : null

  return {
    confirmedReservationIds: confirmedReservations.map((reservation) => reservation.id),
    confirmedSessionKeys: confirmedReservations.map(sessionKey),
    confirmedSlotKeys: confirmedReservations.map(daySlotKey),
    confirmedReservations: confirmedReservations.map((reservation) => serializeMainEventReservation(reservation, userId)),
    cartReservationIds: cartReservations.map((reservation) => reservation.id),
    cartSessionKeys: cartReservations.map(sessionKey),
    cartSlotKeys: cartReservations.map(daySlotKey),
    cartSlots: cartReservations.map((reservation) => ({
      reservationId: reservation.id,
      day: reservation.day,
      slot: reservation.slot,
      mainEventId: reservation.mainEvent.id,
      mainEventTitle: reservation.mainEvent.title,
      game: reservation.mainEvent.game,
      eventId: reservation.event.id,
      eventName: reservation.event?.name || null,
      price: reservation.mainEvent.price ?? null,
      holdExpiresAt: reservation.holdExpiresAt ? reservation.holdExpiresAt.toISOString() : null,
    })),
    companionCartSlots: companionReservations.map((reservation) => ({
      reservationId: reservation.id,
      name: reservation.playerName,
      email: reservation.playerEmail,
      day: reservation.day,
      slot: reservation.slot,
      mainEventTitle: reservation.mainEvent.title,
    })),
    holdExpiresAt: holdExpiresAt ? holdExpiresAt.toISOString() : null,
  }
}

export async function cancelUserMainEventReservation({ reservationId, userId, db = prisma }) {
  const reservation = await db.mainEventReservation.findUnique({
    where: { id: reservationId },
    select: {
      id: true,
      userId: true,
      status: true,
      mainEventId: true,
      eventId: true,
      day: true,
      slot: true,
      mainEvent: { select: { title: true } },
    },
  })

  if (!reservation || reservation.userId !== userId) {
    throw createHttpError(404, 'Prenotazione non trovata.')
  }

  if (reservation.status === 'CANCELLED') {
    throw createHttpError(400, 'La prenotazione è già stata cancellata.')
  }

  if (reservation.status === 'ATTENDED') {
    throw createHttpError(400, 'Non puoi cancellare una prenotazione già registrata come partecipata.')
  }

  if (reservation.status === 'HOLD' || reservation.status === 'EXPIRED') {
    throw createHttpError(400, 'Questa prenotazione non è gestibile dall\'area utente.')
  }

  await db.mainEventReservation.update({
    where: { id: reservation.id },
    data: {
      status: 'CANCELLED',
    },
  })

  // Real occupancy after the cancellation, so the client can set the
  // displayed seat count directly instead of guessing a delta.
  const currentReservations = await db.mainEventReservation.count({
    where: {
      mainEventId: reservation.mainEventId,
      day: reservation.day,
      slot: reservation.slot,
      ...getActiveMainEventReservationFilter(),
      ...getMainEventScopeWhere(reservation.eventId),
    },
  })

  return {
    id: reservation.id,
    title: reservation.mainEvent.title,
    sessionOccupancy: {
      mainEventId: reservation.mainEventId,
      day: reservation.day,
      slot: reservation.slot,
      currentReservations,
    },
  }
}
