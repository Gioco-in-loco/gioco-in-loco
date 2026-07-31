'use client'

import { useState, useMemo, useEffect, useRef } from 'react'
import oneshot from '../../data/oneshot.json'

// Expand oneshots to individual schedule entries for display
const expandedEvents = oneshot.flatMap(oneshot =>
  oneshot.schedule.map(schedule => ({
    ...oneshot,
    ...schedule,
    schedule: undefined,
    originalId: oneshot.id
  }))
)

const uniqueGames = [...new Set(expandedEvents.map(e => e.game))].sort()
const uniqueAssociations = [...new Set(expandedEvents.map(e => e.association))].sort()

function MultiSelect({ label, options, selected, onChange, useAssociationColors }) {
  const [isOpen, setIsOpen] = useState(false)

  const toggleOption = (option) => {
    if (selected.includes(option)) {
      onChange(selected.filter(s => s !== option))
    } else {
      onChange([...selected, option])
    }
  }

  const clearAll = () => onChange([])

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`flex items-center gap-2 px-4 py-2 bg-white border-3 border-comic-navy rounded-xl font-bangers text-sm transition-all hover:scale-105 shadow-[2px_2px 0px 0px #1A1A2E] btn-energetic ${
          selected.length > 0 ? 'text-comic-navy' : 'text-comic-navy/60'
        }`}
      >
        <span>{label}</span>
        {selected.length > 0 && (
          <span className="bg-comic-magenta text-white rounded-full px-2 py-0.5 text-xs">
            {selected.length}
          </span>
        )}
        <span className="ml-1">{isOpen ? '▲' : '▼'}</span>
      </button>

      {isOpen && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />
          <div className="absolute top-full left-0 mt-2 w-64 bg-white border-4 border-comic-navy rounded-xl shadow-[4px 4px 0px 0px #1A1A2E] z-50 max-h-64 overflow-y-auto">
            <div className="p-2 border-b-2 border-comic-navy/20">
              <button
                onClick={clearAll}
                className="text-xs font-comic text-comic-magenta hover:text-comic-navy"
              >
                Clear all
              </button>
            </div>
            {options.map((option) => {
              const colors = useAssociationColors ? getAssociationColor(option) : null
              return (
                <label
                  key={option}
                  className="flex items-center gap-3 px-3 py-2 hover:bg-comic-cream cursor-pointer"
                >
                  <input
                    type="checkbox"
                    checked={selected.includes(option)}
                    onChange={() => toggleOption(option)}
                    className="w-4 h-4 accent-comic-magenta"
                  />
                  {useAssociationColors && (
                    <span className={`w-3 h-3 rounded-full ${colors.bg}`} />
                  )}
                  <span className="font-comic text-sm text-comic-navy">{option}</span>
                </label>
              )
            })}
          </div>
        </>
      )}
    </div>
  )
}

const slots = [
  { id: 1, time: '11-13' },
  { id: 2, time: '13-15' },
  { id: 3, time: '15-17' },
  { id: 4, time: '17-19' },
]
const days = [
  { id: 'Giovedì', label: '30 Aprile', emoji: '🗓️' },
  { id: 'Venerdì', label: '1 Maggio', emoji: '🌟' },
  { id: 'Sabato', label: '2 Maggio', emoji: '⚔️' },
  { id: 'Domenica', label: '3 Maggio', emoji: '🎉' },
]

const GRID_SIZES = {
  slotColMobile: 68,
  slotColDesktop: 128,
  tableCol: 248,
  headerHeightClass: 'h-[56px] lg:h-[88px]',
  cardHeight: 188,
  cellPadding: 10,
  cardGap: 8,
  rowGapClass: 'mb-3',
}

const uniqueTables = [...new Set(expandedEvents.map(e => e.table))].sort((a, b) => {
  const numA = parseInt(a.replace('Tavolo ', ''), 10)
  const numB = parseInt(b.replace('Tavolo ', ''), 10)
  return numA - numB
})

