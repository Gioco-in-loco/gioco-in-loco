const SESSION_STORAGE_KEY = 'gil.analytics.session'
const LAST_PAGE_VIEW_KEY = 'gil.analytics.last-page-view'
const VISITOR_STORAGE_KEY = 'gil.analytics.visitor'
const DEDUPE_WINDOW_MS = 1500

function readSessionStorage(key) {
  try {
    return window.sessionStorage.getItem(key)
  } catch {
    return null
  }
}

function writeSessionStorage(key, value) {
  try {
    window.sessionStorage.setItem(key, value)
  } catch {
    // Ignore storage failures and keep analytics best-effort.
  }
}

function readLocalStorage(key) {
  try {
    return window.localStorage.getItem(key)
  } catch {
    return null
  }
}

function writeLocalStorage(key, value) {
  try {
    window.localStorage.setItem(key, value)
  } catch {
    // Ignore storage failures and keep analytics best-effort.
  }
}

function createKey() {
  return typeof crypto !== 'undefined' && crypto.randomUUID
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`
}

function getSessionKey() {
  const existing = readSessionStorage(SESSION_STORAGE_KEY)
  if (existing) {
    return existing
  }

  const nextKey = createKey()

  writeSessionStorage(SESSION_STORAGE_KEY, nextKey)
  return nextKey
}

function getVisitorKey() {
  const existing = readLocalStorage(VISITOR_STORAGE_KEY)
  if (existing) {
    return existing
  }

  const nextKey = createKey()
  writeLocalStorage(VISITOR_STORAGE_KEY, nextKey)
  return nextKey
}

function detectDeviceType(userAgent) {
  if (/bot|crawler|spider|crawling/i.test(userAgent)) return 'BOT'
  if (/ipad|tablet|playbook|silk/i.test(userAgent)) return 'TABLET'
  if (/mobi|android|iphone|ipod/i.test(userAgent)) return 'MOBILE'
  return 'DESKTOP'
}

function detectBrowser(userAgent) {
  if (/edg/i.test(userAgent)) return 'Edge'
  if (/opr|opera/i.test(userAgent)) return 'Opera'
  if (/chrome|crios/i.test(userAgent)) return 'Chrome'
  if (/firefox|fxios/i.test(userAgent)) return 'Firefox'
  if (/safari/i.test(userAgent) && !/chrome|crios|android/i.test(userAgent)) return 'Safari'
  return 'Altro'
}

function detectOs(userAgent) {
  if (/windows/i.test(userAgent)) return 'Windows'
  if (/android/i.test(userAgent)) return 'Android'
  if (/iphone|ipad|ipod/i.test(userAgent)) return 'iOS'
  if (/mac os x|macintosh/i.test(userAgent)) return 'macOS'
  if (/linux/i.test(userAgent)) return 'Linux'
  return 'Altro'
}

function shouldSkipDuplicatePageView(path) {
  const raw = readSessionStorage(LAST_PAGE_VIEW_KEY)
  if (!raw) {
    return false
  }

  const [lastPath, lastTimestamp] = raw.split('|')
  if (lastPath !== path) {
    return false
  }

  return Date.now() - Number(lastTimestamp) < DEDUPE_WINDOW_MS
}

function markPageView(path) {
  writeSessionStorage(LAST_PAGE_VIEW_KEY, `${path}|${Date.now()}`)
}

async function dispatchAnalytics(payload) {
  const body = JSON.stringify(payload)

  if (navigator.sendBeacon) {
    const blob = new Blob([body], { type: 'application/json' })
    navigator.sendBeacon('/api/analytics', blob)
    return
  }

  await fetch('/api/analytics', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'same-origin',
    keepalive: true,
    body,
  }).catch(() => {})
}

function buildBasePayload(path) {
  const userAgent = navigator.userAgent || ''

  return {
    sessionKey: getSessionKey(),
    visitorKey: getVisitorKey(),
    path,
    referrer: document.referrer || null,
    pageTitle: document.title || null,
    deviceType: detectDeviceType(userAgent),
    browser: detectBrowser(userAgent),
    os: detectOs(userAgent),
  }
}

export function trackPageView(path) {
  if (!path || shouldSkipDuplicatePageView(path)) {
    return
  }

  markPageView(path)
  void dispatchAnalytics({
    ...buildBasePayload(path),
    type: 'PAGE_VIEW',
    name: 'page_view',
  })
}

export function trackAnalyticsEvent(name, eventData = {}) {
  const path = window.location.pathname || '/'

  void dispatchAnalytics({
    ...buildBasePayload(path),
    type: 'CUSTOM',
    name,
    eventData,
  })
}