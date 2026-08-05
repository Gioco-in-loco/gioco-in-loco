'use client'

import { useEffect, useRef, useState } from 'react'

export default function ActionsMenu({ label = 'Azioni', children }) {
  const [open, setOpen] = useState(false)
  const containerRef = useRef(null)

  useEffect(() => {
    if (!open) return undefined

    function handleClickOutside(event) {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setOpen(false)
      }
    }

    function handleKeyDown(event) {
      if (event.key === 'Escape') setOpen(false)
    }

    document.addEventListener('mousedown', handleClickOutside)
    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [open])

  return (
    <div className="relative inline-block" ref={containerRef}>
      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        aria-haspopup="true"
        aria-expanded={open}
        className="inline-flex items-center gap-1.5 rounded-lg bg-editorial-terra px-3.5 py-2 font-body text-xs font-semibold text-white transition-colors hover:bg-editorial-terra/90"
      >
        {label}
        <svg width="10" height="10" viewBox="0 0 12 12" fill="none" className={`transition-transform ${open ? 'rotate-180' : ''}`}>
          <path d="M2.5 4.5L6 8L9.5 4.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>

      {open ? (
        <div
          role="menu"
          onClick={() => setOpen(false)}
          className="absolute right-0 z-20 mt-2 w-60 rounded-lg border border-editorial-border bg-white p-1.5 shadow-soft-lg"
        >
          {children}
        </div>
      ) : null}
    </div>
  )
}

export function ActionsMenuItem({ as: Component = 'button', className = '', ...props }) {
  return (
    <Component
      type={Component === 'button' ? 'button' : undefined}
      role="menuitem"
      className={`block w-full rounded-md px-3 py-2 text-left font-body text-xs font-semibold text-editorial-text transition-colors hover:bg-editorial-bg disabled:cursor-not-allowed disabled:opacity-40 ${className}`}
      {...props}
    />
  )
}
