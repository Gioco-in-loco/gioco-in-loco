import { prisma } from './prisma'
import { EVENT_CART_HOLD_STATUS, getNextHoldExpiration } from './event-booking'
import { sendCompanionInviteRedeemedEmail } from './event-booking-notifications'

const ACTIVE_RESERVATION_STATUSES = ['HOLD', 'PENDING', 'CONFIRMED', 'ATTENDED', 'INVITED']

function createInviteError(message, status) {
  const error = new Error(message)
  error.status = status
  return error
}

async function findGroupRows(code, db = prisma) {
  const [reservations, mainEventReservations] = await Promise.all([
    db.reservation.findMany({
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
    db.mainEventReservation.findMany({
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

  return [
    ...reservations.map((row) => ({ type: 'oneshot', row })),
    ...mainEventReservations.map((row) => ({ type: 'main-event', row })),
  ]
}

function summarizeSession(type, row) {
  if (type === 'oneshot') {
    const event = row.slot.oneshot.eventLinks[0]?.event || null
    return {
      id: row.id,
      type,
      activityTitle: row.slot.oneshot.title,
      price: row.slot.oneshot.price ?? null,
      day: row.slot.day,
      slot: row.slot.slot,
      table: row.slot.table,
      event,
    }
  }

  return {
    id: row.id,
    type,
    activityTitle: row.mainEvent.title,
    price: row.mainEvent.price ?? null,
    day: row.day,
    slot: row.slot,
    table: null,
    event: row.event,
  }
}

function isEntryExpired({ row }, now) {
  const expiredByTime = row.status === 'INVITED' && row.holdExpiresAt && row.holdExpiresAt <= now
  return row.status === 'EXPIRED' || row.status === 'CANCELLED' || expiredByTime
}

export async function getInviteByCode(code, { db = prisma } = {}) {
  if (!code) {
    return { state: 'not_found' }
  }

  const group = await findGroupRows(code, db)
  if (group.length === 0) {
    return { state: 'not_found' }
  }

  const now = new Date()
  const email = group[0].row.playerEmail
  const name = group[0].row.playerName

  // A code is single-use: once any row in the group carries a claimedAt, the
  // whole invite is considered redeemed and can never be picked from again.
  if (group.some(({ row }) => row.claimedAt)) {
    return {
      state: 'claimed',
      email,
      name,
      sessions: group.map(({ type, row }) => ({
        ...summarizeSession(type, row),
        accepted: row.status !== 'CANCELLED' && row.status !== 'EXPIRED',
      })),
    }
  }

  if (group.every((entry) => isEntryExpired(entry, now))) {
    return {
      state: 'expired',
      email,
      name,
      sessions: group.map(({ type, row }) => summarizeSession(type, row)),
    }
  }

  const validEntries = group.filter((entry) => !isEntryExpired(entry, now))
  const expiresAt = validEntries
    .map(({ row }) => row.holdExpiresAt)
    .filter(Boolean)
    .sort((a, b) => a - b)[0] || null

  return {
    state: 'valid',
    email,
    name,
    expiresAt: expiresAt ? expiresAt.toISOString() : null,
    sessions: validEntries.map(({ type, row }) => summarizeSession(type, row)),
  }
}

export async function claimInvite({ code, user, acceptedIds = [], db = prisma }) {
  const { accepted, declined, email, name } = await db.$transaction(async (tx) => {
    const group = await findGroupRows(code, tx)
    if (group.length === 0) {
      throw createInviteError('Invito non trovato.', 404)
    }

    const now = new Date()
    const email = group[0].row.playerEmail
    const name = group[0].row.playerName
    const invitedByUserId = group[0].row.invitedByUserId

    if (group.some(({ row }) => row.claimedAt)) {
      throw createInviteError('Questo invito è già stato utilizzato.', 409)
    }

    if (group.every((entry) => isEntryExpired(entry, now))) {
      throw createInviteError('Questo invito è scaduto.', 410)
    }

    if (String(user.email || '').trim().toLowerCase() !== String(email || '').trim().toLowerCase()) {
      throw createInviteError('Questo invito è associato a un\'altra email.', 403)
    }

    const acceptedIdSet = new Set((acceptedIds || []).map(String))
    const holdExpiresAt = getNextHoldExpiration()
    const accepted = []
    const declined = []

    for (const entry of group) {
      const { type, row } = entry
      // Rows that had already lapsed on their own (independently of this
      // claim) are left untouched — they're neither accepted nor declined.
      if (isEntryExpired(entry, now)) continue

      const isAccepted = acceptedIdSet.has(String(row.id))

      if (isAccepted && type === 'oneshot') {
        const conflicting = await tx.reservation.findUnique({
          where: { userId_slotId: { userId: user.id, slotId: row.slotId } },
          select: { id: true, status: true },
        })
        if (conflicting && ACTIVE_RESERVATION_STATUSES.includes(conflicting.status)) {
          throw createInviteError('Hai già una prenotazione per questa sessione.', 409)
        }
        await tx.reservation.update({
          where: { id: row.id },
          data: {
            userId: user.id,
            status: EVENT_CART_HOLD_STATUS,
            holdExpiresAt,
            claimedAt: now,
            consentGiven: true,
            consentDate: now,
          },
        })
        accepted.push({ ...summarizeSession(type, row), holdExpiresAt: holdExpiresAt.toISOString() })
      } else if (isAccepted) {
        const conflicting = await tx.mainEventReservation.findUnique({
          where: { userId_mainEventId_eventId_day_slot: { userId: user.id, mainEventId: row.mainEventId, eventId: row.eventId, day: row.day, slot: row.slot } },
          select: { id: true, status: true },
        })
        if (conflicting && ACTIVE_RESERVATION_STATUSES.includes(conflicting.status)) {
          throw createInviteError('Hai già una prenotazione per questa sessione.', 409)
        }
        await tx.mainEventReservation.update({
          where: { id: row.id },
          data: {
            userId: user.id,
            status: EVENT_CART_HOLD_STATUS,
            holdExpiresAt,
            claimedAt: now,
            consentGiven: true,
            consentDate: now,
          },
        })
        accepted.push({ ...summarizeSession(type, row), holdExpiresAt: holdExpiresAt.toISOString() })
      } else if (type === 'oneshot') {
        await tx.reservation.update({
          where: { id: row.id },
          data: { status: 'CANCELLED', holdExpiresAt: null, claimedAt: now },
        })
        declined.push(summarizeSession(type, row))
      } else {
        await tx.mainEventReservation.update({
          where: { id: row.id },
          data: { status: 'CANCELLED', holdExpiresAt: null, claimedAt: now },
        })
        declined.push(summarizeSession(type, row))
      }
    }

    // The daily pass rides along with the session claim: a day is only held
    // for the friend if at least one session of that (event, day) pair was
    // accepted, otherwise it's released with the rest of the declined day.
    const dayKey = (eventId, day) => `${eventId}__${day}`
    const acceptedDayKeys = new Set(
      accepted.filter((s) => s.event?.id && s.day).map((s) => dayKey(s.event.id, s.day))
    )
    const allDays = new Map()
    for (const session of [...accepted, ...declined]) {
      if (session.event?.id && session.day) {
        allDays.set(dayKey(session.event.id, session.day), { eventId: session.event.id, day: session.day })
      }
    }

    for (const [key, { eventId, day }] of allDays) {
      const admissionWhere = { invitedByUserId, eventId, day, playerEmail: email, status: 'INVITED' }
      if (acceptedDayKeys.has(key)) {
        await tx.eventAdmission.updateMany({
          where: admissionWhere,
          data: { userId: user.id, status: EVENT_CART_HOLD_STATUS, holdExpiresAt, consentGiven: true, consentDate: now },
        })
      } else {
        await tx.eventAdmission.updateMany({
          where: admissionWhere,
          data: { status: 'CANCELLED', holdExpiresAt: null },
        })
      }
    }

    return { accepted, declined, email, name }
  })

  try {
    await sendCompanionInviteRedeemedEmail({ email, name, accepted, declined })
  } catch (notificationError) {
    console.error('Failed to send companion invite redeemed email:', notificationError)
  }

  return { accepted, declined }
}
