import { NextResponse } from 'next/server'
import { prisma } from './prisma'
import { requireAuthenticatedApi } from './admin-guard'
import {
  EVENT_CART_HOLD_STATUS,
  getConfirmedEventBookingSummary,
  getActiveReservationFilter,
  getNextHoldExpiration,
  getSlotKey,
  getUserEventBookingStatus,
  getUserEventCartState,
  isConfirmedReservationStatus,
  refreshUserEventCartHolds,
  releaseExpiredEventHolds,
  supportsEventCartHolds,
} from './event-booking'
import {
  getActiveMainEventReservationFilter,
  getMainEventScopeWhere,
  refreshUserMainEventCartHolds,
  releaseExpiredMainEventHolds,
} from './main-event-booking'
import { sendEventBookingConfirmationEmails } from './event-booking-notifications'
import { getUserWaitlistDays } from './event-waitlist'

// Default Prisma interactive transaction timeout is 5000ms. Cart mutations only
// hold the transaction for the critical atomic writes; cleanup and final state
// reads happen outside. 10s is generous headroom for slow connections.
const CART_TX_OPTIONS = {
  isolationLevel: 'Serializable',
  timeout: 10000,
  maxWait: 5000,
}

function getEventNotFoundMessage(displayName) {
  return displayName ? `Evento ${displayName} non trovato.` : 'Evento non trovato.'
}

async function getUnavailableCartHoldResponse() {
  const cartHoldsSupported = await supportsEventCartHolds()

  if (cartHoldsSupported) {
    return null
  }

  return NextResponse.json(
    { error: 'Le tue Prenotazioni GDR temporanee non sono disponibili finché la migrazione Prisma 20260511_add_gdr_day_cart_holds non viene applicata.' },
    { status: 503 },
  )
}

/**
 * Cleanup expired holds (idempotent, doesn't need atomicity with the main work).
 * Runs OUTSIDE the transaction to keep critical sections short.
 */
async function releaseExpiredHolds({ eventId, userId }) {
  await Promise.all([
    releaseExpiredEventHolds({ eventId, db: prisma, userId }),
    releaseExpiredMainEventHolds({ eventId, db: prisma, userId }),
  ])
}

async function refreshAllEventCartHolds({ eventId, tx, userId, holdExpiresAt }) {
  await Promise.all([
    refreshUserEventCartHolds({ eventId, db: tx, userId, holdExpiresAt }),
    refreshUserMainEventCartHolds({ eventId, db: tx, userId, holdExpiresAt }),
  ])
}

async function ensureSingleAdmission({ tx, userId, event, day, holdExpiresAt, pricePaid }) {
  const existing = await tx.eventAdmission.findUnique({
    where: { userId_eventId_day: { userId, eventId: event.id, day } },
    select: { id: true, status: true },
  })

  if (!existing) {
    await tx.eventAdmission.create({
      data: {
        userId,
        eventId: event.id,
        day,
        status: EVENT_CART_HOLD_STATUS,
        holdExpiresAt,
        pricePaid,
        consentGiven: true,
        consentDate: new Date(),
      },
    })
    return
  }

  if (!isConfirmedReservationStatus(existing.status)) {
    await tx.eventAdmission.update({
      where: { id: existing.id },
      data: {
        status: EVENT_CART_HOLD_STATUS,
        holdExpiresAt,
        consentGiven: true,
        consentDate: new Date(),
      },
    })
  }
}

// Pricing model: when `event.price` is set, a single event-wide "pass"
// (day="") always carries that price, created once and never re-priced —
// every specific day (day="Sabato", ...) is just a free entry ticket for
// that day, so cancelling one day never affects what was actually charged.
// When only `event.dailyPrice` is set (no unified pass), each day is charged
// independently instead. Read-time code (summary/cart) just sums pricePaid
// across every admission row — no special-casing needed there.
async function ensureEventAdmissionHold({ event, tx, user, holdExpiresAt, day = '' }) {
  if (day && event.price != null) {
    await ensureSingleAdmission({ tx, userId: user.id, event, day: '', holdExpiresAt, pricePaid: event.price })
    await ensureSingleAdmission({ tx, userId: user.id, event, day, holdExpiresAt, pricePaid: 0 })
    return
  }

  const pricePaid = day ? (event.dailyPrice ?? 0) : (event.price ?? null)
  await ensureSingleAdmission({ tx, userId: user.id, event, day, holdExpiresAt, pricePaid })
}

