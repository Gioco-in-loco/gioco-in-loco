'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'

export default function AuthShell({ eyebrow, title, description, children, footer }) {
  const [isVisible, setIsVisible] = useState(false)

  useEffect(() => {
    setIsVisible(true)
  }, [])

  return (
    <section className="min-h-[calc(100vh-4rem)] flex items-center justify-center px-6 py-16 energized-bg">
      {/* Background pattern */}
      <div className="absolute inset-0 dice-pattern-energized opacity-30 pointer-events-none pattern-drift" />

      {/* Decorative elements */}
      <div className="absolute top-20 left-10 w-24 h-24 rounded-full bg-editorial-terra/10" />
      <div className="absolute bottom-40 right-10 w-32 h-32 rounded-full bg-editorial-forest/10" />

      <div
        className={`relative w-full max-w-md bg-white border-2 border-editorial-border rounded-xl shadow-soft-lg p-8 energized-card transition-all duration-700 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}
      >
        <p className="font-body text-xs uppercase tracking-widest text-editorial-terra mb-4 font-semibold">
          {eyebrow}
        </p>
        <h1 className="font-elegant text-4xl text-editorial-text mb-3 font-bold">{title}</h1>
        <p className="font-body text-editorial-text-secondary leading-relaxed mb-8">
          {description}
        </p>

        {children}

        {footer ? (
          <div className="mt-8 text-sm text-editorial-text-secondary font-body">{footer}</div>
        ) : null}

        <div className="mt-8 pt-6 border-t-2 border-editorial-border text-center">
          <Link
            href="/"
            className="font-body text-sm text-editorial-terra hover:underline font-semibold inline-flex items-center gap-2 hover:gap-3 transition-all"
          >
            ← Torna alla home
          </Link>
        </div>
      </div>
    </section>
  )
}