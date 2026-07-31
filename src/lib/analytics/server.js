import { prisma } from '../prisma'

const MAX_RETENTION_DAYS = 90
const CLEANUP_INTERVAL_MS = 6 * 60 * 60 * 1000
const VALID_EVENT_TYPES = new Set(['PAGE_VIEW', 'CUSTOM'])
const VALID_DEVICE_TYPES = new Set(['DESKTOP', 'MOBILE', 'TABLET', 'BOT', 'UNKNOWN'])

let lastCleanupAt = 0

function clampText(value, maxLength = 120) {
  if (typeof value !== 'string') return null
  const normalized = value.trim()
  if (!normalized) return null
  return normalized.slice(0, maxLength)
}

function normalizePath(value) {
  if (typeof value !== 'string') return '/'

  const normalized = value.trim()
  if (!normalized.startsWith('/')) return '/'

  const [pathname] = normalized.split(/[?#]/)
  return pathname.slice(0, 200) || '/'
}

function normalizeSessionKey(value) {
  if (typeof value !== 'string') return null
  const normalized = value.trim()
  if (!normalized) return null
  return normalized.slice(0, 100)
}

function normalizeVisitorKey(value) {
  if (typeof value !== 'string') return null
  const normalized = value.trim()
  if (!normalized) return null
  return normalized.slice(0, 100)
}

function normalizeEventName(value, type) {
  if (type === 'PAGE_VIEW') {
    return 'page_view'
  }

  const base = typeof value === 'string' ? value.trim().toLowerCase() : ''
  if (!base) return 'custom_event'
  return base.replace(/[^a-z0-9:_-]+/g, '_').slice(0, 80)
}

function normalizeReferrer(value) {
  if (typeof value !== 'string') return null

  const normalized = value.trim()
  if (!normalized) return null

  try {
    const url = new URL(normalized)
    return clampText(url.hostname.replace(/^www\./, ''), 120)
  } catch {
    return null
  }
}

function normalizeDeviceType(value) {
  return VALID_DEVICE_TYPES.has(value) ? value : 'UNKNOWN'
}

function normalizeEventData(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return null
  }

  const safeEntries = Object.entries(value)
    .slice(0, 10)
    .map(([key, item]) => [clampText(key, 40), clampText(String(item), 160)])
    .filter(([key, item]) => key && item)

  return safeEntries.length > 0 ? Object.fromEntries(safeEntries) : null
}

async function maybeCleanupExpiredAnalytics() {
  const now = Date.now()
  if (now - lastCleanupAt < CLEANUP_INTERVAL_MS) {
    return
  }

  lastCleanupAt = now
  const cutoff = new Date(now - MAX_RETENTION_DAYS * 24 * 60 * 60 * 1000)

  await prisma.$transaction([
    prisma.analyticsEvent.deleteMany({ where: { occurredAt: { lt: cutoff } } }),
    prisma.analyticsSession.deleteMany({ where: { lastSeenAt: { lt: cutoff } } }),
  ]).catch(() => {})
}

export async function recordAnalyticsEvent(payload) {
  const sessionKey = normalizeSessionKey(payload?.sessionKey)
  if (!sessionKey) {
    return { ok: false, status: 400, error: 'Sessione analytics non valida' }
  }

  const visitorKey = normalizeVisitorKey(payload?.visitorKey)
  if (!visitorKey) {
    return { ok: false, status: 400, error: 'Visitatore analytics non valido' }
  }

  const type = VALID_EVENT_TYPES.has(payload?.type) ? payload.type : 'PAGE_VIEW'
  const path = normalizePath(payload?.path)
  const referrer = normalizeReferrer(payload?.referrer)
  const pageTitle = clampText(payload?.pageTitle, 160)
  const browser = clampText(payload?.browser, 60)
  const os = clampText(payload?.os, 60)
  const deviceType = normalizeDeviceType(payload?.deviceType)
  const eventData = normalizeEventData(payload?.eventData)

  await maybeCleanupExpiredAnalytics()

  await prisma.$transaction(async (tx) => {
    const session = await tx.analyticsSession.upsert({
      where: { sessionKey },
      create: {
        sessionKey,
        visitorKey,
        landingPath: path,
        lastPath: path,
        referrer,
        deviceType,
        browser,
        os,
      },
      update: {
        visitorKey,
        lastPath: path,
        lastSeenAt: new Date(),
        referrer: referrer || undefined,
        deviceType,
        browser: browser || undefined,
        os: os || undefined,
      },
      select: { id: true },
    })

    await tx.analyticsEvent.create({
      data: {
        sessionId: session.id,
        type,
        name: normalizeEventName(payload?.name, type),
        path,
        referrer,
        pageTitle,
        eventData,
      },
    })
  })

  return { ok: true, status: 204 }
}