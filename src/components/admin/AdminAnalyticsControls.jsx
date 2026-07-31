'use client'

import { useMemo, useState, useTransition } from 'react'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import PrivacyModal from '../ui/PrivacyModal'
import TutorialPopup from '../tutorial/TutorialPopup'

const PRESETS = [
  { value: 'day', label: 'Ultimo giorno' },
  { value: 'week', label: 'Ultima settimana' },
  { value: 'month', label: 'Ultimo mese' },
]

function toInputDate(value) {
  return value ? value.slice(0, 10) : ''
}

export default function AdminAnalyticsControls({
  currentRange,
  currentFrom,
  currentTo,
  eyebrow = 'Analisi piattaforma',
  title = 'Analytics',
  description = 'Statistiche first-party anonime: un ID tecnico casuale distingue i visitatori unici senza collegarli a persone o account.',
  tutorialSlides = null,
}) {
  const pathname = usePathname()
  const router = useRouter()
  const searchParams = useSearchParams()
  const [showPrivacy, setShowPrivacy] = useState(false)
  const [isPending, startTransition] = useTransition()
  const [fromDate, setFromDate] = useState(toInputDate(currentFrom))
  const [toDate, setToDate] = useState(toInputDate(currentTo))

  const activeRange = useMemo(() => {
    if (currentRange === 'custom' && fromDate && toDate) {
      return 'custom'
    }

    return PRESETS.some((preset) => preset.value === currentRange) ? currentRange : 'month'
  }, [currentRange, fromDate, toDate])

  const pushParams = (nextParams) => {
    const params = new URLSearchParams(searchParams.toString())

    Object.entries(nextParams).forEach(([key, value]) => {
      if (!value) {
        params.delete(key)
        return
      }

      params.set(key, value)
    })

    startTransition(() => {
      const query = params.toString()
      router.push(query ? `${pathname}?${query}` : pathname)
    })
  }

  const applyPreset = (preset) => {
    setFromDate('')
    setToDate('')
    pushParams({ range: preset, from: '', to: '' })
  }

  const applyCustomRange = (event) => {
    event.preventDefault()
    if (!fromDate || !toDate) {
      return
    }

    pushParams({ range: 'custom', from: fromDate, to: toDate })
  }

  return (
    <>
      {showPrivacy && <PrivacyModal onClose={() => setShowPrivacy(false)} />}

      <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
        <div>
          <p className="font-body text-xs uppercase tracking-widest text-editorial-terra mb-1 font-semibold">
            {eyebrow}
          </p>
          <div className="flex items-center gap-2">
            <h1 className="font-elegant text-4xl text-editorial-text font-bold">{title}</h1>
            {tutorialSlides ? <TutorialPopup label={title} slides={tutorialSlides} /> : null}
          </div>
          <p className="font-body text-sm text-editorial-text-secondary mt-2 max-w-3xl">
            {description}
          </p>
        </div>

        <div className="flex flex-col gap-3 md:items-end">
          <button
            type="button"
            onClick={() => setShowPrivacy(true)}
            className="inline-flex items-center justify-center rounded-lg border border-editorial-border px-4 py-2 font-body text-sm font-semibold text-editorial-text hover:border-editorial-terra transition-colors"
          >
            Apri informativa privacy
          </button>
          <div className="text-xs font-body text-editorial-text-muted">{isPending ? 'Aggiornamento dati...' : 'Filtri attivi in tempo reale'}</div>
        </div>
      </div>

      <section className="bg-white rounded-xl border border-editorial-border p-5 shadow-soft">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
          <div>
            <h2 className="font-elegant text-2xl text-editorial-text font-bold">Filtri</h2>
            <p className="font-body text-sm text-editorial-text-secondary">Scegli un preset rapido oppure un intervallo personalizzato.</p>
          </div>

          <div className="flex flex-wrap gap-2">
            {PRESETS.map((preset) => {
              const active = activeRange === preset.value
              return (
                <button
                  key={preset.value}
                  type="button"
                  onClick={() => applyPreset(preset.value)}
                  className={`rounded-lg px-4 py-2 font-body text-sm font-semibold transition-colors ${active ? 'bg-editorial-terra text-white' : 'border border-editorial-border text-editorial-text hover:border-editorial-terra'}`}
                >
                  {preset.label}
                </button>
              )
            })}
          </div>
        </div>

        <form onSubmit={applyCustomRange} className="mt-4 grid grid-cols-1 md:grid-cols-[1fr_1fr_auto] gap-3">
          <label className="block">
            <span className="block mb-1 font-body text-xs uppercase tracking-widest text-editorial-text-muted">Dal</span>
            <input
              type="date"
              value={fromDate}
              onChange={(event) => setFromDate(event.target.value)}
              className="w-full rounded-lg border border-editorial-border px-3 py-2 font-body text-sm text-editorial-text outline-none focus:border-editorial-terra focus:ring-2 focus:ring-editorial-terra/10 transition-all"
            />
          </label>
          <label className="block">
            <span className="block mb-1 font-body text-xs uppercase tracking-widest text-editorial-text-muted">Al</span>
            <input
              type="date"
              value={toDate}
              onChange={(event) => setToDate(event.target.value)}
              className="w-full rounded-lg border border-editorial-border px-3 py-2 font-body text-sm text-editorial-text outline-none focus:border-editorial-terra focus:ring-2 focus:ring-editorial-terra/10 transition-all"
            />
          </label>
          <button
            type="submit"
            className="rounded-lg bg-editorial-forest px-4 py-2 font-body text-sm font-semibold text-white hover:bg-editorial-forest/90 transition-colors"
          >
            Applica range
          </button>
        </form>
      </section>
    </>
  )
}
