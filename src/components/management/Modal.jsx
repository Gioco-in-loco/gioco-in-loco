'use client'

export default function Modal({ open, onClose, title, children, maxWidthClass = 'max-w-lg' }) {
  if (!open) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4 py-8"
      onClick={onClose}
    >
      {/* Altezza limitata al viewport + scroll sul corpo, non sul contenitore
          esterno: con overflow-y-auto + items-center il contenuto che eccede
          in alto restava irraggiungibile (bug noto del centering flex), che è
          perché le dialog con molte prenotazioni sembravano "senza scroll". */}
      <div
        className={`flex max-h-full w-full ${maxWidthClass} flex-col rounded-xl border border-editorial-border bg-white shadow-soft-lg`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex shrink-0 items-start justify-between gap-4 p-6 pb-4">
          <h3 className="font-elegant text-xl font-bold text-editorial-text">{title}</h3>
          <button
            type="button"
            onClick={onClose}
            className="shrink-0 rounded-lg px-2 py-1 font-body text-sm font-semibold text-editorial-text-muted transition-colors hover:bg-editorial-bg hover:text-editorial-text"
            aria-label="Chiudi"
          >
            ✕
          </button>
        </div>
        <div className="overflow-y-auto px-6 pb-6">
          {children}
        </div>
      </div>
    </div>
  )
}
