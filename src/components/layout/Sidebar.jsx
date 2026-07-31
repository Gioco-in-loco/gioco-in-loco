'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useLocation } from '../../lib/router'
import { useAuth } from '../../context/AuthContext'
import { DICE_FEST_EVENT_ID, DICE_FEST_ROUTE } from '../../lib/event-constants'

const navItems = [
  {
    id: 'dice-fest',
    label: 'DICE FEST',
    href: '/dice-fest',
  },
  {
    id: 'comicon-2026',
    label: 'Comicon 2026',
    href: '/comicon-2026',
  },
  {
    id: 'chi-siamo',
    label: 'Chi Siamo',
    href: '/chi-siamo',
  },
  {
    id: 'contattaci',
    label: 'Contattaci',
    href: '/contattaci',
  },
]

function formatEventDateRange(startDate, endDate) {
  if (!startDate) {
    return 'Data da definire'
  }

  const formatter = new Intl.DateTimeFormat('it-IT', {
    day: 'numeric',
    month: 'long',
  })

  const start = new Date(startDate)
  const formattedStart = formatter.format(start)

  if (!endDate) {
    return formattedStart
  }

  const end = new Date(endDate)
  const formattedEnd = formatter.format(end)

  if (formattedStart === formattedEnd) {
    return formattedStart
  }

  return `${formattedStart} - ${formattedEnd}`
}

function getEventHref(event) {
  if (!event?.id && !event?.externalId) {
    return null
  }

  if (event.externalId === 'comicon-2026') {
    return '/comicon-2026'
  }

  if (event.id === DICE_FEST_EVENT_ID || event.externalId === 'dice-fest') {
    return DICE_FEST_ROUTE
  }

  return null
}

