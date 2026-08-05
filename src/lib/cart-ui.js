export function formatCartPrice(value, { hideWhenMissing = false } = {}) {
  if (value == null) {
    return hideWhenMissing ? null : 'Gratis'
  }

  if (Number(value) <= 0) {
    return 'Gratis'
  }

  return new Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR' }).format(value)
}

export function getTimeRemainingLabel(expiresAt) {
  if (!expiresAt) return null

  const diff = new Date(expiresAt).getTime() - Date.now()
  if (diff <= 0) return '00:00'

  const totalSeconds = Math.floor(diff / 1000)
  const minutes = String(Math.floor(totalSeconds / 60)).padStart(2, '0')
  const seconds = String(totalSeconds % 60).padStart(2, '0')
  return `${minutes}:${seconds}`
}

export function createEmptyEventCartState() {
  return {
    loading: true,
    hasConfirmedAdmission: false,
    hasCartAdmission: false,
    confirmedAdmissionDays: [],
    cartAdmissionDays: [],
    cartAdmissions: [],
    waitlistDays: [],
    confirmedSlotIds: [],
    confirmedSlotKeys: [],
    cartSlotIds: [],
    cartSlotKeys: [],
    cartSlots: [],
    companionCartSlots: [],
    holdExpiresAt: null,
  }
}

export function createEmptyGdrEventCartState() {
  return {
    ...createEmptyEventCartState(),
    mainEventConfirmedReservationIds: [],
    mainEventConfirmedSessionKeys: [],
    mainEventConfirmedSlotKeys: [],
    mainEventConfirmedReservations: [],
    mainEventCartReservationIds: [],
    mainEventCartSessionKeys: [],
    mainEventCartSlotKeys: [],
    mainEventCartSlots: [],
    mainEventCompanionCartSlots: [],
  }
}

export function createEmptyMainEventCartState() {
  return {
    loading: true,
    confirmedSessionKeys: [],
    confirmedSlotKeys: [],
    cartSessionKeys: [],
    cartSlotKeys: [],
    cartSlots: [],
    holdExpiresAt: null,
  }
}

export function clearExpiredGdrCartState(current) {
  return {
    ...current,
    hasCartAdmission: false,
    cartAdmissionDays: [],
    cartAdmissions: [],
    cartSlotIds: [],
    cartSlotKeys: [],
    cartSlots: [],
    companionCartSlots: [],
    mainEventCartReservationIds: [],
    mainEventCartSessionKeys: [],
    mainEventCartSlotKeys: [],
    mainEventCartSlots: [],
    mainEventCompanionCartSlots: [],
    holdExpiresAt: null,
  }
}

function getReservationSessionKey(reservation) {
  return `${reservation?.mainEventId || ''}__${reservation?.eventId || ''}__${String(reservation?.day || '').trim().toLowerCase()}__${String(reservation?.slot || '').trim().toLowerCase()}`
}

export function removeConfirmedMainEventReservation(current, reservationId) {
  const nextReservations = (current.mainEventConfirmedReservations || []).filter((reservation) => reservation.id !== reservationId)

  return {
    ...current,
    mainEventConfirmedReservations: nextReservations,
    mainEventConfirmedReservationIds: nextReservations.map((reservation) => reservation.id),
    mainEventConfirmedSessionKeys: nextReservations.map((reservation) => getReservationSessionKey(reservation)),
  }
}