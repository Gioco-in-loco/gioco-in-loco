'use client'

import { Fragment, useEffect, useMemo, useState } from 'react'

function GridIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
      <rect x="3" y="3" width="7" height="7" />
      <rect x="14" y="3" width="7" height="7" />
      <rect x="3" y="14" width="7" height="7" />
      <rect x="14" y="14" width="7" height="7" />
    </svg>
  )
}

function ListIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
      <path d="M8 6h13M8 12h13M8 18h13" />
      <path d="M3 6h.01M3 12h.01M3 18h.01" />
    </svg>
  )
}

const DAY_ORDER = ['Lunedi', 'Lunedì', 'Martedi', 'Martedì', 'Mercoledi', 'Mercoledì', 'Giovedi', 'Giovedì', 'Venerdi', 'Venerdì', 'Sabato', 'Domenica']

function dayIndex(day) {
  const idx = DAY_ORDER.indexOf(day)
  return idx === -1 ? 999 : idx
}

// Structural table×slot grid — mirrors the admin "Mappa tavoli"
// (src/components/management/TableScheduleMap.jsx) but themed for the public
// fantasy/parchment booking page. Callers own all business logic: each entry
// in `entries` is `{ slot: { day, slot, table, ... }, ... }` and `renderCell`
// decides what a cell looks like and does when clicked.
export default function TableMap({ entries, activeDay, onChangeDay, renderCell, isDimmed, emptyLabel = 'Libero' }) {
  // Below `lg` there's never room for the grid (see the comment on the
  // desktop block below), so the toggle only matters — and is only shown —
  // from `lg` up. Defaults to the grid to keep current desktop behaviour.
  const [viewMode, setViewMode] = useState('table')

  const days = useMemo(() => {
    const unique = Array.from(new Set(entries.map((entry) => entry.slot.day)))
    return unique.sort((left, right) => dayIndex(left) - dayIndex(right))
  }, [entries])

  useEffect(() => {
    if (days.length === 0) return
    if (!activeDay || !days.includes(activeDay)) onChangeDay(days[0])
  }, [days, activeDay, onChangeDay])

  const dayEntries = useMemo(() => entries.filter((entry) => entry.slot.day === activeDay), [entries, activeDay])

  // Righe/colonne derivano dall'unione di TUTTI i giorni, non solo da quello
  // attivo: la sala è la stessa ogni giorno, cambia solo cosa succede in ogni
  // tavolo/fascia. Derivarle dal solo giorno attivo farebbe apparire/sparire
  // tavoli e fasce cambiando tab, anche quando è solo l'occupazione a variare.
  const timeSlots = useMemo(
    () => Array.from(new Set(entries.map((entry) => entry.slot.slot))).sort((left, right) => left.localeCompare(right, undefined, { numeric: true })),
    [entries],
  )

  const tables = useMemo(
    () => Array.from(new Set(entries.map((entry) => entry.slot.table))).sort((left, right) => left.localeCompare(right, undefined, { numeric: true })),
    [entries],
  )

  const cellMap = useMemo(() => {
    const map = new Map()
    dayEntries.forEach((entry) => map.set(`${entry.slot.table}__${entry.slot.slot}`, entry))
    return map
  }, [dayEntries])

  // Mobile list grouped by time slot: only real entries are listed (no
  // "Libero" placeholders), since scanning a flat list of open tables reads
  // better on a phone than reconstructing an empty grid cell by cell.
  const groupedByTimeSlot = useMemo(
    () => timeSlots
      .map((slotTime) => ({
        slotTime,
        entries: tables
          .map((table) => cellMap.get(`${table}__${slotTime}`))
          .filter(Boolean),
      }))
      .filter((group) => group.entries.length > 0),
    [timeSlots, tables, cellMap],
  )

  if (days.length === 0) return null

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-2" role="tablist" aria-label="Scegli il giorno">
          {days.map((day) => (
            <button
              key={day}
              type="button"
              role="tab"
              aria-selected={activeDay === day}
              className="dicefest-tab"
              onClick={() => onChangeDay(day)}
            >
              {day}
            </button>
          ))}
        </div>

        {/* Sotto `lg` la griglia non ha mai spazio a sufficienza (vedi sotto),
            quindi il toggle vista tabella/lista ha senso solo da `lg` in su:
            sotto quella soglia resta sempre la lista. */}
        <div className="hidden items-center gap-1 border-2 border-dicefest-border bg-dicefest-surface p-1 lg:inline-flex" role="group" aria-label="Tipo di visualizzazione">
          <button
            type="button"
            onClick={() => setViewMode('table')}
            aria-pressed={viewMode === 'table'}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 font-df-mono text-xs font-bold uppercase tracking-wide transition-colors ${
              viewMode === 'table' ? 'bg-dicefest-pink text-dicefest-ink' : 'text-dicefest-paper/60 hover:text-dicefest-paper'
            }`}
          >
            <GridIcon />
            Tabella
          </button>
          <button
            type="button"
            onClick={() => setViewMode('list')}
            aria-pressed={viewMode === 'list'}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 font-df-mono text-xs font-bold uppercase tracking-wide transition-colors ${
              viewMode === 'list' ? 'bg-dicefest-pink text-dicefest-ink' : 'text-dicefest-paper/60 hover:text-dicefest-paper'
            }`}
          >
            <ListIcon />
            Lista
          </button>
        </div>
      </div>

      {tables.length === 0 || timeSlots.length === 0 ? null : (
        <>
          {/* Sotto `lg`: sempre lista verticale, nessuno scroll orizzontale.
              Da `lg` in su: lista o griglia in base al toggle sopra. */}
          <div className={`space-y-5 ${viewMode === 'list' ? '' : 'lg:hidden'}`}>
            {groupedByTimeSlot.map((group) => (
              <div key={group.slotTime}>
                <div className="dicefest-timeslot mb-2">
                  <span className="dicefest-timeslot__hour">{group.slotTime}</span>
                </div>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {group.entries.map((entry) => {
                    const dimmed = isDimmed ? isDimmed(entry) : false
                    return (
                      <div key={`${entry.slot.table}__${entry.slot.slot}`} className={dimmed ? 'dicefest-table__cell--dimmed' : ''}>
                        {renderCell(entry)}
                      </div>
                    )
                  })}
                </div>
              </div>
            ))}
          </div>

          {/* Desktop / large tablet: full table × time-slot grid. */}
          <div className={`dicefest-table-scroll hidden ${viewMode === 'table' ? 'lg:block' : ''}`}>
            <div
              className="grid min-w-max"
              style={{ gridTemplateColumns: `84px repeat(${timeSlots.length}, minmax(132px, 1fr))` }}
            >
              <div className="dicefest-table__corner">Tavolo</div>
              {timeSlots.map((slotTime) => (
                <div key={slotTime} className="dicefest-table__col-header">{slotTime}</div>
              ))}

              {tables.map((table) => (
                <Fragment key={table}>
                  <div className="dicefest-table__row-header">{table}</div>
                  {timeSlots.map((slotTime) => {
                    const entry = cellMap.get(`${table}__${slotTime}`)
                    const dimmed = entry && isDimmed ? isDimmed(entry) : false

                    return (
                      <div key={`${table}__${slotTime}`} className={`dicefest-table__cell ${dimmed ? 'dicefest-table__cell--dimmed' : ''}`}>
                        {entry ? renderCell(entry) : <span className="dicefest-table__empty">{emptyLabel}</span>}
                      </div>
                    )
                  })}
                </Fragment>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  )
}
