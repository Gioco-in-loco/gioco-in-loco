import { prisma } from './prisma'
import { createSupabaseServiceClient, isServiceRoleConfigured } from './supabase/service'

export const WEEK_DAYS = new Set(['Lunedi', 'Martedi', 'Mercoledi', 'Giovedi', 'Venerdi', 'Sabato', 'Domenica'])
export const TIME_SLOT_REGEX = /^([01]\d|2[0-3]):[0-5]\d-([01]\d|2[0-3]):[0-5]\d$/
const ACTIVE_RESERVATION_STATUSES = ['PENDING', 'CONFIRMED', 'ATTENDED']
const ACTIVE_MAIN_EVENT_RESERVATION_STATUSES = ['PENDING', 'CONFIRMED', 'ATTENDED']

function createHttpError(status, message) {
  const error = new Error(message)
  error.status = status
  return error
}

async function buildReservationPhoneMap(slots) {
  const phoneByUserId = new Map()
  if (!isServiceRoleConfigured()) return phoneByUserId

  const supabaseUserIds = new Set()
  for (const slot of slots) {
    for (const reservation of slot.reservations || []) {
      if (reservation.user?.supabaseUserId) {
        supabaseUserIds.add(reservation.user.supabaseUserId)
      }
    }
  }
  if (supabaseUserIds.size === 0) return phoneByUserId

  const admin = createSupabaseServiceClient()
  const { data } = await admin.auth.admin.listUsers({ perPage: 1000 })
  const phoneBySupabaseId = new Map((data?.users || []).map((u) => [u.id, u.user_metadata?.phone || null]))

  for (const slot of slots) {
    for (const reservation of slot.reservations || []) {
      const supabaseUserId = reservation.user?.supabaseUserId
      if (supabaseUserId && phoneBySupabaseId.has(supabaseUserId)) {
        phoneByUserId.set(reservation.userId, phoneBySupabaseId.get(supabaseUserId))
      }
    }
  }

  return phoneByUserId
}

export function validateSlotFormat({ day, slot, table, maxPlayers }) {
  if (!WEEK_DAYS.has(day) || !TIME_SLOT_REGEX.test(slot) || !table || !Number.isInteger(maxPlayers) || maxPlayers < 1) {
    throw createHttpError(400, 'Lo slot deve avere un giorno valido, una fascia oraria nel formato HH:mm-HH:mm su 24 ore, un tavolo e almeno 1 posto.')
  }
}

// Giorni e fasce orarie selezionabili per uno slot sono limitati a quelli
// configurati sull'evento (Event.days / Event.timeSlots), non alla lista
// generica dei 7 giorni della settimana — evita che uno slot venga creato per
// un giorno/fascia che l'evento non usa.
export async function assertDayAndSlotAllowed(eventId, day, slotTime) {
  const event = await prisma.event.findUnique({ where: { id: eventId }, select: { days: true, timeSlots: true } })
  if (!event) throw createHttpError(404, 'Evento non trovato')

  if (event.days.length === 0 || event.timeSlots.length === 0) {
    throw createHttpError(400, 'Configura prima i giorni e le fasce orarie dell\'evento (tab Dettaglio evento).')
  }

  if (!event.days.includes(day)) {
    throw createHttpError(400, `Il giorno "${day}" non è tra quelli configurati per l'evento.`)
  }

  if (!event.timeSlots.includes(slotTime)) {
    throw createHttpError(400, `La fascia "${slotTime}" non è tra quelle configurate per l'evento.`)
  }
}

function groupKey(mainEventId, day, slotTime) {
  return `${mainEventId}__${day}__${slotTime}`
}

// ============================================================
// EVENT SLOT POOL — admin crea gli slot grezzi (giorno/fascia/tavolo/posti)
// per un evento; one-shot e main event li "reclamano" (attach) invece di
// avere ciascuno il proprio pool duplicato. Uno slot appartiene a UNA
// one-shot O a UN main event alla volta (mai entrambi), quindi il doppio
// utilizzo di un tavolo è impossibile per costruzione.
// ============================================================

