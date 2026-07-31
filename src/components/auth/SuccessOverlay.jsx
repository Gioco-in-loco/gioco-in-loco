'use client'

import { useEffect } from 'react'

export default function SuccessOverlay({
  title,
  description,
  ctaLabel = 'Continua',
  onCta,
  secondaryLabel,
  onSecondary,
}) {
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape' && onSecondary) onSecondary()
      if (e.key === 'Enter' && onCta) onCta()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onCta, onSecondary])

  return (
    <div
      className="fixed inset-0 z-[300] flex items-center justify-center bg-black/60 px-4 animate-soft-fade"
      role="dialog"
      aria-modal="true"
    >
      <div className="bg-white rounded-2xl border-2 border-editorial-border shadow-soft-lg w-full max-w-sm p-7 text-center animate-pop">
        <div className="w-16 h-16 mx-auto rounded-full bg-emerald-50 border-2 border-emerald-200 flex items-center justify-center mb-5 text-emerald-500">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="w-8 h-8">
            <polyline points="20 6 9 17 4 12" />
          </svg>
        </div>
        <h2 className="font-elegant text-2xl text-editorial-text font-bold mb-2">{title}</h2>
        {description && (
          <p className="font-body text-sm text-editorial-text-secondary leading-relaxed mb-6">{description}</p>
        )}
        <div className="flex flex-col gap-2">
          <button
            type="button"
            onClick={onCta}
            autoFocus
            className="w-full py-3 rounded-lg bg-editorial-terra text-white font-body text-sm font-semibold hover:bg-editorial-terra/90 hover:scale-[1.02] transition-all"
          >
            {ctaLabel}
          </button>
          {secondaryLabel && onSecondary && (
            <button
              type="button"
              onClick={onSecondary}
              className="w-full py-2.5 rounded-lg border-2 border-editorial-border text-editorial-text-muted font-body text-sm font-semibold hover:border-editorial-terra hover:text-editorial-terra transition-colors"
            >
              {secondaryLabel}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