// Attendance ("ci sarai il <day>") isn't a real cart item you need to review
// before confirming — it's a yes/no RSVP, so it's accepted as CONFIRMED right
// away instead of going through the HOLD -> cart -> confirm round trip that
// slot/table reservations use.
async function ensureSingleAdmissionConfirmed({ tx, userId, event, day, pricePaid }) {
  const existing = await tx.eventAdmission.findUnique({
    where: { userId_eventId_day: { userId, eventId: event.id, day } },
    select: { id: true, status: true },
  })

  if (!existing) {
    await tx.eventAdmission.create({
      data: {
        userId,
        eventId: event.id,
        day,
        status: 'CONFIRMED',
        holdExpiresAt: null,
        pricePaid,
        consentGiven: true,
        consentDate: new Date(),
      },
    })
    return
  }

  if (existing.status !== 'CONFIRMED') {
    await tx.eventAdmission.update({
      where: { id: existing.id },
      data: {
        status: 'CONFIRMED',
        holdExpiresAt: null,
        consentGiven: true,
        consentDate: new Date(),
      },
    })
  }
}

async function ensureEventAdmissionConfirmed({ event, tx, user, day = '' }) {
  if (day && event.price != null) {
    await ensureSingleAdmissionConfirmed({ tx, userId: user.id, event, day: '', pricePaid: event.price })
    await ensureSingleAdmissionConfirmed({ tx, userId: user.id, event, day, pricePaid: 0 })
    return
  }

  const pricePaid = day ? (event.dailyPrice ?? 0) : (event.price ?? null)
  await ensureSingleAdmissionConfirmed({ tx, userId: user.id, event, day, pricePaid })
}

async function clearEventAdmissionHoldIfEmpty({ eventId, tx, userId, day = '' }) {
  const now = new Date()

  // Clear this specific day's free ticket once nothing is holding that day.
  if (day) {
    const [dayHoldReservations, dayHoldMainEventReservations] = await Promise.all([
      tx.reservation.count({
        where: {
          userId,
          status: EVENT_CART_HOLD_STATUS,
          holdExpiresAt: { gt: now },
          slot: { day, oneshot: { eventLinks: { some: { eventId } } } },
        },
      }),
      tx.mainEventReservation.count({
        where: {
          userId,
          status: EVENT_CART_HOLD_STATUS,
          holdExpiresAt: { gt: now },
          day,
          ...getMainEventScopeWhere(eventId),
        },
      }),
    ])

    if (dayHoldReservations === 0 && dayHoldMainEventReservations === 0) {
      await tx.eventAdmission.deleteMany({
        where: { userId, eventId, day, status: EVENT_CART_HOLD_STATUS },
      })
    }
  }

  // Clear the event-wide pass hold (and any other lingering day-ticket
  // holds) once nothing at all remains held for this event.
  const [totalHoldReservations, totalHoldMainEventReservations] = await Promise.all([
    tx.reservation.count({
      where: {
        userId,
        status: EVENT_CART_HOLD_STATUS,
        holdExpiresAt: { gt: now },
        slot: { oneshot: { eventLinks: { some: { eventId } } } },
      },
    }),
    tx.mainEventReservation.count({
      where: {
        userId,
        status: EVENT_CART_HOLD_STATUS,
        holdExpiresAt: { gt: now },
        ...getMainEventScopeWhere(eventId),
      },
    }),
  ])

  if (totalHoldReservations === 0 && totalHoldMainEventReservations === 0) {
    await tx.eventAdmission.deleteMany({
      where: { userId, eventId, status: EVENT_CART_HOLD_STATUS },
    })
  }
}