export default function Sidebar({ onNavigate, upcomingEvent }) {
  const [isOpen, setIsOpen] = useState(false)
  const [resolvedUpcomingEvent, setResolvedUpcomingEvent] = useState(upcomingEvent)
  const location = useLocation()
  const isComicRoute = location.pathname === '/comicon-2026'
  const { user: authUser, isConfigured, isPasswordRecovery, logout } = useAuth()
  // While a password-recovery session is active, treat the user as logged out:
  // the session was granted by the emailed link, not by entering credentials,
  // so no authenticated area should be reachable until the password is set.
  const user = isPasswordRecovery ? null : authUser
  const isAdmin = Boolean(user?.isAdmin)
  const isResponsabile = user?.role?.toUpperCase() === 'RESPONSABILE'

  useEffect(() => {
    setResolvedUpcomingEvent(upcomingEvent)
  }, [upcomingEvent])

  useEffect(() => {
    if (isPasswordRecovery && location.pathname !== '/auth/update-password' && location.pathname !== '/') {
      onNavigate('/')
    }
  }, [isPasswordRecovery, location.pathname, onNavigate])

  useEffect(() => {
    let isActive = true

    const loadUpcomingEvent = async () => {
      try {
        const response = await fetch('/api/events/upcoming', {
          cache: 'no-store',
          credentials: 'same-origin',
        })

        if (!response.ok) {
          return
        }

        const event = await response.json()
        if (isActive) {
          setResolvedUpcomingEvent(event)
        }
      } catch {
        // Keep the server-provided value when the public refresh fails.
      }
    }

    void loadUpcomingEvent()

    return () => {
      isActive = false
    }
  }, [])

  const handleNavigation = (href) => {
    if (href.startsWith('#')) {
      const element = document.getElementById(href.slice(1))
      if (element) {
        element.scrollIntoView({ behavior: 'smooth' })
      }
    } else {
      onNavigate(href)
    }
    setIsOpen(false)
  }

  // Comic theme styles
  const comic = {
    wrapper: 'bg-comic-paper border-r-4 border-comic-navy',
    header: 'bg-comic-cream border-b-4 border-comic-navy pt-safe',
    logoText: 'font-bangers text-3xl',
    logoAccent: 'text-comic-magenta -mt-1',
    navButton: 'bg-comic-cream border-3 border-comic-navy rounded-xl hover:translate-x-2 hover:shadow-[4px_4px_0px_0px_#1A1A2E] transition-all duration-200',
    navButtonText: 'font-bangers text-xl text-comic-navy',
    eventWrapper: 'bg-comic-yellow border-3 border-comic-navy rounded-xl p-3 shadow-[3px_3px_0px_0px_#1A1A2E] hover:shadow-[4px_4px_0px_0px_#1A1A2E] transition-shadow',
    eventBadge: 'font-bangers text-comic-orange text-lg',
    eventTitle: 'font-bangers text-2xl text-comic-navy',
    eventInfo: 'text-comic-navy/80 text-sm',
  }

  // Energized Editorial theme styles
  const editorial = {
    wrapper: 'bg-editorial-bg border-r-2 border-editorial-border',
    header: 'bg-white border-b-2 border-editorial-border pt-safe',
    logoText: 'font-elegant text-2xl tracking-wide font-bold',
    logoAccent: 'text-editorial-terra -mt-1',
    navButton: 'bg-white border-2 border-editorial-border rounded-lg hover:translate-x-2 hover:shadow-soft-md hover:border-editorial-terra transition-all duration-300',
    navButtonText: 'font-body text-base text-editorial-text font-semibold',
    eventWrapper: 'bg-white border-2 border-editorial-border rounded-xl p-4 shadow-soft hover:shadow-soft-md hover:border-editorial-terra transition-all duration-300',
    eventBadge: 'font-body text-xs text-editorial-terra uppercase tracking-widest',
    eventTitle: 'font-elegant text-xl text-editorial-text font-bold',
    eventInfo: 'text-editorial-text-secondary text-sm font-body',
  }

  const theme = isComicRoute ? comic : editorial
  const upcomingEventHref = getEventHref(resolvedUpcomingEvent)
  const upcomingEventDateLabel = formatEventDateRange(resolvedUpcomingEvent?.startDate, resolvedUpcomingEvent?.endDate)

  return (
    <>
      {/* Top Navbar - Mobile only */}
      <div className="md:hidden fixed top-0 left-0 right-0 z-[100]" style={{ paddingTop: 'env(safe-area-inset-top, 0px)' }}>
        <nav
          className={`flex items-center justify-between px-4 ${isComicRoute ? 'bg-comic-cream border-b-4 border-comic-navy' : 'bg-white border-b-2 border-editorial-border'}`}
          style={{ minHeight: '3.5rem' }}
        >
          <button onClick={() => handleNavigation('/')} className="flex items-center gap-2">
            <span className={`${isComicRoute ? 'font-bangers text-2xl text-comic-navy' : 'font-elegant text-xl text-editorial-text font-bold'}`}>
              GIOCO IN LOCO
            </span>
          </button>

          <button
            onClick={() => setIsOpen(!isOpen)}
            className={`w-12 h-12 flex items-center justify-center ${isComicRoute ? 'bg-comic-yellow border-4 border-comic-navy rounded-xl shadow-[2px_2px_0px_0px_#1A1A2E]' : 'bg-editorial-terra/10 border-2 border-editorial-border rounded-lg shadow-soft'}`}
            aria-label="Toggle navigation"
          >
            <svg
              className={`w-6 h-6 ${isComicRoute ? 'text-comic-navy' : 'text-editorial-text'} transition-transform duration-300 ${isOpen ? 'rotate-90' : ''}`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              {isOpen ? (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              ) : (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              )}
            </svg>
          </button>
        </nav>
      </div>

      {/* Mobile Menu Overlay */}
      {isOpen && (
        <div className={`fixed inset-0 z-[60] md:hidden flex flex-col ${isComicRoute ? 'bg-comic-paper' : 'bg-editorial-bg'}`}>
          <div className={`flex items-center justify-between p-4 ${isComicRoute ? 'bg-comic-cream border-b-4 border-comic-navy' : 'bg-white border-b-2 border-editorial-border'}`}>
            <button onClick={() => handleNavigation('/')} className="flex items-center gap-2">
              <span className={`${isComicRoute ? 'font-bangers text-2xl text-comic-navy' : 'font-elegant text-xl text-editorial-text font-bold'}`}>
                GIOCO IN LOCO
              </span>
            </button>
            <button
              onClick={() => setIsOpen(false)}
              className={`w-12 h-12 flex items-center justify-center ${isComicRoute ? 'bg-comic-yellow border-4 border-comic-navy rounded-xl' : 'bg-editorial-terra/10 border-2 border-editorial-border rounded-lg'}`}
            >
              <svg className={`w-6 h-6 ${isComicRoute ? 'text-comic-navy' : 'text-editorial-text'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <nav className="flex-1 overflow-y-auto p-5">
            <div className="space-y-3">
              {navItems.map((item) => (
                <button
                  key={item.id}
                  onClick={() => handleNavigation(item.href)}
                  className={`group w-full flex items-center px-5 py-4 ${isComicRoute ? 'bg-comic-cream border-3 border-comic-navy rounded-xl font-bangers text-xl text-comic-navy' : 'bg-white border-2 border-editorial-border rounded-lg font-body text-base text-editorial-text font-semibold hover:border-editorial-terra transition-colors'}`}
                >
                  {item.label}
                </button>
              ))}
            </div>

            {isConfigured && (
              <div className={`mt-6 pt-6 border-t ${isComicRoute ? 'border-comic-navy/20' : 'border-editorial-border/50'}`}>
                {user ? (
                  <div className={`space-y-3 ${isComicRoute ? 'rounded-xl bg-comic-cream p-3 border-3 border-comic-navy' : ''}`}>
                    <div className="flex items-center gap-2">
                      {user.avatarUrl && <img src={user.avatarUrl} alt="" className="w-8 h-8 rounded-full" />}
                      <div className="min-w-0 flex-1">
                        <p className="font-body text-sm text-editorial-text flex-1 truncate font-semibold">{user.name || user.email}</p>
                      </div>
                      <button onClick={logout} className={`px-3 py-1.5 text-xs font-semibold rounded transition-colors ${isComicRoute ? 'bg-comic-magenta/20 text-comic-navy' : 'bg-editorial-terra/10 text-editorial-terra hover:bg-editorial-terra/20'}`}>
                        Logout
                      </button>
                    </div>
                    <div className="space-y-2">
                      <Link href="/account" onClick={() => setIsOpen(false)} className={`block rounded-lg px-4 py-2.5 text-center font-body text-sm font-semibold ${isComicRoute ? 'bg-comic-magenta text-comic-navy' : 'bg-editorial-terra text-white'}`}>
                        Area utente
                      </Link>
                      {isResponsabile && (
                        <Link href="/responsabile" onClick={() => setIsOpen(false)} className={`block rounded-lg px-4 py-2.5 text-center font-body text-sm font-semibold ${isComicRoute ? 'bg-comic-yellow text-comic-navy' : 'bg-editorial-gold text-editorial-text'}`}>
                          Area responsabile
                        </Link>
                      )}
                      {isAdmin && (
                        <Link href="/admin" onClick={() => setIsOpen(false)} className={`block rounded-lg px-4 py-2.5 text-center font-body text-sm font-semibold ${isComicRoute ? 'bg-comic-cyan text-comic-navy' : 'bg-editorial-forest text-white'}`}>
                          Area admin
                        </Link>
                      )}
                    </div>
                  </div>
                ) : (
                  <Link href="/auth/login" onClick={() => setIsOpen(false)} className={`block w-full py-2.5 text-center ${isComicRoute ? 'bg-comic-cyan border-3 border-comic-navy rounded-xl font-bangers text-lg text-comic-navy shadow-[2px_2px_0px_0px_#1A1A2E]' : 'bg-editorial-terra text-white font-body text-sm font-semibold rounded-lg'}`}>
                    Accedi
                  </Link>
                )}
              </div>
            )}

            <div className={`mt-6 p-4 ${isComicRoute ? 'bg-comic-yellow border-3 border-comic-navy rounded-xl shadow-[3px_3px_0px_0px_#1A1A2E]' : 'bg-white border-2 border-editorial-border rounded-xl shadow-soft'}`}>
              <span className={`block mb-2 ${isComicRoute ? 'font-bangers text-comic-orange text-lg' : 'font-body text-xs text-editorial-terra uppercase tracking-widest'}`}>
                Prossimo evento
              </span>
              <span className={`block mb-2 ${isComicRoute ? 'font-bangers text-2xl text-comic-navy' : 'font-elegant text-xl text-editorial-text font-bold'}`}>
                {resolvedUpcomingEvent?.name || 'Nessun evento futuro'}
              </span>
              <div className={`flex items-center gap-2 ${isComicRoute ? 'text-comic-navy/80 text-sm' : 'text-editorial-text-secondary text-sm font-body'} mb-1.5`}>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                <span>{upcomingEventDateLabel}</span>
              </div>
              <div className={`flex items-center gap-2 ${isComicRoute ? 'text-comic-navy/80 text-sm' : 'text-editorial-text-secondary text-sm font-body'}`}>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                </svg>
                <span>{resolvedUpcomingEvent?.location || 'Location da definire'}</span>
              </div>
              {upcomingEventHref && (
                <button onClick={() => handleNavigation(upcomingEventHref)} className={`mt-4 font-body text-sm font-semibold ${isComicRoute ? 'text-comic-magenta' : 'text-editorial-terra'} underline underline-offset-4`}>
                  Vai all&apos;evento
                </button>
              )}
            </div>
          </nav>
        </div>
      )}

      {/* Desktop Sidebar */}
      <aside className={`fixed top-0 left-0 h-full w-72 hidden sm:flex flex-col ${theme.wrapper}`}>
        <div className={`p-6 pb-4 ${theme.header}`}>
          <button onClick={() => handleNavigation('/')} className="w-full hover:opacity-80 transition-opacity text-left">
            <h1 className={`${theme.logoText} text-editorial-text leading-tight`}>GIOCO</h1>
            <h1 className={`${theme.logoText} ${theme.logoAccent} leading-tight`}>IN LOCO</h1>
          </button>
        </div>

        <nav className="flex-1 px-4 pt-4 pb-4">
          <div className="space-y-2">
            {navItems.map((item) => (
              <button
                key={item.id}
                onClick={() => handleNavigation(item.href)}
                className={`group w-full flex items-center px-4 py-3 ${theme.navButton}`}
              >
                <span className={theme.navButtonText}>{item.label}</span>
              </button>
            ))}
          </div>
        </nav>

        {isConfigured && (
          <div className={`p-4 border-t ${theme.header}`}>
            {user ? (
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  {user.avatarUrl && <img src={user.avatarUrl} alt="" className="w-8 h-8 rounded-full" />}
                  <span className="font-body text-sm text-editorial-text flex-1 truncate">{user.name || user.email}</span>
                  <button onClick={logout} className="px-3 py-1.5 bg-editorial-terra/10 text-editorial-terra text-xs font-semibold rounded hover:bg-editorial-terra/20 transition-colors">
                    Logout
                  </button>
                </div>
                <div className="space-y-2">
                  <Link href="/account" className="block rounded-lg bg-editorial-terra px-4 py-2.5 text-center font-body text-sm font-semibold text-white">
                    Area utente
                  </Link>
                  {isResponsabile && (
                    <Link href="/responsabile" className="block rounded-lg bg-editorial-gold px-4 py-2.5 text-center font-body text-sm font-semibold text-editorial-text">
                      Area responsabile
                    </Link>
                  )}
                  {isAdmin && (
                    <Link href="/admin" className="block rounded-lg bg-editorial-forest px-4 py-2.5 text-center font-body text-sm font-semibold text-white">
                      Area admin
                    </Link>
                  )}
                </div>
              </div>
            ) : (
              <Link href="/auth/login" className={`block w-full py-2.5 text-center ${isComicRoute ? 'bg-comic-cyan border-3 border-comic-navy rounded-xl font-bangers text-lg text-comic-navy shadow-[2px_2px_0px_0px_#1A1A2E] hover:shadow-[3px_3px_0px_0px_#1A1A2E] transition-shadow' : 'bg-editorial-terra text-white font-semibold rounded-lg'}`}>
                Accedi
              </Link>
            )}
          </div>
        )}

        <div className={`p-4 border-t ${theme.header}`}>
          <div className="w-full text-left group">
            <div className="flex items-center gap-2 mb-2">
              <span className={theme.eventBadge}>Prossimo evento</span>
            </div>
            <div className={`p-3 rounded-lg ${theme.eventWrapper}`}>
              <span className={`block ${theme.eventTitle} mb-1`}>{resolvedUpcomingEvent?.name || 'Nessun evento futuro'}</span>
              <div className={`flex items-center gap-2 ${theme.eventInfo}`}>
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                <span>{upcomingEventDateLabel}</span>
              </div>
              <div className={`flex items-center gap-2 ${theme.eventInfo}`}>
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                </svg>
                <span>{resolvedUpcomingEvent?.location || 'Location da definire'}</span>
              </div>
              {upcomingEventHref && (
                <button onClick={() => handleNavigation(upcomingEventHref)} className="mt-4 font-body text-sm font-semibold text-editorial-terra underline underline-offset-4">
                  Vai all&apos;evento
                </button>
              )}
            </div>
          </div>
        </div>
      </aside>
    </>
  )
}