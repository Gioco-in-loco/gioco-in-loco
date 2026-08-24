import { prisma } from './prisma'
import { createSupabaseServiceClient, isServiceRoleConfigured } from './supabase/service'

export const DEFAULT_ONESHOT_PAGE_SIZE = 20
const ACTIVE_RESERVATION_STATUSES = ['PENDING', 'CONFIRMED', 'ATTENDED']
const MANAGEABLE_RESERVATION_STATUSES = new Set(['CONFIRMED', 'ATTENDED', 'CANCELLED'])
// Mirrors the WEEK_DAYS list in src/components/management/EventForm.jsx —
// that's the only place that ever sends `days` on an event save.
const WEEK_DAYS = new Set(['Lunedi', 'Martedi', 'Mercoledi', 'Giovedi', 'Venerdi', 'Sabato', 'Domenica'])
const TIME_SLOT_REGEX = /^([01]\d|2[0-3]):[0-5]\d-([01]\d|2[0-3]):[0-5]\d$/

function createHttpError(status, message) {
  const error = new Error(message)
  error.status = status
  return error
}

function formatAuditDate(value = new Date()) {
  return new Intl.DateTimeFormat('it-IT', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(value)
}

function buildCancellationFeedbackMessage({ cancellationReason, actorName, actorEmail }) {
  const actorLabel = actorName || actorEmail || 'Admin'
  const reason = cancellationReason.trim()
  return `[Annullata da admin il ${formatAuditDate()} da ${actorLabel}]\nMotivo: ${reason}`
}

export function normalizeEventDays(daysInput) {
  if (daysInput === undefined) return undefined
  if (!Array.isArray(daysInput)) throw createHttpError(400, 'Giorni evento non validi')

  const unique = Array.from(new Set(daysInput.map((day) => (typeof day === 'string' ? day.trim() : ''))))
  for (const day of unique) {
    if (!WEEK_DAYS.has(day)) throw createHttpError(400, `Giorno "${day}" non valido`)
  }

  return unique
}

export function normalizeEventTimeSlots(timeSlotsInput) {
  if (timeSlotsInput === undefined) return undefined
  if (!Array.isArray(timeSlotsInput)) throw createHttpError(400, 'Fasce orarie evento non valide')

  const unique = Array.from(new Set(timeSlotsInput.map((slotTime) => (typeof slotTime === 'string' ? slotTime.trim() : ''))))
  for (const slotTime of unique) {
    if (!TIME_SLOT_REGEX.test(slotTime)) throw createHttpError(400, `Fascia oraria "${slotTime}" non valida (formato HH:mm-HH:mm)`)
  }

  return unique
}

export function normalizeOptionalString(value) {
  if (typeof value !== 'string') return null
  const trimmed = value.trim()
  return trimmed || null
}

export function normalizeOptionalNumber(value) {
  if (value === '' || value === null || value === undefined) return null
  const parsed = Number(value)
  if (Number.isNaN(parsed)) return NaN
  return parsed
}

function normalizeRequiredInteger(value, fieldLabel) {
  const parsed = Number(value)

  if (!Number.isInteger(parsed) || parsed < 1) {
    throw createHttpError(400, `${fieldLabel} non valido`)
  }

  return parsed
}

function validatePlayerBounds(minPlayers, maxPlayers) {
  if (maxPlayers < minPlayers) {
    throw createHttpError(400, 'Il numero massimo di posti deve essere maggiore o uguale al minimo.')
  }
}

function normalizeSlotIds(slotIds) {
  if (!Array.isArray(slotIds)) return null
  return slotIds.filter((value) => typeof value === 'string' && value.trim())
}

async function buildReservationPhoneMap(oneshot) {
  const phoneByUserId = new Map()
  if (!isServiceRoleConfigured()) return phoneByUserId

  const supabaseUserIds = new Set()
  for (const slot of oneshot.slots || []) {
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

  for (const slot of oneshot.slots || []) {
    for (const reservation of slot.reservations || []) {
      const supabaseUserId = reservation.user?.supabaseUserId
      if (supabaseUserId && phoneBySupabaseId.has(supabaseUserId)) {
        phoneByUserId.set(reservation.userId, phoneBySupabaseId.get(supabaseUserId))
      }
    }
  }

  return phoneByUserId
}

export function serializeOneShot(oneshot, { phoneByUserId = new Map() } = {}) {
  return {
    id: oneshot.id,
    title: oneshot.title,
    game: oneshot.game,
    master: oneshot.master,
    description: oneshot.description,
    image: oneshot.image,
    price: oneshot.price,
    minPlayers: oneshot.minPlayers,
    maxPlayers: oneshot.maxPlayers,
    associationId: oneshot.associationId,
    associationName: oneshot.association?.name || null,
    eventLinks: oneshot.eventLinks?.map((link) => ({
      eventId: link.eventId,
      eventName: link.event?.name || null,
    })) || [],
    createdAt: oneshot.createdAt,
    updatedAt: oneshot.updatedAt,
    slots: (oneshot.slots || []).map((slot) => ({
      id: slot.id,
      day: slot.day,
      slot: slot.slot,
      table: slot.table,
      maxPlayers: slot.maxPlayers,
      reservations: (slot.reservations || []).map((reservation) => ({
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
    })),
  }
}

function buildEventScopedWhere({ eventId, managedAssociationId, search, master, association }) {
  return {
    ...(eventId ? { eventLinks: { some: { eventId } } } : {}),
    // managedAssociationId (responsabile) è uno scoping di sicurezza, sempre
    // esatto; association è invece un filtro di ricerca libero per l'admin —
    // non si sovrappongono perché l'UI mostra l'uno o l'altro, mai entrambi.
    ...(managedAssociationId ? { associationId: managedAssociationId } : {}),
    ...(search ? { title: { contains: search, mode: 'insensitive' } } : {}),
    ...(master ? { master: { contains: master, mode: 'insensitive' } } : {}),
    ...(association ? { association: { name: { contains: association, mode: 'insensitive' } } } : {}),
  }
}

// eventId è opzionale: quando assente, restituisce l'intera libreria one-shot
// (scoped solo per associazione/ricerca) invece delle sole one-shot
// collegate a un evento — le one-shot sono riutilizzabili su più eventi.
export async function listOneShots(params) {
  const {
    eventId,
    search,
    master,
    association,
    page = 1,
    pageSize = DEFAULT_ONESHOT_PAGE_SIZE,
    managedAssociationId = null,
  } = params

  const safePage = Number.isInteger(page) && page > 0 ? page : 1
  const safePageSize = Number.isInteger(pageSize) && pageSize > 0 ? Math.min(pageSize, 100) : DEFAULT_ONESHOT_PAGE_SIZE
  const skip = (safePage - 1) * safePageSize

  const where = buildEventScopedWhere({ eventId, managedAssociationId, search, master, association })

  const [totalItems, oneshots] = await prisma.$transaction([
    prisma.oneShot.count({ where }),
    prisma.oneShot.findMany({
      where,
      orderBy: { title: 'asc' },
      skip,
      take: safePageSize,
      include: {
        association: { select: { name: true } },
        eventLinks: {
          ...(eventId ? { where: { eventId } } : {}),
          select: {
            eventId: true,
            event: { select: { name: true } },
          },
        },
        slots: {
          orderBy: [{ day: 'asc' }, { slot: 'asc' }, { table: 'asc' }],
          select: { id: true, day: true, slot: true, table: true, maxPlayers: true },
        },
      },
    }),
  ])

  return {
    items: oneshots.map(serializeOneShot),
    pagination: {
      page: safePage,
      pageSize: safePageSize,
      totalItems,
      totalPages: totalItems > 0 ? Math.ceil(totalItems / safePageSize) : 0,
    },
  }
}

// A one-shot session runs at one table at a time, so it can't hold two slots
// that share the same day+fascia oraria. Runs against the full requested slot
// set (not just the ones being newly attached) so it also catches a conflict
// introduced by the new selection as a whole.
async function assertSlotsSelectable(tx, slotIds) {
  if (slotIds.length === 0) return

  const slots = await tx.eventSlot.findMany({
    where: { id: { in: slotIds } },
    select: { id: true, day: true, slot: true, table: true, maxPlayers: true },
  })

  if (slots.length !== slotIds.length) {
    throw createHttpError(409, 'Uno o più slot selezionati non sono più disponibili.')
  }

  const seenTimeKeys = new Set()
  for (const slot of slots) {
    const key = `${slot.day}__${slot.slot}`
    if (seenTimeKeys.has(key)) {
      throw createHttpError(400, `Non puoi assegnare più tavoli nello stesso giorno e fascia oraria (${slot.day} ${slot.slot}) alla stessa one-shot.`)
    }
    seenTimeKeys.add(key)
  }
}

// Uno slot marcato "adminOnly" può essere assegnato solo dall'amministratore:
// il responsabile non deve poterlo scegliere neanche chiamando l'API
// direttamente, non solo tramite la UI che già lo nasconde/disabilita.
async function assertNoAdminOnlySlots(tx, slotIds, managedAssociationId) {
  if (!managedAssociationId || slotIds.length === 0) return

  const restrictedCount = await tx.eventSlot.count({ where: { id: { in: slotIds }, adminOnly: true } })
  if (restrictedCount > 0) {
    throw createHttpError(403, 'Uno o più slot selezionati sono riservati all\'amministratore.')
  }
}

// L'admin bypassa sempre il lock (managedAssociationId assente); il
// responsabile non deve poter toccare contenuto o assegnazione tavolo di una
// one-shot legata a un evento con sessioni bloccate (Event.sessionsLocked).
async function assertEventsNotLocked(tx, eventIds, managedAssociationId) {
  if (!managedAssociationId || eventIds.length === 0) return

  const locked = await tx.event.findFirst({ where: { id: { in: eventIds }, sessionsLocked: true } })
  if (locked) {
    throw createHttpError(403, 'Le sessioni di questo evento sono bloccate: solo l\'amministratore può modificarle.')
  }
}

// eventLinks (EventOneShot) non si sceglie più manualmente: è derivata dagli
// slot effettivamente assegnati alla one-shot, così una one-shot risulta
// "collegata" esattamente agli eventi in cui ha almeno uno slot — niente altro
// deve cambiare per chi legge eventLinks (percorso pubblico prenotazioni).
async function syncEventLinksFromSlots(tx, oneshotId) {
  const slots = await tx.eventSlot.findMany({ where: { oneshotId }, select: { eventId: true } })
  const eventIds = Array.from(new Set(slots.map((slot) => slot.eventId)))

  await tx.eventOneShot.deleteMany({ where: { oneShotId: oneshotId, eventId: { notIn: eventIds } } })

  if (eventIds.length > 0) {
    await tx.eventOneShot.createMany({
      data: eventIds.map((eventId) => ({ eventId, oneShotId: oneshotId })),
      skipDuplicates: true,
    })
  }
}

export async function createOneShot({ body, managedAssociationId = null }) {
  const title = body?.title?.trim()
  const game = body?.game?.trim()
  const master = body?.master?.trim()
  const price = normalizeOptionalNumber(body?.price)
  const minPlayers = normalizeRequiredInteger(body?.minPlayers, 'Posti minimi')
  const maxPlayers = normalizeRequiredInteger(body?.maxPlayers, 'Posti massimi')

  if (!title || !game || !master) {
    throw createHttpError(400, 'Titolo, gioco e master sono obbligatori')
  }

  if (Number.isNaN(price) || (price !== null && price < 0)) {
    throw createHttpError(400, 'Prezzo non valido')
  }

  validatePlayerBounds(minPlayers, maxPlayers)

  const associationId = managedAssociationId || normalizeOptionalString(body?.associationId)
  const requestedSlotIds = normalizeSlotIds(body?.slotIds) || []

  try {
    const oneshot = await prisma.$transaction(async (tx) => {
      const created = await tx.oneShot.create({
        data: {
          title,
          game,
          master,
          description: normalizeOptionalString(body?.description),
          image: normalizeOptionalString(body?.image),
          price,
          minPlayers,
          maxPlayers,
          associationId,
        },
      })

      if (requestedSlotIds.length > 0) {
        const requestedSlots = await tx.eventSlot.findMany({ where: { id: { in: requestedSlotIds } }, select: { eventId: true } })
        await assertEventsNotLocked(tx, Array.from(new Set(requestedSlots.map((s) => s.eventId))), managedAssociationId)

        await assertSlotsSelectable(tx, requestedSlotIds)
        await assertNoAdminOnlySlots(tx, requestedSlotIds, managedAssociationId)

        const attached = await tx.eventSlot.updateMany({
          where: { id: { in: requestedSlotIds }, oneshotId: null, mainEventId: null },
          data: { oneshotId: created.id },
        })

        if (attached.count !== requestedSlotIds.length) {
          throw createHttpError(409, 'Uno o più slot selezionati non sono più disponibili.')
        }

        await syncEventLinksFromSlots(tx, created.id)
      }

      return tx.oneShot.findUniqueOrThrow({
        where: { id: created.id },
        include: {
          association: { select: { name: true } },
          eventLinks: {
            select: {
              eventId: true,
              event: { select: { name: true } },
            },
          },
          slots: {
            orderBy: [{ day: 'asc' }, { slot: 'asc' }, { table: 'asc' }],
            select: { id: true, day: true, slot: true, table: true, maxPlayers: true },
          },
        },
      })
    })

    return serializeOneShot(oneshot)
  } catch (error) {
    if (error?.status) throw error
    throw createHttpError(500, 'Creazione one shot non riuscita')
  }
}

export async function updateOneShot({ id, body, managedAssociationId = null }) {
  const data = {}

  if (body?.title !== undefined) {
    const title = body.title?.trim()
    if (!title) throw createHttpError(400, 'Titolo obbligatorio')
    data.title = title
  }

  if (body?.game !== undefined) {
    const game = body.game?.trim()
    if (!game) throw createHttpError(400, 'Gioco obbligatorio')
    data.game = game
  }

  if (body?.master !== undefined) {
    const master = body.master?.trim()
    if (!master) throw createHttpError(400, 'Master obbligatorio')
    data.master = master
  }

  if (body?.description !== undefined) data.description = normalizeOptionalString(body.description)
  if (body?.image !== undefined) data.image = normalizeOptionalString(body.image)
  if (body?.associationId !== undefined && !managedAssociationId) data.associationId = normalizeOptionalString(body.associationId)
  if (managedAssociationId) data.associationId = managedAssociationId

  if (body?.price !== undefined) {
    const price = normalizeOptionalNumber(body.price)
    if (Number.isNaN(price) || (price !== null && price < 0)) {
      throw createHttpError(400, 'Prezzo non valido')
    }
    data.price = price
  }

  const requestedSlotIds = normalizeSlotIds(body?.slotIds)

  try {
    const oneshot = await prisma.$transaction(async (tx) => {
      const currentOneShot = await tx.oneShot.findFirst({
        where: { id, ...(managedAssociationId ? { associationId: managedAssociationId } : {}) },
        select: {
          id: true,
          minPlayers: true,
          maxPlayers: true,
          slots: { select: { id: true, eventId: true } },
        },
      })

      if (!currentOneShot) throw createHttpError(404, 'One shot non trovata')

      // Blocca anche una modifica di solo contenuto (titolo, descrizione...)
      // su una one-shot già seduta su un evento con sessioni bloccate, non
      // solo la riassegnazione slot controllata più sotto.
      await assertEventsNotLocked(tx, Array.from(new Set(currentOneShot.slots.map((s) => s.eventId))), managedAssociationId)

      const nextMinPlayers = body?.minPlayers !== undefined
        ? normalizeRequiredInteger(body.minPlayers, 'Posti minimi')
        : currentOneShot.minPlayers
      const nextMaxPlayers = body?.maxPlayers !== undefined
        ? normalizeRequiredInteger(body.maxPlayers, 'Posti massimi')
        : currentOneShot.maxPlayers

      validatePlayerBounds(nextMinPlayers, nextMaxPlayers)

      if (body?.minPlayers !== undefined) data.minPlayers = nextMinPlayers
      if (body?.maxPlayers !== undefined) data.maxPlayers = nextMaxPlayers

      if (requestedSlotIds !== null) {
        const existingSlotIds = currentOneShot.slots.map((slot) => slot.id)

        const slotIdsToDetach = existingSlotIds.filter((slotId) => !requestedSlotIds.includes(slotId))
        const slotIdsToAttach = requestedSlotIds.filter((slotId) => !existingSlotIds.includes(slotId))

        if (slotIdsToAttach.length > 0) {
          const targetSlots = await tx.eventSlot.findMany({ where: { id: { in: slotIdsToAttach } }, select: { eventId: true } })
          await assertEventsNotLocked(tx, Array.from(new Set(targetSlots.map((s) => s.eventId))), managedAssociationId)
        }

        await assertSlotsSelectable(tx, requestedSlotIds)
        await assertNoAdminOnlySlots(tx, slotIdsToAttach, managedAssociationId)

        if (slotIdsToDetach.length > 0) {
          const activeReservationsCount = await tx.reservation.count({
            where: { slotId: { in: slotIdsToDetach }, status: { in: ACTIVE_RESERVATION_STATUSES } },
          })

          if (activeReservationsCount > 0) {
            throw createHttpError(400, 'Non puoi rimuovere slot che hanno prenotazioni collegate.')
          }

          await tx.eventSlot.updateMany({
            where: { id: { in: slotIdsToDetach } },
            data: { oneshotId: null },
          })
        }

        if (slotIdsToAttach.length > 0) {
          const attached = await tx.eventSlot.updateMany({
            where: { id: { in: slotIdsToAttach }, oneshotId: null, mainEventId: null },
            data: { oneshotId: id },
          })

          if (attached.count !== slotIdsToAttach.length) {
            throw createHttpError(409, 'Uno o più slot selezionati non sono più disponibili.')
          }
        }

        await syncEventLinksFromSlots(tx, id)
      }

      return tx.oneShot.update({
        where: { id },
        data,
        include: {
          association: { select: { name: true } },
          eventLinks: {
            select: {
              eventId: true,
              event: { select: { name: true } },
            },
          },
          slots: {
            orderBy: [{ day: 'asc' }, { slot: 'asc' }, { table: 'asc' }],
            select: { id: true, day: true, slot: true, table: true, maxPlayers: true },
          },
        },
      })
    })

    return serializeOneShot(oneshot)
  } catch (error) {
    if (error?.status) throw error
    if (error?.code === 'P2025') {
      throw createHttpError(404, 'One shot non trovata')
    }
    throw createHttpError(500, 'Aggiornamento one shot non riuscito')
  }
}

export async function getOneShotDetail({ id, managedAssociationId = null }) {
  const oneshot = await prisma.oneShot.findFirst({
    where: {
      id,
      ...(managedAssociationId ? { associationId: managedAssociationId } : {}),
    },
    include: {
      association: { select: { name: true } },
      eventLinks: {
        select: {
          eventId: true,
          event: { select: { name: true } },
        },
      },
      slots: {
        orderBy: [{ day: 'asc' }, { slot: 'asc' }, { table: 'asc' }],
        include: {
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
      },
    },
  })

  if (!oneshot) {
    throw createHttpError(404, 'One shot non trovata')
  }

  const phoneByUserId = await buildReservationPhoneMap(oneshot)
  return serializeOneShot(oneshot, { phoneByUserId })
}

export async function updateManagedOneShotReservationStatus({ oneshotId, reservationId, status, managedAssociationId = null, cancellationReason = '', actorName = null, actorEmail = null, actorUserId = null }) {
  if (!MANAGEABLE_RESERVATION_STATUSES.has(status)) {
    throw createHttpError(400, 'Stato prenotazione non valido')
  }

  if (status === 'CANCELLED' && !cancellationReason.trim()) {
    throw createHttpError(400, 'Inserisci il motivo dell\'annullamento.')
  }

  const reservation = await prisma.reservation.findFirst({
    where: {
      id: reservationId,
      slot: {
        oneshotId,
        oneshot: {
          ...(managedAssociationId ? { associationId: managedAssociationId } : {}),
        },
      },
    },
    select: {
      id: true,
      userId: true,
      status: true,
    },
  })

  if (!reservation) {
    throw createHttpError(404, 'Prenotazione non trovata')
  }

  // A responsabile-scoped request (managedAssociationId set) may only mark or
  // remove attendance at the table — reverting to CONFIRMED is allowed only
  // when undoing a previous ATTENDED mark, not to confirm a pending booking.
  if (managedAssociationId && status === 'CONFIRMED' && reservation.status !== 'ATTENDED') {
    throw createHttpError(403, 'Il responsabile puo solo segnare o rimuovere la presenza al tavolo.')
  }

  return prisma.$transaction(async (tx) => {
    const updatedReservation = await tx.reservation.update({
      where: { id: reservationId },
      data: { status },
      select: {
        id: true,
        status: true,
        updatedAt: true,
      },
    })

    if (status === 'CANCELLED') {
      await tx.userFeedback.create({
        data: {
          userId: reservation.userId,
          reservationId: reservation.id,
          authorUserId: actorUserId,
          type: 'ADMIN_RESERVATION_CANCELLATION',
          message: buildCancellationFeedbackMessage({
            cancellationReason,
            actorName,
            actorEmail,
          }),
        },
      })
    }

    return updatedReservation
  })
}

// Hard delete, admin-only: unlike CANCELLED (which keeps the row as an audit
// trail and frees the seat), this removes the reservation record entirely —
// e.g. to correct a mistaken/duplicate booking. UserFeedback entries tied to
// it are detached (onDelete: SetNull), not deleted, so cancellation history
// elsewhere is unaffected.
export async function deleteOneShotReservation({ oneshotId, reservationId }) {
  const reservation = await prisma.reservation.findFirst({
    where: { id: reservationId, slot: { oneshotId } },
    select: { id: true },
  })

  if (!reservation) {
    throw createHttpError(404, 'Prenotazione non trovata')
  }

  await prisma.reservation.delete({ where: { id: reservationId } })
}

export async function deleteOneShot({ id, managedAssociationId = null }) {
  try {
    await prisma.$transaction(async (tx) => {
      const oneshot = await tx.oneShot.findFirst({
        where: {
          id,
          ...(managedAssociationId ? { associationId: managedAssociationId } : {}),
        },
        select: {
          id: true,
          slots: {
            select: { id: true, eventId: true },
          },
        },
      })

      if (!oneshot) {
        throw createHttpError(404, 'One shot non trovata')
      }

      await assertEventsNotLocked(tx, Array.from(new Set(oneshot.slots.map((s) => s.eventId))), managedAssociationId)

      const slotIds = oneshot.slots.map((slot) => slot.id)

      if (slotIds.length > 0) {
        await tx.reservation.deleteMany({
          where: {
            slotId: { in: slotIds },
          },
        })
      }

      // Deleting the one-shot detaches its slots (onDelete: SetNull) instead of
      // destroying them — they're an event resource and go back to the pool.
      await tx.oneShot.delete({ where: { id: oneshot.id } })
    })
  } catch (error) {
    if (error?.status) throw error
    throw createHttpError(404, 'One shot non trovata')
  }
}