export async function handleGetEventCart(eventId) {
  const { user, error, status } = await requireAuthenticatedApi()
  if (error) return NextResponse.json({ error }, { status })

  const [cartState, waitlistDays] = await Promise.all([
    getUserEventCartState({ eventId, userId: user.id }),
    getUserWaitlistDays({ eventId, userId: user.id }),
  ])
  return NextResponse.json({ ...cartState, waitlistDays })
}

export async function handleGetEventBookingStatus(eventId) {
  const { user, error, status } = await requireAuthenticatedApi()
  if (error) return NextResponse.json({ error }, { status })

  const bookingStatus = await getUserEventBookingStatus({ eventId, userId: user.id })
  return NextResponse.json(bookingStatus)
}

export async function handleAddEventCartSlot(request, { eventId, displayName }) {
  const unavailableCartHoldResponse = await getUnavailableCartHoldResponse()
  if (unavailableCartHoldResponse) return unavailableCartHoldResponse

  const { user, error, status } = await requireAuthenticatedApi()
  if (error) return NextResponse.json({ error }, { status })

  const body = await request.json().catch(() => null)
  const slotId = typeof body?.slotId === 'string' ? body.slotId.trim() : ''

  if (!slotId) {
    return NextResponse.json({ error: 'Slot non valido.' }, { status: 400 })
  }

  try {
    await releaseExpiredHolds({ eventId, userId: user.id })

    // Pre-load event metadata (read-only, doesn't need to be in tx)
    const event = await prisma.event.findUnique({
      where: { id: eventId },
      select: { id: true, price: true, dailyPrice: true },
    })

    if (!event) {
      return NextResponse.json({ error: getEventNotFoundMessage(displayName) }, { status: 404 })
    }

    await prisma.$transaction(async (tx) => {
      const selectedSlot = await tx.eventSlot.findFirst({
        where: {
          id: slotId,
          oneshot: {
            eventLinks: {
              some: { eventId: event.id },
            },
          },
        },
        select: {
          id: true,
          day: true,
          slot: true,
          table: true,
          maxPlayers: true,
          oneshot: {
            select: {
              title: true,
            },
          },
        },
      })

      if (!selectedSlot) {
        throw new Error('La sessione selezionata non è disponibile per questo evento.')
      }

      const existingReservation = await tx.reservation.findUnique({
        where: { userId_slotId: { userId: user.id, slotId } },
        select: {
          id: true,
          status: true,
          holdExpiresAt: true,
        },
      })

      // Fast path: hold still valid, just refresh the timer
      if (existingReservation?.status === EVENT_CART_HOLD_STATUS && existingReservation.holdExpiresAt && existingReservation.holdExpiresAt > new Date()) {
        const holdExpiresAt = getNextHoldExpiration()
        await refreshAllEventCartHolds({ eventId, tx, userId: user.id, holdExpiresAt })
        return
      }

      if (existingReservation && isConfirmedReservationStatus(existingReservation.status)) {
        throw new Error(`Hai già prenotato la sessione ${selectedSlot.oneshot.title}.`)
      }

      const selectedSlotKey = getSlotKey(selectedSlot)
      const [userActiveReservations, userActiveMainEventReservations, currentReservations] = await Promise.all([
        tx.reservation.findMany({
          where: {
            userId: user.id,
            ...getActiveReservationFilter(),
            slot: {
              oneshot: {
                eventLinks: {
                  some: { eventId: event.id },
                },
              },
            },
          },
          select: {
            slotId: true,
            slot: { select: { day: true, slot: true } },
          },
        }),
        tx.mainEventReservation.findMany({
          where: {
            userId: user.id,
            ...getActiveMainEventReservationFilter(),
            ...getMainEventScopeWhere(event.id),
          },
          select: {
            day: true,
            slot: true,
          },
        }),
        tx.reservation.count({
          where: {
            slotId: selectedSlot.id,
            ...getActiveReservationFilter(),
          },
        }),
      ])

      const conflictingReservation = userActiveReservations.find((reservation) => reservation.slotId !== selectedSlot.id && getSlotKey(reservation.slot) === selectedSlotKey)
      const conflictingMainEventReservation = userActiveMainEventReservations.find((reservation) => getSlotKey(reservation) === selectedSlotKey)

      if (conflictingReservation || conflictingMainEventReservation) {
        throw new Error(`Hai già una sessione nello stesso giorno e fascia oraria: ${selectedSlot.day} ${selectedSlot.slot}.`)
      }

      if (currentReservations >= selectedSlot.maxPlayers) {
        throw new Error(`La sessione ${selectedSlot.oneshot.title} è al completo.`)
      }

      const holdExpiresAt = getNextHoldExpiration()

      if (existingReservation) {
        await tx.reservation.update({
          where: { id: existingReservation.id },
          data: {
            status: EVENT_CART_HOLD_STATUS,
            holdExpiresAt,
            playerName: user.name || user.email || null,
            playerEmail: user.email || null,
            consentGiven: true,
            consentDate: new Date(),
          },
        })
      } else {
        await tx.reservation.create({
          data: {
            userId: user.id,
            slotId: selectedSlot.id,
            status: EVENT_CART_HOLD_STATUS,
            holdExpiresAt,
            playerName: user.name || user.email || null,
            playerEmail: user.email || null,
            consentGiven: true,
            consentDate: new Date(),
          },
        })
      }

      await ensureEventAdmissionHold({ event, tx, user, holdExpiresAt, day: selectedSlot.day })
      await refreshAllEventCartHolds({ eventId, tx, userId: user.id, holdExpiresAt })
    }, CART_TX_OPTIONS)

    const cartState = await getUserEventCartState({ eventId, userId: user.id })
    return NextResponse.json(cartState)
  } catch (cartError) {
    return NextResponse.json({ error: cartError.message || 'Impossibile aggiornare le prenotazioni.' }, { status: 400 })
  }
}

