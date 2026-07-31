import { BrowserRouter, Routes, Route, useNavigate, useLocation } from 'react-router-dom'
import { useEffect, useState } from 'react'
import './assets/main.css'
import Sidebar from './components/layout/Sidebar'
import Home from './components/pages/Home'
import Comicon2026 from './components/pages/Comicon2026'
import ChiSiamoPage from './components/pages/ChiSiamo'
import Footer from './components/layout/Footer'
import PWAInstallBanner from './components/ui/PWAInstallBanner'
import PWAUpdateBanner from './components/ui/PWAUpdateBanner'
import AssociazionePage from './components/pages/AssociazionePage'
import { AuthProvider } from './context/AuthContext'

function AppContent() {
  const navigate = useNavigate()
  const location = useLocation()
  const isComicRoute = location.pathname === '/comicon-2026'

  // Scroll to top on route change
  useEffect(() => {
    window.scrollTo(0, 0)
  }, [location.pathname])

  return (
    <div className="relative min-h-screen">
      {isComicRoute && <div className="halftone-overlay z-[1]" />}
      <Sidebar onNavigate={(href) => {
        if (href.startsWith('#')) {
          const element = document.getElementById(href.slice(1))
          if (element) element.scrollIntoView({ behavior: 'smooth' })
        } else {
          navigate(href)
        }
      }} />
      <main className="min-h-screen md:ml-72 flex flex-col">
        <div className={`flex-1 ${isComicRoute ? 'comic-paper' : 'bg-editorial-bg'}`}>
          {isComicRoute && <div className="absolute inset-0 comic-dots opacity-20 pointer-events-none" />}
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/comicon-2026" element={<Comicon2026 />} />
            <Route path="/chi-siamo" element={<ChiSiamoPage />} />
            <Route path="/associazione/:id" element={<AssociazionePage />} />
          </Routes>
        </div>
        <Footer />
      </main>
    </div>
  )
}

export default function App() {
  const [waitingWorker, setWaitingWorker] = useState(null)

  useEffect(() => {
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

  return (
    <>
      <BrowserRouter>
        <AuthProvider>
          <PWAUpdateBanner showBanner={Boolean(waitingWorker)} onRefresh={handleRefresh} />
          <PWAInstallBanner />
          <AppContent />
        </AuthProvider>
      </BrowserRouter>
    </>
  )
}
