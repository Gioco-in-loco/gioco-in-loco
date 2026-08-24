import { prisma } from './prisma'
import { normalizeTags } from './oneshots-management'

export const DEFAULT_MAIN_EVENT_PAGE_SIZE = 20
const ACTIVE_RESERVATION_STATUSES = ['PENDING', 'CONFIRMED', 'ATTENDED']

function createHttpError(status, message) {
  const error = new Error(message)
  error.status = status
  return error
}

function normalizeOptionalString(value) {
  if (typeof value !== 'string') return null
  const trimmed = value.trim()
  return trimmed || null
}

function normalizeOptionalNumber(value) {
  if (value === '' || value === null || value === undefined) return null
  const parsed = Number(value)
  if (Number.isNaN(parsed)) return NaN
  return parsed
}

function normalizeSlotIds(slotIds) {
  if (!Array.isArray(slotIds)) return null
  return slotIds.filter((value) => typeof value === 'string' && value.trim())
}

function normalizeMaxPlayers(value) {
  if (value === '' || value === null || value === undefined) return NaN
  const parsed = Number(value)
  if (!Number.isInteger(parsed)) return NaN
  return parsed
}

export function serializeMainEvent(mainEvent) {
  const eventsById = new Map()
  for (const slot of mainEvent.slots || []) {
    if (slot.event && !eventsById.has(slot.event.id)) {
      eventsById.set(slot.event.id, slot.event.name)
    }
  }

  return {
    id: mainEvent.id,
    title: mainEvent.title,
    description: mainEvent.description,
    game: mainEvent.game,
    image: mainEvent.image,
    tags: mainEvent.tags || [],
    price: mainEvent.price,
    maxPlayers: mainEvent.maxPlayers,
    createdAt: mainEvent.createdAt,
    updatedAt: mainEvent.updatedAt,
    events: Array.from(eventsById, ([eventId, eventName]) => ({ eventId, eventName })),
    slots: (mainEvent.slots || []).map((slot) => ({
      id: slot.id,
      day: slot.day,
      slot: slot.slot,
      table: slot.table,
      maxPlayers: slot.maxPlayers,
      eventId: slot.eventId,
      eventName: slot.event?.name || null,
    })),
  }
}

function buildLibraryWhere({ eventId, search }) {
  return {
    ...(eventId ? { slots: { some: { eventId } } } : {}),
    ...(search ? { title: { contains: search, mode: 'insensitive' } } : {}),
  }
}

const SLOT_SELECT = {
  id: true,
  day: true,
  slot: true,
  table: true,
  maxPlayers: true,
  eventId: true,
  event: { select: { id: true, name: true } },
}

// eventId è opzionale: senza, restituisce l'intera libreria main event (i main
// event sono riutilizzabili su più eventi tramite il pool di slot per-evento).
export async function listMainEvents(params) {
  const {
    eventId,
    search,
    page = 1,
    pageSize = DEFAULT_MAIN_EVENT_PAGE_SIZE,
  } = params

  const safePage = Number.isInteger(page) && page > 0 ? page : 1
  const safePageSize = Number.isInteger(pageSize) && pageSize > 0 ? Math.min(pageSize, 100) : DEFAULT_MAIN_EVENT_PAGE_SIZE
  const skip = (safePage - 1) * safePageSize

  const where = buildLibraryWhere({ eventId, search })

  const [totalItems, mainEvents] = await prisma.$transaction([
    prisma.mainEvent.count({ where }),
    prisma.mainEvent.findMany({
      where,
      orderBy: { title: 'asc' },
      skip,
      take: safePageSize,
      include: {
        slots: {
          ...(eventId ? { where: { eventId } } : {}),
          orderBy: [{ day: 'asc' }, { slot: 'asc' }, { table: 'asc' }],
          select: SLOT_SELECT,
        },
      },
    }),
  ])

  return {
    items: mainEvents.map(serializeMainEvent),
    pagination: {
      page: safePage,
      pageSize: safePageSize,
      totalItems,
      totalPages: totalItems > 0 ? Math.ceil(totalItems / safePageSize) : 0,
    },
  }
}

