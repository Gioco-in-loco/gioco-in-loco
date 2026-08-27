'use client'

import { useCallback, useEffect, useState } from 'react'
import { useToast } from '../../context/ToastContext'

function formatDate(value) {
  if (!value) return '—'
  return new Date(value).toLocaleDateString('it-IT', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
}

export default function EventWaitlistPanel({ eventId, waitlistEndpointBase }) {
  const toast = useToast()
  const [groups, setGroups] = useState([])
  const [loading, setLoading] = useState(false)
  const [expandedDay, setExpandedDay] = useState(null)
  const [sendingDay, setSendingDay] = useState(null)

  const load = useCallback(async () => {
    if (!eventId) { setGroups([]); return }
    setLoading(true)
    const res = await fetch(`${waitlistEndpointBase}/${eventId}/waitlist`)
    if (res.ok) setGroups(await res.json())
    setLoading(false)
  }, [eventId, waitlistEndpointBase])

  useEffect(() => { load() }, [load])

  const handleNotify = async (day) => {
    setSendingDay(day)
    try {
      const res = await fetch(`${waitlistEndpointBase}/${eventId}/waitlist/notify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ day }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.error || 'Invio non riuscito.')

      toast.success(
        data.sentCount > 0
          ? `Email inviata a ${data.sentCount} ${data.sentCount === 1 ? 'iscritto' : 'iscritti'} per ${day}.`
          : `Nessuna email da inviare per ${day} (già tutti notificati).`,
      )
      await load()
    } catch (err) {
      toast.error(err.message || 'Invio non riuscito.')
    } finally {
      setSendingDay(null)
    }
  }

  const totalSubscribers = groups.reduce((sum, group) => sum + group.entries.length, 0)

  return (
    <div className="space-y-4 rounded-xl border border-editorial-border bg-white p-6 shadow-soft">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="font-body text-xs font-semibold uppercase tracking-wider text-editorial-terra">Lista d&apos;attesa</p>
          <p className="mt-1 font-body text-xs text-editorial-text-muted">Iscritti in attesa di un posto libero tra le one shot, per giorno.</p>
        </div>
        <p className="font-body text-sm text-editorial-text-secondary">{totalSubscribers} iscritti totali</p>
      </div>

      {loading ? (
        <p className="font-body text-sm text-editorial-text-muted">Caricamento...</p>
      ) : groups.length === 0 ? (
        <p className="rounded-lg border border-editorial-border bg-editorial-bg/40 px-4 py-3 font-body text-sm text-editorial-text-muted">
          Nessuno iscritto in lista d&apos;attesa per questo evento.
        </p>
      ) : (
        <div className="space-y-3">
          {groups.map((group) => {
            const isExpanded = expandedDay === group.day
            const pendingCount = group.entries.filter((entry) => !entry.notifiedAt).length

            return (
              <div key={group.day} className="rounded-lg border border-editorial-border">
                <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
                  <button
                    type="button"
                    onClick={() => setExpandedDay(isExpanded ? null : group.day)}
                    className="flex items-center gap-2 font-body text-sm font-semibold text-editorial-text"
                  >
                    <span>{isExpanded ? '▾' : '▸'}</span>
                    {group.day}
                    <span className="font-body text-xs font-normal text-editorial-text-muted">
                      ({group.entries.length} iscritti{pendingCount > 0 ? `, ${pendingCount} da notificare` : ''})
                    </span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleNotify(group.day)}
                    disabled={sendingDay === group.day || pendingCount === 0}
                    className="rounded-lg bg-editorial-terra px-3 py-1.5 font-body text-xs font-semibold text-white transition-colors hover:bg-editorial-terra/90 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {sendingDay === group.day ? 'Invio...' : pendingCount === 0 ? 'Tutti notificati' : 'Invia email'}
                  </button>
                </div>

                {isExpanded ? (
                  <div className="overflow-hidden border-t border-editorial-border">
                    <table className="w-full">
                      <thead>
                        <tr className="bg-editorial-bg">
                          <th className="px-3 py-2 text-left font-body text-xs uppercase tracking-wider text-editorial-text-muted">Utente</th>
                          <th className="px-3 py-2 text-left font-body text-xs uppercase tracking-wider text-editorial-text-muted">Iscritto il</th>
                          <th className="px-3 py-2 text-left font-body text-xs uppercase tracking-wider text-editorial-text-muted">Notificato</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-editorial-border">
                        {group.entries.map((entry) => (
                          <tr key={entry.id}>
                            <td className="px-3 py-2 font-body text-sm text-editorial-text">
                              {entry.name || entry.email || 'Utente sconosciuto'}
                              {entry.name && entry.email ? <span className="block font-body text-xs text-editorial-text-muted">{entry.email}</span> : null}
                              {entry.nickname ? <span className="block font-body text-xs text-editorial-text-muted">@{entry.nickname}</span> : null}
                            </td>
                            <td className="px-3 py-2 font-body text-sm text-editorial-text-secondary">{formatDate(entry.createdAt)}</td>
                            <td className="px-3 py-2 font-body text-sm text-editorial-text-secondary">{entry.notifiedAt ? formatDate(entry.notifiedAt) : '—'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : null}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
