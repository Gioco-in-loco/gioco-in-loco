'use client'

export default function Modal({ open, onClose, title, children, maxWidthClass = 'max-w-lg' }) {
  if (!open) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/40 px-4 py-8"
      onClick={onClose}
    >
      <div
        className={`w-full ${maxWidthClass} rounded-xl border border-editorial-border bg-white p-6 shadow-soft-lg`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-start justify-between gap-4">
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
        {children}
      </div>
    </div>
  )
}