export async function listEventSlots({ eventId }) {
  if (!eventId) return []

  const slots = await prisma.eventSlot.findMany({
    where: { eventId },
    orderBy: [{ day: 'asc' }, { slot: 'asc' }, { table: 'asc' }],
    select: {
      id: true,
      day: true,
      slot: true,
      table: true,
      maxPlayers: true,
      adminOnly: true,
      oneshotId: true,
      oneshot: { select: { title: true, association: { select: { id: true, name: true } } } },
      mainEventId: true,
      mainEvent: { select: { title: true } },
      reservations: { where: { status: { in: ACTIVE_RESERVATION_STATUSES } }, select: { id: true } },
    },
  })

  // I main event possono occupare più tavoli nella stessa fascia: la
  // capienza/prenotazioni si calcolano aggregate sul gruppo (mainEvent, day,
  // slot), non sul singolo tavolo — a differenza delle one-shot che occupano
  // sempre un solo tavolo per fascia.
  const groupCapacity = new Map()
  for (const slot of slots) {
    if (!slot.mainEventId) continue
    const key = groupKey(slot.mainEventId, slot.day, slot.slot)
    groupCapacity.set(key, (groupCapacity.get(key) || 0) + slot.maxPlayers)
  }

  const mainEventIds = Array.from(new Set(slots.filter((slot) => slot.mainEventId).map((slot) => slot.mainEventId)))
  const mainEventReservationCounts = mainEventIds.length > 0
    ? await prisma.mainEventReservation.groupBy({
        by: ['mainEventId', 'day', 'slot'],
        where: { eventId, mainEventId: { in: mainEventIds }, status: { in: ACTIVE_MAIN_EVENT_RESERVATION_STATUSES } },
        _count: { _all: true },
      })
    : []
  const groupReservations = new Map(mainEventReservationCounts.map((entry) => [groupKey(entry.mainEventId, entry.day, entry.slot), entry._count._all]))

  return slots.map((slot) => {
    const mainEventGroupKey = slot.mainEventId ? groupKey(slot.mainEventId, slot.day, slot.slot) : null

    return {
      id: slot.id,
      day: slot.day,
      slot: slot.slot,
      table: slot.table,
      maxPlayers: slot.maxPlayers,
      adminOnly: slot.adminOnly,
      oneshotId: slot.oneshotId,
      oneshotTitle: slot.oneshot?.title || null,
      associationId: slot.oneshot?.association?.id || null,
      associationName: slot.oneshot?.association?.name || null,
      mainEventId: slot.mainEventId,
      mainEventTitle: slot.mainEvent?.title || null,
      groupMaxPlayers: mainEventGroupKey ? groupCapacity.get(mainEventGroupKey) : null,
      reservationsCount: slot.oneshotId
        ? (slot.reservations?.length || 0)
        : (mainEventGroupKey ? (groupReservations.get(mainEventGroupKey) || 0) : 0),
    }
  })
}

// Scoped to a single slot's reservations (not the whole one-shot's) — used by
// the "Prenotati" tab in the table-map slot dialog, which must only ever show
// who booked this specific table/fascia, never bookings for the one-shot's
// other slots. Non si applica agli slot di un main event: le sue prenotazioni
// sono aggregate sul gruppo (mainEvent, day, slot), non su un tavolo preciso.
export async function getSlotReservationsDetail({ eventId, slotId, managedAssociationId = null }) {
  const slot = await prisma.eventSlot.findFirst({
    where: { id: slotId, eventId },
    include: {
      oneshot: { select: { id: true, title: true, associationId: true } },
      reservations: {
        where: { status: { in: ACTIVE_RESERVATION_STATUSES } },
        orderBy: [{ createdAt: 'asc' }],
        select: {
          id: true,
          userId: true,
          status: true,
          playerName: true,
          playerEmail: true,
          notes: true,
          consentGiven: true,
          consentDate: true,
          createdAt: true,
          updatedAt: true,
          user: { select: { supabaseUserId: true } },
        },
      },
    },
  })

  if (!slot) {
    throw createHttpError(404, 'Slot non trovato')
  }

  // Un responsabile vede in griglia anche gli slot di altre associazioni (per
  // pianificare), ma non deve poter leggere nome/email/telefono dei loro
  // prenotati chiamando questo endpoint direttamente con quello slotId.
  if (managedAssociationId && slot.oneshot?.associationId !== managedAssociationId) {
    throw createHttpError(404, 'Slot non trovato')
  }

  const phoneByUserId = await buildReservationPhoneMap([slot])

  return {
    id: slot.id,
    day: slot.day,
    slot: slot.slot,
    table: slot.table,
    maxPlayers: slot.maxPlayers,
    oneshotId: slot.oneshotId,
    oneshotTitle: slot.oneshot?.title || null,
    reservations: slot.reservations.map((reservation) => ({
      id: reservation.id,
      userId: reservation.userId,
      status: reservation.status,
      playerName: reservation.playerName || null,
      playerEmail: reservation.playerEmail || null,
      playerPhone: phoneByUserId.get(reservation.userId) || null,
      notes: reservation.notes || null,
      consentGiven: Boolean(reservation.consentGiven),
      consentDate: reservation.consentDate,
      createdAt: reservation.createdAt,
      updatedAt: reservation.updatedAt,
    })),
  }
}

