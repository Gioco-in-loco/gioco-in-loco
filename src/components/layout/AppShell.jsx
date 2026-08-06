'use client'

// Side-effect import: patches window.fetch for /api/ calls so the loading
// overlay below tracks every request without touching individual call
// sites. Must run before any child component can call fetch.
import '../../lib/apiFetchTracking'

import { useEffect, useState } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import Sidebar from './Sidebar'
import Footer from './Footer'
import AnalyticsTracker from '../analytics/AnalyticsTracker'
import PWAInstallBanner from '../ui/PWAInstallBanner'
import PWAUpdateBanner from '../ui/PWAUpdateBanner'
import { AuthProvider } from '../../context/AuthContext'
import { ToastProvider } from '../../context/ToastContext'
import ToastContainer from '../ui/ToastContainer'
import LoadingOverlay from '../ui/LoadingOverlay'

export default function AppShell({ children, upcomingEvent }) {
  const pathname = usePathname()
  const router = useRouter()
  const [waitingWorker, setWaitingWorker] = useState(null)
  const isComicRoute = pathname === '/comicon-2026'
  const isDiceFestRoute = pathname.startsWith('/dice-fest')

  useEffect(() => {
    window.scrollTo(0, 0)
  }, [pathname])

  useEffect(() => {
    if (!window.location.hash) {
      return
    }

    const targetId = window.location.hash.slice(1)
    const timeoutId = window.setTimeout(() => {
      const element = document.getElementById(targetId)
      if (element) {
        element.scrollIntoView({ behavior: 'smooth' })
      }
    }, 0)

    return () => {
      window.clearTimeout(timeoutId)
    }
  }, [pathname])

  useEffect(() => {
    if (process.env.NODE_ENV !== 'production') {
      return undefined
    }

    if (!('serviceWorker' in navigator)) {
      return undefined
    }

    let hasRefreshed = false
    let activeRegistration = null

    const handleControllerChange = () => {
      if (hasRefreshed) {
        return
      }

      hasRefreshed = true
      window.location.reload()
    }

    const trackInstallingWorker = (registration, worker) => {
      if (!worker) {
        return
      }

      worker.addEventListener('statechange', () => {
        if (worker.state === 'installed' && navigator.serviceWorker.controller) {
          setWaitingWorker(registration.waiting || worker)
        }
      })
    }

    navigator.serviceWorker.addEventListener('controllerchange', handleControllerChange)

    navigator.serviceWorker.register('/sw.js').then((registration) => {
      activeRegistration = registration

      if (registration.waiting) {
        setWaitingWorker(registration.waiting)
      }

      trackInstallingWorker(registration, registration.installing)

      registration.addEventListener('updatefound', () => {
        trackInstallingWorker(registration, registration.installing)
      })
    }).catch(() => {})

    return () => {
      navigator.serviceWorker.removeEventListener('controllerchange', handleControllerChange)

      if (activeRegistration) {
        activeRegistration.onupdatefound = null
      }
    }
  }, [])

  const handleRefresh = () => {
    if (!waitingWorker) {
      window.location.reload()
      return
    }

    waitingWorker.postMessage({ type: 'SKIP_WAITING' })
  }

  const handleNavigate = (href) => {
    router.push(href)
  }

  return (
    <AuthProvider>
      <ToastProvider>
        <AnalyticsTracker />
        <PWAUpdateBanner showBanner={Boolean(waitingWorker)} onRefresh={handleRefresh} />
        <PWAInstallBanner />
        <div className="relative min-h-screen">
          {isComicRoute && <div className="halftone-overlay z-[1]" />}
          <Sidebar onNavigate={handleNavigate} upcomingEvent={upcomingEvent} />
          <main className="min-h-screen md:ml-72 flex flex-col">
            <div className={`flex-1 ${isComicRoute ? 'comic-paper' : isDiceFestRoute ? '' : 'energized-bg dice-pattern-energized'}`}>
              {isComicRoute && <div className="absolute inset-0 comic-dots opacity-20 pointer-events-none" />}
              {children}
            </div>
            <Footer />
          </main>
        </div>
        <ToastContainer />
        <LoadingOverlay />
      </ToastProvider>
    </AuthProvider>
  )
}