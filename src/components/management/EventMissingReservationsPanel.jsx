'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { useToast } from '../../context/ToastContext'

export default function EventMissingReservationsPanel({ eventId, endpointBase = '/api/admin/eventi' }) {
  const toast = useToast()
  const [attendees, setAttendees] = useState([])
  const [loading, setLoading] = useState(false)
  const [loadError, setLoadError] = useState('')
  const [selectedKeys, setSelectedKeys] = useState(() => new Set())
  const [sendingKeys, setSendingKeys] = useState(() => new Set())
  const [sentKeys, setSentKeys] = useState(() => new Set())
  const [bulkSending, setBulkSending] = useState(false)

  const load = useCallback(async () => {
    if (!eventId) { setAttendees([]); return }
    setLoading(true)
    setLoadError('')
    try {
      const res = await fetch(`${endpointBase}/${eventId}/attendees-without-reservations`)
      if (!res.ok) throw new Error('Impossibile caricare la lista.')
      setAttendees(await res.json())
    } catch (err) {
      setLoadError(err.message || 'Impossibile caricare la lista.')
    } finally {
      setLoading(false)
    }
  }, [eventId, endpointBase])

  useEffect(() => { load() }, [load])

  const emailableKeys = useMemo(() => new Set(attendees.filter((a) => a.email).map((a) => a.key)), [attendees])
  const allSelected = emailableKeys.size > 0 && selectedKeys.size === emailableKeys.size

  const toggleRow = (key) => {
    setSelectedKeys((current) => {
      const next = new Set(current)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
  }

  const toggleAll = () => {
    setSelectedKeys(allSelected ? new Set() : new Set(emailableKeys))
  }

  const sendTo = async (keys) => {
    try {
      const res = await fetch(`${endpointBase}/${eventId}/attendees-without-reservations/notify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ keys }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.error || 'Invio non riuscito.')
      setSentKeys((current) => new Set([...current, ...keys]))
      toast.success(`Email inviata a ${data.sentCount} ${data.sentCount === 1 ? 'persona' : 'persone'}.`)
    } catch (err) {
      toast.error(err.message || 'Invio non riuscito.')
    }
  }

  const handleSendOne = async (key) => {
    setSendingKeys((current) => new Set(current).add(key))
    await sendTo([key])
    setSendingKeys((current) => {
      const next = new Set(current)
      next.delete(key)
      return next
    })
  }

  const handleSendSelected = async () => {
    if (selectedKeys.size === 0) return
    setBulkSending(true)
    await sendTo(Array.from(selectedKeys))
    setSelectedKeys(new Set())
    setBulkSending(false)
  }

  return (
    <div className="space-y-4 rounded-xl border border-editorial-border bg-white p-6 shadow-soft">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="font-body text-xs font-semibold uppercase tracking-wider text-editorial-terra">Pass senza prenotazioni</p>
          <p className="mt-1 font-body text-xs text-editorial-text-muted">
            Pass evento confermati che non hanno ancora nessuna prenotazione one-shot o Main Event.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <p className="font-body text-sm text-editorial-text-secondary">{attendees.length} {attendees.length === 1 ? 'persona' : 'persone'}</p>
          {selectedKeys.size > 0 ? (
            <button
              type="button"
              onClick={handleSendSelected}
              disabled={bulkSending}
              className="rounded-lg bg-editorial-terra px-3 py-1.5 font-body text-xs font-semibold text-white transition-colors hover:bg-editorial-terra/90 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {bulkSending ? 'Invio...' : `Invia email (${selectedKeys.size})`}
            </button>
          ) : null}
        </div>
      </div>

      {loading ? (
        <p className="font-body text-sm text-editorial-text-muted">Caricamento...</p>
      ) : loadError ? (
        <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 font-body text-sm text-red-600">{loadError}</p>
      ) : attendees.length === 0 ? (
        <p className="rounded-lg border border-editorial-border bg-editorial-bg/40 px-4 py-3 font-body text-sm text-editorial-text-muted">
          Tutti i pass confermati hanno almeno una prenotazione.
        </p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-editorial-bg">
                <th className="px-3 py-2 text-left">
                  <input
                    type="checkbox"
                    checked={allSelected}
                    onChange={toggleAll}
                    aria-label="Seleziona tutti"
                  />
                </th>
                <th className="px-3 py-2 text-left font-body text-xs uppercase tracking-wider text-editorial-text-muted">Persona</th>
                <th className="px-3 py-2 text-left font-body text-xs uppercase tracking-wider text-editorial-text-muted">Giorni pass</th>
                <th className="px-3 py-2 text-right font-body text-xs uppercase tracking-wider text-editorial-text-muted">Azione</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-editorial-border">
              {attendees.map((attendee) => {
                const isSending = sendingKeys.has(attendee.key)
                const wasSent = sentKeys.has(attendee.key)

                return (
                  <tr key={attendee.key}>
                    <td className="px-3 py-2">
                      <input
                        type="checkbox"
                        checked={selectedKeys.has(attendee.key)}
                        onChange={() => toggleRow(attendee.key)}
                        disabled={!attendee.email}
                        aria-label={`Seleziona ${attendee.name || attendee.email || 'persona'}`}
                      />
                    </td>
                    <td className="px-3 py-2 font-body text-sm text-editorial-text">
                      {attendee.name || attendee.email || 'Utente sconosciuto'}
                      {attendee.email && attendee.email !== attendee.name ? (
                        <span className="block font-body text-xs text-editorial-text-muted">{attendee.email}</span>
                      ) : null}
                      {attendee.nickname ? <span className="block font-body text-xs text-editorial-text-muted">@{attendee.nickname}</span> : null}
                    </td>
                    <td className="px-3 py-2 font-body text-sm text-editorial-text-secondary">
                      {attendee.days.length > 0 ? attendee.days.join(', ') : 'Intero evento'}
                    </td>
                    <td className="px-3 py-2 text-right">
                      <button
                        type="button"
                        onClick={() => handleSendOne(attendee.key)}
                        disabled={!attendee.email || isSending}
                        className="rounded-lg border border-editorial-border px-3 py-1.5 font-body text-xs font-semibold text-editorial-text transition-colors hover:border-editorial-terra disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        {isSending ? 'Invio...' : wasSent ? 'Inviata ✓' : 'Invia email'}
                      </button>
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
