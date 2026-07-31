import { useState, useEffect } from 'react'
import { useLocation } from '../../lib/router'

const DISMISS_KEY = 'pwa-banner-dismissed-at'
const STORAGE_RESET_KEY = 'pwa-storage-last-reset-at'
const STORAGE_RESET_INTERVAL_MS = 1000 * 60 * 60

function canShowBanner() {
  const dismissedAt = Number(localStorage.getItem(DISMISS_KEY) || '0')
  return !dismissedAt
}

function refreshPwaStorageWindow() {
  const now = Date.now()
  const lastResetAt = Number(localStorage.getItem(STORAGE_RESET_KEY) || '0')

  if (!lastResetAt) {
    localStorage.setItem(STORAGE_RESET_KEY, String(now))
    return
  }

  if (now - lastResetAt >= STORAGE_RESET_INTERVAL_MS) {
    localStorage.removeItem(DISMISS_KEY)
    localStorage.setItem(STORAGE_RESET_KEY, String(now))
  }
}

export default function PWAInstallBanner() {
  const [showBanner, setShowBanner] = useState(false)
  const location = useLocation()
  const isComicRoute = location.pathname === '/comicon-2026'

  useEffect(() => {
    const updateBannerVisibility = () => {
      refreshPwaStorageWindow()

      if (window.deferredPrompt && canShowBanner()) {
        setShowBanner(true)
        return
      }

      setShowBanner(false)
    }

    const handleBeforeInstallPrompt = (event) => {
      window.deferredPrompt = event
      updateBannerVisibility()
    }

    const handleAppInstalled = () => {
      localStorage.removeItem(DISMISS_KEY)
      localStorage.setItem(STORAGE_RESET_KEY, String(Date.now()))
      setShowBanner(false)
    }

    updateBannerVisibility()

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
    window.addEventListener('appinstalled', handleAppInstalled)

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
      window.removeEventListener('appinstalled', handleAppInstalled)
    }
  }, [])

  const handleDismiss = () => {
    localStorage.setItem(DISMISS_KEY, String(Date.now()))
    setShowBanner(false)
  }

  const handleInstall = async () => {
    if (!window.deferredPrompt) {
      return
    }

    const promptEvent = window.deferredPrompt
    promptEvent.prompt()

    const choiceResult = await promptEvent.userChoice
    window.deferredPrompt = null

    if (choiceResult.outcome === 'accepted') {
      localStorage.removeItem(DISMISS_KEY)
      localStorage.setItem(STORAGE_RESET_KEY, String(Date.now()))
      setShowBanner(false)
      return
    }

    handleDismiss()
  }

  if (!showBanner) return null

  // Comic theme (for comicon route)
  if (isComicRoute) {
    return (
      <div className="fixed top-0 left-0 right-0 z-[999]">
        <div className="bg-gradient-to-r from-comic-cyan via-comic-yellow to-comic-magenta border-b-4 border-comic-navy px-4 py-3 shadow-[0_4px_0px_0px_#1A1A2E]">
          <div className="flex items-center justify-between gap-4 max-w-5xl mx-auto">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-comic-navy flex items-center justify-center shadow-lg">
                <span className="text-2xl">📱</span>
              </div>
              <div>
                <p className="font-bangers text-lg text-comic-navy leading-tight">
                  INSTALLA L'APP!
                </p>
                <p className="font-comic text-xs text-comic-navy/70">
                  Gioca anche offline al Comicon 2026
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={handleInstall}
                className="px-4 py-2 bg-comic-navy text-comic-yellow font-bangers text-base border-3 border-comic-navy rounded-xl shadow-[3px_3px_0px_0px_#1A1A2E] hover:scale-105 hover:shadow-[4px_4px_0px_0px_#1A1A2E] transition-all"
              >
                INSTALLA
              </button>
              <button
                onClick={handleDismiss}
                className="w-10 h-10 flex items-center justify-center font-bangers text-comic-navy/60 hover:text-comic-navy hover:bg-comic-navy/10 rounded-lg transition-colors"
              >
                ✕
              </button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // Editorial theme (for non-comicon routes)
  return (
    <div className="fixed top-0 left-0 right-0 z-[999]">
      <div className="bg-white border-b border-editorial-border shadow-soft-md px-4 py-3">
        <div className="flex items-center justify-between gap-4 max-w-5xl mx-auto">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-soft-lg bg-editorial-terra/10 flex items-center justify-center">
              <svg className="w-6 h-6 text-editorial-terra" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 18h-1.25a6.75 6.75 0 000-13.5h1.25a3.75 3.75 0 010 7.5h-1.25a2.25 2.25 0 000 4.5h1.25M12 15v6m-3-3h6" />
              </svg>
            </div>
            <div>
              <p className="font-elegant text-lg text-editorial-text leading-tight">
                Installa l'app
              </p>
              <p className="font-body text-sm text-editorial-text-muted">
                Gioco In Loco sempre con te, anche offline
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={handleInstall}
              className="px-5 py-2.5 bg-editorial-terra text-white font-body font-semibold rounded-soft hover:bg-editorial-terra/90 transition-colors shadow-soft"
            >
              Installa
            </button>
            <button
              onClick={handleDismiss}
              className="w-9 h-9 flex items-center justify-center text-editorial-text-muted hover:text-editorial-text hover:bg-editorial-border/50 rounded-full transition-colors"
            >
              ✕
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}