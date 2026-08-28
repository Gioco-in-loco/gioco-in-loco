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
      const entry = byDayMap.get(row.day) || { total: 0, admission: 0, oneshot: 0, mainEvent: 0 }
      entry.total += 1
      if (row.type === 'admission') entry.admission += 1
      else if (row.type === 'oneshot') entry.oneshot += 1
      else if (row.type === 'mainEvent') entry.mainEvent += 1
      byDayMap.set(row.day, entry)
    }
    // Posti offerti per giorno: per le one-shot è la somma dei maxPlayers dei
    // tavoli, per i main event è il tetto per gruppo (mainEventId, day, slot)
    // — un main event può girare su più tavoli, ma il tetto è unico per
    // gruppo, non la somma dei singoli tavoli (vedi MainEvent.maxPlayers).
    // Tenute separate (invece di un unico totale) per poter mostrare il
    // rapporto corretto accanto a ciascuna colonna one-shot / main event.
    const oneshotCapacityByDayMap = new Map()
    const mainEventCapacityByDayMap = new Map()
    const seenMainEventGroups = new Set()
    for (const slot of slots) {
      if (slot.oneshotId) {
        oneshotCapacityByDayMap.set(slot.day, (oneshotCapacityByDayMap.get(slot.day) || 0) + slot.maxPlayers)
      } else if (slot.mainEventId) {
        const groupKey = `${slot.mainEventId}__${slot.day}__${slot.slot}`
        if (seenMainEventGroups.has(groupKey)) continue
        seenMainEventGroups.add(groupKey)
        mainEventCapacityByDayMap.set(slot.day, (mainEventCapacityByDayMap.get(slot.day) || 0) + (slot.groupMaxPlayers ?? slot.maxPlayers))
      }
    }

    const dayNames = new Set([...byDayMap.keys(), ...oneshotCapacityByDayMap.keys(), ...mainEventCapacityByDayMap.keys()])
    const emptyDayEntry = { total: 0, admission: 0, oneshot: 0, mainEvent: 0 }
    const byDay = Array.from(dayNames)
      .map((day) => ({
        day,
        ...(byDayMap.get(day) || emptyDayEntry),
        oneshotCapacity: oneshotCapacityByDayMap.get(day) ?? null,
        mainEventCapacity: mainEventCapacityByDayMap.get(day) ?? null,
      }))
      .sort((left, right) => dayIndex(left.day) - dayIndex(right.day))
    const totalOneshotCapacity = Array.from(oneshotCapacityByDayMap.values()).reduce((sum, value) => sum + value, 0)
    const totalMainEventCapacity = Array.from(mainEventCapacityByDayMap.values()).reduce((sum, value) => sum + value, 0)

    const oneshotCountsMap = new Map()
    const gameCountsMap = new Map()
    const masterCountsMap = new Map()
    for (const row of active) {
      if (row.type !== 'oneshot') continue
      oneshotCountsMap.set(row.title, (oneshotCountsMap.get(row.title) || 0) + 1)
      if (row.game) gameCountsMap.set(row.game, (gameCountsMap.get(row.game) || 0) + 1)
      if (row.master) masterCountsMap.set(row.master, (masterCountsMap.get(row.master) || 0) + 1)
    }
    const topOneshots = Array.from(oneshotCountsMap.entries())
      .map(([title, count]) => ({ title, count }))
      .sort((left, right) => right.count - left.count)
      .slice(0, 5)
    const topGames = Array.from(gameCountsMap.entries())
      .map(([title, count]) => ({ title, count }))
      .sort((left, right) => right.count - left.count)
      .slice(0, 5)
    const topMasters = Array.from(masterCountsMap.entries())
      .map(([title, count]) => ({ title, count }))
      .sort((left, right) => right.count - left.count)
      .slice(0, 5)

    return { active, byType, avgBookingsPerPlayer, nonAdmissionUniquePlayers, byStatus, byDay, totalOneshotCapacity, totalMainEventCapacity, topOneshots, topGames, topMasters }
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
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <KpiCard label="Prenotazioni totali" value={stats.active.length} hint="One-shot + Main Event + Pass, confermate" />
        <KpiCard label="Pass evento iscritti" value={stats.byType.admission} hint="Ammissioni confermate" />
        <KpiCard label="One-shot prenotate" value={stats.byType.oneshot} />
        <KpiCard label="Main Event prenotati" value={stats.byType.mainEvent} />
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <KpiCard label="Giocatori unici" value={stats.nonAdmissionUniquePlayers.size} hint="Persone con almeno una prenotazione one-shot o Main Event (escluso chi ha solo il pass)" />
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
            Prenotazioni confermate, giorno per giorno.
          </p>
          <div className="mt-4 overflow-x-auto">
            <table className="w-full min-w-[420px] font-body text-sm">
              <thead>
                <tr className="text-left text-xs font-semibold uppercase tracking-wider text-editorial-text-muted">
                  <th className="pb-2">Giorno</th>
                  <th className="pb-2 text-right">Totale</th>
                  <th className="pb-2 text-right">Pass</th>
                  <th className="pb-2 text-right">One-shot</th>
                  <th className="pb-2 text-right">Main Event</th>
                </tr>
              </thead>
              <tbody>
                {stats.byDay.map(({ day, total, admission, oneshot, mainEvent, oneshotCapacity, mainEventCapacity }) => (
                  <tr key={day} className="border-t border-editorial-border">
                    <td className="py-2 text-editorial-text-secondary">{day}</td>
                    <td className="py-2 text-right font-semibold text-editorial-text">{total}</td>
                    <td className="py-2 text-right text-editorial-text">{admission}</td>
                    <td className="py-2 text-right text-editorial-text">
                      {oneshot}{oneshotCapacity != null ? ` / ${oneshotCapacity}` : ''}
                    </td>
                    <td className="py-2 text-right text-editorial-text">
                      {mainEvent}{mainEventCapacity != null ? ` / ${mainEventCapacity}` : ''}
                    </td>
                  </tr>
                ))}
              </tbody>
              {stats.byDay.length > 0 ? (
                <tfoot>
                  <tr className="border-t border-editorial-border">
                    <td className="pt-2 font-semibold text-editorial-text">Totale</td>
                    <td className="pt-2 text-right font-semibold text-editorial-text">
                      {stats.byDay.reduce((sum, { total }) => sum + total, 0)}
                    </td>
                    <td className="pt-2 text-right font-semibold text-editorial-text">
                      {stats.byDay.reduce((sum, { admission }) => sum + admission, 0)}
                    </td>
                    <td className="pt-2 text-right font-semibold text-editorial-text">
                      {stats.byDay.reduce((sum, { oneshot }) => sum + oneshot, 0)}{stats.totalOneshotCapacity > 0 ? ` / ${stats.totalOneshotCapacity}` : ''}
                    </td>
                    <td className="pt-2 text-right font-semibold text-editorial-text">
                      {stats.byDay.reduce((sum, { mainEvent }) => sum + mainEvent, 0)}{stats.totalMainEventCapacity > 0 ? ` / ${stats.totalMainEventCapacity}` : ''}
                    </td>
                  </tr>
                </tfoot>
              ) : null}
            </table>
            {stats.byDay.length === 0 ? (
              <p className="font-body text-sm text-editorial-text-muted">Nessun dato per giorno disponibile.</p>
            ) : null}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
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
          <p className="font-body text-xs font-semibold uppercase tracking-wider text-editorial-terra">Master più richiesto</p>
          <p className="mt-1 font-body text-xs text-editorial-text-muted">Top 5 master per numero di prenotazioni confermate sui loro tavoli.</p>
          <div className="mt-4 space-y-2">
            {stats.topMasters.map(({ title, count }) => (
              <div key={title} className="flex items-center justify-between font-body text-sm">
                <span className="text-editorial-text-secondary">{title}</span>
                <span className="font-semibold text-editorial-text">{count}</span>
              </div>
            ))}
            {stats.topMasters.length === 0 ? (
              <p className="font-body text-sm text-editorial-text-muted">Nessuna prenotazione one-shot confermata.</p>
            ) : null}
          </div>
        </div>

        <div className="rounded-xl border border-editorial-border bg-white p-6 shadow-soft">
          <p className="font-body text-xs font-semibold uppercase tracking-wider text-editorial-terra">Gioco più richiesto</p>
          <p className="mt-1 font-body text-xs text-editorial-text-muted">Top 5 rulebook per numero di prenotazioni confermate.</p>
          <div className="mt-4 space-y-2">
            {stats.topGames.map(({ title, count }) => (
              <div key={title} className="flex items-center justify-between font-body text-sm">
                <span className="text-editorial-text-secondary">{title}</span>
                <span className="font-semibold text-editorial-text">{count}</span>
              </div>
            ))}
            {stats.topGames.length === 0 ? (
              <p className="font-body text-sm text-editorial-text-muted">Nessuna prenotazione one-shot confermata.</p>
            ) : null}
          </div>
        </div>
      </div>

      <div className="rounded-xl border border-editorial-border bg-white p-6 shadow-soft">
        <p className="font-body text-xs font-semibold uppercase tracking-wider text-editorial-terra">Lista d&apos;attesa</p>
        <p className="mt-1 font-body text-xs text-editorial-text-muted">Persone in attesa di un posto libero tra le one-shot.</p>
        <p className="mt-4 font-elegant text-3xl font-bold text-editorial-text">{waitlistTotal}</p>
      </div>
    </div>
  )
}
