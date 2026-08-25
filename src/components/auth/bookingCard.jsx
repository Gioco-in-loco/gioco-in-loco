'use client'

// Shared between the per-event view and the Timeline view in
// AccountBookingsPage.jsx / BookingsTimelineView.jsx.

export function formatReservationStatus(status) {
  switch (status) {
    case 'CONFIRMED':
      return { label: 'Confermata', className: 'border-emerald-200 bg-emerald-50 text-emerald-700' }
    case 'PENDING':
      return { label: 'In attesa', className: 'border-amber-200 bg-amber-50 text-amber-700' }
    case 'ATTENDED':
      return { label: 'Partecipata', className: 'border-sky-200 bg-sky-50 text-sky-700' }
    case 'CANCELLED':
      return { label: 'Cancellata', className: 'border-slate-200 bg-slate-100 text-slate-600' }
    default:
      return { label: status || 'Sconosciuta', className: 'border-editorial-border bg-editorial-bg/60 text-editorial-text-secondary' }
  }
}

export function formatCompanionStatus(status) {
  switch (status) {
    case 'HOLD':
      return { label: 'Nel carrello', className: 'border-slate-200 bg-slate-100 text-slate-600' }
    case 'INVITED':
      return { label: 'Invito inviato, in attesa di conferma', className: 'border-amber-200 bg-amber-50 text-amber-700' }
    case 'EXPIRED':
      return { label: 'Invito scaduto', className: 'border-slate-200 bg-slate-100 text-slate-500' }
    case 'PENDING':
    case 'CONFIRMED':
    case 'ATTENDED':
      return { label: 'Confermato', className: 'border-emerald-200 bg-emerald-50 text-emerald-700' }
    default:
      return { label: status || 'Sconosciuto', className: 'border-editorial-border bg-editorial-bg/60 text-editorial-text-secondary' }
  }
}

export function getBookingTypeBadge(bookingType) {
  switch (bookingType) {
    case 'event-admission':
      return 'border-editorial-gold/40 bg-editorial-gold/10 text-editorial-text'
    case 'main-event':
      return 'border-editorial-forest/30 bg-editorial-forest/10 text-editorial-forest'
    default:
      return 'border-editorial-terra/30 bg-editorial-terra/10 text-editorial-terra'
  }
}

export function formatCompanionDeadline(holdExpiresAt) {
  if (!holdExpiresAt) return null
  return new Intl.DateTimeFormat('it-IT', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }).format(new Date(holdExpiresAt))
}