export async function handleRemoveEventCartSlot({ eventId, slotId }) {
  const unavailableCartHoldResponse = await getUnavailableCartHoldResponse()
  if (unavailableCartHoldResponse) return unavailableCartHoldResponse

  const { user, error, status } = await requireAuthenticatedApi()
  if (error) return NextResponse.json({ error }, { status })

  if (!slotId) {
    return NextResponse.json({ error: 'Slot non valido.' }, { status: 400 })
  }

  try {
    await releaseExpiredHolds({ eventId, userId: user.id })

    await prisma.$transaction(async (tx) => {
      const reservation = await tx.reservation.findFirst({
        where: {
          userId: user.id,
          slotId,
          status: EVENT_CART_HOLD_STATUS,
          holdExpiresAt: { gt: new Date() },
          slot: {
            oneshot: {
              eventLinks: {
                some: { eventId },
              },
            },
          },
        },
        select: { id: true, slot: { select: { day: true } } },
      })

      if (!reservation) {
        throw new Error('La prenotazione non è presente nel ordine.')
      }

      await tx.reservation.delete({ where: { id: reservation.id } })
      await clearEventAdmissionHoldIfEmpty({ eventId, tx, userId: user.id, day: reservation.slot.day })
    }, CART_TX_OPTIONS)

    const cartState = await getUserEventCartState({ eventId, userId: user.id })
    return NextResponse.json(cartState)
  } catch (cartError) {
    return NextResponse.json({ error: cartError.message || 'Impossibile rimuovere la prenotazione .' }, { status: 400 })
  }
}

