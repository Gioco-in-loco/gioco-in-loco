'use client'

import { useState } from 'react'
import Modal from '../management/Modal'
import TutorialIllustration from './TutorialIllustration'

export default function TutorialPopup({ label, slides = [] }) {
  const [open, setOpen] = useState(false)
  const [index, setIndex] = useState(0)

  if (slides.length === 0) return null

  const handleClose = () => {
    setOpen(false)
    setIndex(0)
  }

  const slide = slides[index]
  const isFirst = index === 0
  const isLast = index === slides.length - 1

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        title={`Come funziona: ${label}`}
        aria-label={`Come funziona: ${label}`}
        className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-editorial-terra/40 bg-editorial-terra/10 font-body text-xs font-bold text-editorial-terra transition-colors hover:bg-editorial-terra/20"
      >
        ?
      </button>

      <Modal open={open} onClose={handleClose} title={`Come funziona: ${label}`} maxWidthClass="max-w-lg">
        <div className="space-y-4">
          <TutorialIllustration illustration={slide.illustration} />

          <div>
            <p className="font-body text-xs font-semibold uppercase tracking-wider text-editorial-terra">
              Passo {index + 1} di {slides.length}
            </p>
            <h4 className="mt-1 font-elegant text-lg font-bold text-editorial-text">{slide.title}</h4>
            <p className="mt-1 font-body text-sm text-editorial-text-secondary">{slide.description}</p>
          </div>

          <div className="flex items-center justify-between gap-3 pt-1">
            <div className="flex items-center gap-1.5">
              {slides.map((s, i) => (
                <button
                  key={s.title}
                  type="button"
                  onClick={() => setIndex(i)}
                  aria-label={`Vai al passo ${i + 1}`}
                  className={`h-1.5 rounded-full transition-all ${i === index ? 'w-5 bg-editorial-terra' : 'w-1.5 bg-editorial-border'}`}
                />
              ))}
            </div>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setIndex((i) => Math.max(0, i - 1))}
                disabled={isFirst}
                className="rounded-lg border border-editorial-border px-3 py-1.5 font-body text-xs font-semibold text-editorial-text transition-colors hover:border-editorial-terra disabled:cursor-not-allowed disabled:opacity-40"
              >
                ← Indietro
              </button>
              {isLast ? (
                <button
                  type="button"
                  onClick={handleClose}
                  className="rounded-lg bg-editorial-terra px-3 py-1.5 font-body text-xs font-semibold text-white transition-colors hover:bg-editorial-terra/90"
                >
                  Fatto
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => setIndex((i) => Math.min(slides.length - 1, i + 1))}
                  className="rounded-lg bg-editorial-terra px-3 py-1.5 font-body text-xs font-semibold text-white transition-colors hover:bg-editorial-terra/90"
                >
                  Avanti →
                </button>
              )}
            </div>
          </div>
        </div>
      </Modal>
    </>
  )
}
