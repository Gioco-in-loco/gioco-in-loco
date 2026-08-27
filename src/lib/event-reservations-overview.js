import { prisma } from './prisma'
import { createSupabaseServiceClient, isServiceRoleConfigured } from './supabase/service'

function createHttpError(status, message) {
  const error = new Error(message)
  error.status = status
  return error
}

const ACTIVE_RESERVATION_STATUSES = ['PENDING', 'CONFIRMED', 'ATTENDED']
const ACTIVE_MAIN_EVENT_RESERVATION_STATUSES = ['PENDING', 'CONFIRMED', 'ATTENDED']

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

async function buildAuthLookup() {
  if (!isServiceRoleConfigured()) return new Map()

  const admin = createSupabaseServiceClient()
  const { data } = await admin.auth.admin.listUsers({ perPage: 1000 })
  return new Map((data?.users || []).map((authUser) => [authUser.id, authUser]))
}

function accountFieldsFor(user, authBySupabaseId) {
  const authUser = user?.supabaseUserId ? authBySupabaseId.get(user.supabaseUserId) : null
  return {
    accountName: authUser?.user_metadata?.full_name || authUser?.user_metadata?.name || null,
    accountEmail: authUser?.email || null,
    nickname: user?.nickname || null,
  }
}

// Admin-facing: every reservation (one-shot + main event + admission pass)
// for an entire event, in one flat list — used by the "Prenotazioni" tab to
// let an admin search across all bookings by player/account name, something
// no existing view does (they're all scoped to a single slot or user).
// redactPlayerData (responsabile, used only by the event analytics tab)
// nasconde nome/email/telefono dei prenotati di TUTTE le associazioni, non
// solo la propria: questa vista è per costruzione a livello di intero
// evento, quindi non si può filtrare per associazione senza snaturarla. Va
// passato esplicitamente (non derivato da un associationId) perché un
// responsabile senza associazione assegnata deve restare comunque redatto.
export async function getEventAllReservations({ eventId, redactPlayerData = false }) {
  const [oneshotReservations, mainEventReservations, admissions] = await Promise.all([
    prisma.reservation.findMany({
      where: { slot: { eventId } },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        userId: true,
        status: true,
        playerName: true,
        playerEmail: true,
        createdAt: true,
        user: { select: { supabaseUserId: true, nickname: true } },
        invitedBy: { select: { supabaseUserId: true, nickname: true } },
        slot: {
          select: {
            day: true,
            slot: true,
            table: true,
            oneshot: { select: { title: true, master: true } },
          },
        },
      },
    }),
    prisma.mainEventReservation.findMany({
      where: { eventId },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        userId: true,
        status: true,
        playerName: true,
        playerEmail: true,
        day: true,
        slot: true,
        createdAt: true,
        user: { select: { supabaseUserId: true, nickname: true } },
        invitedBy: { select: { supabaseUserId: true, nickname: true } },
        mainEvent: { select: { title: true } },
      },
    }),
    prisma.eventAdmission.findMany({
      where: { eventId },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        userId: true,
        status: true,
        day: true,
        pricePaid: true,
        playerName: true,
        playerEmail: true,
        createdAt: true,
        user: { select: { supabaseUserId: true, nickname: true } },
        invitedBy: { select: { supabaseUserId: true, nickname: true } },
      },
    }),
  ])

  const authBySupabaseId = redactPlayerData ? new Map() : await buildAuthLookup()

  const rows = [
    ...oneshotReservations.map((reservation) => ({
      id: reservation.id,
      type: 'oneshot',
      userId: reservation.userId,
      status: reservation.status,
      playerName: redactPlayerData ? null : reservation.playerName,
      playerEmail: redactPlayerData ? null : reservation.playerEmail,
      invitedByName: redactPlayerData || !reservation.invitedBy ? null : (accountFieldsFor(reservation.invitedBy, authBySupabaseId).accountName || accountFieldsFor(reservation.invitedBy, authBySupabaseId).accountEmail),
      ...accountFieldsFor(reservation.user, authBySupabaseId),
      title: reservation.slot.oneshot?.title || 'One-shot',
      subtitle: reservation.slot.oneshot?.master ? `Master ${reservation.slot.oneshot.master}` : null,
      day: reservation.slot.day,
      slotTime: reservation.slot.slot,
      table: reservation.slot.table,
      createdAt: reservation.createdAt,
    })),
    ...mainEventReservations.map((reservation) => ({
      id: reservation.id,
      type: 'mainEvent',
      userId: reservation.userId,
      status: reservation.status,
      playerName: redactPlayerData ? null : reservation.playerName,
      playerEmail: redactPlayerData ? null : reservation.playerEmail,
      invitedByName: redactPlayerData || !reservation.invitedBy ? null : (accountFieldsFor(reservation.invitedBy, authBySupabaseId).accountName || accountFieldsFor(reservation.invitedBy, authBySupabaseId).accountEmail),
      ...accountFieldsFor(reservation.user, authBySupabaseId),
      title: reservation.mainEvent?.title || 'Main Event',
      subtitle: null,
      day: reservation.day,
      slotTime: reservation.slot,
      table: null,
      createdAt: reservation.createdAt,
    })),
    ...admissions.map((admission) => ({
      id: admission.id,
      type: 'admission',
      userId: admission.userId,
      status: admission.status,
      playerName: redactPlayerData ? null : admission.playerName,
      playerEmail: redactPlayerData ? null : admission.playerEmail,
      invitedByName: redactPlayerData || !admission.invitedBy ? null : (accountFieldsFor(admission.invitedBy, authBySupabaseId).accountName || accountFieldsFor(admission.invitedBy, authBySupabaseId).accountEmail),
      ...accountFieldsFor(admission.user, authBySupabaseId),
      title: 'Pass ingresso',
      subtitle: admission.pricePaid != null ? `EUR ${Number(admission.pricePaid).toFixed(2)}` : null,
      day: admission.day || null,
      slotTime: null,
      table: null,
      createdAt: admission.createdAt,
    })),
  ]

  rows.sort((left, right) => new Date(right.createdAt) - new Date(left.createdAt))

  return rows
}

