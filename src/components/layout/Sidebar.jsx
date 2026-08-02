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

// One variant map for the whole navigation chrome (mobile bar, mobile
// overlay, desktop aside). /comicon-2026 is the only route that keeps the
// legacy comic-book identity — every other route renders the shared
// editorial theme. Centralizing the two skins here replaces the long
// isComicRoute ? '...' : '...' ternaries that used to repeat on every element.
const THEMES = {
  comic: {
    topBar: 'bg-comic-cream border-b-4 border-comic-navy',
    hamburgerButton: 'bg-comic-yellow border-4 border-comic-navy rounded-xl shadow-[2px_2px_0px_0px_#1A1A2E]',
    hamburgerIcon: 'text-comic-navy',
    overlayBg: 'bg-comic-paper',
    mobileNavButton: 'bg-comic-cream border-3 border-comic-navy rounded-xl font-bangers text-xl text-comic-navy',
    authSectionBorder: 'border-comic-navy/20',
    userBox: 'rounded-xl bg-comic-cream p-3 border-3 border-comic-navy',
    userText: 'text-comic-navy',
    logoutButton: 'rounded bg-comic-magenta/20 text-comic-navy',
    accountLink: 'rounded-lg bg-comic-magenta text-comic-navy',
    responsabileLink: 'rounded-lg bg-comic-yellow text-comic-navy',
    adminLink: 'rounded-lg bg-comic-cyan text-comic-navy',
    loginButtonMobile: 'bg-comic-cyan border-3 border-comic-navy rounded-xl font-bangers text-lg text-comic-navy shadow-[2px_2px_0px_0px_#1A1A2E]',
    loginButtonDesktop: 'bg-comic-cyan border-3 border-comic-navy rounded-xl font-bangers text-lg text-comic-navy shadow-[2px_2px_0px_0px_#1A1A2E] hover:shadow-[3px_3px_0px_0px_#1A1A2E] transition-shadow',
    eventLink: 'text-comic-magenta',
    wrapper: 'bg-comic-paper border-r-4 border-comic-navy',
    header: 'bg-comic-cream border-b-4 border-comic-navy pt-safe',
    navButton: 'bg-comic-cream border-3 border-comic-navy rounded-xl hover:translate-x-2 hover:shadow-[4px_4px_0px_0px_#1A1A2E] transition-all duration-200',
    navButtonText: 'font-bangers text-xl text-comic-navy',
    eventWrapper: 'bg-comic-yellow border-3 border-comic-navy rounded-xl p-3 shadow-[3px_3px_0px_0px_#1A1A2E] hover:shadow-[4px_4px_0px_0px_#1A1A2E] transition-shadow',
    eventBadge: 'font-bangers text-comic-orange text-lg',
    eventTitle: 'font-bangers text-2xl text-comic-navy',
    eventInfo: 'text-comic-navy/80 text-sm',
    logo: 'font-bangers text-2xl text-comic-navy',
    logoDesktop: 'font-bangers text-3xl text-comic-navy leading-tight',
    logoAccent: 'font-bangers text-3xl text-comic-magenta leading-tight -mt-1',
  },
  editorial: {
    topBar: 'bg-white border-b-2 border-editorial-border',
    hamburgerButton: 'bg-editorial-terra/10 border-2 border-editorial-border rounded-lg shadow-soft',
    hamburgerIcon: 'text-editorial-text',
    overlayBg: 'bg-editorial-bg',
    mobileNavButton: 'bg-white border-2 border-editorial-border rounded-lg font-body text-base text-editorial-text font-semibold hover:border-editorial-terra transition-colors',
    authSectionBorder: 'border-editorial-border/50',
    userBox: '',
    userText: 'text-editorial-text',
    logoutButton: 'rounded bg-editorial-terra/10 text-editorial-terra hover:bg-editorial-terra/20',
    accountLink: 'rounded-lg bg-editorial-terra text-white',
    responsabileLink: 'rounded-lg bg-editorial-gold text-editorial-text',
    adminLink: 'rounded-lg bg-editorial-forest text-white',
    loginButtonMobile: 'bg-editorial-terra text-white font-body text-sm font-semibold rounded-lg',
    loginButtonDesktop: 'bg-editorial-terra text-white font-semibold rounded-lg',
    eventLink: 'text-editorial-terra',
    wrapper: 'bg-editorial-bg border-r-2 border-editorial-border',
    header: 'bg-white border-b-2 border-editorial-border pt-safe',
    navButton: 'bg-white border-2 border-editorial-border rounded-lg hover:translate-x-2 hover:shadow-soft-md hover:border-editorial-terra transition-all duration-300',
    navButtonText: 'font-body text-base text-editorial-text font-semibold',
    eventWrapper: 'bg-white border-2 border-editorial-border rounded-xl p-4 shadow-soft hover:shadow-soft-md hover:border-editorial-terra transition-all duration-300',
    eventBadge: 'font-body text-xs text-editorial-terra uppercase tracking-widest',
    eventTitle: 'font-elegant text-xl text-editorial-text font-bold',
    eventInfo: 'text-editorial-text-secondary text-sm font-body',
    logo: 'font-elegant text-xl tracking-wide font-bold text-editorial-text',
    logoDesktop: 'font-elegant text-2xl tracking-wide font-bold text-editorial-text leading-tight',
    logoAccent: 'font-elegant text-2xl tracking-wide font-bold text-editorial-terra leading-tight -mt-1',
  },
  // Dark brutalist/neon skin, shown only while browsing under /dice-fest —
  // keeps the sidebar/topbar/footer chrome coherent with the hub's own
  // dicefest-* tokens defined in main.css / tailwind.config.js.
  dicefest: {
    topBar: 'bg-dicefest-ink border-b-2 border-dicefest-border',
    hamburgerButton: 'bg-dicefest-surface-2 border-2 border-dicefest-border',
    hamburgerIcon: 'text-dicefest-paper',
    overlayBg: 'bg-dicefest-ink',
    mobileNavButton: 'bg-dicefest-surface border-2 border-dicefest-border font-df-mono uppercase tracking-wide text-sm text-dicefest-paper hover:border-dicefest-pink transition-colors',
    authSectionBorder: 'border-dicefest-border',
    userBox: 'bg-dicefest-surface-2 p-3 border-2 border-dicefest-border',
    userText: 'text-dicefest-paper',
    logoutButton: 'bg-dicefest-pink/10 text-dicefest-pink hover:bg-dicefest-pink/20',
    accountLink: 'bg-dicefest-pink text-dicefest-ink',
    responsabileLink: 'bg-dicefest-green text-dicefest-ink',
    adminLink: 'border-2 border-dicefest-border bg-dicefest-surface-2 text-dicefest-paper',
    loginButtonMobile: 'bg-dicefest-pink border-2 border-dicefest-ink font-df-display uppercase text-lg text-dicefest-ink shadow-df-hard-sm',
    loginButtonDesktop: 'bg-dicefest-pink border-2 border-dicefest-ink font-df-display uppercase text-lg text-dicefest-ink shadow-df-hard-sm hover:shadow-df-hard transition-shadow',
    eventLink: 'text-dicefest-pink',
    wrapper: 'bg-dicefest-ink border-r-2 border-dicefest-border',
    header: 'bg-dicefest-ink border-b-2 border-dicefest-border pt-safe',
    navButton: 'bg-dicefest-surface border-2 border-dicefest-border hover:translate-x-2 hover:border-dicefest-pink transition-all duration-200',
    navButtonText: 'font-df-mono uppercase tracking-wide text-sm text-dicefest-paper',
    eventWrapper: 'bg-dicefest-surface border-2 border-dicefest-border p-3 shadow-df-hard-sm hover:shadow-df-hard-pink transition-shadow',
    eventBadge: 'font-df-mono text-dicefest-green text-xs uppercase tracking-[0.2em]',
    eventTitle: 'font-df-display text-2xl text-dicefest-paper uppercase',
    eventInfo: 'text-dicefest-paper/70 text-sm font-df-body',
    logo: 'font-df-display text-xl uppercase tracking-wide text-dicefest-paper',
    logoDesktop: 'font-df-display text-2xl uppercase tracking-wide text-dicefest-paper leading-tight',
    logoAccent: 'font-df-display text-2xl uppercase tracking-wide text-dicefest-pink leading-tight -mt-1',
  },
}

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
  const isDiceFestRoute = location.pathname.startsWith('/dice-fest')
  const theme = THEMES[isComicRoute ? 'comic' : isDiceFestRoute ? 'dicefest' : 'editorial']
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

  const upcomingEventHref = getEventHref(resolvedUpcomingEvent)
  const upcomingEventDateLabel = formatEventDateRange(resolvedUpcomingEvent?.startDate, resolvedUpcomingEvent?.endDate)

  return (
    <>
      {/* Top Navbar - Mobile only */}
      <div className="md:hidden fixed top-0 left-0 right-0 z-[100]" style={{ paddingTop: 'env(safe-area-inset-top, 0px)' }}>
        <nav
          className={`grid grid-cols-[3rem_1fr_3rem] items-center px-4 ${theme.topBar}`}
          style={{ minHeight: '3.5rem' }}
        >
          <span />

          <button onClick={() => handleNavigation('/')} className="flex items-center justify-center">
            <span className={theme.logo}>GIOCO IN LOCO</span>
          </button>

          <button
            onClick={() => setIsOpen(!isOpen)}
            className={`w-12 h-12 flex items-center justify-center justify-self-end ${theme.hamburgerButton}`}
            aria-label="Toggle navigation"
          >
            <svg
              className={`w-6 h-6 ${theme.hamburgerIcon} transition-transform duration-300 ${isOpen ? 'rotate-90' : ''}`}
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

      {/* Mobile Menu Overlay — no header of its own: the fixed top bar above
          (z-[100], always on top of this z-[60] panel) already has the logo
          and a working close toggle (same button, icon swaps hamburger/X),
          so a second header here was pure duplication. Content just starts
          below that fixed bar's height instead. */}
      {isOpen && (
        <div
          className={`fixed inset-0 z-[60] md:hidden flex flex-col ${theme.overlayBg}`}
          style={{ paddingTop: 'calc(3.5rem + env(safe-area-inset-top, 0px))' }}
        >
          <nav className="flex-1 overflow-y-auto p-5">
            <div className="space-y-3">
              {navItems.map((item) => (
                <button
                  key={item.id}
                  onClick={() => handleNavigation(item.href)}
                  className={`group w-full flex items-center px-5 py-4 min-h-[44px] ${theme.mobileNavButton}`}
                >
                  {item.label}
                </button>
              ))}
            </div>

            {isConfigured && (
              <div className={`mt-6 pt-6 border-t ${theme.authSectionBorder}`}>
                {user ? (
                  <div className={`space-y-3 ${theme.userBox}`}>
                    <div className="flex items-center gap-2">
                      {user.avatarUrl && <img src={user.avatarUrl} alt="" className="w-8 h-8 rounded-full" />}
                      <div className="min-w-0 flex-1">
                        <p className={`font-body text-sm flex-1 truncate font-semibold ${theme.userText}`}>{user.name || user.email}</p>
                      </div>
                      <button onClick={logout} className={`px-3 py-1.5 text-xs font-semibold transition-colors ${theme.logoutButton}`}>
                        Logout
                      </button>
                    </div>
                    <div className="space-y-2">
                      <Link href="/account" onClick={() => setIsOpen(false)} className={`block px-4 py-2.5 text-center font-body text-sm font-semibold ${theme.accountLink}`}>
                        Area utente
                      </Link>
                      {isResponsabile && (
                        <Link href="/responsabile" onClick={() => setIsOpen(false)} className={`block px-4 py-2.5 text-center font-body text-sm font-semibold ${theme.responsabileLink}`}>
                          Area responsabile
                        </Link>
                      )}
                      {isAdmin && (
                        <Link href="/admin" onClick={() => setIsOpen(false)} className={`block px-4 py-2.5 text-center font-body text-sm font-semibold ${theme.adminLink}`}>
                          Area admin
                        </Link>
                      )}
                    </div>
                  </div>
                ) : (
                  <Link href="/auth/login" onClick={() => setIsOpen(false)} className={`block w-full py-2.5 text-center ${theme.loginButtonMobile}`}>
                    Accedi
                  </Link>
                )}
              </div>
            )}

            <div className={`mt-6 p-4 ${theme.eventWrapper}`}>
              <span className={`block mb-2 ${theme.eventBadge}`}>
                Prossimo evento
              </span>
              <span className={`block mb-2 ${theme.eventTitle}`}>
                {resolvedUpcomingEvent?.name || 'Nessun evento futuro'}
              </span>
              <div className={`flex items-center gap-2 ${theme.eventInfo} mb-1.5`}>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                <span>{upcomingEventDateLabel}</span>
              </div>
              <div className={`flex items-center gap-2 ${theme.eventInfo}`}>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                </svg>
                <span>{resolvedUpcomingEvent?.location || 'Location da definire'}</span>
              </div>
              {upcomingEventHref && (
                <button onClick={() => handleNavigation(upcomingEventHref)} className={`mt-4 font-body text-sm font-semibold ${theme.eventLink} underline underline-offset-4`}>
                  Vai all&apos;evento
                </button>
              )}
            </div>
          </nav>
        </div>
      )}

      {/* Desktop Sidebar */}
      <aside className={`fixed top-0 left-0 h-full w-72 hidden sm:flex flex-col ${theme.wrapper}`}>
        <div className={`p-6 pb-4 flex justify-center ${theme.header}`}>
          <button onClick={() => handleNavigation('/')} className="hover:opacity-80 transition-opacity flex flex-col items-center">
            <span className={theme.logoDesktop}>GIOCO</span>
            <span className={theme.logoAccent}>IN LOCO</span>
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
                  <span className={`font-body text-sm flex-1 truncate ${theme.userText}`}>{user.name || user.email}</span>
                  <button onClick={logout} className={`px-3 py-1.5 text-xs font-semibold transition-colors ${theme.logoutButton}`}>
                    Logout
                  </button>
                </div>
                <div className="space-y-2">
                  <Link href="/account" className={`block px-4 py-2.5 text-center font-body text-sm font-semibold ${theme.accountLink}`}>
                    Area utente
                  </Link>
                  {isResponsabile && (
                    <Link href="/responsabile" className={`block px-4 py-2.5 text-center font-body text-sm font-semibold ${theme.responsabileLink}`}>
                      Area responsabile
                    </Link>
                  )}
                  {isAdmin && (
                    <Link href="/admin" className={`block px-4 py-2.5 text-center font-body text-sm font-semibold ${theme.adminLink}`}>
                      Area admin
                    </Link>
                  )}
                </div>
              </div>
            ) : (
              <Link href="/auth/login" className={`block w-full py-2.5 text-center ${theme.loginButtonDesktop}`}>
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
            <div className={`p-3 ${theme.eventWrapper}`}>
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
                <button onClick={() => handleNavigation(upcomingEventHref)} className={`mt-4 font-body text-sm font-semibold underline underline-offset-4 ${theme.eventLink}`}>
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