const associationColors = {
  'Progetto Hobbyville': { bg: 'bg-cyan-500', text: 'text-white' },
  'Guiscardo': { bg: 'bg-red-600', text: 'text-white' },
  'Drago Verde Ischia': { bg: 'bg-green-600', text: 'text-white' },
  'Janara': { bg: 'bg-purple-600', text: 'text-white' },
  'Caldera': { bg: 'bg-orange-500', text: 'text-white' },
}
const getAssociationColor = (association) => associationColors[association] || { bg: 'bg-cyan-500', text: 'text-white' }

function GridCellCard({ event, onClick }) {
  const colors = getAssociationColor(event.association)
  const hasLongTitle = event.title.length > 24
  const hasVeryLongTitle = event.title.length > 34
  const hasLongGame = event.game.length > 22
  const hasVeryLongGame = event.game.length > 30
  const hasLongMaster = event.master.length > 22

  const titleClass = hasVeryLongTitle
    ? 'text-[0.8rem] lg:text-[0.88rem] leading-[1.02]'
    : hasLongTitle
      ? 'text-[0.88rem] lg:text-[0.96rem] leading-[1.04]'
      : 'text-[0.95rem] lg:text-[1.05rem] leading-[1.05]'

  const gameClass = hasVeryLongGame
    ? 'text-[0.72rem] lg:text-[0.8rem] leading-[1.08]'
    : hasLongGame
      ? 'text-[0.75rem] lg:text-[0.84rem] leading-[1.1]'
      : 'text-[0.78rem] lg:text-[0.9rem] leading-[1.08]'

  const masterClass = hasLongMaster
    ? 'text-[0.7rem] lg:text-[0.8rem] leading-[1.12]'
    : 'text-[0.74rem] lg:text-[0.86rem] leading-[1.12]'

  return (
    <button
      onClick={onClick}
      className="w-full h-full min-h-0 box-border flex flex-col text-left cursor-pointer group rounded-xl overflow-hidden energy-pulse hover:scale-[1.02] transition-transform"
    >
      <div className={`h-2 lg:h-3 ${colors.bg} flex-shrink-0`} />

      <div className="flex-1 min-h-0 overflow-hidden px-3 lg:px-4 py-2 lg:py-3 grid min-w-0 bg-white border-x-2 lg:border-x-3 border-t border-comic-navy group-hover:border-comic-magenta transition-colors grid-rows-[2.2rem_2.2rem_2.3rem] lg:grid-rows-[2.4rem_2.4rem_2.6rem]">
        <div className="overflow-hidden">
          <h4 className={`font-bangers ${titleClass} text-comic-navy font-semibold line-clamp-2 flex-shrink-0`}>
            {event.title}
          </h4>
        </div>
        <div className="mt-1 overflow-hidden">
          <span className={`block ${gameClass} text-comic-cyan font-bold uppercase tracking-[0.02em] line-clamp-2`}>
            {event.game}
          </span>
        </div>
        <div className="mt-2 border-t border-comic-navy/10 pt-2 overflow-hidden self-end">
          <span className={`block ${masterClass} text-comic-navy/85 font-comic line-clamp-2`}>
            {event.master}
          </span>
        </div>
      </div>

      <div className={`${colors.bg} min-h-[32px] lg:min-h-[38px] px-3 lg:px-4 py-1 lg:py-1.5 flex items-center justify-center`}>
        <span className={`text-[0.72rem] lg:text-[0.82rem] font-bold uppercase ${colors.text} line-clamp-1 text-center`}>
          {event.association}
        </span>
      </div>
    </button>
  )
}

