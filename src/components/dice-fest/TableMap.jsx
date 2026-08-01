'use client'

import { Fragment, useEffect, useMemo } from 'react'

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
      <div className="flex flex-wrap gap-2" role="tablist" aria-label="Scegli il giorno">
        {days.map((day) => (
          <button
            key={day}
            type="button"
            role="tab"
            aria-selected={activeDay === day}
            className="tab-fantasy"
            onClick={() => onChangeDay(day)}
          >
            {day}
          </button>
        ))}
      </div>

      {tables.length === 0 || timeSlots.length === 0 ? null : (
        <>
          {/* Mobile / tablet: vertical list, no horizontal scroll. */}
          <div className="space-y-5 lg:hidden">
            {groupedByTimeSlot.map((group) => (
              <div key={group.slotTime}>
                <div className="timeslot-marker mb-2">
                  <span className="timeslot-marker__hour">{group.slotTime}</span>
                </div>
                <div className="space-y-3">
                  {group.entries.map((entry) => {
                    const dimmed = isDimmed ? isDimmed(entry) : false
                    return (
                      <div key={`${entry.slot.table}__${entry.slot.slot}`} className={dimmed ? 'table-map__cell--dimmed' : ''}>
                        {renderCell(entry)}
                      </div>
                    )
                  })}
                </div>
              </div>
            ))}
          </div>

          {/* Desktop / large tablet: full table × time-slot grid. */}
          <div className="table-map-scroll hidden lg:block">
            <div
              className="grid min-w-max"
              style={{ gridTemplateColumns: `132px repeat(${timeSlots.length}, minmax(200px, 1fr))` }}
            >
              <div className="table-map__corner">Tavolo</div>
              {timeSlots.map((slotTime) => (
                <div key={slotTime} className="table-map__col-header">{slotTime}</div>
              ))}

              {tables.map((table) => (
                <Fragment key={table}>
                  <div className="table-map__row-header">{table}</div>
                  {timeSlots.map((slotTime) => {
                    const entry = cellMap.get(`${table}__${slotTime}`)
                    const dimmed = entry && isDimmed ? isDimmed(entry) : false

                    return (
                      <div key={`${table}__${slotTime}`} className={`table-map__cell ${dimmed ? 'table-map__cell--dimmed' : ''}`}>
                        {entry ? renderCell(entry) : <span className="table-map__empty">{emptyLabel}</span>}
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