export async function handleAddEventCartMainEventSlot(request, { eventId, displayName }) {
  const unavailableCartHoldResponse = await getUnavailableCartHoldResponse()
  if (unavailableCartHoldResponse) return unavailableCartHoldResponse

  const { user, error, status } = await requireAuthenticatedApi()
  if (error) return NextResponse.json({ error }, { status })

  const body = await request.json().catch(() => null)
  const mainEventId = typeof body?.mainEventId === 'string' ? body.mainEventId.trim() : ''
  const day = typeof body?.day === 'string' ? body.day.trim() : ''
  const slot = typeof body?.slot === 'string' ? body.slot.trim() : ''

  if (!mainEventId || !day || !slot) {
    return NextResponse.json({ error: 'Sessione main event non valida.' }, { status: 400 })
  }

  try {
    await releaseExpiredHolds({ eventId, userId: user.id })

    const event = await prisma.event.findUnique({
      where: { id: eventId },
      select: { id: true, price: true, dailyPrice: true },
    })

    if (!event) {
      return NextResponse.json({ error: getEventNotFoundMessage(displayName) }, { status: 404 })
    }

    await prisma.$transaction(async (tx) => {
      const mainEvent = await tx.mainEvent.findUnique({ where: { id: mainEventId }, select: { id: true, title: true } })
      if (!mainEvent) {
        throw new Error('Main event non trovato.')
      }

      const sessionSlots = await tx.eventSlot.findMany({
        where: { mainEventId, eventId: event.id, day, slot },
        select: { maxPlayers: true },
      })
      const sessionCapacity = sessionSlots.reduce((sum, s) => sum + s.maxPlayers, 0)

      if (sessionCapacity === 0) {
        throw new Error('La sessione main event selezionata non è disponibile per questo evento.')
      }

      const existingReservation = await tx.mainEventReservation.findUnique({
        where: { userId_mainEventId_eventId_day_slot: { userId: user.id, mainEventId, eventId: event.id, day, slot } },
        select: {
          id: true,
          status: true,
          holdExpiresAt: true,
        },
      })

      if (existingReservation?.status === EVENT_CART_HOLD_STATUS && existingReservation.holdExpiresAt && existingReservation.holdExpiresAt > new Date()) {
        const holdExpiresAt = getNextHoldExpiration()
        await refreshAllEventCartHolds({ eventId, tx, userId: user.id, holdExpiresAt })
        return
      }

      if (existingReservation && isConfirmedReservationStatus(existingReservation.status)) {
        throw new Error(`Hai già prenotato il main event ${mainEvent.title}.`)
      }

      const selectedSlotKey = getSlotKey({ day, slot })
      const [userActiveReservations, userActiveMainEventReservations, currentReservations] = await Promise.all([
        tx.reservation.findMany({
          where: {
            userId: user.id,
            ...getActiveReservationFilter(),
            slot: {
              oneshot: {
                eventLinks: {
                  some: { eventId: event.id },
                },
              },
            },
          },
          select: {
            slotId: true,
            slot: { select: { day: true, slot: true } },
          },
        }),
        tx.mainEventReservation.findMany({
          where: {
            userId: user.id,
            ...getActiveMainEventReservationFilter(),
            ...getMainEventScopeWhere(event.id),
          },
          select: {
            mainEventId: true,
            day: true,
            slot: true,
          },
        }),
        tx.mainEventReservation.count({
          where: {
            mainEventId,
            eventId: event.id,
            day,
            slot,
            ...getActiveMainEventReservationFilter(),
          },
        }),
      ])

      const conflictingReservation = userActiveReservations.find((reservation) => getSlotKey(reservation.slot) === selectedSlotKey)
      const conflictingMainEventReservation = userActiveMainEventReservations.find((reservation) => reservation.mainEventId !== mainEventId && getSlotKey(reservation) === selectedSlotKey)

      if (conflictingReservation || conflictingMainEventReservation) {
        throw new Error(`Hai già una sessione nello stesso giorno e fascia oraria: ${day} ${slot}.`)
      }

      if (currentReservations >= sessionCapacity) {
        throw new Error(`Il main event ${mainEvent.title} è al completo.`)
      }

      const holdExpiresAt = getNextHoldExpiration()

      if (existingReservation) {
        await tx.mainEventReservation.update({
          where: { id: existingReservation.id },
          data: {
            status: EVENT_CART_HOLD_STATUS,
            holdExpiresAt,
            playerName: user.name || user.email || null,
            playerEmail: user.email || null,
            consentGiven: true,
            consentDate: new Date(),
          },
        })
      } else {
        await tx.mainEventReservation.create({
          data: {
            userId: user.id,
            mainEventId,
            eventId: event.id,
            day,
            slot,
            status: EVENT_CART_HOLD_STATUS,
            holdExpiresAt,
            playerName: user.name || user.email || null,
            playerEmail: user.email || null,
            consentGiven: true,
            consentDate: new Date(),
          },
        })
      }

      await ensureEventAdmissionHold({ event, tx, user, holdExpiresAt, day })
      await refreshAllEventCartHolds({ eventId, tx, userId: user.id, holdExpiresAt })
    }, CART_TX_OPTIONS)

    const cartState = await getUserEventCartState({ eventId, userId: user.id })
    return NextResponse.json(cartState)
  } catch (cartError) {
    return NextResponse.json({ error: cartError.message || 'Impossibile aggiornare le prenotazioni.' }, { status: 400 })
  }
}