export function formatUpdatedAt(updatedAt) {
  if (!updatedAt) return 'n/d'
  return new Date(updatedAt).toLocaleString('it-IT', {
    day: '2-digit',
    month: '2-digit',
    year: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export function formatBookingPrice(price) {
  if (typeof price !== 'number' || price <= 0) return null

  return new Intl.NumberFormat('it-IT', {
    style: 'currency',
    currency: 'EUR',
  }).format(price)
}

export function CalendarIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" className="text-editorial-text-muted" aria-hidden="true">
      <rect x="2" y="3.5" width="12" height="11" rx="1.5" />
      <path d="M2 6.5h12M5.5 2v3M10.5 2v3" />
    </svg>
  )
}

export function BookingItemCard({ booking, pendingCancellationKey, onCancel, showEventName = false }) {
  const status = formatReservationStatus(booking.status)
  const pendingKey = `${booking.bookingType}:${booking.id}`
  const isAdmission = booking.bookingType === 'event-admission'
  const isPending = pendingCancellationKey === pendingKey
  const activityPriceLabel = formatBookingPrice(booking.activity.price)

  return (
    <article className="rounded-xl border border-editorial-border bg-white px-3.5 py-3 shadow-soft transition hover:border-editorial-gold/40">
      <div className="flex flex-col gap-2.5 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
        <div className="min-w-0 flex-1">
          {/* Badges row */}
          <div className="flex flex-wrap items-center gap-1.5">
            <span className={`inline-flex rounded-full border px-2 py-0.5 font-body text-[10px] font-bold uppercase tracking-wider ${getBookingTypeBadge(booking.bookingType)}`}>
              {booking.bookingTypeLabel}
            </span>
            <span className={`inline-flex rounded-full border px-2 py-0.5 font-body text-[10px] font-bold ${status.className}`}>
              {status.label}
            </span>
            {showEventName && booking.event?.name ? (
              <span className="font-body text-[10px] font-semibold uppercase tracking-wider text-editorial-text-muted">
                {booking.event.name}
              </span>
            ) : null}
          </div>

          {/* Title */}
          <h3 className="mt-1.5 font-elegant text-base font-bold leading-tight text-editorial-text">{booking.activity.title}</h3>

          {/* Meta inline: game · associazione · host */}
          {(booking.activity.game || booking.activity.associationName || booking.activity.hostLabel || activityPriceLabel) ? (
            <p className="mt-0.5 font-body text-xs text-editorial-text-secondary">
              {booking.activity.game ? <span>{booking.activity.game}</span> : null}
              {booking.activity.game && (booking.activity.associationName || booking.activity.hostLabel || activityPriceLabel) ? <span className="text-editorial-text-muted"> · </span> : null}
              {booking.activity.associationName ? <span>{booking.activity.associationName}</span> : null}
              {booking.activity.associationName && (booking.activity.hostLabel || activityPriceLabel) ? <span className="text-editorial-text-muted"> · </span> : null}
              {booking.activity.hostLabel ? <span className="font-semibold text-editorial-terra">{booking.activity.hostLabel}</span> : null}
              {booking.activity.hostLabel && activityPriceLabel ? <span className="text-editorial-text-muted"> · </span> : null}
              {activityPriceLabel ? <span className="font-semibold text-editorial-terra">{activityPriceLabel}</span> : null}
            </p>
          ) : null}

          {/* Schedule inline */}
          {isAdmission ? (
            <p className="mt-1.5 inline-flex items-center gap-1.5 font-body text-xs text-editorial-text-secondary">
              <CalendarIcon />
              {booking.schedule.day ? `Valido per: ${booking.schedule.day}` : 'Valido per l\'intera giornata'}
            </p>
          ) : (
            <p className="mt-1.5 inline-flex flex-wrap items-center gap-1.5 font-body text-xs text-editorial-text">
              <CalendarIcon />
              <span className="font-semibold">{booking.schedule.day}</span>
              <span className="text-editorial-text-muted">·</span>
              <span className="font-semibold text-editorial-terra">{booking.schedule.slot}</span>
              <span className="text-editorial-text-muted">·</span>
              <span>{booking.schedule.table || 'Tavolo da definire'}</span>
            </p>
          )}

          <p className="mt-1.5 font-body text-[10px] text-editorial-text-muted">
            Aggiornata · {formatUpdatedAt(booking.updatedAt)}
          </p>

          {booking.companions?.length > 0 ? (
            <div className="mt-2 space-y-1 border-t border-dashed border-editorial-border pt-2">
              <p className="font-body text-[10px] font-bold uppercase tracking-wider text-editorial-text-muted">Amici invitati</p>
              {booking.companions.map((companion, index) => {
                const companionStatus = formatCompanionStatus(companion.status)
                const deadline = companion.status === 'INVITED' ? formatCompanionDeadline(companion.holdExpiresAt) : null
                return (
                  <div key={`${companion.email}:${index}`} className="flex flex-wrap items-center gap-1.5 font-body text-xs text-editorial-text-secondary">
                    <span className="font-semibold text-editorial-text">{companion.name || companion.email}</span>
                    <span className={`inline-flex rounded-full border px-2 py-0.5 font-body text-[10px] font-bold ${companionStatus.className}`}>
                      {companionStatus.label}
                    </span>
                    {deadline ? <span className="text-editorial-text-muted">entro il {deadline}</span> : null}
                  </div>
                )
              })}
            </div>
          ) : null}
        </div>

        <div className="flex shrink-0 flex-col items-stretch gap-1.5 sm:items-end">
          {booking.canCancel ? (
            <button
              type="button"
              onClick={() => onCancel(booking)}
              disabled={isPending}
              className="inline-flex items-center justify-center rounded-full border border-red-200 px-3.5 py-1.5 font-body text-xs font-semibold text-red-600 transition-colors hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isPending ? 'Cancello…' : 'Cancella'}
            </button>
          ) : booking.status === 'CANCELLED' && booking.cancellationReason ? (
            <span className="max-w-[220px] whitespace-pre-line font-body text-[10px] leading-relaxed text-editorial-text-muted sm:text-right">
              {booking.cancellationReason}
            </span>
          ) : (
            <span className="max-w-[220px] font-body text-[10px] leading-relaxed text-editorial-text-muted sm:text-right">
              {booking.cancellationBlockedReason || 'Non modificabile.'}
            </span>
          )}
        </div>
      </div>
    </article>
  )
}
