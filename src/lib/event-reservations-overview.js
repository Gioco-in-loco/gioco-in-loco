import { prisma } from './prisma'
import { createSupabaseServiceClient, isServiceRoleConfigured } from './supabase/service'

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
  }
}

// Admin-facing: every reservation (one-shot + main event + admission pass)
// for an entire event, in one flat list — used by the "Prenotazioni" tab to
// let an admin search across all bookings by player/account name, something
// no existing view does (they're all scoped to a single slot or user).
export async function getEventAllReservations({ eventId }) {
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
        user: { select: { supabaseUserId: true } },
        invitedBy: { select: { supabaseUserId: true } },
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
        user: { select: { supabaseUserId: true } },
        invitedBy: { select: { supabaseUserId: true } },
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
        createdAt: true,
        user: { select: { supabaseUserId: true } },
      },
    }),
  ])

  const authBySupabaseId = await buildAuthLookup()

  const rows = [
    ...oneshotReservations.map((reservation) => ({
      id: reservation.id,
      type: 'oneshot',
      userId: reservation.userId,
      status: reservation.status,
      playerName: reservation.playerName,
      playerEmail: reservation.playerEmail,
      invitedByName: reservation.invitedBy ? (accountFieldsFor(reservation.invitedBy, authBySupabaseId).accountName || accountFieldsFor(reservation.invitedBy, authBySupabaseId).accountEmail) : null,
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
      playerName: reservation.playerName,
      playerEmail: reservation.playerEmail,
      invitedByName: reservation.invitedBy ? (accountFieldsFor(reservation.invitedBy, authBySupabaseId).accountName || accountFieldsFor(reservation.invitedBy, authBySupabaseId).accountEmail) : null,
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
      playerName: null,
      playerEmail: null,
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
      await tx.userFeedback.create({
        data: {
          userId: reservation.userId,
          reservationId: reservation.id,
          authorUserId: actorUserId,
          type: 'ADMIN_RESERVATION_CANCELLATION',
          message,
        },
      })
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
      await tx.userFeedback.create({
        data: {
          userId: reservation.userId,
          mainEventReservationId: reservation.id,
          authorUserId: actorUserId,
          type: 'ADMIN_RESERVATION_CANCELLATION',
          message,
        },
      })
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
      await tx.userFeedback.create({
        data: {
          userId: admission.userId,
          eventAdmissionId: admission.id,
          authorUserId: actorUserId,
          type: 'ADMIN_RESERVATION_CANCELLATION',
          message,
        },
      })
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