export async function handleRemoveEventCartMainEventSlot({ eventId, mainEventId, day, slot }) {
  const unavailableCartHoldResponse = await getUnavailableCartHoldResponse()
  if (unavailableCartHoldResponse) return unavailableCartHoldResponse

  const { user, error, status } = await requireAuthenticatedApi()
  if (error) return NextResponse.json({ error }, { status })

  if (!mainEventId || !day || !slot) {
    return NextResponse.json({ error: 'Sessione main event non valida.' }, { status: 400 })
  }

  try {
    await releaseExpiredHolds({ eventId, userId: user.id })

    await prisma.$transaction(async (tx) => {
      const reservation = await tx.mainEventReservation.findFirst({
        where: {
          userId: user.id,
          mainEventId,
          day,
          slot,
          status: EVENT_CART_HOLD_STATUS,
          holdExpiresAt: { gt: new Date() },
          ...getMainEventScopeWhere(eventId),
        },
        select: { id: true, day: true },
      })

      if (!reservation) {
        throw new Error('La prenotazione non è presente nel ordine.')
      }

      await tx.mainEventReservation.delete({ where: { id: reservation.id } })
      await clearEventAdmissionHoldIfEmpty({ eventId, tx, userId: user.id, day: reservation.day })
    }, CART_TX_OPTIONS)

    const cartState = await getUserEventCartState({ eventId, userId: user.id })
    return NextResponse.json(cartState)
  } catch (cartError) {
    return NextResponse.json({ error: cartError.message || 'Impossibile rimuovere il tavolo.' }, { status: 400 })
  }
}

export async function handleClearEventCart(eventId) {
  const unavailableCartHoldResponse = await getUnavailableCartHoldResponse()
  if (unavailableCartHoldResponse) return unavailableCartHoldResponse

  const { user, error, status } = await requireAuthenticatedApi()
  if (error) return NextResponse.json({ error }, { status })

  try {
    await releaseExpiredHolds({ eventId, userId: user.id })

    await prisma.$transaction(async (tx) => {
      await Promise.all([
        tx.reservation.deleteMany({
          where: {
            userId: user.id,
            status: EVENT_CART_HOLD_STATUS,
            slot: {
              oneshot: {
                eventLinks: {
                  some: { eventId },
                },
              },
            },
          },
        }),
        tx.mainEventReservation.deleteMany({
          where: {
            userId: user.id,
            status: EVENT_CART_HOLD_STATUS,
            ...getMainEventScopeWhere(eventId),
          },
        }),
        tx.eventAdmission.deleteMany({
          where: {
            userId: user.id,
            eventId,
            status: EVENT_CART_HOLD_STATUS,
          },
        }),
      ])
    }, CART_TX_OPTIONS)

    const cartState = await getUserEventCartState({ eventId, userId: user.id })
    return NextResponse.json(cartState)
  } catch (cartError) {
    return NextResponse.json({ error: cartError.message || 'Impossibile svuotare le Prenotazioni.' }, { status: 400 })
  }
}