export async function getMainEventDetail({ id }) {
  const mainEvent = await prisma.mainEvent.findUnique({
    where: { id },
    include: {
      slots: {
        orderBy: [{ day: 'asc' }, { slot: 'asc' }, { table: 'asc' }],
        select: SLOT_SELECT,
      },
    },
  })

  if (!mainEvent) {
    throw createHttpError(404, 'Main event non trovato')
  }

  return serializeMainEvent(mainEvent)
}

async function assertSlotsAttachable(tx, slotIds) {
  if (slotIds.length === 0) return

  const slots = await tx.eventSlot.findMany({
    where: { id: { in: slotIds }, oneshotId: null },
    select: { id: true },
  })

  if (slots.length !== slotIds.length) {
    throw createHttpError(409, 'Uno o più tavoli selezionati non sono più disponibili.')
  }
}

// I posti di un main event sono un valore fisso sul main event stesso
// (maxPlayers), indipendente dai tavoli assegnati: i tavoli servono solo a
// indicare dove si gioca fisicamente. Questo controllo evita solo di
// lasciare una fascia con prenotazioni attive senza più nessun tavolo
// assegnato (che romperebbe la mappa tavoli), non una questione di capienza.
async function assertSlotDetachCapacity(tx, mainEventId, slotsToDetach) {
  if (slotsToDetach.length === 0) return

  const detachIds = new Set(slotsToDetach.map((slot) => slot.id))
  const groups = new Map()
  for (const slot of slotsToDetach) {
    const key = `${slot.eventId}__${slot.day}__${slot.slot}`
    if (!groups.has(key)) groups.set(key, { eventId: slot.eventId, day: slot.day, slot: slot.slot })
  }

  for (const group of groups.values()) {
    const remainingSlots = await tx.eventSlot.count({
      where: {
        mainEventId,
        eventId: group.eventId,
        day: group.day,
        slot: group.slot,
        id: { notIn: Array.from(detachIds) },
      },
    })

    if (remainingSlots > 0) continue

    const activeReservations = await tx.mainEventReservation.count({
      where: {
        mainEventId,
        eventId: group.eventId,
        day: group.day,
        slot: group.slot,
        status: { in: ACTIVE_RESERVATION_STATUSES },
      },
    })

    if (activeReservations > 0) {
      throw createHttpError(400, `Non puoi rimuovere l'ultimo tavolo della fascia ${group.day} ${group.slot}: ci sono ${activeReservations} prenotazioni attive su quella fascia.`)
    }
  }
}

export async function createMainEvent({ body }) {
  const title = body?.title?.trim()
  if (!title) {
    throw createHttpError(400, 'Titolo obbligatorio')
  }

  const price = normalizeOptionalNumber(body?.price)
  if (Number.isNaN(price) || (price !== null && price < 0)) {
    throw createHttpError(400, 'Prezzo non valido')
  }

  const maxPlayers = normalizeMaxPlayers(body?.maxPlayers)
  if (Number.isNaN(maxPlayers) || maxPlayers < 1) {
    throw createHttpError(400, 'Posti massimi non validi')
  }

  const requestedSlotIds = normalizeSlotIds(body?.slotIds) || []

  try {
    const mainEvent = await prisma.$transaction(async (tx) => {
      const created = await tx.mainEvent.create({
        data: {
          title,
          description: normalizeOptionalString(body?.description),
          game: normalizeOptionalString(body?.game),
          image: normalizeOptionalString(body?.image),
          tags: normalizeTags(body?.tags) ?? [],
          price,
          maxPlayers,
        },
      })

      if (requestedSlotIds.length > 0) {
        await assertSlotsAttachable(tx, requestedSlotIds)

        const attached = await tx.eventSlot.updateMany({
          where: { id: { in: requestedSlotIds }, mainEventId: null, oneshotId: null },
          data: { mainEventId: created.id },
        })

        if (attached.count !== requestedSlotIds.length) {
          throw createHttpError(409, 'Uno o più tavoli selezionati non sono più disponibili.')
        }
      }

      return tx.mainEvent.findUniqueOrThrow({
        where: { id: created.id },
        include: {
          slots: {
            orderBy: [{ day: 'asc' }, { slot: 'asc' }, { table: 'asc' }],
            select: SLOT_SELECT,
          },
        },
      })
    })

    return serializeMainEvent(mainEvent)
  } catch (error) {
    if (error?.status) throw error
    throw createHttpError(500, 'Creazione main event non riuscita')
  }
}

