'use client'

import { useEffect, useMemo, useState } from 'react'

const DAY_ORDER = ['Lunedi', 'Lunedì', 'Martedi', 'Martedì', 'Mercoledi', 'Mercoledì', 'Giovedi', 'Giovedì', 'Venerdi', 'Venerdì', 'Sabato', 'Domenica']

function dayIndex(day) {
  const idx = DAY_ORDER.indexOf(day)
  return idx === -1 ? 999 : idx
}

const TYPE_LABELS = {
  oneshot: 'One-shot',
  mainEvent: 'Main Event',
  admission: 'Pass ingresso',
}

const STATUS_LABELS = {
  HOLD: 'In blocco',
  INVITED: 'Invito in attesa',
  PENDING: 'In attesa',
  CONFIRMED: 'Confermato',
  CANCELLED: 'Annullato',
  EXPIRED: 'Non confermato',
  ATTENDED: 'Presente',
}

const ACTIVE_STATUSES = new Set(['CONFIRMED', 'ATTENDED'])

function playerKey(row) {
  if (row.userId) return `u:${row.userId}`
  const email = (row.playerEmail || row.accountEmail || '').trim().toLocaleLowerCase('it-IT')
  if (email) return `e:${email}`
  const name = (row.playerName || row.accountName || '').trim().toLocaleLowerCase('it-IT')
  return name ? `n:${name}` : `r:${row.type}-${row.id}`
}

function KpiCard({ label, value, hint }) {
  return (
    <div className="rounded-xl border border-editorial-border bg-white p-4 shadow-soft">
      <p className="font-body text-xs font-semibold uppercase tracking-wider text-editorial-text-muted">{label}</p>
      <p className="mt-2 font-elegant text-3xl font-bold text-editorial-text">{value}</p>
      {hint ? <p className="mt-1 font-body text-xs text-editorial-text-muted">{hint}</p> : null}
    </div>
  )
}