// Unified admin-facing cancel: scoped by eventId (not oneshotId, unlike
// updateManagedOneShotReservationStatus in oneshots-management.js, which this
// panel doesn't reuse since it must handle all 3 reservation kinds the same
// way). Sets status to CANCELLED and leaves an audit-trail UserFeedback row
// so the user can read why, mirroring the existing one-shot mechanism.
export async function cancelEventReservation({ eventId, type, reservationId, cancellationReason, actorName = null, actorEmail = null, actorUserId = null }) {
  const reason = String(cancellationReason || '').trim()
  if (!reason) {
    throw createHttpError(400, 'Inserisci il motivo dell\'annullamento.')
  }

  const message = buildCancellationFeedbackMessage({ cancellationReason: reason, actorName, actorEmail })

  if (type === 'oneshot') {
    const reservation = await prisma.reservation.findFirst({
      where: { id: reservationId, slot: { eventId } },
      select: { id: true, userId: true },
    })
    if (!reservation) throw createHttpError(404, 'Prenotazione non trovata')

    return prisma.$transaction(async (tx) => {
      const updated = await tx.reservation.update({
        where: { id: reservationId },
        data: { status: 'CANCELLED' },
        select: { id: true, status: true },
      })
      // Unclaimed companion invites have no userId yet — nothing to attribute
      // the audit trail to, so skip it rather than violate the FK.
      if (reservation.userId) {
        await tx.userFeedback.create({
          data: {
            userId: reservation.userId,
            reservationId: reservation.id,
            authorUserId: actorUserId,
            type: 'ADMIN_RESERVATION_CANCELLATION',
            message,
          },
        })
      }
      return updated
    })
  }

  if (type === 'mainEvent') {
    const reservation = await prisma.mainEventReservation.findFirst({
      where: { id: reservationId, eventId },
      select: { id: true, userId: true },
    })
    if (!reservation) throw createHttpError(404, 'Prenotazione non trovata')

    return prisma.$transaction(async (tx) => {
      const updated = await tx.mainEventReservation.update({
        where: { id: reservationId },
        data: { status: 'CANCELLED' },
        select: { id: true, status: true },
      })
      if (reservation.userId) {
        await tx.userFeedback.create({
          data: {
            userId: reservation.userId,
            mainEventReservationId: reservation.id,
            authorUserId: actorUserId,
            type: 'ADMIN_RESERVATION_CANCELLATION',
            message,
          },
        })
      }
      return updated
    })
  }

  if (type === 'admission') {
    const admission = await prisma.eventAdmission.findFirst({
      where: { id: reservationId, eventId },
      select: { id: true, userId: true },
    })
    if (!admission) throw createHttpError(404, 'Prenotazione non trovata')

    return prisma.$transaction(async (tx) => {
      const updated = await tx.eventAdmission.update({
        where: { id: reservationId },
        data: { status: 'CANCELLED' },
        select: { id: true, status: true },
      })
      if (admission.userId) {
        await tx.userFeedback.create({
          data: {
            userId: admission.userId,
            eventAdmissionId: admission.id,
            authorUserId: actorUserId,
            type: 'ADMIN_RESERVATION_CANCELLATION',
            message,
          },
        })
      }
      return updated
    })
  }

  throw createHttpError(400, 'Tipo prenotazione non valido')
}