export async function handleCreateEventAdmission(request, eventId, { displayName } = {}) {
  const unavailableCartHoldResponse = await getUnavailableCartHoldResponse()
  if (unavailableCartHoldResponse) return unavailableCartHoldResponse

  const { user, error, status } = await requireAuthenticatedApi()
  if (error) return NextResponse.json({ error }, { status })

  const body = await request.json().catch(() => null)
  const day = typeof body?.day === 'string' ? body.day.trim() : ''

  try {
    await releaseExpiredHolds({ eventId, userId: user.id })

    const event = await prisma.event.findUnique({
      where: { id: eventId },
      select: { id: true, price: true, dailyPrice: true },
    })

    if (!event) {
      return NextResponse.json({ error: getEventNotFoundMessage(displayName) }, { status: 404 })
    }

    await prisma.$transaction(async (tx) => {
      await ensureEventAdmissionConfirmed({ event, tx, user, day })
    }, CART_TX_OPTIONS)

    const [cartState, bookingSummary] = await Promise.all([
      getUserEventCartState({ eventId, userId: user.id }),
      getConfirmedEventBookingSummary({ eventId, userId: user.id, includeAdmission: true }),
    ])

    try {
      await sendEventBookingConfirmationEmails({ summary: bookingSummary, user })
    } catch (notificationError) {
      console.error('Failed to send admission confirmation email:', notificationError)
    }

    return NextResponse.json(cartState)
  } catch (admissionError) {
    return NextResponse.json({ error: admissionError.message || 'Impossibile confermare la tua presenza.' }, { status: 400 })
  }
}

export async function handleDeleteEventAdmission(request, eventId) {
  const { user, error, status } = await requireAuthenticatedApi()
  if (error) return NextResponse.json({ error }, { status })

  const body = await request.json().catch(() => null)
  const day = typeof body?.day === 'string' ? body.day.trim() : ''

  try {
    await releaseExpiredHolds({ eventId, userId: user.id })

    await prisma.$transaction(async (tx) => {
      const [activeReservations, activeMainEventReservations] = await Promise.all([
        tx.reservation.count({
          where: {
            userId: user.id,
            ...getActiveReservationFilter(),
            slot: {
              ...(day ? { day } : {}),
              oneshot: {
                eventLinks: {
                  some: { eventId },
                },
              },
            },
          },
        }),
        tx.mainEventReservation.count({
          where: {
            userId: user.id,
            ...getActiveMainEventReservationFilter(),
            ...(day ? { day } : {}),
            ...getMainEventScopeWhere(eventId),
          },
        }),
      ])

      if (activeReservations > 0 || activeMainEventReservations > 0) {
        throw new Error(day
          ? 'Hai sessioni prenotate per questo giorno. Cancellale prima di annullare la presenza.'
          : 'Hai sessioni prenotate per questo evento. Cancellale prima di annullare la presenza.')
      }

      // The pass ("") is what actually carries the price — it can't be
      // cancelled while other day-tickets for this event still exist,
      // otherwise those tickets would be left referencing a pass that's gone.
      if (!day) {
        const otherDayAdmissions = await tx.eventAdmission.count({
          where: { userId: user.id, eventId, day: { not: '' } },
        })

        if (otherDayAdmissions > 0) {
          throw new Error('Hai altri giorni prenotati per questo evento. Cancellali prima di annullare il pass.')
        }
      }

      await tx.eventAdmission.deleteMany({
        where: {
          userId: user.id,
          eventId,
          day,
        },
      })
    }, CART_TX_OPTIONS)

    const cartState = await getUserEventCartState({ eventId, userId: user.id })
    return NextResponse.json(cartState)
  } catch (admissionError) {
    return NextResponse.json({ error: admissionError.message || 'Impossibile annullare la presenza.' }, { status: 400 })
  }
}

