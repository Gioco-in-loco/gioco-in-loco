'use client'

import { useEffect, useState } from 'react'

function pad(n) {
  return String(n).padStart(2, '0')
}

function getTimeLeft(targetTime) {
  const diff = targetTime - Date.now()
  if (diff <= 0) return null

  return {
    days: Math.floor(diff / (1000 * 60 * 60 * 24)),
    hours: Math.floor((diff / (1000 * 60 * 60)) % 24),
    minutes: Math.floor((diff / (1000 * 60)) % 60),
    seconds: Math.floor((diff / 1000) % 60),
  }
}

export default function Countdown({ startDate, className = '' }) {
  const targetTime = startDate ? new Date(startDate).getTime() : null
  const [timeLeft, setTimeLeft] = useState(() => (targetTime ? getTimeLeft(targetTime) : null))

  useEffect(() => {
    if (!targetTime) return undefined

    setTimeLeft(getTimeLeft(targetTime))
    const timerId = setInterval(() => {
      setTimeLeft(getTimeLeft(targetTime))
    }, 1000)

    return () => clearInterval(timerId)
  }, [targetTime])

  if (!targetTime) return null

  return (
    <div className={`dicefest-surface shadow-df-hard-green px-6 py-6 text-center sm:px-8 ${className}`}>
      <p className="dicefest-eyebrow justify-center">Al via tra</p>
      {timeLeft ? (
        <div className="mt-4 grid grid-cols-4 gap-2">
          {[
            { value: timeLeft.days, label: 'Giorni' },
            { value: timeLeft.hours, label: 'Ore' },
            { value: timeLeft.minutes, label: 'Min' },
            { value: timeLeft.seconds, label: 'Sec' },
          ].map((unit) => (
            <div key={unit.label}>
              <span className="font-df-display text-3xl text-dicefest-paper sm:text-4xl">{pad(unit.value)}</span>
              <span className="mt-1 block font-df-mono text-[10px] uppercase tracking-widest text-dicefest-paper/50">
                {unit.label}
              </span>
            </div>
          ))}
        </div>
      ) : (
        <p className="mt-4 font-df-display text-2xl uppercase text-dicefest-green">Dice Fest è iniziato!</p>
      )}
    </div>
  )
}
