import Link from 'next/link'

const DEFAULT_FORMATTER = new Intl.DateTimeFormat('it-IT', { day: 'numeric', month: 'long', year: 'numeric' })

function formatPrice(value) {
  if (value == null) return null
  if (Number(value) === 0) return 'Ingresso libero'
  return new Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR' }).format(value)
}

function formatDateRange(startDate, endDate) {
  if (!startDate) return null
  const startLabel = DEFAULT_FORMATTER.format(new Date(startDate))
  if (!endDate) return startLabel
  const endLabel = DEFAULT_FORMATTER.format(new Date(endDate))
  return startLabel === endLabel ? startLabel : `${startLabel} – ${endLabel}`
}

// The neon-brutalist brand has no corner-flourish decoration — kept as a
// no-op export only so nothing breaks if still imported elsewhere.
export function CornerGlyphs() {
  return null
}

export function ParchmentCard({ children, className = '', as: Tag = 'section' }) {
  return (
    <Tag className={`dicefest-surface ${className}`}>
      {children}
    </Tag>
  )
}

export function SigilDivider({ className = '' }) {
  return (
    <div className={`dicefest-divider ${className}`} aria-hidden="true">
      <span className="dicefest-divider__line" />
      <span className="dicefest-divider__glyph" />
      <span className="dicefest-divider__line" />
    </div>
  )
}

export function WaxSeal({ size = 96, label = 'DF', className = '' }) {
  return (
    <div
      className={`dicefest-seal ${className}`}
      style={{ width: size, height: size }}
    >
      <span className="dicefest-seal__label" style={{ fontSize: size * 0.22 }}>
        {label}
      </span>
    </div>
  )
}

function MetaItem({ icon, label, value }) {
  return (
    <div className="flex items-start gap-3">
      <span className="mt-0.5 inline-flex h-9 w-9 shrink-0 items-center justify-center border border-dicefest-border bg-dicefest-surface-2 text-dicefest-green">
        {icon}
      </span>
      <div>
        <p className="font-df-mono text-[10px] font-bold uppercase tracking-[0.22em] text-dicefest-paper/50">{label}</p>
        <p className="mt-1 font-df-body text-base font-semibold text-dicefest-paper">{value}</p>
      </div>
    </div>
  )
}

export function EventMeta({ startDate, endDate, location, price }) {
  const dateLabel = formatDateRange(startDate, endDate) || 'Data da annunciare'
  const locationLabel = location || 'Luogo da annunciare'
  const priceLabel = formatPrice(price) || 'Libero'

  return (
    <div className="flex flex-col gap-5">
      <MetaItem
        label="Quando"
        value={dateLabel}
        icon={
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round">
            <path d="M12 3 A9 9 0 1 0 21 12" />
            <path d="M12 7 L12 12 L15 14" />
          </svg>
        }
      />
      <MetaItem
        label="Dove"
        value={locationLabel}
        icon={
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 21s-7-6.5-7-12a7 7 0 0 1 14 0c0 5.5-7 12-7 12Z" />
            <circle cx="12" cy="9" r="2.5" />
          </svg>
        }
      />
      <MetaItem
        label="Ingresso"
        value={priceLabel}
        icon={
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round">
            <circle cx="12" cy="12" r="8.5" />
            <path d="M9 9 L9 15 L15 15" />
            <path d="M9 12 L13 12" />
          </svg>
        }
      />
    </div>
  )
}

export function FantasyLinkButton({ href, children, variant = 'wax' }) {
  const className = variant === 'wax' ? 'dicefest-btn-primary' : 'dicefest-btn-secondary'
  return (
    <Link href={href} className={className}>
      {children}
    </Link>
  )
}
