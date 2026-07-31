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

export function CornerGlyphs({ color = 'currentColor' }) {
  return (
    <>
      <svg className="corner-glyph" style={{ top: 10, left: 10 }} viewBox="0 0 28 28" aria-hidden="true">
        <path d="M2 14 L2 2 L14 2" fill="none" stroke={color} strokeWidth="1.4" strokeLinecap="round" />
        <circle cx="2" cy="2" r="1.6" fill={color} />
      </svg>
      <svg className="corner-glyph" style={{ top: 10, right: 10, transform: 'scaleX(-1)' }} viewBox="0 0 28 28" aria-hidden="true">
        <path d="M2 14 L2 2 L14 2" fill="none" stroke={color} strokeWidth="1.4" strokeLinecap="round" />
        <circle cx="2" cy="2" r="1.6" fill={color} />
      </svg>
      <svg className="corner-glyph" style={{ bottom: 10, left: 10, transform: 'scaleY(-1)' }} viewBox="0 0 28 28" aria-hidden="true">
        <path d="M2 14 L2 2 L14 2" fill="none" stroke={color} strokeWidth="1.4" strokeLinecap="round" />
        <circle cx="2" cy="2" r="1.6" fill={color} />
      </svg>
      <svg className="corner-glyph" style={{ bottom: 10, right: 10, transform: 'scale(-1, -1)' }} viewBox="0 0 28 28" aria-hidden="true">
        <path d="M2 14 L2 2 L14 2" fill="none" stroke={color} strokeWidth="1.4" strokeLinecap="round" />
        <circle cx="2" cy="2" r="1.6" fill={color} />
      </svg>
    </>
  )
}

export function ParchmentCard({ children, className = '', withGlyphs = true, as: Tag = 'section' }) {
  return (
    <Tag className={`parchment-surface ${className}`}>
      {withGlyphs ? <CornerGlyphs color="#C9A227" /> : null}
      {children}
    </Tag>
  )
}

export function SigilDivider({ className = '' }) {
  return (
    <div className={`flex items-center justify-center gap-4 ${className}`} aria-hidden="true">
      <span className="h-px w-16 bg-gradient-to-r from-transparent via-editorial-gold to-transparent sm:w-28" />
      <svg className="ink-trace text-editorial-terra" width="46" height="20" viewBox="0 0 46 20">
        <path d="M2 10 Q 12 2 23 10 T 44 10" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
        <circle cx="23" cy="10" r="2.2" fill="#C9A227" />
        <circle cx="6" cy="10" r="1" fill="currentColor" />
        <circle cx="40" cy="10" r="1" fill="currentColor" />
      </svg>
      <span className="h-px w-16 bg-gradient-to-l from-transparent via-editorial-gold to-transparent sm:w-28" />
    </div>
  )
}

export function WaxSeal({ size = 96, label = 'DF', className = '' }) {
  return (
    <div
      className={`relative flex items-center justify-center ${className}`}
      style={{ width: size, height: size }}
      aria-hidden="true"
    >
      <svg viewBox="0 0 100 100" className="absolute inset-0">
        <defs>
          <radialGradient id="wax-grad" cx="38%" cy="32%" r="70%">
            <stop offset="0%" stopColor="#E27553" />
            <stop offset="55%" stopColor="#C45D3A" />
            <stop offset="100%" stopColor="#7A2E16" />
          </radialGradient>
          <filter id="wax-shadow" x="-20%" y="-20%" width="140%" height="140%">
            <feDropShadow dx="0" dy="2" stdDeviation="2" floodColor="#3D1308" floodOpacity="0.35" />
          </filter>
        </defs>
        <path
          d="M50 4 L60 16 L76 14 L78 30 L92 38 L86 53 L96 66 L84 76 L84 92 L68 88 L58 96 L50 84 L42 96 L32 88 L16 92 L16 76 L4 66 L14 53 L8 38 L22 30 L24 14 L40 16 Z"
          fill="url(#wax-grad)"
          filter="url(#wax-shadow)"
        />
        <circle cx="50" cy="52" r="28" fill="none" stroke="#FBE7D6" strokeWidth="1" strokeOpacity="0.35" />
      </svg>
      <span
        className="relative font-elegant text-[14px] font-bold tracking-widest"
        style={{ color: '#FBE7D6', textShadow: '0 1px 2px rgba(91,30,14,0.7)' }}
      >
        {label}
      </span>
    </div>
  )
}

function MetaItem({ icon, label, value }) {
  return (
    <div className="flex items-start gap-3">
      <span className="mt-0.5 inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-editorial-gold/50 bg-editorial-gold/10 text-editorial-terra">
        {icon}
      </span>
      <div>
        <p className="font-body text-[10px] font-bold uppercase tracking-[0.22em] text-editorial-text-muted">{label}</p>
        <p className="mt-1 font-elegant text-base font-semibold text-editorial-text">{value}</p>
      </div>
    </div>
  )
}

export function EventMeta({ startDate, endDate, location, price }) {
  const dateLabel = formatDateRange(startDate, endDate) || 'Data sospesa nel tempo'
  const locationLabel = location || 'Luogo ancora segreto'
  const priceLabel = formatPrice(price) || 'Libero'

  return (
    <div className="grid gap-6 sm:grid-cols-3">
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
        label="Pegno d'ingresso"
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
  const className = variant === 'wax' ? 'btn-wax' : 'btn-ghost-fantasy'
  return (
    <Link href={href} className={className}>
      {children}
    </Link>
  )
}
