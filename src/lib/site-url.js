const PUBLIC_SITE_URL_KEY = 'NEXT_PUBLIC_SITE_URL'

function normalizeOrigin(value, defaultProtocol = 'https') {
  if (typeof value !== 'string') return null

  const trimmed = value.trim()
  if (!trimmed) return null

  const withProtocol = /^https?:\/\//i.test(trimmed)
    ? trimmed
    : `${defaultProtocol}://${trimmed}`

  try {
    const url = new URL(withProtocol)
    return `${url.protocol}//${url.host}`
  } catch {
    return null
  }
}

export function getConfiguredSiteUrl() {
  return normalizeOrigin(process.env[PUBLIC_SITE_URL_KEY], 'https')
}

export function getBrowserSiteUrl() {
  const configuredSiteUrl = getConfiguredSiteUrl()
  if (configuredSiteUrl) {
    return configuredSiteUrl
  }

  if (typeof window !== 'undefined' && window.location?.origin) {
    return window.location.origin
  }

  return null
}

export function getRequestSiteUrl(request) {
  const configuredSiteUrl = getConfiguredSiteUrl()
  if (configuredSiteUrl) {
    return configuredSiteUrl
  }

  const forwardedProto = request?.headers?.get?.('x-forwarded-proto')
  const forwardedHost = request?.headers?.get?.('x-forwarded-host')
  const host = forwardedHost || request?.headers?.get?.('host')
  const protocol = forwardedProto?.split(',')[0]?.trim() || (process.env.NODE_ENV === 'development' ? 'http' : 'https')

  if (host) {
    const normalized = normalizeOrigin(`${protocol}://${host.split(',')[0].trim()}`, protocol)
    if (normalized) {
      return normalized
    }
  }

  return normalizeOrigin(request?.url, process.env.NODE_ENV === 'development' ? 'http' : 'https')
}

export function buildAbsoluteUrl(path, siteUrl) {
  return new URL(path, siteUrl).toString()
}