'use client'

import { useEffect, useState, useSyncExternalStore } from 'react'
import { subscribe, getSnapshot, getServerSnapshot } from '../../lib/requestActivityStore'

// Only shows once a request has been in flight for a bit, so near-instant
// calls don't cause a visible flash.
const SHOW_DELAY_MS = 200

export default function LoadingOverlay() {
  const activeCount = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot)
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    if (activeCount === 0) {
      setVisible(false)
      return undefined
    }

    const timer = setTimeout(() => setVisible(true), SHOW_DELAY_MS)
    return () => clearTimeout(timer)
  }, [activeCount])

  if (!visible) return null

  return (
    <div
      className="fixed inset-0 z-[1200] flex items-center justify-center bg-black/30 backdrop-blur-[1px]"
      role="status"
      aria-live="polite"
      aria-label="Caricamento"
    >
      <div className="flex items-center gap-3 rounded-xl border-2 border-editorial-border bg-white px-5 py-4 shadow-soft-lg">
        <span className="h-5 w-5 flex-shrink-0 animate-spin rounded-full border-2 border-editorial-terra border-t-transparent" />
        <span className="font-body text-sm font-semibold text-editorial-text">Caricamento…</span>
      </div>
    </div>
  )
}
