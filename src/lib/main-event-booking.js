import { prisma } from './prisma'
import { generateInviteCode, getCompanionInviteExpiration } from './invite-tokens'

export const MAIN_EVENT_ACTIVE_STATUSES = ['PENDING', 'CONFIRMED', 'ATTENDED']
export const MAIN_EVENT_CART_HOLD_STATUS = 'HOLD'
export const MAIN_EVENT_CART_HOLD_MINUTES = 10
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

function getNextHoldExpiration() {
  return new Date(Date.now() + MAIN_EVENT_CART_HOLD_MINUTES * 60 * 1000)
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
// il gruppo giorno+fascia, la cui capienza è la somma dei posti di tutti i
// tavoli assegnati a quel main event in quel gruppo.
function groupSlotsIntoSessions(slots) {
  const groups = new Map()

  for (const slot of slots) {
    const key = `${slot.day}__${slot.slot}`
    if (!groups.has(key)) groups.set(key, { day: slot.day, slot: slot.slot, maxPlayers: 0, allBookingEnabled: true })
    const group = groups.get(key)
    group.maxPlayers += slot.maxPlayers
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
      maxPlayers: session.maxPlayers,
      currentReservations,
      available: currentReservations < session.maxPlayers,
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

export async function getPublicMainEvent(mainEventId, { eventId, db = prisma } = {}) {
  await releaseExpiredMainEventHolds({ db })

  const mainEvent = await db.mainEvent.findUnique({
    where: { id: mainEventId },
    include: {
      slots: {
        where: { isVisible: true, ...(eventId ? { eventId } : {}) },
        select: { day: true, slot: true, maxPlayers: true, eventId: true, bookingEnabled: true },
      },
    },
  })

  if (!mainEvent || mainEvent.slots.length === 0) {
    return null
  }

  const resolvedEventId = eventId || mainEvent.slots[0].eventId
  const eventsById = await loadEventsById(db, new Set([resolvedEventId]))
  const event = eventsById.get(resolvedEventId)
  if (!event) return null

  const countsByKey = await loadReservationCounts(db, [mainEvent.id])

  return serializeMainEventForEvent(
    { ...mainEvent, slots: mainEvent.slots.filter((slot) => slot.eventId === resolvedEventId) },
    event,
    countsByKey,
  )
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

export async function getUserMainEventReservations({ userId, eventId, db = prisma }) {
  await releaseExpiredMainEventHolds({ db, userId, eventId })

  const reservations = await db.mainEventReservation.findMany({
    where: {
      userId,
      status: { in: MAIN_EVENT_ACTIVE_STATUSES },
      ...getMainEventScopeWhere(eventId),
    },
    select: {
      id: true,
      status: true,
      day: true,
      slot: true,
      createdAt: true,
      updatedAt: true,
      mainEvent: { select: { id: true, title: true, game: true } },
      event: { select: { id: true, name: true } },
    },
    orderBy: [{ updatedAt: 'desc' }],
  })

  return reservations.map((reservation) => serializeMainEventReservation(reservation, userId))
}

export async function getUserMainEventCartState({ userId, eventId, db = prisma }) {
  const now = new Date()
  await releaseExpiredMainEventHolds({ db, userId, eventId })

  const reservations = await db.mainEventReservation.findMany({
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
  })

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
    holdExpiresAt: holdExpiresAt ? holdExpiresAt.toISOString() : null,
  }
}

// Default Prisma interactive transaction timeout is 5000ms. We keep only the
// critical atomic writes inside the transaction; cleanup and final state reads
// happen outside.
const MAIN_EVENT_CART_TX_OPTIONS = {
  isolationLevel: 'Serializable',
  timeout: 10000,
  maxWait: 5000,
}

async function getSessionCapacity(db, { mainEventId, eventId, day, slot }) {
  const slots = await db.eventSlot.findMany({
    where: { mainEventId, eventId, day, slot },
    select: { maxPlayers: true, bookingEnabled: true },
  })

  return {
    capacity: slots.reduce((sum, s) => sum + s.maxPlayers, 0),
    // The session spans every table assigned to this day+slot group — it's
    // only bookable once ALL of them have booking turned on.
    bookingEnabled: slots.length > 0 && slots.every((s) => s.bookingEnabled),
  }
}

export async function addMainEventSessionToCart({ userId, mainEventId, eventId, day, slot, userName, userEmail, companions = [], isAdmin = false, db = prisma }) {
  // Cleanup expired holds OUTSIDE the transaction (idempotent, no atomicity needed)
  await releaseExpiredMainEventHolds({ db, userId, eventId })

  await db.$transaction(async (tx) => {
    const mainEvent = await tx.mainEvent.findUnique({ where: { id: mainEventId }, select: { id: true, title: true } })
    if (!mainEvent) {
      throw createHttpError(404, 'Main event non trovato.')
    }

    const event = await tx.event.findUnique({ where: { id: eventId }, select: { bookingOpensAt: true } })
    if (!event) {
      throw createHttpError(404, 'Evento non trovato.')
    }

    const { capacity, bookingEnabled: sessionBookingEnabled } = await getSessionCapacity(tx, { mainEventId, eventId, day, slot })
    if (capacity === 0) {
      throw createHttpError(404, 'Sessione main event non trovata.')
    }

    const bookingWindowOpen = !event.bookingOpensAt || new Date() >= new Date(event.bookingOpensAt)
    if (!isAdmin && (!sessionBookingEnabled || !bookingWindowOpen)) {
      throw createHttpError(400, `Le prenotazioni per il main event ${mainEvent.title} non sono ancora aperte.`)
    }

    const existingReservation = await tx.mainEventReservation.findUnique({
      where: { userId_mainEventId_eventId_day_slot: { userId, mainEventId, eventId, day, slot } },
      select: { id: true, status: true, holdExpiresAt: true },
    })

    if (existingReservation && MAIN_EVENT_ACTIVE_STATUSES.includes(existingReservation.status)) {
      throw createHttpError(400, 'Hai già prenotato questa sessione.')
    }

    // Own hold still valid — counted in currentReservations below, so it must be
    // excluded from the "seats taken by others" tally.
    const holdStillValid = Boolean(existingReservation?.status === MAIN_EVENT_CART_HOLD_STATUS && existingReservation.holdExpiresAt && existingReservation.holdExpiresAt > new Date())
    const holdExpiresAt = getNextHoldExpiration()

    const [conflictingReservation, currentReservations, existingCompanionsCount] = await Promise.all([
      tx.mainEventReservation.findFirst({
        where: {
          userId,
          ...getActiveMainEventReservationFilter(),
          NOT: { mainEventId, eventId },
          day,
          slot,
          ...(eventId ? { eventId } : {}),
        },
        select: { id: true },
      }),
      tx.mainEventReservation.count({
        where: {
          mainEventId,
          eventId,
          day,
          slot,
          ...getActiveMainEventReservationFilter(),
        },
      }),
      tx.mainEventReservation.count({
        where: { invitedByUserId: userId, mainEventId, eventId, day, slot, status: MAIN_EVENT_CART_HOLD_STATUS },
      }),
    ])

    if (conflictingReservation) {
      throw createHttpError(400, `Hai già una prenotazione nello stesso giorno e fascia oraria: ${day} ${slot}.`)
    }

    // Seats taken by other people, excluding this host's own row and their
    // own (about-to-be-replaced) companion invites for this session.
    const seatsTakenByOthers = currentReservations - (holdStillValid ? 1 : 0) - existingCompanionsCount
    const seatsNeeded = 1 + companions.length

    if (seatsTakenByOthers + seatsNeeded > capacity) {
      throw createHttpError(400, `Non ci sono abbastanza posti liberi per te e i tuoi amici nel main event ${mainEvent.title}.`)
    }

    if (existingReservation) {
      await tx.mainEventReservation.update({
        where: { id: existingReservation.id },
        data: {
          status: MAIN_EVENT_CART_HOLD_STATUS,
          holdExpiresAt,
          playerName: userName || userEmail || null,
          playerEmail: userEmail || null,
          consentGiven: true,
          consentDate: new Date(),
        },
      })
    } else {
      await tx.mainEventReservation.create({
        data: {
          userId,
          mainEventId,
          eventId,
          day,
          slot,
          status: MAIN_EVENT_CART_HOLD_STATUS,
          holdExpiresAt,
          playerName: userName || userEmail || null,
          playerEmail: userEmail || null,
          consentGiven: true,
          consentDate: new Date(),
        },
      })
    }

    // Replace this host's companion invites for this session with the submitted list.
    await tx.mainEventReservation.deleteMany({
      where: { invitedByUserId: userId, mainEventId, eventId, day, slot, status: MAIN_EVENT_CART_HOLD_STATUS },
    })

    if (companions.length > 0) {
      await tx.mainEventReservation.createMany({
        data: companions.map((companion) => ({
          mainEventId,
          eventId,
          day,
          slot,
          status: MAIN_EVENT_CART_HOLD_STATUS,
          holdExpiresAt,
          playerName: companion.fullName,
          playerEmail: companion.email,
          invitedByUserId: userId,
          inviteCode: generateInviteCode(),
          consentGiven: false,
        })),
      })
    }

    await refreshUserMainEventCartHolds({ userId, holdExpiresAt, db: tx, eventId })
  }, MAIN_EVENT_CART_TX_OPTIONS)

  return getUserMainEventCartState({ userId, eventId, db })
}

export async function removeMainEventSessionFromCart({ userId, mainEventId, eventId, day, slot, db = prisma }) {
  await releaseExpiredMainEventHolds({ db, userId, eventId })

  await db.$transaction(async (tx) => {
    const reservation = await tx.mainEventReservation.findFirst({
      where: {
        userId,
        mainEventId,
        eventId,
        day,
        slot,
        status: MAIN_EVENT_CART_HOLD_STATUS,
        holdExpiresAt: { gt: new Date() },
      },
      select: { id: true },
    })

    if (!reservation) {
      throw createHttpError(404, 'La sessione non è presente nelle Prenotazioni.')
    }

    await tx.mainEventReservation.delete({ where: { id: reservation.id } })
    await tx.mainEventReservation.deleteMany({
      where: { invitedByUserId: userId, mainEventId, eventId, day, slot, status: MAIN_EVENT_CART_HOLD_STATUS },
    })
  }, MAIN_EVENT_CART_TX_OPTIONS)

  return getUserMainEventCartState({ userId, eventId, db })
}

export async function confirmMainEventCart({ userId, eventId, db = prisma }) {
  await releaseExpiredMainEventHolds({ db, userId, eventId })

  const companionInvites = await db.$transaction(async (tx) => {
    const holdReservations = await tx.mainEventReservation.findMany({
      where: {
        userId,
        status: MAIN_EVENT_CART_HOLD_STATUS,
        holdExpiresAt: { gt: new Date() },
        ...getMainEventScopeWhere(eventId),
      },
      select: { id: true, mainEventId: true, eventId: true, day: true, slot: true, mainEvent: { select: { title: true } } },
    })

    if (holdReservations.length === 0) {
      throw createHttpError(400, 'Le prenotazioni del Main Event sono vuote oppure il tempo è scaduto.')
    }

    await tx.mainEventReservation.updateMany({
      where: { id: { in: holdReservations.map((reservation) => reservation.id) } },
      data: { status: 'PENDING', holdExpiresAt: null },
    })

    // Companions the host invited on these same sessions move from HOLD (still
    // just a cart draft) to INVITED — reserved for 1h while they register/claim
    // it. They are never part of the host's own paid total.
    const companionInviteExpiresAt = getCompanionInviteExpiration()
    const invites = []

    const companions = await tx.mainEventReservation.findMany({
      where: {
        invitedByUserId: userId,
        status: MAIN_EVENT_CART_HOLD_STATUS,
        OR: holdReservations.map((reservation) => ({
          mainEventId: reservation.mainEventId,
          eventId: reservation.eventId,
          day: reservation.day,
          slot: reservation.slot,
        })),
      },
      select: { id: true, playerName: true, playerEmail: true, inviteCode: true, mainEventId: true, eventId: true, day: true, slot: true },
    })

    if (companions.length > 0) {
      await tx.mainEventReservation.updateMany({
        where: { id: { in: companions.map((companion) => companion.id) } },
        data: { status: 'INVITED', holdExpiresAt: companionInviteExpiresAt },
      })

      const sessionByKey = new Map(holdReservations.map((reservation) => [`${reservation.mainEventId}__${reservation.eventId}__${reservation.day}__${reservation.slot}`, reservation.mainEvent]))
      for (const companion of companions) {
        const mainEvent = sessionByKey.get(`${companion.mainEventId}__${companion.eventId}__${companion.day}__${companion.slot}`)
        invites.push({
          name: companion.playerName,
          email: companion.playerEmail,
          inviteCode: companion.inviteCode,
          activityTitle: mainEvent?.title || 'Main event',
          day: companion.day,
          slot: companion.slot,
          table: null,
          eventId: companion.eventId,
        })
      }
    }

    return invites
  }, MAIN_EVENT_CART_TX_OPTIONS)

  const cartState = await getUserMainEventCartState({ userId, eventId, db })
  return { ...cartState, companionInvites }
}

export async function cancelUserMainEventReservation({ reservationId, userId, db = prisma }) {
  const reservation = await db.mainEventReservation.findUnique({
    where: { id: reservationId },
    select: {
      id: true,
      userId: true,
      status: true,
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

  return {
    id: reservation.id,
    title: reservation.mainEvent.title,
  }
}