export default function EventAnalyticsPanel({ eventId }) {
  const [rows, setRows] = useState([])
  const [waitlistTotal, setWaitlistTotal] = useState(0)
  const [loading, setLoading] = useState(false)
  const [loadError, setLoadError] = useState('')

  useEffect(() => {
    if (!eventId) return
    let cancelled = false

    const load = async () => {
      setLoading(true)
      setLoadError('')
      try {
        const [reservationsRes, waitlistRes] = await Promise.all([
          fetch(`/api/admin/eventi/${eventId}/reservations`),
          fetch(`/api/admin/eventi/${eventId}/waitlist`),
        ])
        if (cancelled) return
        if (!reservationsRes.ok) throw new Error('Impossibile caricare le prenotazioni.')

        const reservations = await reservationsRes.json()
        const waitlistGroups = waitlistRes.ok ? await waitlistRes.json() : []
        if (cancelled) return

        setRows(reservations)
        setWaitlistTotal(waitlistGroups.reduce((sum, group) => sum + group.entries.length, 0))
      } catch (err) {
        if (!cancelled) setLoadError(err.message || 'Impossibile caricare le statistiche.')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    load()
    return () => { cancelled = true }
  }, [eventId])

  const stats = useMemo(() => {
    const active = rows.filter((row) => ACTIVE_STATUSES.has(row.status))
    const byType = { oneshot: 0, mainEvent: 0, admission: 0 }
    for (const row of active) byType[row.type] = (byType[row.type] || 0) + 1

    const uniquePlayers = new Set(active.map(playerKey))

    const byStatus = {}
    for (const row of rows) byStatus[row.status] = (byStatus[row.status] || 0) + 1

    const byDayMap = new Map()
    for (const row of active) {
      if (!row.day) continue
      byDayMap.set(row.day, (byDayMap.get(row.day) || 0) + 1)
    }
    const byDay = Array.from(byDayMap.entries())
      .map(([day, count]) => ({ day, count }))
      .sort((left, right) => dayIndex(left.day) - dayIndex(right.day))

    const oneshotCountsMap = new Map()
    for (const row of active) {
      if (row.type !== 'oneshot') continue
      oneshotCountsMap.set(row.title, (oneshotCountsMap.get(row.title) || 0) + 1)
    }
    const topOneshots = Array.from(oneshotCountsMap.entries())
      .map(([title, count]) => ({ title, count }))
      .sort((left, right) => right.count - left.count)
      .slice(0, 5)

    return { active, byType, uniquePlayers, byStatus, byDay, topOneshots }
  }, [rows])

  if (loading) {
    return (
      <div className="rounded-xl border border-editorial-border bg-white p-6 shadow-soft">
        <p className="font-body text-sm text-editorial-text-muted">Caricamento statistiche...</p>
      </div>
    )
  }

  if (loadError) {
    return (
      <div className="rounded-xl border border-editorial-border bg-white p-6 shadow-soft">
        <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 font-body text-sm text-red-600">{loadError}</p>
      </div>
    )
  }

  const statusOrder = ['CONFIRMED', 'ATTENDED', 'PENDING', 'HOLD', 'INVITED', 'EXPIRED', 'CANCELLED']

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
        <KpiCard label="Pass evento iscritti" value={stats.byType.admission} hint="Ammissioni confermate" />
        <KpiCard label="Prenotazioni totali" value={stats.active.length} hint="One-shot + Main Event + Pass, confermate" />
        <KpiCard label="Giocatori unici" value={stats.uniquePlayers.size} hint="Persone distinte con almeno una prenotazione confermata" />
        <KpiCard label="One-shot prenotate" value={stats.byType.oneshot} />
        <KpiCard label="Main Event prenotati" value={stats.byType.mainEvent} />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div className="rounded-xl border border-editorial-border bg-white p-6 shadow-soft">
          <p className="font-body text-xs font-semibold uppercase tracking-wider text-editorial-terra">Per stato</p>
          <p className="mt-1 font-body text-xs text-editorial-text-muted">Tutte le prenotazioni registrate, incluse quelle non confermate o annullate.</p>
          <div className="mt-4 space-y-2">
            {statusOrder.filter((status) => stats.byStatus[status]).map((status) => (
              <div key={status} className="flex items-center justify-between font-body text-sm">
                <span className="text-editorial-text-secondary">{STATUS_LABELS[status] || status}</span>
                <span className="font-semibold text-editorial-text">{stats.byStatus[status]}</span>
              </div>
            ))}
            {rows.length === 0 ? (
              <p className="font-body text-sm text-editorial-text-muted">Nessuna prenotazione registrata.</p>
            ) : null}
          </div>
        </div>

        <div className="rounded-xl border border-editorial-border bg-white p-6 shadow-soft">
          <p className="font-body text-xs font-semibold uppercase tracking-wider text-editorial-terra">Per giorno</p>
          <p className="mt-1 font-body text-xs text-editorial-text-muted">Prenotazioni confermate, giorno per giorno.</p>
          <div className="mt-4 space-y-2">
            {stats.byDay.map(({ day, count }) => (
              <div key={day} className="flex items-center justify-between font-body text-sm">
                <span className="text-editorial-text-secondary">{day}</span>
                <span className="font-semibold text-editorial-text">{count}</span>
              </div>
            ))}
            {stats.byDay.length === 0 ? (
              <p className="font-body text-sm text-editorial-text-muted">Nessun dato per giorno disponibile.</p>
            ) : null}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div className="rounded-xl border border-editorial-border bg-white p-6 shadow-soft">
          <p className="font-body text-xs font-semibold uppercase tracking-wider text-editorial-terra">One-shot più richieste</p>
          <p className="mt-1 font-body text-xs text-editorial-text-muted">Top 5 per numero di prenotazioni confermate.</p>
          <div className="mt-4 space-y-2">
            {stats.topOneshots.map(({ title, count }) => (
              <div key={title} className="flex items-center justify-between font-body text-sm">
                <span className="text-editorial-text-secondary">{title}</span>
                <span className="font-semibold text-editorial-text">{count}</span>
              </div>
            ))}
            {stats.topOneshots.length === 0 ? (
              <p className="font-body text-sm text-editorial-text-muted">Nessuna prenotazione one-shot confermata.</p>
            ) : null}
          </div>
        </div>

        <div className="rounded-xl border border-editorial-border bg-white p-6 shadow-soft">
          <p className="font-body text-xs font-semibold uppercase tracking-wider text-editorial-terra">Lista d&apos;attesa</p>
          <p className="mt-1 font-body text-xs text-editorial-text-muted">Persone in attesa di un posto libero tra le one-shot.</p>
          <p className="mt-4 font-elegant text-3xl font-bold text-editorial-text">{waitlistTotal}</p>
        </div>
      </div>
    </div>
  )
}
