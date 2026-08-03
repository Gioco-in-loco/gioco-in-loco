'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { useToast } from '../../context/ToastContext'
import TutorialPopup from '../tutorial/TutorialPopup'

const BOOKINGS_TUTORIAL_SLIDES = [
  {
    title: 'Le tue prenotazioni',
    description: 'Qui trovi le prenotazioni per i tuoi eventi futuri, raggruppate per evento.',
    illustration: { type: 'cards', items: [{ label: 'Comicon 2026' }, { label: 'Altro evento' }], highlightIndex: -1 },
  },
  {
    title: 'Cambia evento',
    description: 'Se hai prenotazioni per più eventi, usa le schede in alto per passare dall\'uno all\'altro.',
    illustration: { type: 'cards', items: [{ label: 'Comicon 2026' }, { label: 'Altro evento' }], highlightIndex: 1 },
  },
  {
    title: 'Dettagli prenotazione',
    description: 'Ogni scheda mostra tipo di attività, stato, giorno, fascia oraria e tavolo assegnato.',
    illustration: { type: 'list', columns: ['Attività', 'Stato'], rows: 3, highlightRow: 1 },
  },
  {
    title: 'Cancella se serve',
    description: 'Se la prenotazione è ancora annullabile, premi "Cancella" per liberare il posto.',
    illustration: { type: 'form', fields: ['Prenotazione'], highlightIndex: 1, submitLabel: 'Cancella' },
  },
]

function formatReservationStatus(status) {
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

function formatEventDateRange(startDate, endDate) {
  if (!startDate) {
    return 'Data da definire'
  }

  const formatter = new Intl.DateTimeFormat('it-IT', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })

  const start = new Date(startDate)
  const formattedStart = formatter.format(start)

  if (!endDate) {
    return formattedStart
  }

  const end = new Date(endDate)
  const formattedEnd = formatter.format(end)

  if (formattedStart === formattedEnd) {
    return formattedStart
  }

  return `${formattedStart} - ${formattedEnd}`
}

function getBookingEventLabel(booking) {
  return booking?.event?.name || 'Evento non specificato'
}

function getBookingTypeBadge(bookingType) {
  switch (bookingType) {
    case 'event-admission':
      return 'border-editorial-gold/40 bg-editorial-gold/10 text-editorial-text'
    case 'main-event':
      return 'border-editorial-forest/30 bg-editorial-forest/10 text-editorial-forest'
    default:
      return 'border-editorial-terra/30 bg-editorial-terra/10 text-editorial-terra'
  }
}

function sortEventGroups(left, right) {
  const leftDate = left.event?.startDate ? new Date(left.event.startDate).getTime() : Number.MAX_SAFE_INTEGER
  const rightDate = right.event?.startDate ? new Date(right.event.startDate).getTime() : Number.MAX_SAFE_INTEGER
  if (leftDate !== rightDate) return leftDate - rightDate
  return getBookingEventLabel(left.items[0]).localeCompare(getBookingEventLabel(right.items[0]))
}

