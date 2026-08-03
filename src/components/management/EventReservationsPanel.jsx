'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { useToast } from '../../context/ToastContext'

const TYPE_LABELS = {
  oneshot: 'One-shot',
  mainEvent: 'Main Event',
  admission: 'Pass ingresso',
}

const STATUS_LABELS = {
  HOLD: 'In blocco',
  PENDING: 'In attesa',
  CONFIRMED: 'Confermato',
  CANCELLED: 'Annullato',
  EXPIRED: 'Non confermato',
  ATTENDED: 'Presente',
}

const STATUS_CLASSES = {
  HOLD: 'bg-editorial-bg text-editorial-text-muted',
  PENDING: 'bg-amber-50 text-amber-700',
  CONFIRMED: 'bg-editorial-forest/10 text-editorial-forest',
  CANCELLED: 'bg-red-50 text-red-600',
  EXPIRED: 'bg-editorial-bg text-editorial-text-muted',
  ATTENDED: 'bg-editorial-terra/10 text-editorial-terra',
}

const DAY_ORDER = ['Lunedi', 'Lunedì', 'Martedi', 'Martedì', 'Mercoledi', 'Mercoledì', 'Giovedi', 'Giovedì', 'Venerdi', 'Venerdì', 'Sabato', 'Domenica']

function dayIndex(day) {
  const idx = DAY_ORDER.indexOf(day)
  return idx === -1 ? 999 : idx
}

function formatDate(value) {
  if (!value) return '—'
  return new Intl.DateTimeFormat('it-IT', {
    day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit',
  }).format(new Date(value))
}

function normalizeSearchValue(value) {
  return String(value || '').trim().toLocaleLowerCase('it-IT')
}

// Di default si vedono solo le prenotazioni confermate: la lista completa
// (in attesa, annullate, scadute...) è pensata per l'audit occasionale, non
// per la vista principale su cosa succederà davvero all'evento.
const DEFAULT_FILTERS = { type: '', day: '', slotTime: '', status: 'CONFIRMED' }