function Modal({ event, allSchedules, onClose }) {
  const groupedSchedules = days
    .map((day) => ({
      day: day.id,
      entries: allSchedules
        .filter((schedule) => schedule.day === day.id)
        .sort((left, right) => {
          if (left.slot !== right.slot) {
            return left.slot.localeCompare(right.slot)
          }
          return left.table.localeCompare(right.table, undefined, { numeric: true })
        }),
    }))
    .filter((group) => group.entries.length > 0)

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-comic-navy/70 backdrop-blur-sm"
        onClick={onClose}
      />

      <div className="relative flex max-h-[calc(100vh-2rem)] w-full max-w-lg flex-col bg-white border-4 border-comic-navy rounded-2xl shadow-[8px 8px 0px 0px #1A1A2E] overflow-hidden animate-pop">
        <div className="relative p-6 pb-4 bg-comic-cream border-b-4 border-comic-navy">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 w-10 h-10 bg-comic-red text-white border-3 border-comic-navy rounded-lg flex items-center justify-center hover:scale-105 transition-transform shadow-[2px 2px 0px 0px #1A1A2E] btn-ripple"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>

          <div className="inline-flex items-center gap-2 bg-comic-cyan border-3 border-comic-navy rounded-full px-4 py-2 mb-3 shadow-[2px 2px 0px 0px #1A1A2E]">
            <span className="font-bangers text-comic-navy uppercase tracking-wider">
              📚 {event.game}
            </span>
          </div>

          <h3 className="font-bangers text-3xl text-comic-navy font-bold leading-tight mb-3">
            {event.title}
          </h3>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-4 min-h-0">
          <div className="bg-comic-orange/10 border-3 border-comic-navy rounded-xl p-4">
            <p className="font-bangers text-comic-navy text-xl mb-3">📅 PROGRAMMAZIONE</p>
            <div className="space-y-3">
              {groupedSchedules.map((group) => (
                <div key={group.day} className="grid grid-cols-1 sm:grid-cols-[auto,1fr] gap-2 sm:gap-3 items-start">
                  <span className="inline-flex items-center justify-center bg-comic-orange border-3 border-comic-navy rounded-full px-4 py-2 shadow-[2px 2px 0px 0px #1A1A2E] font-bangers text-comic-navy uppercase tracking-wider whitespace-nowrap">
                    {group.day}
                  </span>
                  <div className="flex flex-wrap gap-2">
                    {group.entries.map((schedule, index) => (
                      <span
                        key={`${group.day}-${schedule.slot}-${schedule.table}-${index}`}
                        className="inline-flex items-center gap-2 bg-white border-3 border-comic-navy rounded-full px-3 py-2 shadow-[2px 2px 0px 0px #1A1A2E] font-comic text-comic-navy font-bold"
                      >
                        <span>🕐 {schedule.slot}</span>
                        <span>•</span>
                        <span>🪑 {schedule.table}</span>
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-comic-cream border-3 border-comic-navy rounded-xl p-4 max-h-64 overflow-y-auto">
            <p className="font-comic text-comic-navy leading-relaxed text-lg">
              {event.description}
            </p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="bg-comic-magenta/20 border-3 border-comic-navy rounded-xl p-3">
              <span className="font-comic text-xs text-comic-navy/60 uppercase tracking-wider">🏠 REALTÀ LUDICA</span>
              <p className="font-semibold text-comic-navy text-sm">{event.association}</p>
            </div>
            <div className="bg-comic-yellow/20 border-3 border-comic-navy rounded-xl p-3">
              <span className="font-comic text-xs text-comic-navy/60 uppercase tracking-wider">🎭 Master</span>
              <p className="font-bangers text-comic-navy">{event.master}</p>
            </div>
          </div>
        </div>

        <div className="p-4 bg-comic-cream border-t-4 border-comic-navy">
          <button
            onClick={onClose}
            className="w-full py-3 bg-comic-magenta text-comic-navy font-bangers text-xl border-3 border-comic-navy rounded-xl shadow-[3px 3px 0px 0px #1A1A2E] hover:translate-y-0.5 hover:shadow-[2px 2px 0px 0px #1A1A2E] transition-all btn-energetic"
          >
            CHIUDI
          </button>
        </div>
      </div>
    </div>
  )
}

function getDefaultDay() {
  const today = new Date()
  const todayStr = today.toISOString().split('T')[0]

  const eventDates = {
    '2026-04-30': 'Giovedì',
    '2026-05-01': 'Venerdì',
    '2026-05-02': 'Sabato',
    '2026-05-03': 'Domenica',
  }

  const todayKey = eventDates[todayStr]
  const availableDays = ['Giovedì', 'Venerdì', 'Sabato', 'Domenica']

  if (todayKey && availableDays.includes(todayKey)) {
    const hasEvents = expandedEvents.some(e => e.day === todayKey)
    if (hasEvents) return todayKey
  }

  for (const day of availableDays) {
    if (expandedEvents.some(e => e.day === day)) {
      return day
    }
  }

  return 'Giovedì'
}

export default function AreaGDRSection() {
  const [selectedDay, setSelectedDay] = useState(getDefaultDay)
  const [selectedEvent, setSelectedEvent] = useState(null)
  const [selectedGames, setSelectedGames] = useState([])
  const [selectedAssociations, setSelectedAssociations] = useState([])
  const [isVisible, setIsVisible] = useState(false)
  const sectionRef = useRef(null)

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true)
        }
      },
      { threshold: 0.1 }
    )

    if (sectionRef.current) {
      observer.observe(sectionRef.current)
    }

    return () => observer.disconnect()
  }, [])

  const dayEvents = useMemo(() => {
    return expandedEvents.filter(e => {
      if (e.day !== selectedDay) return false
      if (selectedGames.length > 0 && !selectedGames.includes(e.game)) return false
      if (selectedAssociations.length > 0 && !selectedAssociations.includes(e.association)) return false
      return true
    })
  }, [selectedDay, selectedGames, selectedAssociations])

  const gridBySlotTable = useMemo(() => {
    return slots.reduce((acc, slot) => {
      acc[slot.time] = uniqueTables.reduce((tableAcc, table) => {
        tableAcc[table] = dayEvents.filter(e =>
          e.slot === slot.time && e.table === table
        )
        return tableAcc
      }, {})
      return acc
    }, {})
  }, [dayEvents])

  const slotRowHeights = useMemo(() => {
    return slots.reduce((acc, slot) => {
      const maxCardsInRow = Math.max(
        1,
        ...uniqueTables.map(table => gridBySlotTable[slot.time]?.[table]?.length || 0)
      )

      acc[slot.time] =
        maxCardsInRow * GRID_SIZES.cardHeight +
        (maxCardsInRow - 1) * GRID_SIZES.cardGap +
        GRID_SIZES.cellPadding * 2

      return acc
    }, {})
  }, [gridBySlotTable])

  return (
    <section id="area-gdr" ref={sectionRef} className="relative py-24 px-6 bg-comic-cream overflow-hidden">
      {/* Background with texture */}
      <div className="absolute inset-0 pattern-drift">
        <div className="absolute inset-0" style={{
          backgroundImage: `
            radial-gradient(circle at 20% 80%, rgba(255, 20, 147, 0.08) 0%, transparent 40%),
            radial-gradient(circle at 80% 20%, rgba(0, 212, 255, 0.08) 0%, transparent 40%)
          `
        }} />
      </div>

      {/* Placeholder background for GDR area */}
      <div className="absolute inset-0 z-0 opacity-5">
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="text-center text-comic-navy/50">
            <div className="text-9xl mb-4 opacity-20">⚔️</div>
            <p className="font-bangers text-2xl tracking-wider">area-gdr.jpg</p>
          </div>
        </div>
      </div>

      {/* Geometric decorations */}
      <div className="absolute top-20 right-10 w-32 h-32 border-4 border-comic-magenta/20 rounded-full" />
      <div className="absolute bottom-40 left-10 w-24 h-24 bg-comic-cyan/10 rounded-full" />

      <div className="relative max-w-7xl mx-auto z-10">
        {/* Section header */}
        <div className="text-center mb-12">
          {/* Decorative swords with animation */}
          <div className="flex items-center justify-center gap-4 mb-4">
            <span className="text-5xl float-bounce" style={{ filter: 'drop-shadow(0 4px 8px rgba(0,0,0,0.2))' }}>⚔️</span>
            <h2
              className={`font-bangers text-5xl md:text-6xl text-comic-navy tracking-wider transition-all duration-700 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}
            >
              AREA GDR
            </h2>
            <span className="text-5xl float-bounce" style={{ filter: 'drop-shadow(0 4px 8px rgba(0,0,0,0.2))', animationDelay: '0.5s' }}>⚔️</span>
          </div>

          {/* Info banner */}
          <div
            className={`inline-block bg-white border-4 border-comic-navy rounded-xl px-6 py-4 mb-6 shadow-[4px 4px 0px 0px #1A1A2E] transition-all duration-700 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}
            style={{ transitionDelay: '0.2s' }}
          >
            <p className="font-comic text-comic-navy text-lg leading-relaxed">
              Entra nel vivo dell'azione e dai vita a storie indimenticabili!
              <br />
              Nell'area Giochi di Ruolo potrai esplorare mondi fantastici e provare gratuitamente tantissimi titoli, dai grandi classici alle ultime novità, fino ai prototipi più curiosi. Che tu voglia impugnare una spada, pilotare una nave spaziale o investigare su misteri occulti, c'è un'avventura che ti aspetta.
              <br />
              <b>Non hai mai giocato? </b> Nessun problema!
              <br />
              I nostri narratori ti spiegheranno le basi in pochi minuti e ti guideranno in una sessione dimostrativa di circa due ore.
              <br /> È l'occasione perfetta per scoprire quanto può essere emozionante creare una storia insieme!
              <br /> Sfrutta l'occasione per testare quel gioco che non sei mai riuscito ad intavolare o per lasciarti sorprendere da una nuova ambientazione.
              <br />
              Con oltre 20 sistemi differenti, la sfida è assicurata.
            </p>
          </div>

          {/* Gilde section */}
          <div
            className={`mt-8 mb-8 pb-8 p-6 bg-comic-cyan/20 border-4 border-comic-navy rounded-xl text-center transition-all duration-700 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}
            style={{ transitionDelay: '0.3s' }}
          >
            <p className="font-bangers text-2xl text-comic-navy mb-2">🛡️ LE GILDE CHE VI GUIDERANNO</p>
            <p className="font-comic text-comic-navy mb-4">
              A farvi da guida tra dadi e mappe saranno le migliori realtà campane:
            </p>
            <div className="flex flex-wrap items-center justify-center gap-3 text-lg font-bangers">
              {['Il Guiscardo', 'Drago Verde Ischia', 'Caldera', 'Hobbyville', 'Janara Studios', 'Il Calderone Ludico'].map((guild, i) => (
                <span
                  key={guild}
                  className="bg-white border-3 border-comic-navy rounded-lg px-3 py-1 hover:bg-comic-yellow/30 transition-colors cursor-pointer stagger-fade-in"
                  style={{ animationDelay: `${0.4 + i * 0.1}s` }}
                >
                  {guild}
                </span>
              ))}
            </div>
            <p className="font-comic text-comic-navy mt-4">
              Ti aspettiamo al <span className="font-bold">Padiglione 3</span> per scrivere insieme il prossimo capitolo!
            </p>
          </div>

          {/* Info pills */}
          <div className="flex flex-wrap items-center justify-center gap-3">
            {[
              { icon: '🕐', text: '4 SLOT', color: 'comic-orange', delay: '0.4s' },
              { icon: '🪑', text: `${uniqueTables.length} TAVOLI`, color: 'comic-cyan', delay: '0.5s' },
              { icon: '🎟️', text: 'GRATIS', color: 'comic-yellow', delay: '0.6s' }
            ].map((pill) => (
              <div
                key={pill.text}
                className={`stagger-fade-in bg-${pill.color}/90 backdrop-blur-sm border-3 border-comic-navy rounded-full px-5 py-2 shadow-[3px 3px 0px 0px #1A1A2E] hover:scale-110 transition-transform cursor-pointer`}
                style={{ animationDelay: pill.delay }}
              >
                <span className="font-bangers text-comic-navy">{pill.icon} {pill.text}</span>
              </div>
            ))}
          </div>

          {/* Reservation info */}
          <div
            className={`mt-6 p-4 bg-comic-magenta/10 border-4 border-comic-magenta rounded-xl max-w-2xl mx-auto transition-all duration-700 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}
            style={{ transitionDelay: '0.5s' }}
          >
            <p className="font-bangers text-comic-navy text-lg mb-2">📋 COME PRENOTARE:</p>
            <p> Puoi prenotarti presso la segreteria  esterna al Padiglione 3 nei seguenti orari:</p>
            <br />
            <div className="flex flex-wrap items-center justify-center gap-4 text-sm">
              <span className="bg-comic-cream border-2 border-comic-navy rounded-lg px-3 py-1 font-semibold">
                🕙 10:00-11:00 → 1° e 2° Slot
              </span>
              <span className="bg-comic-cream border-2 border-comic-navy rounded-lg px-3 py-1 font-semibold">
                🕑 14:00-15:00 → 3° e 4° Slot
              </span>
            </div>
            <br />
            <p className="font-comic text-comic-navy/80 text-sm mb-3 text-center">
              Prenotazioni solo <span className="font-bold text-comic-magenta">durante l'evento</span>, <span className="font-bold text-comic-magenta">giorno per giorno</span>
            </p>
          </div>
        </div>

        {/* Day selector tabs with animated underline */}
        <div className="flex flex-wrap justify-center gap-3 mb-8">
          {days.map((day, index) => (
            <button
              key={day.id}
              onClick={() => setSelectedDay(day.id)}
              className={`relative px-6 py-4 rounded-xl font-bangers text-lg tracking-wide transition-all duration-200 border-4 ${
                selectedDay === day.id
                  ? 'bg-comic-magenta text-comic-navy border-comic-navy shadow-[4px 4px 0px 0px #1A1A2E] energy-pulse'
                  : 'bg-comic-paper text-comic-navy border-comic-navy hover:translate-y-1 hover:shadow-[3px 3px 0px 0px #1A1A2E]'
              }`}
            >
              <span className="mr-2">{day.emoji}</span>
              {day.label}
            </button>
          ))}
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center justify-center gap-4 mb-8">
          <MultiSelect
            label="GIOCO"
            options={uniqueGames}
            selected={selectedGames}
            onChange={setSelectedGames}
          />
          <MultiSelect
            label="REALTÀ LUDICA"
            options={uniqueAssociations}
            selected={selectedAssociations}
            onChange={setSelectedAssociations}
            useAssociationColors
          />
        </div>

        {/* Calendar Grid */}
        <div className="block overflow-x-auto pb-4">
          <div
            className="min-w-fit"
            style={{ minWidth: `${GRID_SIZES.slotColMobile + 12 + uniqueTables.length * GRID_SIZES.tableCol}px` }}
          >
            <div className={`flex items-stretch gap-3 ${GRID_SIZES.rowGapClass}`}>
              <div
                className={`${GRID_SIZES.headerHeightClass} sticky left-0 z-10 flex-shrink-0 bg-comic-navy border-3 lg:border-4 border-comic-navy rounded-xl px-2 lg:px-3 shadow-[2px 2px 0px 0px #1A1A2E] lg:shadow-[4px 4px 0px 0px #1A1A2E] flex items-center justify-center`}
                style={{ width: `clamp(${GRID_SIZES.slotColMobile}px, 14vw, ${GRID_SIZES.slotColDesktop}px)` }}
              >
                <span className="font-bangers text-comic-yellow uppercase tracking-wider text-sm lg:text-base">Orari</span>
              </div>

              <div className="grid gap-3" style={{ gridTemplateColumns: `repeat(${uniqueTables.length}, ${GRID_SIZES.tableCol}px)` }}>
                {uniqueTables.map(table => (
                  <div
                    key={table}
                    className={`${GRID_SIZES.headerHeightClass} bg-comic-cyan border-3 lg:border-4 border-comic-navy rounded-xl px-3 lg:px-4 flex items-center justify-center text-center shadow-[2px 2px 0px 0px #1A1A2E] lg:shadow-[4px 4px 0px 0px #1A1A2E]`}
                  >
                    <span className="font-bangers text-comic-navy text-base lg:text-xl font-bold block">{table}</span>
                  </div>
                ))}
              </div>
            </div>

            {slots.map((slot, slotIndex) => (
              <div
                key={slot.time}
                className={`flex items-stretch gap-3 ${GRID_SIZES.rowGapClass} transition-all duration-700 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}
                style={{ transitionDelay: `${0.6 + slotIndex * 0.1}s` }}
              >
                <div
                  className="sticky left-0 z-10 flex-shrink-0 bg-comic-navy border-3 lg:border-4 border-comic-navy rounded-xl px-2 lg:px-3 shadow-[3px 3px 0px 0px #1A1A2E] lg:shadow-[4px 4px 0px 0px #1A1A2E] flex items-center justify-center"
                  style={{
                    width: `clamp(${GRID_SIZES.slotColMobile}px, 14vw, ${GRID_SIZES.slotColDesktop}px)`,
                    height: `${slotRowHeights[slot.time]}px`,
                  }}
                >
                  <div className="text-center">
                    <span className="font-bangers text-sm lg:text-lg text-comic-yellow font-bold block leading-tight">{slot.id}°</span>
                    <span className="font-bangers text-xs lg:text-sm text-comic-yellow/80">{slot.time}</span>
                  </div>
                </div>

                <div
                  className="grid gap-3"
                  style={{ gridTemplateColumns: `repeat(${uniqueTables.length}, ${GRID_SIZES.tableCol}px)` }}
                >
                  {uniqueTables.map(table => {
                    const cellEvents = gridBySlotTable[slot.time]?.[table] || []
                    const isEmpty = cellEvents.length === 0

                    return (
                      <div
                        key={`${slot.time}-${table}`}
                        className={`box-border transition-all duration-150 ${
                          isEmpty
                            ? 'bg-comic-paper/50'
                            : 'bg-transparent'
                        }`}
                        style={{ height: `${slotRowHeights[slot.time]}px` }}
                      >
                        {isEmpty ? (
                          <div className="w-full h-full border-3 border-dashed border-comic-navy/10 rounded-xl" />
                        ) : (
                          <div className="flex flex-col h-full box-border overflow-hidden p-2.5" style={{ gap: `${GRID_SIZES.cardGap}px` }}>
                            {cellEvents.map((event) => (
                              <div
                                key={`${event.originalId}-${event.day}-${event.slot}-${event.table}`}
                                className="flex-shrink-0"
                                style={{ height: `${GRID_SIZES.cardHeight}px` }}
                              >
                                <GridCellCard
                                  event={event}
                                  onClick={() => setSelectedEvent(event)}
                                />
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Info note */}
        <div
          className={`mt-12 p-6 bg-comic-yellow/30 border-4 border-comic-navy rounded-xl text-center transition-all duration-700 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}
          style={{ transitionDelay: '1s' }}
        >
          <p className="font-comic text-comic-navy">
            <span className="text-2xl mr-2">💡</span>
            Le sessioni sono gratuite e aperte a tutti. Non è necessaria esperienza pregressa!
          </p>
        </div>
      </div>

      {selectedEvent && (
        <Modal
          event={selectedEvent}
          allSchedules={oneshot.find(o => o.id === selectedEvent.originalId)?.schedule || []}
          onClose={() => setSelectedEvent(null)}
        />
      )}
    </section>
  )
}