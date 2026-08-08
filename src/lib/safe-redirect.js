// Only allow same-origin, root-relative redirect targets ("/foo", "/foo?x=1").
// Rejects absolute URLs and protocol-relative ones ("//evil.com") that would
// otherwise let an attacker-crafted link (e.g. /auth/callback?next=https://evil.com)
// redirect a user off-site right after they log in.
export function sanitizeRedirectTarget(value, fallback = '/') {
  if (typeof value !== 'string' || !value) return fallback
  if (!value.startsWith('/') || value.startsWith('//')) return fallback
  return value
}