export async function createEventSlot({ eventId, body }) {
  if (!eventId) throw createHttpError(400, 'Evento non valido')

  const day = typeof body?.day === 'string' ? body.day.trim() : ''
  const slotTime = typeof body?.slot === 'string' ? body.slot.trim() : ''
  const table = typeof body?.table === 'string' ? body.table.trim() : ''
  const maxPlayers = Number(body?.maxPlayers)
  const quantity = Number(body?.quantity) || 1
  const adminOnly = Boolean(body?.adminOnly)

  await assertDayAndSlotAllowed(eventId, day, slotTime)

  // Bulk mode: same day/fascia/posti, N tables auto-numbered from the given
  // name (e.g. "Tavolo" x10 -> "Tavolo 1".."Tavolo 10") — avoids repeating the
  // same form N times when a whole timeslot needs many tables at once.
  if (quantity > 1) {
    if (!Number.isInteger(quantity) || quantity < 2 || quantity > 100) {
      throw createHttpError(400, 'La quantità deve essere un numero intero tra 2 e 100.')
    }

    if (!table) {
      throw createHttpError(400, 'Indica un nome tavolo (verrà numerato automaticamente).')
    }

    const tableStart = Number.isInteger(Number(body?.tableStart)) && Number(body.tableStart) > 0 ? Number(body.tableStart) : 1
    const tables = Array.from({ length: quantity }, (_, i) => `${table} ${tableStart + i}`)

    for (const generatedTable of tables) {
      validateSlotFormat({ day, slot: slotTime, table: generatedTable, maxPlayers })
    }

    const created = await prisma.eventSlot.createMany({
      data: tables.map((generatedTable) => ({ eventId, day, slot: slotTime, table: generatedTable, maxPlayers, adminOnly, oneshotId: null, mainEventId: null })),
    })

    return { count: created.count }
  }

  validateSlotFormat({ day, slot: slotTime, table, maxPlayers })

  const slot = await prisma.eventSlot.create({
    data: { eventId, day, slot: slotTime, table, maxPlayers, adminOnly, oneshotId: null, mainEventId: null },
  })

  return {
    id: slot.id,
    day: slot.day,
    slot: slot.slot,
    table: slot.table,
    maxPlayers: slot.maxPlayers,
    adminOnly: slot.adminOnly,
    oneshotId: null,
    oneshotTitle: null,
    associationName: null,
    mainEventId: null,
    mainEventTitle: null,
    reservationsCount: 0,
  }
}

export async function updateEventSlot({ eventId, slotId, body }) {
  const slot = await prisma.eventSlot.findFirst({
    where: { id: slotId, eventId },
    select: { id: true },
  })

  if (!slot) {
    throw createHttpError(404, 'Slot non trovato')
  }

  const day = typeof body?.day === 'string' ? body.day.trim() : ''
  const slotTime = typeof body?.slot === 'string' ? body.slot.trim() : ''
  const table = typeof body?.table === 'string' ? body.table.trim() : ''
  const maxPlayers = Number(body?.maxPlayers)
  const adminOnly = Boolean(body?.adminOnly)

  validateSlotFormat({ day, slot: slotTime, table, maxPlayers })
  await assertDayAndSlotAllowed(eventId, day, slotTime)

  const updated = await prisma.eventSlot.update({
    where: { id: slotId },
    data: { day, slot: slotTime, table, maxPlayers, adminOnly },
    include: {
      oneshot: { select: { title: true, association: { select: { name: true } } } },
      mainEvent: { select: { title: true } },
      reservations: { where: { status: { in: ACTIVE_RESERVATION_STATUSES } }, select: { id: true } },
    },
  })

  return {
    id: updated.id,
    day: updated.day,
    slot: updated.slot,
    table: updated.table,
    maxPlayers: updated.maxPlayers,
    adminOnly: updated.adminOnly,
    oneshotId: updated.oneshotId,
    oneshotTitle: updated.oneshot?.title || null,
    associationName: updated.oneshot?.association?.name || null,
    mainEventId: updated.mainEventId,
    mainEventTitle: updated.mainEvent?.title || null,
    reservationsCount: updated.reservations.length,
  }
}

export async function deleteEventSlot({ eventId, slotId }) {
  const slot = await prisma.eventSlot.findFirst({
    where: { id: slotId, eventId },
    select: { id: true, oneshotId: true, mainEventId: true, reservations: { select: { id: true } } },
  })

  if (!slot) {
    throw createHttpError(404, 'Slot non trovato')
  }

  if (slot.oneshotId) {
    throw createHttpError(400, 'Rimuovi prima lo slot dalla one-shot a cui è assegnato.')
  }

  if (slot.mainEventId) {
    throw createHttpError(400, 'Rimuovi prima il tavolo dal main event a cui è assegnato.')
  }

  if (slot.reservations.length > 0) {
    throw createHttpError(400, 'Non puoi eliminare uno slot con prenotazioni collegate.')
  }

  await prisma.eventSlot.delete({ where: { id: slotId } })
}
