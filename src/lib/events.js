import { cache } from 'react'
import { prisma } from './prisma'

const globalForUpcomingEvent = globalThis

function isBuildPhase() {
  return process.env.NEXT_PHASE === 'phase-production-build'
}

export async function fetchUpcomingEvent() {
  if (isBuildPhase()) {
    return null
  }

  const now = new Date()

  let event

  try {
    ;[event] = await prisma.$queryRaw`
      SELECT
        id,
        "externalId",
        name,
        location,
        "startDate",
        "endDate"
      FROM events
      WHERE (
        ("endDate" IS NOT NULL AND "endDate" >= ${now})
        OR (
          "endDate" IS NULL
          AND "startDate" IS NOT NULL
          AND "startDate" >= ${now}
        )
      )
      ORDER BY "startDate" ASC
      LIMIT 1
    `
  } catch (error) {
    if (!globalForUpcomingEvent.__upcomingEventErrorLogged) {
      console.warn('Failed to load upcoming event:', error?.message || error)
      globalForUpcomingEvent.__upcomingEventErrorLogged = true
    }

    return null
  }

  if (!event) {
    return null
  }

  return {
    ...event,
    startDate: event.startDate ? event.startDate.toISOString() : null,
    endDate: event.endDate ? event.endDate.toISOString() : null,
  }
}

// Only safe to memoize within a single Server Component render pass — do not
// use this from Route Handlers, where React's per-request cache scope does
// not apply and the result can leak stale data across requests.
export const getUpcomingEvent = cache(fetchUpcomingEvent)