function formatUpdatedAt(updatedAt) {
  if (!updatedAt) return 'n/d'
  return new Date(updatedAt).toLocaleString('it-IT', {
    day: '2-digit',
    month: '2-digit',
    year: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function formatBookingPrice(price) {
  if (typeof price !== 'number' || price <= 0) return null

  return new Intl.NumberFormat('it-IT', {
    style: 'currency',
    currency: 'EUR',
  }).format(price)
}

function CalendarIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" className="text-editorial-text-muted" aria-hidden="true">
      <rect x="2" y="3.5" width="12" height="11" rx="1.5" />
      <path d="M2 6.5h12M5.5 2v3M10.5 2v3" />
    </svg>
  )
}

function BookingItemCard({ booking, pendingCancellationKey, onCancel }) {
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

function EventBookingGroupCard({ eventGroup, pendingCancellationKey, onCancel }) {
  const bookingCount = eventGroup.items.length
  const dateLabel = formatEventDateRange(eventGroup.event?.startDate, eventGroup.event?.endDate)
  const locationLabel = eventGroup.event?.location || 'Luogo da definire'

  return (
    <section className="rounded-2xl border border-editorial-border bg-white p-4 shadow-soft sm:p-5">
      <header className="flex flex-col gap-1 border-b border-dashed border-editorial-border pb-3 sm:flex-row sm:items-end sm:justify-between sm:gap-4">
        <div className="min-w-0">
          <p className="font-body text-[10px] font-bold uppercase tracking-[0.18em] text-editorial-terra">Evento</p>
          <h2 className="mt-1 font-elegant text-xl font-bold leading-tight text-editorial-text sm:text-2xl">
            {eventGroup.event?.name || 'Evento non specificato'}
          </h2>
        </div>
        <p className="font-body text-xs text-editorial-text-secondary">
          <span className="font-semibold text-editorial-text">{dateLabel}</span>
          <span className="text-editorial-text-muted"> · </span>
          <span>{locationLabel}</span>
          <span className="text-editorial-text-muted"> · </span>
          <span>{bookingCount} {bookingCount === 1 ? 'voce' : 'voci'}</span>
        </p>
      </header>

      <div className="mt-3 space-y-2.5">
        {eventGroup.items.map((booking) => (
          <BookingItemCard
            key={`${booking.bookingType}:${booking.id}`}
            booking={booking}
            pendingCancellationKey={pendingCancellationKey}
            onCancel={onCancel}
          />
        ))}
      </div>
    </section>
  )
}

function getEventGroupKey(group) {
  return group.event?.id || `group:${group.items[0]?.bookingType}:${group.items[0]?.id}`
}

function formatTabDate(startDate) {
  if (!startDate) return null
  return new Intl.DateTimeFormat('it-IT', { day: 'numeric', month: 'short' }).format(new Date(startDate))
}

function EventTabs({ groups, activeKey, onChange }) {
  return (
    <div
      className="flex flex-wrap gap-1.5 rounded-xl border border-editorial-border bg-editorial-bg/30 p-1.5"
      role="tablist"
      aria-label="Eventi prenotati"
    >
      {groups.map((group) => {
        const key = getEventGroupKey(group)
        const isActive = key === activeKey
        const dateLabel = formatTabDate(group.event?.startDate)
        return (
          <button
            key={key}
            type="button"
            role="tab"
            aria-selected={isActive}
            onClick={() => onChange(key)}
            className={[
              'inline-flex items-center gap-2 rounded-lg px-3 py-1.5 font-body text-xs font-semibold transition-colors',
              isActive
                ? 'bg-white text-editorial-text shadow-soft border border-editorial-gold/40'
                : 'text-editorial-text-secondary hover:bg-white/50 hover:text-editorial-text border border-transparent',
            ].join(' ')}
          >
            <span className="font-elegant text-sm font-bold leading-none">
              {group.event?.name || 'Evento'}
            </span>
            {dateLabel ? (
              <span className="font-body text-[10px] uppercase tracking-wider text-editorial-text-muted">
                {dateLabel}
              </span>
            ) : null}
            <span className={[
              'inline-flex min-w-[20px] items-center justify-center rounded-full px-1.5 py-0.5 font-body text-[10px] font-bold leading-none',
              isActive ? 'bg-editorial-terra text-white' : 'bg-editorial-border/60 text-editorial-text',
            ].join(' ')}>
              {group.items.length}
            </span>
          </button>
        )
      })}
    </div>
  )
}

export default function AccountBookingsPage() {
  const toast = useToast()
  const [bookingsState, setBookingsState] = useState({ loading: true, error: '', items: [] })
  const [pendingCancellationKey, setPendingCancellationKey] = useState(null)
  const [activeEventKey, setActiveEventKey] = useState(null)

  const loadBookings = useCallback(async ({ preserveItems = false } = {}) => {
    if (!preserveItems) {
      setBookingsState((current) => ({ ...current, loading: true, error: '' }))
    }

    try {
      const response = await fetch('/api/account/bookings', {
        cache: 'no-store',
        credentials: 'same-origin',
      })

      const payload = await response.json().catch(() => ({}))

      if (!response.ok) {
        throw new Error(payload.error || 'Impossibile caricare le prenotazioni.')
      }

      setBookingsState({ loading: false, error: '', items: payload.bookings || [] })
    } catch (error) {
      setBookingsState((current) => ({
        loading: false,
        error: error.message || 'Impossibile caricare le prenotazioni.',
        items: preserveItems ? current.items : [],
      }))
    }
  }, [])

  useEffect(() => {
    void loadBookings()
  }, [loadBookings])

  const bookingsByEvent = useMemo(() => {
    const groups = new Map()

    for (const booking of bookingsState.items) {
      const eventId = booking.event?.id || `eventless:${booking.bookingType}:${booking.id}`
      const current = groups.get(eventId)
      if (current) {
        current.items.push(booking)
      } else {
        groups.set(eventId, {
          event: booking.event,
          items: [booking],
        })
      }
    }

    return Array.from(groups.values())
      .map((group) => ({
        ...group,
        items: [...group.items],
      }))
      .sort(sortEventGroups)
  }, [bookingsState.items])

  // Keep activeEventKey in sync with available groups
  useEffect(() => {
    if (bookingsByEvent.length === 0) {
      if (activeEventKey !== null) setActiveEventKey(null)
      return
    }
    const exists = bookingsByEvent.some((g) => getEventGroupKey(g) === activeEventKey)
    if (!exists) {
      setActiveEventKey(getEventGroupKey(bookingsByEvent[0]))
    }
  }, [bookingsByEvent, activeEventKey])

  const activeGroup = useMemo(() => {
    if (!activeEventKey) return bookingsByEvent[0] || null
    return bookingsByEvent.find((g) => getEventGroupKey(g) === activeEventKey) || bookingsByEvent[0] || null
  }, [bookingsByEvent, activeEventKey])

  const handleCancelReservation = async (booking) => {
    const pendingKey = `${booking.bookingType}:${booking.id}`
    setPendingCancellationKey(pendingKey)

    try {
      const response = await fetch(`/api/account/bookings/${booking.bookingType}/${booking.id}`, {
        method: 'DELETE',
        credentials: 'same-origin',
      })
      const payload = await response.json().catch(() => ({}))

      if (!response.ok) {
        throw new Error(payload.error || 'Impossibile cancellare la prenotazione.')
      }

      toast.success('Prenotazione cancellata.')
      await loadBookings({ preserveItems: true })
    } catch (error) {
      toast.error(error.message || 'Impossibile cancellare la prenotazione.')
    } finally {
      setPendingCancellationKey(null)
    }
  }

  return (
    <section className="space-y-6">
      <div className="flex items-center gap-2">
        <h1 className="font-elegant text-2xl font-bold text-editorial-text sm:text-3xl">Prenotazioni</h1>
        <TutorialPopup label="Prenotazioni" slides={BOOKINGS_TUTORIAL_SLIDES} />
      </div>

      {bookingsState.loading ? (
        <div className="rounded-2xl border border-editorial-border bg-white p-6 shadow-soft font-body text-sm text-editorial-text-secondary">
          Caricamento prenotazioni in corso...
        </div>
      ) : null}

      {!bookingsState.loading && bookingsState.error ? (
        <div className="rounded-2xl border border-red-200 bg-red-50 p-6 font-body text-sm text-red-600">
          {bookingsState.error}
        </div>
      ) : null}

      {!bookingsState.loading && !bookingsState.error && bookingsState.items.length === 0 ? (
        <div className="rounded-2xl border border-editorial-border bg-white p-8 shadow-soft">
          <h2 className="font-elegant text-2xl font-bold text-editorial-text">Nessuna prenotazione futura</h2>
          <p className="mt-3 font-body text-sm text-editorial-text-secondary">
            Al momento non hai prenotazioni associate a eventi futuri da gestire.
          </p>
        </div>
      ) : null}

      {!bookingsState.loading && !bookingsState.error && activeGroup ? (
        <div className="space-y-4">
          {bookingsByEvent.length > 1 ? (
            <EventTabs
              groups={bookingsByEvent}
              activeKey={getEventGroupKey(activeGroup)}
              onChange={setActiveEventKey}
            />
          ) : null}
          <EventBookingGroupCard
            key={getEventGroupKey(activeGroup)}
            eventGroup={activeGroup}
            pendingCancellationKey={pendingCancellationKey}
            onCancel={handleCancelReservation}
          />
        </div>
      ) : null}
    </section>
  )
}