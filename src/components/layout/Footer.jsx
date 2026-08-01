'use client'

import { useState } from 'react'
import { useLocation } from '../../lib/router'
import PrivacyModal from '../ui/PrivacyModal'

export default function Footer() {
  const location = useLocation()
  const isComicRoute = location.pathname === '/comicon-2026'
  const isDiceFestRoute = location.pathname.startsWith('/dice-fest')
  const [showPrivacy, setShowPrivacy] = useState(false)

  if (isComicRoute) {
    return (
      <footer className="relative border-t-4 border-comic-navy bg-comic-cream py-4 pb-8 sm:pb-4" style={{ paddingBottom: 'calc(1rem + env(safe-area-inset-bottom, 0px))' }}>
        <div className="section-divider mb-8" />
        <div className="relative max-w-7xl mx-auto px-6">
          <div className="flex flex-col items-center justify-center gap-4">
            <div className="flex items-center gap-3">
              <span className="text-3xl float-bounce">🎲</span>
              <p className="font-comic text-comic-navy/80 text-center">
                © 2026 Gioco In Loco. Tutti i diritti riservati.
              </p>
              <span className="text-3xl float-bounce" style={{ animationDelay: '0.5s' }}>🎲</span>
            </div>
          </div>
        </div>
      </footer>
    )
  }

  if (isDiceFestRoute) {
    return (
      <>
        {showPrivacy && <PrivacyModal onClose={() => setShowPrivacy(false)} />}
        <footer className="dicefest-scope border-t-2 border-dicefest-border bg-dicefest-ink" style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}>
          <div className="max-w-7xl mx-auto px-6 py-4 flex flex-col sm:flex-row items-center justify-between gap-3">
            <span className="font-df-display text-sm uppercase tracking-wide text-dicefest-paper">
              Dice<span className="text-dicefest-pink">Fest</span>
            </span>

            <p className="font-df-mono text-xs text-dicefest-paper/50 order-last sm:order-none">
              © 2026 Gioco In Loco · <button type="button" onClick={() => setShowPrivacy(true)} className="hover:text-dicefest-pink transition-colors">Privacy</button>
            </p>

            <div className="flex items-center gap-3">
              <a href="https://www.instagram.com/giocoinloco/?hl=it" target="_blank" rel="noopener noreferrer" aria-label="Instagram Gioco In Loco" className="text-dicefest-paper/50 hover:text-dicefest-pink transition-colors">
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/></svg>
              </a>
            </div>
          </div>
        </footer>
      </>
    )
  }

  // Energized Editorial theme
  return (
    <>
      {showPrivacy && <PrivacyModal onClose={() => setShowPrivacy(false)} />}
      <footer className="border-t border-editorial-border bg-editorial-bg" style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}>
        <div className="max-w-7xl mx-auto px-6 py-4 flex flex-col sm:flex-row items-center justify-between gap-3">
          <span className="font-elegant text-sm text-editorial-text font-semibold tracking-wide">Gioco In Loco</span>

          <p className="font-body text-xs text-editorial-text-muted order-last sm:order-none">
            © 2026 Gioco In Loco · <button type="button" onClick={() => setShowPrivacy(true)} className="hover:text-editorial-terra transition-colors">Privacy</button>
          </p>

          <div className="flex items-center gap-3">
            <a href="https://www.instagram.com/giocoinloco/?hl=it" target="_blank" rel="noopener noreferrer" aria-label="Instagram Gioco In Loco" className="text-editorial-text-muted hover:text-editorial-terra transition-colors">
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/></svg>
            </a>
           {/*  <a href="#" aria-label="Facebook" className="text-editorial-text-muted hover:text-editorial-terra transition-colors">
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>
            </a> */}
          </div>
        </div>
      </footer>
    </>
  )
}