// Hard delete, admin-only — mirrors deleteOneShotReservation in
// oneshots-management.js but scoped by eventId across all 3 reservation
// kinds. UserFeedback rows tied to the deleted record are detached
// (onDelete: SetNull), not deleted, so cancellation history survives.
export async function deleteEventReservation({ eventId, type, reservationId }) {
  if (type === 'oneshot') {
    const reservation = await prisma.reservation.findFirst({
      where: { id: reservationId, slot: { eventId } },
      select: { id: true },
    })
    if (!reservation) throw createHttpError(404, 'Prenotazione non trovata')
    await prisma.reservation.delete({ where: { id: reservationId } })
    return
  }

  if (type === 'mainEvent') {
    const reservation = await prisma.mainEventReservation.findFirst({
      where: { id: reservationId, eventId },
      select: { id: true },
    })
    if (!reservation) throw createHttpError(404, 'Prenotazione non trovata')
    await prisma.mainEventReservation.delete({ where: { id: reservationId } })
    return
  }

  if (type === 'admission') {
    const admission = await prisma.eventAdmission.findFirst({
      where: { id: reservationId, eventId },
      select: { id: true },
    })
    if (!admission) throw createHttpError(404, 'Prenotazione non trovata')
    await prisma.eventAdmission.delete({ where: { id: reservationId } })
    return
  }

  throw createHttpError(400, 'Tipo prenotazione non valido')
}

// Elimina in un colpo solo più prenotazioni selezionate dalla tabella
// (checkbox per riga). Righe già sparite (cancellate da un altro admin nel
// frattempo) vengono ignorate invece di far fallire l'intera operazione.
export async function deleteEventReservationsBulk({ eventId, items }) {
  if (!Array.isArray(items) || items.length === 0) {
    throw createHttpError(400, 'Nessuna prenotazione selezionata.')
  }

  let deleted = 0
  for (const item of items) {
    try {
      await deleteEventReservation({ eventId, type: item.type, reservationId: item.reservationId })
      deleted += 1
    } catch (error) {
      if (error?.status !== 404) throw error
    }
  }

  return { deleted }
}

