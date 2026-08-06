// Patches window.fetch once, client-side only, to drive the global loading
// overlay for same-origin /api/ calls. This is a side-effect module (import
// it once, don't call anything from it) so every existing and future
// fetch('/api/...') call site gets the loading overlay + timeout for free,
// without having to migrate the ~30 files that call fetch directly.
import { beginRequest, endRequest } from './requestActivityStore'

const API_TIMEOUT_MS = 15000
const TIMEOUT_MESSAGE = 'Il server non risponde. Riprova tra qualche istante.'

function getRequestUrl(input) {
  if (typeof input === 'string') return input
  if (input instanceof URL) return input.toString()
  return input?.url || ''
}

if (typeof window !== 'undefined' && !window.__apiFetchPatched) {
  window.__apiFetchPatched = true
  const originalFetch = window.fetch.bind(window)

  window.fetch = async (input, init = {}) => {
    const url = getRequestUrl(input)
    if (!url.startsWith('/api/')) {
      return originalFetch(input, init)
    }

    beginRequest()

    // Respect a caller-provided signal instead of overriding it — none of
    // the current call sites pass one, but this keeps the patch transparent
    // for any that do in the future.
    const controller = init.signal ? null : new AbortController()
    const timer = controller ? setTimeout(() => controller.abort(), API_TIMEOUT_MS) : null

    try {
      return await originalFetch(input, controller ? { ...init, signal: controller.signal } : init)
    } catch (error) {
      if (controller?.signal.aborted) {
        throw new Error(TIMEOUT_MESSAGE)
      }
      throw error
    } finally {
      if (timer) clearTimeout(timer)
      endRequest()
    }
  }
}