export async function handleConfirmEventCart(eventId) {
  const unavailableCartHoldResponse = await getUnavailableCartHoldResponse()
  if (unavailableCartHoldResponse) return unavailableCartHoldResponse

  const { user, error, status } = await requireAuthenticatedApi()
  if (error) return NextResponse.json({ error }, { status })

  try {
    await releaseExpiredHolds({ eventId, userId: user.id })

    const confirmation = await prisma.$transaction(async (tx) => {
      const [admissions, holdReservations, holdMainEventReservations] = await Promise.all([
        tx.eventAdmission.findMany({
          where: { userId: user.id, eventId },
          select: { id: true, status: true, holdExpiresAt: true },
        }),
        tx.reservation.findMany({
          where: {
            userId: user.id,
            status: EVENT_CART_HOLD_STATUS,
            holdExpiresAt: { gt: new Date() },
            slot: {
              oneshot: {
                eventLinks: {
                  some: { eventId },
                },
              },
            },
          },
          select: { id: true },
        }),
        tx.mainEventReservation.findMany({
          where: {
            userId: user.id,
            status: EVENT_CART_HOLD_STATUS,
            holdExpiresAt: { gt: new Date() },
            ...getMainEventScopeWhere(eventId),
          },
          select: { id: true },
        }),
      ])

      const holdAdmissions = admissions.filter((admission) => (
        admission.status === EVENT_CART_HOLD_STATUS
        && admission.holdExpiresAt
        && admission.holdExpiresAt > new Date()
      ))
      const hasAdmissionHold = holdAdmissions.length > 0

      if (holdReservations.length === 0 && holdMainEventReservations.length === 0 && !hasAdmissionHold) {
        throw new Error('Le prenotazioni sono vuote o il tempo di 10 minuti è scaduto.')
      }

      const hasUsableAdmission = admissions.some((admission) => isConfirmedReservationStatus(admission.status) || admission.status === EVENT_CART_HOLD_STATUS)
      if (!hasUsableAdmission) {
        throw new Error('Il pass evento non è presente nelle Prenotazioni.')
      }

      if (holdAdmissions.length > 0) {
        await tx.eventAdmission.updateMany({
          where: { id: { in: holdAdmissions.map((admission) => admission.id) } },
          data: { status: 'CONFIRMED', holdExpiresAt: null },
        })
      }

      const confirmedReservationIds = holdReservations.map((reservation) => reservation.id)
      const confirmedMainEventReservationIds = holdMainEventReservations.map((reservation) => reservation.id)

      if (confirmedReservationIds.length > 0) {
        await tx.reservation.updateMany({
          where: { id: { in: confirmedReservationIds } },
          data: { status: 'CONFIRMED', holdExpiresAt: null },
        })
      }

      if (confirmedMainEventReservationIds.length > 0) {
        await tx.mainEventReservation.updateMany({
          where: { id: { in: confirmedMainEventReservationIds } },
          data: { status: 'PENDING', holdExpiresAt: null },
        })
      }

      return {
        confirmedReservationIds,
        confirmedMainEventReservationIds,
        shouldIncludeAdmissionInSummary: hasAdmissionHold,
      }
    }, CART_TX_OPTIONS)

    // Read final state + booking summary outside the transaction
    const [cartState, bookingSummary] = await Promise.all([
      getUserEventCartState({ eventId, userId: user.id }),
      getConfirmedEventBookingSummary({
        eventId,
        userId: user.id,
        includeAdmission: confirmation.shouldIncludeAdmissionInSummary,
        reservationIds: confirmation.confirmedReservationIds,
        mainEventReservationIds: confirmation.confirmedMainEventReservationIds,
      }),
    ])

    try {
      await sendEventBookingConfirmationEmails({
        summary: bookingSummary,
        user,
      })
    } catch (notificationError) {
      console.error('Failed to send booking confirmation emails:', notificationError)
    }

    return NextResponse.json({ ok: true, ...cartState })
  } catch (cartError) {
    return NextResponse.json({ error: cartError.message || 'Impossibile confermare le tue Prenotazioni.' }, { status: 400 })
  }
}
