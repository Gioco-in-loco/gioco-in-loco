// Plain external store (not React state) tracking how many /api requests are
// currently in flight — the patched fetch in apiFetchTracking.js lives
// outside any component, so it can't use hooks directly.
let activeCount = 0
const listeners = new Set()

function emit() {
  listeners.forEach((listener) => listener())
}

export function beginRequest() {
  activeCount += 1
  emit()
}

export function endRequest() {
  activeCount = Math.max(0, activeCount - 1)
  emit()
}

export function subscribe(listener) {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

export function getSnapshot() {
  return activeCount
}

export function getServerSnapshot() {
  return 0
}
