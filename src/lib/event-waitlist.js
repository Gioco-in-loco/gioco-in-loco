import { prisma } from './prisma'
import { isDayFullyBooked } from './event-booking'
import { getBookableEventConfigByEventId } from './bookable-events'
import { sendWaitlistSpotAvailableEmail } from './event-booking-notifications'
import { createSupabaseServiceClient, isServiceRoleConfigured } from './supabase/service'

function createHttpError(status, message) {
  const error = new Error(message)
  error.status = status
  return error
}

export async function getUserWaitlistDays({ eventId, userId, db = prisma }) {
  const entries = await db.eventWaitlist.findMany({
    where: { userId, eventId },
    select: { day: true },
  })
  return entries.map((entry) => entry.day)
}

export async function joinWaitlist({ eventId, userId, day }) {
  if (!day) {
    throw createHttpError(400, 'Giorno non valido.')
  }

  const full = await isDayFullyBooked(eventId, day)
  if (!full) {
    throw createHttpError(400, 'Ci sono ancora posti disponibili per questo giorno: non è necessario iscriversi in lista d\'attesa.')
  }

  await prisma.eventWaitlist.upsert({
    where: { userId_eventId_day: { userId, eventId, day } },
    update: {},
    create: { userId, eventId, day },
  })
}

export async function leaveWaitlist({ eventId, userId, day }) {
  await prisma.eventWaitlist.deleteMany({
    where: { userId, eventId, day },
  })
}

async function buildAuthLookup() {
  if (!isServiceRoleConfigured()) return new Map()

  const admin = createSupabaseServiceClient()
  const { data } = await admin.auth.admin.listUsers({ perPage: 1000 })
  return new Map((data?.users || []).map((authUser) => [authUser.id, authUser]))
}

// Admin-facing: list every waitlist entry for an event, grouped by day, with
// the subscriber's email/name resolved from Supabase auth (not stored in the
// Prisma User row). Used by the admin panel to review who's waiting before
// deciding to notify them.
export async function getEventWaitlistOverview(eventId) {
  const entries = await prisma.eventWaitlist.findMany({
    where: { eventId },
    orderBy: [{ day: 'asc' }, { createdAt: 'asc' }],
    select: {
      id: true,
      day: true,
      createdAt: true,
      notifiedAt: true,
      user: { select: { supabaseUserId: true } },
    },
  })

  const authBySupabaseId = await buildAuthLookup()

  const groupsByDay = new Map()
  for (const entry of entries) {
    const authUser = entry.user.supabaseUserId ? authBySupabaseId.get(entry.user.supabaseUserId) : null

    if (!groupsByDay.has(entry.day)) {
      groupsByDay.set(entry.day, [])
    }

    groupsByDay.get(entry.day).push({
      id: entry.id,
      createdAt: entry.createdAt,
      notifiedAt: entry.notifiedAt,
      email: authUser?.email || null,
      name: authUser?.user_metadata?.full_name || authUser?.user_metadata?.name || null,
    })
  }

  return Array.from(groupsByDay.entries()).map(([day, waitlistEntries]) => ({ day, entries: waitlistEntries }))
}

// Admin-triggered: emails every not-yet-notified waitlist entry for the given
// event+day and marks them notified. Does NOT check whether the day is still
// full — the admin decides when a spot has actually opened up.
export async function sendWaitlistNotifications({ eventId, day }) {
  if (!day) {
    throw createHttpError(400, 'Giorno non valido.')
  }

  const waitlistEntries = await prisma.eventWaitlist.findMany({
    where: { eventId, day, notifiedAt: null },
    select: {
      id: true,
      user: { select: { supabaseUserId: true } },
    },
  })

  if (waitlistEntries.length === 0) {
    return { sentCount: 0 }
  }

  const event = await prisma.event.findUnique({
    where: { id: eventId },
    select: { id: true, name: true },
  })
  if (!event) {
    throw createHttpError(404, 'Evento non trovato')
  }

  await prisma.eventWaitlist.updateMany({
    where: { id: { in: waitlistEntries.map((entry) => entry.id) } },
    data: { notifiedAt: new Date() },
  })

  if (!isServiceRoleConfigured()) {
    return { sentCount: 0 }
  }

  const authBySupabaseId = await buildAuthLookup()
  const routeBasePath = getBookableEventConfigByEventId(eventId)?.routeBasePath || null

  const results = await Promise.allSettled(waitlistEntries.map((entry) => {
    const authUser = entry.user.supabaseUserId ? authBySupabaseId.get(entry.user.supabaseUserId) : null
    if (!authUser?.email) return Promise.resolve(false)

    return sendWaitlistSpotAvailableEmail({
      user: {
        email: authUser.email,
        name: authUser.user_metadata?.full_name || authUser.user_metadata?.name || null,
      },
      event,
      day,
      routeBasePath,
    }).then(() => true)
  }))

  const sentCount = results.filter((result) => result.status === 'fulfilled' && result.value).length
  return { sentCount }
}