// Dettaglio completo di una singola prenotazione (qualsiasi dei 3 tipi) per
// la pagina di modifica in admin — a differenza delle righe di
// getEventAllReservations, include anche i campi modificabili (notes) e i
// dati di consenso.
export async function getEventReservationDetail({ eventId, type, reservationId }) {
  const authBySupabaseId = await buildAuthLookup()

  if (type === 'oneshot') {
    const reservation = await prisma.reservation.findFirst({
      where: { id: reservationId, slot: { eventId } },
      select: {
        id: true,
        status: true,
        playerName: true,
        playerEmail: true,
        notes: true,
        consentGiven: true,
        consentDate: true,
        createdAt: true,
        updatedAt: true,
        holdExpiresAt: true,
        user: { select: { supabaseUserId: true, nickname: true } },
        invitedBy: { select: { supabaseUserId: true, nickname: true } },
        slot: { select: { day: true, slot: true, table: true, oneshot: { select: { title: true, master: true } } } },
      },
    })
    if (!reservation) throw createHttpError(404, 'Prenotazione non trovata')

    return {
      id: reservation.id,
      type: 'oneshot',
      status: reservation.status,
      playerName: reservation.playerName,
      playerEmail: reservation.playerEmail,
      notes: reservation.notes,
      consentGiven: reservation.consentGiven,
      consentDate: reservation.consentDate,
      createdAt: reservation.createdAt,
      updatedAt: reservation.updatedAt,
      holdExpiresAt: reservation.holdExpiresAt,
      invitedByName: reservation.invitedBy ? (accountFieldsFor(reservation.invitedBy, authBySupabaseId).accountName || accountFieldsFor(reservation.invitedBy, authBySupabaseId).accountEmail) : null,
      ...accountFieldsFor(reservation.user, authBySupabaseId),
      title: reservation.slot.oneshot?.title || 'One-shot',
      subtitle: reservation.slot.oneshot?.master ? `Master ${reservation.slot.oneshot.master}` : null,
      day: reservation.slot.day,
      slotTime: reservation.slot.slot,
      table: reservation.slot.table,
    }
  }

  if (type === 'mainEvent') {
    const reservation = await prisma.mainEventReservation.findFirst({
      where: { id: reservationId, eventId },
      select: {
        id: true,
        status: true,
        playerName: true,
        playerEmail: true,
        notes: true,
        consentGiven: true,
        consentDate: true,
        day: true,
        slot: true,
        createdAt: true,
        updatedAt: true,
        holdExpiresAt: true,
        user: { select: { supabaseUserId: true, nickname: true } },
        invitedBy: { select: { supabaseUserId: true, nickname: true } },
        mainEvent: { select: { title: true } },
      },
    })
    if (!reservation) throw createHttpError(404, 'Prenotazione non trovata')

    return {
      id: reservation.id,
      type: 'mainEvent',
      status: reservation.status,
      playerName: reservation.playerName,
      playerEmail: reservation.playerEmail,
      notes: reservation.notes,
      consentGiven: reservation.consentGiven,
      consentDate: reservation.consentDate,
      createdAt: reservation.createdAt,
      updatedAt: reservation.updatedAt,
      holdExpiresAt: reservation.holdExpiresAt,
      invitedByName: reservation.invitedBy ? (accountFieldsFor(reservation.invitedBy, authBySupabaseId).accountName || accountFieldsFor(reservation.invitedBy, authBySupabaseId).accountEmail) : null,
      ...accountFieldsFor(reservation.user, authBySupabaseId),
      title: reservation.mainEvent?.title || 'Main Event',
      subtitle: null,
      day: reservation.day,
      slotTime: reservation.slot,
      table: null,
    }
  }

  if (type === 'admission') {
    const admission = await prisma.eventAdmission.findFirst({
      where: { id: reservationId, eventId },
      select: {
        id: true,
        status: true,
        day: true,
        pricePaid: true,
        playerName: true,
        playerEmail: true,
        consentGiven: true,
        consentDate: true,
        createdAt: true,
        updatedAt: true,
        holdExpiresAt: true,
        user: { select: { supabaseUserId: true, nickname: true } },
        invitedBy: { select: { supabaseUserId: true, nickname: true } },
      },
    })
    if (!admission) throw createHttpError(404, 'Prenotazione non trovata')

    return {
      id: admission.id,
      type: 'admission',
      status: admission.status,
      playerName: admission.playerName,
      playerEmail: admission.playerEmail,
      notes: null,
      consentGiven: admission.consentGiven,
      consentDate: admission.consentDate,
      createdAt: admission.createdAt,
      updatedAt: admission.updatedAt,
      holdExpiresAt: admission.holdExpiresAt,
      invitedByName: admission.invitedBy ? (accountFieldsFor(admission.invitedBy, authBySupabaseId).accountName || accountFieldsFor(admission.invitedBy, authBySupabaseId).accountEmail) : null,
      ...accountFieldsFor(admission.user, authBySupabaseId),
      title: 'Pass ingresso',
      subtitle: admission.pricePaid != null ? `EUR ${Number(admission.pricePaid).toFixed(2)}` : null,
      day: admission.day || null,
      slotTime: null,
      table: null,
    }
  }

  throw createHttpError(400, 'Tipo prenotazione non valido')
}

