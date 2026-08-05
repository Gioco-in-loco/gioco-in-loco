import { prisma } from './prisma'
import { sendCompanionClaimConfirmationEmail } from './event-booking-notifications'

function createInviteError(message, status) {
  const error = new Error(message)
  error.status = status
  return error
}

async function findInviteRows(code, db = prisma) {
  const [reservation, mainEventReservation] = await Promise.all([
    db.reservation.findUnique({
      where: { inviteCode: code },
      select: {
        id: true,
        status: true,
        holdExpiresAt: true,
        claimedAt: true,
        playerName: true,
        playerEmail: true,
        slotId: true,
        userId: true,
        invitedByUserId: true,
        slot: {
          select: {
            day: true,
            slot: true,
            table: true,
            oneshot: {
              select: {
                title: true,
                price: true,
                eventLinks: { select: { event: { select: { id: true, name: true, location: true } } } },
              },
            },
          },
        },
      },
    }),
    db.mainEventReservation.findUnique({
      where: { inviteCode: code },
      select: {
        id: true,
        status: true,
        holdExpiresAt: true,
        claimedAt: true,
        playerName: true,
        playerEmail: true,
        mainEventId: true,
        eventId: true,
        day: true,
        slot: true,
        userId: true,
        invitedByUserId: true,
        mainEvent: { select: { title: true, price: true } },
        event: { select: { id: true, name: true, location: true } },
      },
    }),
  ])

  if (reservation) return { type: 'oneshot', row: reservation }
  if (mainEventReservation) return { type: 'main-event', row: mainEventReservation }
  return null
}

function summarizeInvite(type, row) {
  if (type === 'oneshot') {
    const event = row.slot.oneshot.eventLinks[0]?.event || null
    return {
      activityTitle: row.slot.oneshot.title,
      price: row.slot.oneshot.price ?? null,
      day: row.slot.day,
      slot: row.slot.slot,
      table: row.slot.table,
      event,
    }
  }

  return {
    activityTitle: row.mainEvent.title,
    price: row.mainEvent.price ?? null,
    day: row.day,
    slot: row.slot,
    table: null,
    event: row.event,
  }
}

export async function getInviteByCode(code, { db = prisma } = {}) {
  if (!code) {
    return { state: 'not_found' }
  }

  const found = await findInviteRows(code, db)
  if (!found) {
    return { state: 'not_found' }
  }

  const { type, row } = found
  const summary = summarizeInvite(type, row)
  const now = new Date()
  const isExpiredByTime = row.status === 'INVITED' && row.holdExpiresAt && row.holdExpiresAt <= now

  if (row.claimedAt || (row.userId && row.status !== 'INVITED')) {
    return { state: 'claimed', ...summary }
  }

  if (row.status === 'EXPIRED' || row.status === 'CANCELLED' || isExpiredByTime) {
    return { state: 'expired', ...summary }
  }

  if (row.status !== 'INVITED') {
    return { state: 'not_found' }
  }

  return {
    state: 'valid',
    email: row.playerEmail,
    name: row.playerName,
    expiresAt: row.holdExpiresAt ? row.holdExpiresAt.toISOString() : null,
    ...summary,
  }
}

export async function claimInvite({ code, user, db = prisma }) {
  const found = await findInviteRows(code, db)
  if (!found) {
    throw createInviteError('Invito non trovato.', 404)
  }

  const { type, row } = found
  const now = new Date()
  const isExpiredByTime = row.status === 'INVITED' && row.holdExpiresAt && row.holdExpiresAt <= now

  if (row.claimedAt || (row.userId && row.status !== 'INVITED')) {
    throw createInviteError('Questo invito è già stato riscattato.', 409)
  }

  if (row.status !== 'INVITED' || isExpiredByTime) {
    throw createInviteError('Questo invito è scaduto.', 410)
  }

  if (String(user.email || '').trim().toLowerCase() !== String(row.playerEmail || '').trim().toLowerCase()) {
    throw createInviteError('Questo invito è associato a un\'altra email.', 403)
  }

  if (type === 'oneshot') {
    const conflicting = await db.reservation.findUnique({
      where: { userId_slotId: { userId: user.id, slotId: row.slotId } },
      select: { id: true, status: true },
    })
    if (conflicting && ['HOLD', 'PENDING', 'CONFIRMED', 'ATTENDED', 'INVITED'].includes(conflicting.status)) {
      throw createInviteError('Hai già una prenotazione per questa sessione.', 409)
    }

    await db.reservation.update({
      where: { id: row.id },
      data: {
        userId: user.id,
        // Matches the host's own one-shot flow (handleConfirmEventCart),
        // which sets CONFIRMED, not PENDING, at checkout.
        status: 'CONFIRMED',
        holdExpiresAt: null,
        claimedAt: now,
        consentGiven: true,
        consentDate: now,
      },
    })
  } else {
    const conflicting = await db.mainEventReservation.findUnique({
      where: { userId_mainEventId_eventId_day_slot: { userId: user.id, mainEventId: row.mainEventId, eventId: row.eventId, day: row.day, slot: row.slot } },
      select: { id: true, status: true },
    })
    if (conflicting && ['HOLD', 'PENDING', 'CONFIRMED', 'ATTENDED', 'INVITED'].includes(conflicting.status)) {
      throw createInviteError('Hai già una prenotazione per questa sessione.', 409)
    }

    await db.mainEventReservation.update({
      where: { id: row.id },
      data: {
        userId: user.id,
        status: 'PENDING',
        holdExpiresAt: null,
        claimedAt: now,
        consentGiven: true,
        consentDate: now,
      },
    })
  }

  const summary = summarizeInvite(type, row)

  // The daily pass rides along with the session claim, matched by
  // day+email rather than its own invite code (see
  // reconcileCompanionAdmissionHolds in event-booking-routes.js) — claiming
  // any one of a companion's session invites for that day also claims it.
  if (summary.event?.id && summary.day && row.invitedByUserId) {
    const admissionConflict = await db.eventAdmission.findUnique({
      where: { userId_eventId_day: { userId: user.id, eventId: summary.event.id, day: summary.day } },
      select: { id: true },
    })

    if (!admissionConflict) {
      await db.eventAdmission.updateMany({
        where: {
          invitedByUserId: row.invitedByUserId,
          eventId: summary.event.id,
          day: summary.day,
          playerEmail: row.playerEmail,
          status: 'INVITED',
        },
        data: {
          userId: user.id,
          // Matches the host's own admission flow (handleConfirmEventCart),
          // which sets CONFIRMED, not PENDING, at checkout.
          status: 'CONFIRMED',
          holdExpiresAt: null,
          consentGiven: true,
          consentDate: now,
        },
      })
    }
  }

  try {
    await sendCompanionClaimConfirmationEmail({
      email: row.playerEmail,
      name: row.playerName,
      event: summary.event,
      activityTitle: summary.activityTitle,
      day: summary.day,
      slot: summary.slot,
      table: summary.table,
      price: summary.price,
    })
  } catch (notificationError) {
    console.error('Failed to send companion claim confirmation email:', notificationError)
  }

  return summary
}
