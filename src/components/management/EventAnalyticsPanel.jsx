'use client'

import { useEffect, useMemo, useState } from 'react'

const DAY_ORDER = ['Lunedi', 'Lunedì', 'Martedi', 'Martedì', 'Mercoledi', 'Mercoledì', 'Giovedi', 'Giovedì', 'Venerdi', 'Venerdì', 'Sabato', 'Domenica']

function dayIndex(day) {
  const idx = DAY_ORDER.indexOf(day)
  return idx === -1 ? 999 : idx
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

export default function EventAnalyticsPanel({ eventId, endpointBase = '/api/admin/eventi' }) {
  const [rows, setRows] = useState([])
  const [slots, setSlots] = useState([])
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
        const [reservationsRes, waitlistRes, slotsRes] = await Promise.all([
          fetch(`${endpointBase}/${eventId}/reservations`),
          fetch(`${endpointBase}/${eventId}/waitlist`),
          fetch(`${endpointBase}/${eventId}/slots`),
        ])
        if (cancelled) return
        if (!reservationsRes.ok) throw new Error('Impossibile caricare le prenotazioni.')

        const reservations = await reservationsRes.json()
        const waitlistGroups = waitlistRes.ok ? await waitlistRes.json() : []
        const slotsData = slotsRes.ok ? await slotsRes.json() : []
        if (cancelled) return

        setRows(reservations)
        setSlots(slotsData)
        setWaitlistTotal(waitlistGroups.reduce((sum, group) => sum + group.entries.length, 0))
      } catch (err) {
        if (!cancelled) setLoadError(err.message || 'Impossibile caricare le statistiche.')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    load()
    return () => { cancelled = true }
  }, [eventId, endpointBase])

  const stats = useMemo(() => {
    const active = rows.filter((row) => ACTIVE_STATUSES.has(row.status))
    const byType = { oneshot: 0, mainEvent: 0, admission: 0 }
    for (const row of active) byType[row.type] = (byType[row.type] || 0) + 1

    // "Giocatori unici" conta solo chi ha prenotato una sessione vera
    // (one-shot/main event): chi ha comprato solo il pass ingresso non è un
    // giocatore ai fini di questa vista, quindi non entra né qui né nella
    // media sotto.
    const nonAdmissionRows = active.filter((row) => row.type !== 'admission')
    const nonAdmissionUniquePlayers = new Set(nonAdmissionRows.map(playerKey))
    const avgBookingsPerPlayer = nonAdmissionUniquePlayers.size > 0
      ? nonAdmissionRows.length / nonAdmissionUniquePlayers.size
      : 0

    const byStatus = {}
    for (const row of rows) byStatus[row.status] = (byStatus[row.status] || 0) + 1

    const byDayMap = new Map()
    for (const row of active) {
      if (!row.day) continue
      byDayMap.set(row.day, (byDayMap.get(row.day) || 0) + 1)
    }
    // Posti offerti per giorno: per le one-shot è la somma dei maxPlayers dei
    // tavoli, per i main event è il tetto per gruppo (mainEventId, day, slot)
    // — un main event può girare su più tavoli, ma il tetto è unico per
    // gruppo, non la somma dei singoli tavoli (vedi MainEvent.maxPlayers).
    const capacityByDayMap = new Map()
    const seenMainEventGroups = new Set()
    for (const slot of slots) {
      if (slot.oneshotId) {
        capacityByDayMap.set(slot.day, (capacityByDayMap.get(slot.day) || 0) + slot.maxPlayers)
      } else if (slot.mainEventId) {
        const groupKey = `${slot.mainEventId}__${slot.day}__${slot.slot}`
        if (seenMainEventGroups.has(groupKey)) continue
        seenMainEventGroups.add(groupKey)
        capacityByDayMap.set(slot.day, (capacityByDayMap.get(slot.day) || 0) + (slot.groupMaxPlayers ?? slot.maxPlayers))
      }
    }

    const dayNames = new Set([...byDayMap.keys(), ...capacityByDayMap.keys()])
    const byDay = Array.from(dayNames)
      .map((day) => ({ day, count: byDayMap.get(day) || 0, capacity: capacityByDayMap.get(day) ?? null }))
      .sort((left, right) => dayIndex(left.day) - dayIndex(right.day))
    const totalCapacity = Array.from(capacityByDayMap.values()).reduce((sum, value) => sum + value, 0)

    const oneshotCountsMap = new Map()
    for (const row of active) {
      if (row.type !== 'oneshot') continue
      oneshotCountsMap.set(row.title, (oneshotCountsMap.get(row.title) || 0) + 1)
    }
    const topOneshots = Array.from(oneshotCountsMap.entries())
      .map(([title, count]) => ({ title, count }))
      .sort((left, right) => right.count - left.count)
      .slice(0, 5)

    return { active, byType, avgBookingsPerPlayer, nonAdmissionUniquePlayers, byStatus, byDay, totalCapacity, topOneshots }
  }, [rows, slots])

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
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
        <KpiCard label="Pass evento iscritti" value={stats.byType.admission} hint="Ammissioni confermate" />
        <KpiCard label="Prenotazioni totali" value={stats.active.length} hint="One-shot + Main Event + Pass, confermate" />
        <KpiCard label="Giocatori unici" value={stats.nonAdmissionUniquePlayers.size} hint="Persone con almeno una prenotazione one-shot o Main Event (escluso chi ha solo il pass)" />
        <KpiCard label="One-shot prenotate" value={stats.byType.oneshot} />
        <KpiCard label="Main Event prenotati" value={stats.byType.mainEvent} />
        <KpiCard
          label="Media prenotazioni/giocatore"
          value={stats.avgBookingsPerPlayer.toFixed(1)}
          hint="One-shot + Main Event confermate, per giocatore reale (escluso pass ingresso)"
        />
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
          <p className="mt-1 font-body text-xs text-editorial-text-muted">
            Prenotazioni confermate su posti offerti (tavoli one-shot + main event), giorno per giorno.
          </p>
          <div className="mt-4 space-y-2">
            {stats.byDay.map(({ day, count, capacity }) => (
              <div key={day} className="flex items-center justify-between font-body text-sm">
                <span className="text-editorial-text-secondary">{day}</span>
                <span className="font-semibold text-editorial-text">{count}{capacity != null ? ` / ${capacity}` : ''}</span>
              </div>
            ))}
            {stats.byDay.length === 0 ? (
              <p className="font-body text-sm text-editorial-text-muted">Nessun dato per giorno disponibile.</p>
            ) : (
              <div className="flex items-center justify-between border-t border-editorial-border pt-2 font-body text-sm">
                <span className="font-semibold text-editorial-text">Totale</span>
                <span className="font-semibold text-editorial-text">
                  {stats.byDay.reduce((sum, { count }) => sum + count, 0)}{stats.totalCapacity > 0 ? ` / ${stats.totalCapacity}` : ''}
                </span>
              </div>
            )}
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
