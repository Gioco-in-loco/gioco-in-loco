export const COMPANION_INVITE_MINUTES = 60

// Web Crypto API (globalThis.crypto) instead of node:crypto — this module is
// reachable from client bundles (main-event-booking.js is imported by
// event-booking.js, which client components import for getSlotKey), and
// bare "node:" scheme imports fail the webpack client build.
export function generateInviteCode() {
  return crypto.randomUUID().replace(/-/g, '')
}

export function getCompanionInviteExpiration() {
  return new Date(Date.now() + COMPANION_INVITE_MINUTES * 60 * 1000)
}

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export function normalizeCompanions(rawCompanions, { maxCount } = {}) {
  if (!Array.isArray(rawCompanions) || rawCompanions.length === 0) {
    return []
  }

  const companions = rawCompanions.slice(0, typeof maxCount === 'number' ? maxCount : rawCompanions.length).map((entry) => {
    const firstName = typeof entry?.firstName === 'string' ? entry.firstName.trim() : ''
    const lastName = typeof entry?.lastName === 'string' ? entry.lastName.trim() : ''
    const email = typeof entry?.email === 'string' ? entry.email.trim().toLowerCase() : ''

    if (!firstName || !lastName || !EMAIL_PATTERN.test(email)) {
      throw new Error('Controlla nome, cognome ed email degli amici invitati.')
    }

    return { firstName, lastName, email, fullName: `${firstName} ${lastName}` }
  })

  const seenEmails = new Set(companions.map((c) => c.email))
  if (seenEmails.size !== companions.length) {
    throw new Error('Hai inserito la stessa email più di una volta tra gli amici invitati.')
  }

  return companions
}
