'use client'

import { Fragment, useEffect, useMemo, useState } from 'react'

const WEEK_DAYS = ['Lunedi', 'Martedi', 'Mercoledi', 'Giovedi', 'Venerdi', 'Sabato', 'Domenica']

function dayIndex(day) {
  const idx = WEEK_DAYS.indexOf(day)
  return idx === -1 ? 999 : idx
}

export default function TableScheduleMap({ slots, loading, onCellClick, isCellClickable }) {
  const days = useMemo(() => {
    const unique = Array.from(new Set(slots.map((slot) => slot.day)))
    return unique.sort((left, right) => dayIndex(left) - dayIndex(right))
  }, [slots])

  const [activeDay, setActiveDay] = useState('')

  useEffect(() => {
    setActiveDay((current) => (days.includes(current) ? current : days[0] || ''))
  }, [days])

  const daySlots = useMemo(() => slots.filter((slot) => slot.day === activeDay), [slots, activeDay])

  const timeSlots = useMemo(
    () => Array.from(new Set(daySlots.map((slot) => slot.slot))).sort((left, right) => left.localeCompare(right, undefined, { numeric: true })),
    [daySlots],
  )

  const tables = useMemo(
    () => Array.from(new Set(daySlots.map((slot) => slot.table))).sort((left, right) => left.localeCompare(right, undefined, { numeric: true })),
    [daySlots],
  )

  const cellMap = useMemo(() => {
    const map = new Map()
    daySlots.forEach((slot) => map.set(`${slot.table}__${slot.slot}`, slot))
    return map
  }, [daySlots])

  if (loading) {
    return <p className="font-body text-sm text-editorial-text-muted">Caricamento mappa...</p>
  }

  if (slots.length === 0) {
    return (
      <p className="rounded-xl border border-editorial-border bg-white px-4 py-6 text-center font-body text-sm text-editorial-text-muted">
        Nessuno slot creato per questo evento.
      </p>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        {days.map((day) => (
          <button
            key={day}
            type="button"
            onClick={() => setActiveDay(day)}
            className={`rounded-lg px-3 py-1.5 font-body text-sm font-semibold transition-colors ${
              activeDay === day
                ? 'bg-editorial-terra text-white shadow-soft'
                : 'border border-editorial-border text-editorial-text hover:border-editorial-terra'
            }`}
          >
            {day}
          </button>
        ))}
      </div>

      <div className="flex flex-wrap items-center gap-4 font-body text-xs text-editorial-text-muted">
        <span className="flex items-center gap-1.5">
          <span className="inline-block h-3 w-3 rounded-sm border border-editorial-forest bg-editorial-forest/10" />
          Assegnato
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block h-3 w-3 rounded-sm border border-dashed border-editorial-border bg-editorial-bg" />
          Libero
        </span>
      </div>

      {tables.length === 0 || timeSlots.length === 0 ? (
        <p className="rounded-xl border border-editorial-border bg-white px-4 py-6 text-center font-body text-sm text-editorial-text-muted">
          Nessuno slot per questo giorno.
        </p>
      ) : (
        <div className="overflow-auto rounded-xl border border-editorial-border bg-white shadow-soft">
          <div
            className="grid min-w-max"
            style={{ gridTemplateColumns: `160px repeat(${timeSlots.length}, minmax(180px, 1fr))` }}
          >
            <div className="sticky left-0 top-0 z-20 border-b border-r border-editorial-border bg-editorial-bg px-3 py-2 font-body text-xs font-semibold uppercase tracking-wider text-editorial-text-muted">
              Tavolo
            </div>
            {timeSlots.map((slotTime) => (
              <div
                key={slotTime}
                className="sticky top-0 z-10 border-b border-editorial-border bg-editorial-bg px-3 py-2 text-center font-body text-xs font-semibold uppercase tracking-wider text-editorial-text-muted"
              >
                {slotTime}
              </div>
            ))}

            {tables.map((table) => (
              <Fragment key={table}>
                <div className="sticky left-0 z-10 border-r border-t border-editorial-border bg-white px-3 py-3 font-body text-sm font-semibold text-editorial-text">
                  {table}
                </div>
                {timeSlots.map((slotTime) => {
                  const cell = cellMap.get(`${table}__${slotTime}`)

                  if (!cell) {
                    return (
                      <div key={`${table}-${slotTime}`} className="border-t border-editorial-border bg-editorial-bg/10 px-3 py-3">
                        <span className="font-body text-xs text-editorial-text-muted">—</span>
                      </div>
                    )
                  }

                  const isOneShot = Boolean(cell.oneshotId)
                  const isMainEvent = Boolean(cell.mainEventId)
                  const isAssigned = isOneShot || isMainEvent
                  const clickable = Boolean(onCellClick) && (!isCellClickable || isCellClickable(cell))
                  const capacity = isMainEvent ? (cell.groupMaxPlayers ?? cell.maxPlayers) : cell.maxPlayers

                  return (
                    <button
                      key={`${table}-${slotTime}`}
                      type="button"
                      onClick={() => { if (clickable) onCellClick(cell) }}
                      disabled={!clickable}
                      className={`w-full border-t border-editorial-border px-3 py-2 text-left transition-shadow disabled:cursor-default ${
                        isAssigned ? 'bg-editorial-forest/5' : 'bg-editorial-bg/40'
                      } ${clickable ? 'cursor-pointer hover:ring-2 hover:ring-inset hover:ring-editorial-terra' : ''}`}
                    >
                      {isAssigned ? (
                        <>
                          <p className="font-body text-[10px] font-semibold uppercase tracking-wider text-editorial-terra">
                            {isOneShot ? 'One shot' : 'Main event'}
                          </p>
                          <p className="font-body text-sm font-semibold text-editorial-text">{isOneShot ? (cell.oneshotTitle || 'One shot') : (cell.mainEventTitle || 'Main event')}</p>
                          {isOneShot && cell.oneshotMaster ? (
                            <p className="font-body text-xs text-editorial-text-muted">Master {cell.oneshotMaster}</p>
                          ) : null}
                          {isOneShot && cell.associationName ? (
                            <p className="font-body text-xs text-editorial-text-muted">{cell.associationName}</p>
                          ) : null}
                          <p className="mt-1 font-body text-[11px] text-editorial-text-secondary">
                            {cell.reservationsCount}/{capacity} prenotati
                          </p>
                        </>
                      ) : (
                        <p className="font-body text-xs text-editorial-text-muted">
                          Libero · {cell.maxPlayers} posti{cell.adminOnly ? ' · Riservato admin' : ''}
                        </p>
                      )}
                    </button>
                  )
                })}
              </Fragment>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