export async function updateMainEvent({ id, body }) {
  const data = {}

  if (body?.title !== undefined) {
    const title = body.title?.trim()
    if (!title) throw createHttpError(400, 'Titolo obbligatorio')
    data.title = title
  }

  if (body?.description !== undefined) data.description = normalizeOptionalString(body.description)
  if (body?.game !== undefined) data.game = normalizeOptionalString(body.game)
  if (body?.image !== undefined) data.image = normalizeOptionalString(body.image)
  if (body?.tags !== undefined) data.tags = normalizeTags(body.tags)

  if (body?.price !== undefined) {
    const price = normalizeOptionalNumber(body.price)
    if (Number.isNaN(price) || (price !== null && price < 0)) {
      throw createHttpError(400, 'Prezzo non valido')
    }
    data.price = price
  }

  if (body?.maxPlayers !== undefined) {
    const maxPlayers = normalizeMaxPlayers(body.maxPlayers)
    if (Number.isNaN(maxPlayers) || maxPlayers < 1) {
      throw createHttpError(400, 'Posti massimi non validi')
    }
    data.maxPlayers = maxPlayers
  }

  const requestedSlotIds = normalizeSlotIds(body?.slotIds)

  try {
    const mainEvent = await prisma.$transaction(async (tx) => {
      const current = await tx.mainEvent.findUnique({
        where: { id },
        select: {
          id: true,
          slots: { select: { id: true, eventId: true, day: true, slot: true, maxPlayers: true } },
        },
      })

      if (!current) throw createHttpError(404, 'Main event non trovato')

      if (requestedSlotIds !== null) {
        const existingSlotIds = current.slots.map((slot) => slot.id)
        const slotIdsToDetach = existingSlotIds.filter((slotId) => !requestedSlotIds.includes(slotId))
        const slotIdsToAttach = requestedSlotIds.filter((slotId) => !existingSlotIds.includes(slotId))

        const slotsToDetach = current.slots.filter((slot) => slotIdsToDetach.includes(slot.id))
        await assertSlotDetachCapacity(tx, id, slotsToDetach)

        if (slotIdsToAttach.length > 0) {
          await assertSlotsAttachable(tx, slotIdsToAttach)

          const attached = await tx.eventSlot.updateMany({
            where: { id: { in: slotIdsToAttach }, mainEventId: null, oneshotId: null },
            data: { mainEventId: id },
          })

          if (attached.count !== slotIdsToAttach.length) {
            throw createHttpError(409, 'Uno o più tavoli selezionati non sono più disponibili.')
          }
        }

        if (slotIdsToDetach.length > 0) {
          await tx.eventSlot.updateMany({
            where: { id: { in: slotIdsToDetach } },
            data: { mainEventId: null },
          })
        }
      }

      return tx.mainEvent.update({
        where: { id },
        data,
        include: {
          slots: {
            orderBy: [{ day: 'asc' }, { slot: 'asc' }, { table: 'asc' }],
            select: SLOT_SELECT,
          },
        },
      })
    })

    return serializeMainEvent(mainEvent)
  } catch (error) {
    if (error?.status) throw error
    if (error?.code === 'P2025') throw createHttpError(404, 'Main event non trovato')
    throw createHttpError(500, 'Aggiornamento main event non riuscito')
  }
}

export async function deleteMainEvent({ id }) {
  try {
    await prisma.$transaction(async (tx) => {
      const mainEvent = await tx.mainEvent.findUnique({ where: { id }, select: { id: true } })
      if (!mainEvent) throw createHttpError(404, 'Main event non trovato')

      await tx.mainEventReservation.deleteMany({ where: { mainEventId: id } })
      // Eliminare il main event stacca i suoi tavoli (onDelete: SetNull) invece
      // di distruggerli — sono una risorsa dell'evento e tornano nel pool.
      await tx.mainEvent.delete({ where: { id: mainEvent.id } })
    })
  } catch (error) {
    if (error?.status) throw error
    throw createHttpError(404, 'Main event non trovato')
  }
}

