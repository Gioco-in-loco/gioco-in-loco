'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { useToast } from '../../context/ToastContext'
import TutorialPopup from '../tutorial/TutorialPopup'
import BookingsTimelineView from './BookingsTimelineView'
import {
  formatReservationStatus,
  formatCompanionStatus,
  getBookingTypeBadge,
  formatUpdatedAt,
  formatBookingPrice,
  CalendarIcon,
  BookingItemCard,
} from './bookingCard'

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

function sortEventGroups(left, right) {
  const leftDate = left.event?.startDate ? new Date(left.event.startDate).getTime() : Number.MAX_SAFE_INTEGER
  const rightDate = right.event?.startDate ? new Date(right.event.startDate).getTime() : Number.MAX_SAFE_INTEGER
  if (leftDate !== rightDate) return leftDate - rightDate
  return getBookingEventLabel(left.items[0]).localeCompare(getBookingEventLabel(right.items[0]))
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
  const [viewMode, setViewMode] = useState('byEvent')
  const [isSendingIcs, setIsSendingIcs] = useState(false)

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

  const handleSendIcsEmail = async () => {
    setIsSendingIcs(true)
    try {
      const response = await fetch('/api/account/bookings/ics/email', { method: 'POST', credentials: 'same-origin' })
      const payload = await response.json().catch(() => ({}))

      if (!response.ok) {
        throw new Error(payload.error || 'Impossibile inviare il calendario via email.')
      }

      toast.success(payload.count > 0 ? 'Calendario inviato alla tua email.' : 'Nessuna prenotazione attiva da inviare.')
    } catch (error) {
      toast.error(error.message || 'Impossibile inviare il calendario via email.')
    } finally {
      setIsSendingIcs(false)
    }
  }

  const hasBookings = !bookingsState.loading && !bookingsState.error && bookingsState.items.length > 0

  return (
    <section className="space-y-6">
      <div className="flex flex-wrap items-center gap-2">
        <h1 className="font-elegant text-2xl font-bold text-editorial-text sm:text-3xl">Prenotazioni</h1>
        <TutorialPopup label="Prenotazioni" slides={BOOKINGS_TUTORIAL_SLIDES} />
      </div>

      {hasBookings ? (
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex rounded-lg border border-editorial-border bg-editorial-bg/30 p-1">
            <button
              type="button"
              onClick={() => setViewMode('byEvent')}
              className={`rounded-md px-3 py-1.5 font-body text-xs font-semibold transition-colors ${viewMode === 'byEvent' ? 'bg-white text-editorial-text shadow-soft' : 'text-editorial-text-secondary hover:text-editorial-text'}`}
            >
              Per evento
            </button>
            <button
              type="button"
              onClick={() => setViewMode('timeline')}
              className={`rounded-md px-3 py-1.5 font-body text-xs font-semibold transition-colors ${viewMode === 'timeline' ? 'bg-white text-editorial-text shadow-soft' : 'text-editorial-text-secondary hover:text-editorial-text'}`}
            >
              Timeline
            </button>
          </div>

          <a
            href="/api/account/bookings/ics"
            download
            className="inline-flex items-center rounded-lg border border-editorial-border px-3 py-1.5 font-body text-xs font-semibold text-editorial-text transition-colors hover:border-editorial-gold/40"
          >
            Scarica calendario (.ics)
          </a>

          <button
            type="button"
            onClick={handleSendIcsEmail}
            disabled={isSendingIcs}
            className="inline-flex items-center rounded-lg border border-editorial-border px-3 py-1.5 font-body text-xs font-semibold text-editorial-text transition-colors hover:border-editorial-gold/40 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isSendingIcs ? 'Invio in corso…' : 'Invia calendario via email'}
          </button>
        </div>
      ) : null}

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

      {hasBookings && viewMode === 'byEvent' && activeGroup ? (
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

      {hasBookings && viewMode === 'timeline' ? (
        <BookingsTimelineView
          bookings={bookingsState.items}
          pendingCancellationKey={pendingCancellationKey}
          onCancel={handleCancelReservation}
        />
      ) : null}
    </section>
  )
}