// Sposta una prenotazione esistente su un'altra sessione (tavolo one-shot, o
// gruppo mainEvent+giorno+fascia) — usato quando una sessione salta o due
// vengono accorpate e i giocatori già prenotati vanno ricollocati altrove
// senza farli ripassare dal carrello. targetSlotId è sempre un EventSlot: per
// le one-shot identifica direttamente il tavolo di destinazione, per i main
// event serve solo a leggere il gruppo (mainEventId, day, slot) a cui
// appartiene, perché le prenotazioni main event non sono legate a un tavolo
// preciso.
export async function moveEventReservationToSlot({ eventId, type, reservationId, targetSlotId }) {
  if (!targetSlotId) {
    throw createHttpError(400, 'Seleziona una sessione di destinazione.')
  }

  if (type === 'oneshot') {
    const [reservation, targetSlot] = await Promise.all([
      prisma.reservation.findFirst({
        where: { id: reservationId, slot: { eventId } },
        select: { id: true, userId: true, slotId: true },
      }),
      prisma.eventSlot.findFirst({
        where: { id: targetSlotId, eventId },
        select: { id: true, oneshotId: true, maxPlayers: true },
      }),
    ])
    if (!reservation) throw createHttpError(404, 'Prenotazione non trovata')
    if (!targetSlot) throw createHttpError(404, 'Tavolo di destinazione non trovato')
    if (!targetSlot.oneshotId) throw createHttpError(400, 'Il tavolo di destinazione non è assegnato a nessuna one shot.')
    if (targetSlot.id === reservation.slotId) throw createHttpError(400, 'La prenotazione è già in questa sessione.')

    if (reservation.userId) {
      const clash = await prisma.reservation.findFirst({
        where: { userId: reservation.userId, slotId: targetSlot.id },
        select: { id: true },
      })
      if (clash) throw createHttpError(409, 'Questo giocatore ha già una prenotazione nella sessione di destinazione.')
    }

    const activeCount = await prisma.reservation.count({
      where: { slotId: targetSlot.id, status: { in: ACTIVE_RESERVATION_STATUSES } },
    })
    if (activeCount >= targetSlot.maxPlayers) {
      throw createHttpError(409, 'Il tavolo di destinazione è al completo.')
    }

    await prisma.reservation.update({ where: { id: reservationId }, data: { slotId: targetSlot.id } })
    return getEventReservationDetail({ eventId, type, reservationId })
  }

  if (type === 'mainEvent') {
    const [reservation, targetSlot] = await Promise.all([
      prisma.mainEventReservation.findFirst({
        where: { id: reservationId, eventId },
        select: { id: true, userId: true, mainEventId: true, day: true, slot: true },
      }),
      prisma.eventSlot.findFirst({
        where: { id: targetSlotId, eventId },
        select: { id: true, mainEventId: true, day: true, slot: true },
      }),
    ])
    if (!reservation) throw createHttpError(404, 'Prenotazione non trovata')
    if (!targetSlot || !targetSlot.mainEventId) throw createHttpError(400, 'Il tavolo di destinazione non è assegnato a nessun main event.')

    const isSameSession = targetSlot.mainEventId === reservation.mainEventId
      && targetSlot.day === reservation.day
      && targetSlot.slot === reservation.slot
    if (isSameSession) throw createHttpError(400, 'La prenotazione è già in questa sessione.')

    if (reservation.userId) {
      const clash = await prisma.mainEventReservation.findFirst({
        where: { userId: reservation.userId, mainEventId: targetSlot.mainEventId, eventId, day: targetSlot.day, slot: targetSlot.slot },
        select: { id: true },
      })
      if (clash) throw createHttpError(409, 'Questo giocatore ha già una prenotazione nella sessione di destinazione.')
    }

    const [groupSlots, activeCount] = await Promise.all([
      prisma.eventSlot.findMany({
        where: { eventId, mainEventId: targetSlot.mainEventId, day: targetSlot.day, slot: targetSlot.slot },
        select: { maxPlayers: true },
      }),
      prisma.mainEventReservation.count({
        where: { eventId, mainEventId: targetSlot.mainEventId, day: targetSlot.day, slot: targetSlot.slot, status: { in: ACTIVE_MAIN_EVENT_RESERVATION_STATUSES } },
      }),
    ])
    const groupCapacity = groupSlots.reduce((sum, groupSlot) => sum + groupSlot.maxPlayers, 0)
    if (activeCount >= groupCapacity) {
      throw createHttpError(409, 'La sessione di destinazione è al completo.')
    }

    await prisma.mainEventReservation.update({
      where: { id: reservationId },
      data: { mainEventId: targetSlot.mainEventId, day: targetSlot.day, slot: targetSlot.slot },
    })
    return getEventReservationDetail({ eventId, type, reservationId })
  }

  throw createHttpError(400, 'Questo tipo di prenotazione non può essere spostato.')
}

