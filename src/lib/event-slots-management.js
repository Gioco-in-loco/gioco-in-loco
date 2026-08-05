import { prisma } from './prisma'
import { createSupabaseServiceClient, isServiceRoleConfigured } from './supabase/service'

const WEEK_DAY_ORDER = ['Lunedi', 'Martedi', 'Mercoledi', 'Giovedi', 'Venerdi', 'Sabato', 'Domenica']
export const WEEK_DAYS = new Set(WEEK_DAY_ORDER)
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
      isVisible: true,
      bookingEnabled: true,
      oneshotId: true,
      oneshot: { select: { title: true, master: true, game: true, association: { select: { id: true, name: true } } } },
      mainEventId: true,
      mainEvent: { select: { title: true, game: true } },
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
      isVisible: slot.isVisible,
      bookingEnabled: slot.bookingEnabled,
      oneshotId: slot.oneshotId,
      oneshotTitle: slot.oneshot?.title || null,
      oneshotMaster: slot.oneshot?.master || null,
      oneshotGame: slot.oneshot?.game || null,
      associationId: slot.oneshot?.association?.id || null,
      associationName: slot.oneshot?.association?.name || null,
      mainEventId: slot.mainEventId,
      mainEventTitle: slot.mainEvent?.title || null,
      mainEventGame: slot.mainEvent?.game || null,
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
  const isVisible = body?.isVisible === undefined ? true : Boolean(body.isVisible)
  const bookingEnabled = body?.bookingEnabled === undefined ? true : Boolean(body.bookingEnabled)

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
      data: tables.map((generatedTable) => ({ eventId, day, slot: slotTime, table: generatedTable, maxPlayers, adminOnly, isVisible, bookingEnabled, oneshotId: null, mainEventId: null })),
    })

    return { count: created.count }
  }

  validateSlotFormat({ day, slot: slotTime, table, maxPlayers })

  const slot = await prisma.eventSlot.create({
    data: { eventId, day, slot: slotTime, table, maxPlayers, adminOnly, isVisible, bookingEnabled, oneshotId: null, mainEventId: null },
  })

  return {
    id: slot.id,
    day: slot.day,
    slot: slot.slot,
    table: slot.table,
    maxPlayers: slot.maxPlayers,
    adminOnly: slot.adminOnly,
    isVisible: slot.isVisible,
    bookingEnabled: slot.bookingEnabled,
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
  const isVisible = body?.isVisible === undefined ? true : Boolean(body.isVisible)
  const bookingEnabled = body?.bookingEnabled === undefined ? true : Boolean(body.bookingEnabled)

  validateSlotFormat({ day, slot: slotTime, table, maxPlayers })
  await assertDayAndSlotAllowed(eventId, day, slotTime)

  const updated = await prisma.eventSlot.update({
    where: { id: slotId },
    data: { day, slot: slotTime, table, maxPlayers, adminOnly, isVisible, bookingEnabled },
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
    isVisible: updated.isVisible,
    bookingEnabled: updated.bookingEnabled,
    oneshotId: updated.oneshotId,
    oneshotTitle: updated.oneshot?.title || null,
    associationName: updated.oneshot?.association?.name || null,
    mainEventId: updated.mainEventId,
    mainEventTitle: updated.mainEvent?.title || null,
    reservationsCount: updated.reservations.length,
  }
}

// Bulk override: riattiva "attiva prenotazione" su tutti gli slot dell'evento
// in un colpo solo, invece di doverlo fare tavolo per tavolo. Non tocca
// isVisible/adminOnly, solo il flag di prenotabilità.
export async function enableBookingForAllSlots({ eventId }) {
  if (!eventId) throw createHttpError(400, 'Evento non valido')

  const result = await prisma.eventSlot.updateMany({
    where: { eventId, bookingEnabled: false },
    data: { bookingEnabled: true },
  })

  return { count: result.count }
}

// Modifica granulare di visibilità e/o prenotabilità: un giorno intero
// (slot = null) oppure un singolo giorno+fascia. Usato dalla dialog "Blocca /
// sblocca prenotazioni" per non dover passare tavolo per tavolo quando serve
// chiudere/nascondere solo una fascia o un'intera giornata. isVisible e
// bookingEnabled sono entrambi opzionali: solo i campi passati vengono
// aggiornati, cosi si puo cambiare l'uno, l'altro, o entrambi insieme.
export async function updateSlotsScope({ eventId, day, slot, isVisible, bookingEnabled }) {
  if (!eventId) throw createHttpError(400, 'Evento non valido')
  if (!WEEK_DAYS.has(day)) throw createHttpError(400, 'Giorno non valido')
  if (slot && !TIME_SLOT_REGEX.test(slot)) throw createHttpError(400, 'Fascia oraria non valida')
  if (isVisible === undefined && bookingEnabled === undefined) {
    throw createHttpError(400, 'Seleziona almeno una modifica da applicare (prenotazione o visibilità).')
  }

  const scope = slot ? { eventId, day, slot } : { eventId, day }
  const data = {}
  if (isVisible !== undefined) data.isVisible = Boolean(isVisible)
  if (bookingEnabled !== undefined) data.bookingEnabled = Boolean(bookingEnabled)

  const result = await prisma.eventSlot.updateMany({ where: scope, data })

  return { count: result.count }
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

// Un main event mette in comune più tavoli nella stessa fascia (la capienza è
// la somma dei posti dei tavoli assegnati): spostare un tavolo fuori dal
// gruppo riduce quella somma, quindi va bloccato se scenderebbe sotto le
// prenotazioni già confermate sul gruppo (le prenotazioni main event non sono
// legate a un tavolo preciso, ma al gruppo mainEvent+giorno+fascia).
async function assertMainEventCapacityAfterRemoval(tx, { mainEventId, eventId, day, slotTime, removedSlotId }) {
  const [groupSlots, reservationCount] = await Promise.all([
    tx.eventSlot.findMany({
      where: { mainEventId, eventId, day, slot: slotTime },
      select: { id: true, maxPlayers: true },
    }),
    tx.mainEventReservation.count({
      where: { mainEventId, eventId, day, slot: slotTime, status: { in: ACTIVE_MAIN_EVENT_RESERVATION_STATUSES } },
    }),
  ])

  const remainingCapacity = groupSlots
    .filter((groupSlot) => groupSlot.id !== removedSlotId)
    .reduce((sum, groupSlot) => sum + groupSlot.maxPlayers, 0)

  if (remainingCapacity < reservationCount) {
    throw createHttpError(409, 'Non puoi spostare questo tavolo: la capienza rimanente del main event scenderebbe sotto le prenotazioni già confermate.')
  }
}

// Una one-shot non può avere due tavoli nello stesso giorno+fascia (stessa
// regola applicata in oneshots-management.js quando si assegnano gli slot a
// mano): spostare un tavolo su un giorno/fascia dove quella one-shot è già
// presente altrove va bloccato.
async function assertNoOneshotDayTimeConflict(tx, { oneshotId, day, slotTime, excludeSlotId }) {
  const conflict = await tx.eventSlot.findFirst({
    where: { oneshotId, day, slot: slotTime, id: { not: excludeSlotId } },
    select: { id: true },
  })
  if (conflict) {
    throw createHttpError(409, 'Questa one-shot ha già un tavolo nello stesso giorno e fascia oraria.')
  }
}

// Drag & drop nella mappa tavoli: sposta l'assegnazione (one-shot o main
// event) da un tavolo a un altro dello STESSO giorno (la griglia mostra un
// giorno alla volta) — anche tra fasce orarie diverse. Se il tavolo di
// destinazione è libero la sessione si sposta; se è occupato le due sessioni
// si scambiano di tavolo.
export async function moveEventSlotAssignment({ eventId, sourceSlotId, targetSlotId }) {
  if (!eventId || !sourceSlotId || !targetSlotId) {
    throw createHttpError(400, 'Richiesta non valida.')
  }
  if (sourceSlotId === targetSlotId) {
    throw createHttpError(400, 'Seleziona due tavoli diversi.')
  }

  const selectSlot = {
    id: true,
    day: true,
    slot: true,
    maxPlayers: true,
    oneshotId: true,
    mainEventId: true,
    reservations: { where: { status: { in: ACTIVE_RESERVATION_STATUSES } }, select: { id: true } },
  }

  return prisma.$transaction(async (tx) => {
    const [source, target] = await Promise.all([
      tx.eventSlot.findFirst({ where: { id: sourceSlotId, eventId }, select: selectSlot }),
      tx.eventSlot.findFirst({ where: { id: targetSlotId, eventId }, select: selectSlot }),
    ])

    if (!source || !target) {
      throw createHttpError(404, 'Tavolo non trovato.')
    }

    if (!source.oneshotId && !source.mainEventId) {
      throw createHttpError(400, 'Questo tavolo non ha una sessione da spostare.')
    }

    if (source.day !== target.day) {
      throw createHttpError(400, 'Puoi spostare una sessione solo tra tavoli dello stesso giorno.')
    }

    if (source.reservations.length > 0 || target.reservations.length > 0) {
      throw createHttpError(409, 'Non puoi spostare una sessione: uno dei due tavoli ha prenotazioni attive.')
    }

    const isSwap = Boolean(target.oneshotId || target.mainEventId)

    if (source.oneshotId) {
      await assertNoOneshotDayTimeConflict(tx, {
        oneshotId: source.oneshotId, day: target.day, slotTime: target.slot, excludeSlotId: source.id,
      })
    }
    if (isSwap && target.oneshotId) {
      await assertNoOneshotDayTimeConflict(tx, {
        oneshotId: target.oneshotId, day: source.day, slotTime: source.slot, excludeSlotId: target.id,
      })
    }

    if (source.mainEventId && source.mainEventId !== target.mainEventId) {
      await assertMainEventCapacityAfterRemoval(tx, {
        mainEventId: source.mainEventId, eventId, day: source.day, slotTime: source.slot, removedSlotId: source.id,
      })
    }
    if (isSwap && target.mainEventId && target.mainEventId !== source.mainEventId) {
      await assertMainEventCapacityAfterRemoval(tx, {
        mainEventId: target.mainEventId, eventId, day: target.day, slotTime: target.slot, removedSlotId: target.id,
      })
    }

    await tx.eventSlot.update({
      where: { id: targetSlotId },
      data: { oneshotId: source.oneshotId, mainEventId: source.mainEventId },
    })
    await tx.eventSlot.update({
      where: { id: sourceSlotId },
      data: { oneshotId: isSwap ? target.oneshotId : null, mainEventId: isSwap ? target.mainEventId : null },
    })

    return { swapped: isSwap }
  })
}

function weekDayIndex(day) {
  const idx = WEEK_DAY_ORDER.indexOf(day)
  return idx === -1 ? 999 : idx
}

// Righe per l'export Excel delle sessioni GDR (one-shot) di un evento: una
// riga per tavolo/fascia assegnati, con i giocatori attivi in ordine di
// prenotazione. I main event non hanno un master/giocatori per tavolo (la
// capienza è aggregata sul gruppo, non sul singolo posto), quindi restano
// fuori da questo export.
export async function listSessionsForExport({ eventId }) {
  if (!eventId) return []

  const slots = await prisma.eventSlot.findMany({
    where: { eventId, oneshotId: { not: null } },
    select: {
      day: true,
      slot: true,
      table: true,
      oneshot: { select: { title: true, master: true } },
      reservations: {
        where: { status: { in: ACTIVE_RESERVATION_STATUSES } },
        orderBy: { createdAt: 'asc' },
        select: { playerName: true, playerEmail: true },
      },
    },
  })

  return slots
    .map((slot) => ({
      day: slot.day,
      slot: slot.slot,
      table: slot.table,
      title: slot.oneshot?.title || '',
      master: slot.oneshot?.master || '',
      players: slot.reservations.map((reservation) => reservation.playerName || reservation.playerEmail || ''),
    }))
    .sort((left, right) => {
      const dayDiff = weekDayIndex(left.day) - weekDayIndex(right.day)
      if (dayDiff !== 0) return dayDiff
      const slotDiff = left.slot.localeCompare(right.slot, undefined, { numeric: true })
      if (slotDiff !== 0) return slotDiff
      return left.table.localeCompare(right.table, undefined, { numeric: true })
    })
}