function ReservationActionsCell({ reservation, busyKey, onCancel, onDelete }) {
  const [mode, setMode] = useState(null) // null | 'cancel' | 'confirmDelete'
  const [reason, setReason] = useState('')
  const rowKey = `${reservation.type}-${reservation.id}`
  const isBusy = busyKey === rowKey

  if (mode === 'cancel') {
    return (
      <div className="flex min-w-[220px] flex-col gap-1.5">
        <textarea
          value={reason}
          onChange={(event) => setReason(event.target.value)}
          placeholder="Motivo dell'annullamento (visibile all'utente)..."
          rows={2}
          className="w-full rounded-lg border border-editorial-border px-2 py-1.5 font-body text-xs text-editorial-text placeholder:text-editorial-text-muted focus:border-editorial-terra focus:outline-none"
        />
        <div className="flex gap-1.5">
          <button
            type="button"
            disabled={isBusy || !reason.trim()}
            onClick={async () => {
              const ok = await onCancel(reservation, reason.trim())
              if (ok) setMode(null)
            }}
            className="rounded-lg bg-red-600 px-2.5 py-1 font-body text-xs font-semibold text-white transition-colors hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isBusy ? 'Annullo...' : 'Conferma annullamento'}
          </button>
          <button
            type="button"
            disabled={isBusy}
            onClick={() => { setMode(null); setReason('') }}
            className="rounded-lg border border-editorial-border px-2.5 py-1 font-body text-xs font-semibold text-editorial-text hover:border-editorial-terra"
          >
            Chiudi
          </button>
        </div>
      </div>
    )
  }

  if (mode === 'confirmDelete') {
    return (
      <div className="flex min-w-[220px] flex-col gap-1.5">
        <p className="font-body text-xs font-semibold text-red-600">Eliminare definitivamente questo record?</p>
        <div className="flex gap-1.5">
          <button
            type="button"
            disabled={isBusy}
            onClick={async () => {
              const ok = await onDelete(reservation)
              if (ok) setMode(null)
            }}
            className="rounded-lg bg-red-600 px-2.5 py-1 font-body text-xs font-semibold text-white transition-colors hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isBusy ? 'Elimino...' : 'Sì, elimina'}
          </button>
          <button
            type="button"
            disabled={isBusy}
            onClick={() => setMode(null)}
            className="rounded-lg border border-editorial-border px-2.5 py-1 font-body text-xs font-semibold text-editorial-text hover:border-editorial-terra"
          >
            Annulla
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="flex gap-1.5">
      <button
        type="button"
        disabled={reservation.status === 'CANCELLED'}
        onClick={() => setMode('cancel')}
        className="rounded-lg border border-editorial-border px-2.5 py-1 font-body text-xs font-semibold text-editorial-text transition-colors hover:border-editorial-terra disabled:cursor-not-allowed disabled:opacity-40"
      >
        Annulla
      </button>
      <button
        type="button"
        onClick={() => setMode('confirmDelete')}
        className="rounded-lg border border-red-200 px-2.5 py-1 font-body text-xs font-semibold text-red-600 transition-colors hover:bg-red-50"
      >
        Elimina
      </button>
    </div>
  )
}

export default function EventReservationsPanel({ eventId }) {
  const toast = useToast()
  const [reservations, setReservations] = useState([])
  const [loading, setLoading] = useState(false)
  const [loadError, setLoadError] = useState('')
  const [search, setSearch] = useState('')
  const [filters, setFilters] = useState(DEFAULT_FILTERS)
  const [busyKey, setBusyKey] = useState(null)

  const load = useCallback(async () => {
    if (!eventId) { setReservations([]); return }
    setLoading(true)
    setLoadError('')
    try {
      const res = await fetch(`/api/admin/eventi/${eventId}/reservations`)
      if (!res.ok) throw new Error('Impossibile caricare le prenotazioni.')
      setReservations(await res.json())
    } catch (err) {
      setLoadError(err.message || 'Impossibile caricare le prenotazioni.')
    } finally {
      setLoading(false)
    }
  }, [eventId])

  useEffect(() => { load() }, [load])

  const dayOptions = useMemo(() => {
    const unique = Array.from(new Set(reservations.map((r) => r.day).filter(Boolean)))
    return unique.sort((left, right) => dayIndex(left) - dayIndex(right))
  }, [reservations])

  const slotOptions = useMemo(() => {
    const unique = Array.from(new Set(reservations.map((r) => r.slotTime).filter(Boolean)))
    return unique.sort((left, right) => left.localeCompare(right, undefined, { numeric: true }))
  }, [reservations])

  const filtered = useMemo(() => {
    const query = normalizeSearchValue(search)

    return reservations.filter((reservation) => {
      if (filters.status && reservation.status !== filters.status) return false
      if (filters.type && reservation.type !== filters.type) return false
      if (filters.day && reservation.day !== filters.day) return false
      if (filters.slotTime && reservation.slotTime !== filters.slotTime) return false

      if (query) {
        const haystack = [reservation.playerName, reservation.playerEmail, reservation.accountName, reservation.accountEmail]
          .map(normalizeSearchValue)
          .join(' ')
        if (!haystack.includes(query)) return false
      }

      return true
    })
  }, [reservations, search, filters])

  const handleCancel = async (reservation, reason) => {
    const rowKey = `${reservation.type}-${reservation.id}`
    setBusyKey(rowKey)
    try {
      const res = await fetch(`/api/admin/eventi/${eventId}/reservations/${reservation.id}?type=${reservation.type}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cancellationReason: reason }),
      })
      const payload = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(payload.error || 'Annullamento non riuscito.')
      toast.success('Prenotazione annullata.')
      await load()
      return true
    } catch (err) {
      toast.error(err.message || 'Annullamento non riuscito.')
      return false
    } finally {
      setBusyKey(null)
    }
  }

  const handleDelete = async (reservation) => {
    const rowKey = `${reservation.type}-${reservation.id}`
    setBusyKey(rowKey)
    try {
      const res = await fetch(`/api/admin/eventi/${eventId}/reservations/${reservation.id}?type=${reservation.type}`, {
        method: 'DELETE',
      })
      if (!res.ok) {
        const payload = await res.json().catch(() => ({}))
        throw new Error(payload.error || 'Eliminazione non riuscita.')
      }
      toast.success('Prenotazione eliminata.')
      await load()
      return true
    } catch (err) {
      toast.error(err.message || 'Eliminazione non riuscita.')
      return false
    } finally {
      setBusyKey(null)
    }
  }

  return (
    <div className="space-y-4 rounded-xl border border-editorial-border bg-white p-6 shadow-soft">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="font-body text-xs font-semibold uppercase tracking-wider text-editorial-terra">Prenotazioni</p>
          <p className="mt-1 font-body text-xs text-editorial-text-muted">
            Tutte le prenotazioni di questo evento: one-shot, Main Event e pass d&apos;ingresso.
          </p>
        </div>
        <input
          type="search"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Cerca per nome o email giocatore..."
          className="w-full max-w-xs rounded-lg border border-editorial-border px-3 py-1.5 font-body text-sm text-editorial-text placeholder:text-editorial-text-muted focus:border-editorial-terra focus:outline-none"
        />
      </div>

      <div className="flex flex-wrap gap-3">
        <select
          value={filters.status}
          onChange={(event) => setFilters((current) => ({ ...current, status: event.target.value }))}
          className="rounded-lg border border-editorial-border px-3 py-1.5 font-body text-sm text-editorial-text focus:border-editorial-terra focus:outline-none"
        >
          <option value="">Tutti gli stati</option>
          <option value="CONFIRMED">Confermato</option>
          <option value="PENDING">In attesa</option>
          <option value="ATTENDED">Presente</option>
          <option value="CANCELLED">Annullato</option>
          <option value="EXPIRED">Non confermato</option>
          <option value="HOLD">In blocco</option>
        </select>
        <select
          value={filters.type}
          onChange={(event) => setFilters((current) => ({ ...current, type: event.target.value }))}
          className="rounded-lg border border-editorial-border px-3 py-1.5 font-body text-sm text-editorial-text focus:border-editorial-terra focus:outline-none"
        >
          <option value="">Tutti i tipi</option>
          <option value="oneshot">One-shot</option>
          <option value="mainEvent">Main Event</option>
          <option value="admission">Pass ingresso</option>
        </select>
        <select
          value={filters.day}
          onChange={(event) => setFilters((current) => ({ ...current, day: event.target.value }))}
          className="rounded-lg border border-editorial-border px-3 py-1.5 font-body text-sm text-editorial-text focus:border-editorial-terra focus:outline-none"
        >
          <option value="">Tutti i giorni</option>
          {dayOptions.map((day) => <option key={day} value={day}>{day}</option>)}
        </select>
        <select
          value={filters.slotTime}
          onChange={(event) => setFilters((current) => ({ ...current, slotTime: event.target.value }))}
          className="rounded-lg border border-editorial-border px-3 py-1.5 font-body text-sm text-editorial-text focus:border-editorial-terra focus:outline-none"
        >
          <option value="">Tutte le fasce</option>
          {slotOptions.map((slotTime) => <option key={slotTime} value={slotTime}>{slotTime}</option>)}
        </select>
        {filters.status !== DEFAULT_FILTERS.status || filters.type || filters.day || filters.slotTime ? (
          <button
            type="button"
            onClick={() => setFilters(DEFAULT_FILTERS)}
            className="rounded-lg border border-editorial-border px-3 py-1.5 font-body text-xs font-semibold text-editorial-text hover:border-editorial-terra"
          >
            Reset filtri
          </button>
        ) : null}
      </div>

      {loading ? (
        <p className="font-body text-sm text-editorial-text-muted">Caricamento...</p>
      ) : loadError ? (
        <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 font-body text-sm text-red-600">{loadError}</p>
      ) : filtered.length === 0 ? (
        <p className="rounded-lg border border-editorial-border bg-editorial-bg/40 px-4 py-3 font-body text-sm text-editorial-text-muted">
          {reservations.length === 0 ? 'Nessuna prenotazione per questo evento.' : 'Nessun risultato per questi filtri.'}
        </p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-editorial-bg">
                <th className="px-3 py-2 text-left font-body text-xs uppercase tracking-wider text-editorial-text-muted">Giocatore</th>
                <th className="px-3 py-2 text-left font-body text-xs uppercase tracking-wider text-editorial-text-muted">Tipo</th>
                <th className="px-3 py-2 text-left font-body text-xs uppercase tracking-wider text-editorial-text-muted">Dettaglio</th>
                <th className="px-3 py-2 text-left font-body text-xs uppercase tracking-wider text-editorial-text-muted">Giorno · Fascia</th>
                <th className="px-3 py-2 text-left font-body text-xs uppercase tracking-wider text-editorial-text-muted">Stato</th>
                <th className="px-3 py-2 text-left font-body text-xs uppercase tracking-wider text-editorial-text-muted">Prenotato il</th>
                <th className="px-3 py-2 text-left font-body text-xs uppercase tracking-wider text-editorial-text-muted">Azioni</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-editorial-border">
              {filtered.map((reservation) => {
                const displayName = reservation.playerName || reservation.accountName || reservation.accountEmail || 'Utente sconosciuto'
                const displayEmail = reservation.playerEmail || reservation.accountEmail
                const slotLabel = [reservation.day, reservation.slotTime].filter(Boolean).join(' · ')

                return (
                  <tr key={`${reservation.type}-${reservation.id}`}>
                    <td className="px-3 py-2 font-body text-sm text-editorial-text">
                      {displayName}
                      {displayEmail && displayEmail !== displayName ? (
                        <span className="block font-body text-xs text-editorial-text-muted">{displayEmail}</span>
                      ) : null}
                    </td>
                    <td className="px-3 py-2 font-body text-sm text-editorial-text-secondary">{TYPE_LABELS[reservation.type] || reservation.type}</td>
                    <td className="px-3 py-2 font-body text-sm text-editorial-text-secondary">
                      {reservation.title}
                      {reservation.subtitle ? <span className="block font-body text-xs text-editorial-text-muted">{reservation.subtitle}</span> : null}
                    </td>
                    <td className="px-3 py-2 font-body text-sm text-editorial-text-secondary">
                      {slotLabel || '—'}
                      {reservation.table ? <span className="block font-body text-xs text-editorial-text-muted">{reservation.table}</span> : null}
                    </td>
                    <td className="px-3 py-2">
                      <span className={`inline-flex rounded-full px-2.5 py-1 font-body text-xs font-semibold ${STATUS_CLASSES[reservation.status] || 'bg-editorial-bg text-editorial-text-muted'}`}>
                        {STATUS_LABELS[reservation.status] || reservation.status}
                      </span>
                    </td>
                    <td className="px-3 py-2 font-body text-sm text-editorial-text-secondary">{formatDate(reservation.createdAt)}</td>
                    <td className="px-3 py-2">
                      <ReservationActionsCell
                        reservation={reservation}
                        busyKey={busyKey}
                        onCancel={handleCancel}
                        onDelete={handleDelete}
                      />
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