// Stati che l'admin può impostare direttamente dal form di modifica.
// CANCELLED resta un'azione a parte (pulsante "Annulla", con motivo e audit
// trail); HOLD/EXPIRED/INVITED sono stati gestiti dal ciclo di vita
// automatico del carrello, non qualcosa da impostare a mano.
const EDITABLE_STATUSES = new Set(['PENDING', 'CONFIRMED', 'ATTENDED'])

// Modifica i campi di una prenotazione (nome/email giocatore, note, stato)
// dalla pagina di dettaglio in admin. Annullamento ed eliminazione restano
// azioni separate (cancelEventReservation / deleteEventReservation) per
// mantenere il motivo obbligatorio e l'audit trail sull'annullamento.
export async function updateEventReservationFields({ eventId, type, reservationId, body }) {
  const playerName = typeof body?.playerName === 'string' ? (body.playerName.trim() || null) : undefined
  const playerEmail = typeof body?.playerEmail === 'string' ? (body.playerEmail.trim() || null) : undefined
  const notes = typeof body?.notes === 'string' ? (body.notes.trim() || null) : undefined
  const status = typeof body?.status === 'string' && body.status ? body.status : undefined

  if (status !== undefined && !EDITABLE_STATUSES.has(status)) {
    throw createHttpError(400, 'Stato non valido. Usa "Annulla prenotazione" per annullarla.')
  }

  const data = {}
  if (playerName !== undefined) data.playerName = playerName
  if (playerEmail !== undefined) data.playerEmail = playerEmail
  if (status !== undefined) data.status = status

  if (type === 'oneshot') {
    if (notes !== undefined) data.notes = notes
    const existing = await prisma.reservation.findFirst({ where: { id: reservationId, slot: { eventId } }, select: { id: true } })
    if (!existing) throw createHttpError(404, 'Prenotazione non trovata')
    await prisma.reservation.update({ where: { id: reservationId }, data })
    return getEventReservationDetail({ eventId, type, reservationId })
  }

  if (type === 'mainEvent') {
    if (notes !== undefined) data.notes = notes
    const existing = await prisma.mainEventReservation.findFirst({ where: { id: reservationId, eventId }, select: { id: true } })
    if (!existing) throw createHttpError(404, 'Prenotazione non trovata')
    await prisma.mainEventReservation.update({ where: { id: reservationId }, data })
    return getEventReservationDetail({ eventId, type, reservationId })
  }

  if (type === 'admission') {
    const existing = await prisma.eventAdmission.findFirst({ where: { id: reservationId, eventId }, select: { id: true } })
    if (!existing) throw createHttpError(404, 'Prenotazione non trovata')
    await prisma.eventAdmission.update({ where: { id: reservationId }, data })
    return getEventReservationDetail({ eventId, type, reservationId })
  }

  throw createHttpError(400, 'Tipo prenotazione non valido')
}
