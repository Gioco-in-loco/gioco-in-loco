'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useToast } from '../../context/ToastContext'

const TYPE_LABELS = {
  oneshot: 'One-shot',
  mainEvent: 'Main Event',
  admission: 'Pass ingresso',
}

const STATUS_LABELS = {
  HOLD: 'In blocco',
  INVITED: 'Invito amico in attesa',
  PENDING: 'In attesa',
  CONFIRMED: 'Confermato',
  CANCELLED: 'Annullato',
  EXPIRED: 'Non confermato',
  ATTENDED: 'Presente',
}

const STATUS_CLASSES = {
  HOLD: 'bg-editorial-bg text-editorial-text-muted',
  INVITED: 'bg-amber-50 text-amber-700',
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

function rowKeyFor(reservation) {
  return `${reservation.type}-${reservation.id}`
}

// Di default si vedono solo le prenotazioni confermate: la lista completa
// (in attesa, annullate, scadute...) è pensata per l'audit occasionale, non
// per la vista principale su cosa succederà davvero all'evento.
const DEFAULT_FILTERS = { type: '', day: '', slotTime: '', status: 'CONFIRMED' }

export default function EventReservationsPanel({ eventId }) {
  const router = useRouter()
  const toast = useToast()
  const [reservations, setReservations] = useState([])
  const [loading, setLoading] = useState(false)
  const [loadError, setLoadError] = useState('')
  const [search, setSearch] = useState('')
  const [filters, setFilters] = useState(DEFAULT_FILTERS)
  const [selectedKeys, setSelectedKeys] = useState(() => new Set())
  const [bulkDeleting, setBulkDeleting] = useState(false)

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

  // Selezioni fuori dai filtri correnti (es. cambiando filtro dopo aver
  // selezionato righe) non contano più verso il conteggio/bulk delete.
  const filteredKeys = useMemo(() => new Set(filtered.map(rowKeyFor)), [filtered])
  const selectedInView = useMemo(() => Array.from(selectedKeys).filter((key) => filteredKeys.has(key)), [selectedKeys, filteredKeys])
  const allInViewSelected = filtered.length > 0 && selectedInView.length === filtered.length

  const toggleRow = (key) => {
    setSelectedKeys((current) => {
      const next = new Set(current)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
  }

  const toggleAllInView = () => {
    setSelectedKeys((current) => {
      const next = new Set(current)
      if (allInViewSelected) {
        for (const reservation of filtered) next.delete(rowKeyFor(reservation))
      } else {
        for (const reservation of filtered) next.add(rowKeyFor(reservation))
      }
      return next
    })
  }

  const handleBulkDelete = async () => {
    if (selectedInView.length === 0) return
    const shouldDelete = window.confirm(`Eliminare definitivamente ${selectedInView.length} prenotazioni selezionate? L'operazione non è reversibile.`)
    if (!shouldDelete) return

    setBulkDeleting(true)
    try {
      const items = selectedInView.map((key) => {
        const reservation = filtered.find((r) => rowKeyFor(r) === key)
        return { type: reservation.type, reservationId: reservation.id }
      })
      const res = await fetch(`/api/admin/eventi/${eventId}/reservations/bulk-delete`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ items }),
      })
      const payload = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(payload.error || 'Eliminazione non riuscita.')
      toast.success(`${payload.deleted ?? items.length} prenotazioni eliminate.`)
      setSelectedKeys(new Set())
      await load()
    } catch (err) {
      toast.error(err.message || 'Eliminazione non riuscita.')
    } finally {
      setBulkDeleting(false)
    }
  }

  const openReservation = (reservation) => {
    router.push(`/admin/eventi/${eventId}/prenotazioni/${reservation.id}?type=${reservation.type}`)
  }

  return (
    <div className="space-y-4 rounded-xl border border-editorial-border bg-white p-6 shadow-soft">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="font-body text-xs font-semibold uppercase tracking-wider text-editorial-terra">Prenotazioni</p>
          <p className="mt-1 font-body text-xs text-editorial-text-muted">
            Tutte le prenotazioni di questo evento: one-shot, Main Event e pass d&apos;ingresso. Clicca una riga per aprirla e modificarla.
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

      <div className="flex flex-wrap items-center gap-3">
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
          <option value="INVITED">Invito amico in attesa</option>
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

        {selectedInView.length > 0 ? (
          <button
            type="button"
            onClick={handleBulkDelete}
            disabled={bulkDeleting}
            className="ml-auto rounded-lg border border-red-200 px-3 py-1.5 font-body text-xs font-semibold text-red-600 transition-colors hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {bulkDeleting ? 'Elimino...' : `Elimina selezionate (${selectedInView.length})`}
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
                <th className="px-3 py-2 text-left">
                  <input
                    type="checkbox"
                    checked={allInViewSelected}
                    onChange={toggleAllInView}
                    aria-label="Seleziona tutte le righe visibili"
                  />
                </th>
                <th className="px-3 py-2 text-left font-body text-xs uppercase tracking-wider text-editorial-text-muted">Giocatore</th>
                <th className="px-3 py-2 text-left font-body text-xs uppercase tracking-wider text-editorial-text-muted">Tipo</th>
                <th className="px-3 py-2 text-left font-body text-xs uppercase tracking-wider text-editorial-text-muted">Dettaglio</th>
                <th className="px-3 py-2 text-left font-body text-xs uppercase tracking-wider text-editorial-text-muted">Giorno · Fascia</th>
                <th className="px-3 py-2 text-left font-body text-xs uppercase tracking-wider text-editorial-text-muted">Stato</th>
                <th className="px-3 py-2 text-left font-body text-xs uppercase tracking-wider text-editorial-text-muted">Prenotato il</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-editorial-border">
              {filtered.map((reservation) => {
                const displayName = reservation.playerName || reservation.accountName || reservation.accountEmail || 'Utente sconosciuto'
                const displayEmail = reservation.playerEmail || reservation.accountEmail
                const slotLabel = [reservation.day, reservation.slotTime].filter(Boolean).join(' · ')
                const key = rowKeyFor(reservation)

                return (
                  <tr
                    key={key}
                    onClick={() => openReservation(reservation)}
                    className="cursor-pointer transition-colors hover:bg-editorial-bg/50"
                  >
                    <td className="px-3 py-2" onClick={(event) => event.stopPropagation()}>
                      <input
                        type="checkbox"
                        checked={selectedKeys.has(key)}
                        onChange={() => toggleRow(key)}
                        aria-label={`Seleziona prenotazione di ${displayName}`}
                      />
                    </td>
                    <td className="px-3 py-2 font-body text-sm text-editorial-text">
                      {displayName}
                      {displayEmail && displayEmail !== displayName ? (
                        <span className="block font-body text-xs text-editorial-text-muted">{displayEmail}</span>
                      ) : null}
                      {reservation.invitedByName ? (
                        <span className="block font-body text-xs text-editorial-text-muted">Invitato da {reservation.invitedByName}</span>
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
