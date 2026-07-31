'use client'

import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'
import { useAuth } from '../../context/AuthContext'
import { useToast } from '../../context/ToastContext'

function CheckIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M3 8.5l3 3 7-7" />
    </svg>
  )
}

function HandRaisedIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M8 11V5.5a1.5 1.5 0 0 1 3 0V11" />
      <path d="M11 11V4a1.5 1.5 0 0 1 3 0v7" />
      <path d="M14 11V5.5a1.5 1.5 0 0 1 3 0V13" />
      <path d="M17 8a1.5 1.5 0 0 1 3 0v8a6 6 0 0 1-6 6h-2a6 6 0 0 1-5.3-3.2L4 14.5a1.6 1.6 0 0 1 2.7-1.7L8 14.5V8" />
    </svg>
  )
}

const DAY_ORDER = ['Lunedi', 'Lunedì', 'Martedi', 'Martedì', 'Mercoledi', 'Mercoledì', 'Giovedi', 'Giovedì', 'Venerdi', 'Venerdì', 'Sabato', 'Domenica']

function dayIndex(day) {
  const idx = DAY_ORDER.indexOf(day)
  return idx === -1 ? 999 : idx
}

function getDistinctDays(oneshots) {
  const days = new Set()
  for (const oneshot of oneshots || []) {
    for (const slot of oneshot.slots || []) {
      if (slot.day) days.add(slot.day)
    }
  }
  return Array.from(days).sort((left, right) => dayIndex(left) - dayIndex(right))
}

function mapCartPayload(payload) {
  return {
    loading: false,
    hasConfirmedAdmission: Boolean(payload.hasConfirmedAdmission),
    hasCartAdmission: Boolean(payload.hasCartAdmission),
    confirmedAdmissionDays: payload.confirmedAdmissionDays || [],
    cartAdmissionDays: payload.cartAdmissionDays || [],
    hasActiveSessions:
      (payload.confirmedSlotIds?.length || 0) > 0
      || (payload.cartSlotIds?.length || 0) > 0
      || (payload.mainEventConfirmedSessionKeys?.length || 0) > 0
      || (payload.mainEventCartSessionKeys?.length || 0) > 0,
  }
}

const EMPTY_STATE = {
  loading: false,
  hasConfirmedAdmission: false,
  hasCartAdmission: false,
  confirmedAdmissionDays: [],
  cartAdmissionDays: [],
  hasActiveSessions: false,
}

export default function RsvpButton({ oneshots }) {
  const { user, isLoading: isAuthLoading } = useAuth()
  const toast = useToast()

  const days = useMemo(() => getDistinctDays(oneshots), [oneshots])
  const isMultiDay = days.length > 1

  const [state, setState] = useState({ ...EMPTY_STATE, loading: true })
  const [pendingDay, setPendingDay] = useState(null)

  useEffect(() => {
    let isActive = true
    const load = async () => {
      if (!user) {
        if (isActive) setState({ ...EMPTY_STATE, loading: false })
        return
      }
      try {
        const response = await fetch('/api/dice-fest/cart', { cache: 'no-store', credentials: 'same-origin' })
        if (!response.ok) throw new Error()
        const payload = await response.json()
        if (isActive) setState(mapCartPayload(payload))
      } catch {
        if (isActive) setState({ ...EMPTY_STATE, loading: false })
      }
    }
    void load()
    return () => { isActive = false }
  }, [user])

  const handleRsvp = async (day) => {
    if (!user) {
      window.location.href = '/auth/login?next=/dice-fest'
      return
    }
    setPendingDay(day)
    try {
      const response = await fetch('/api/dice-fest/admission', {
        method: 'POST',
        credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ day }),
      })
      const payload = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(payload.error || 'Impossibile confermare la tua presenza.')
      setState(mapCartPayload(payload))
      toast.success(day ? `Presenza confermata per ${day}.` : 'Presenza confermata.')
    } catch (err) {
      toast.error(err.message || 'Impossibile confermare la tua presenza.')
    } finally {
      setPendingDay(null)
    }
  }

  const handleCancel = async (day) => {
    if (!user) return
    if (state.hasActiveSessions) {
      toast.error('Hai sessioni prenotate. Cancellale prima di annullare la presenza.')
      return
    }
    setPendingDay(day)
    try {
      const response = await fetch('/api/dice-fest/admission', {
        method: 'DELETE',
        credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ day }),
      })
      const payload = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(payload.error || 'Impossibile annullare la presenza.')
      setState(mapCartPayload(payload))
      toast.success('Presenza annullata.')
    } catch (err) {
      toast.error(err.message || 'Impossibile annullare la presenza.')
    } finally {
      setPendingDay(null)
    }
  }

  if (isAuthLoading || state.loading) {
    return (
      <div className="inline-flex items-center gap-2 rounded-full border border-editorial-border bg-white/60 px-4 py-2.5 font-elegant text-sm font-semibold text-editorial-text-muted">
        <span className="inline-block h-3 w-3 animate-pulse rounded-full bg-editorial-gold" />
        Carico…
      </div>
    )
  }

  const registerLink = state.hasActiveSessions ? (
    <Link
      href="/dice-fest/prenotazioni"
      className="inline-flex items-center rounded-full border border-editorial-border bg-white/70 px-4 py-2.5 font-elegant text-sm font-bold text-editorial-text transition hover:border-editorial-gold/60 hover:bg-editorial-gold/10"
    >
      Guarda il registro delle missioni
    </Link>
  ) : null

  // Single-day events (or events without GDR days configured yet) keep the
  // original single-button UI with day="" (the legacy "whole event" pass).
  if (!isMultiDay) {
    const isPending = pendingDay === ''

    if (state.hasConfirmedAdmission) {
      return (
        <div className="inline-flex flex-wrap items-center gap-2">
          <span className="inline-flex items-center gap-2 rounded-full border border-editorial-forest/50 bg-editorial-forest/10 px-4 py-2.5 font-elegant text-sm font-bold text-editorial-forest">
            <CheckIcon />
            Ci sarai
          </span>
          {registerLink}
          {!state.hasActiveSessions ? (
            <button
              type="button"
              onClick={() => handleCancel('')}
              disabled={isPending}
              className="font-body text-xs font-semibold uppercase tracking-[0.18em] text-editorial-text-muted underline-offset-2 hover:text-editorial-terra hover:underline disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isPending ? 'Annullo…' : 'Annulla'}
            </button>
          ) : null}
        </div>
      )
    }

    if (state.hasCartAdmission) {
      return (
        <div className="inline-flex flex-wrap items-center gap-2">
          <Link
            href="/dice-fest/carrello"
            className="inline-flex items-center gap-2 rounded-full border border-editorial-gold/60 bg-editorial-gold/10 px-4 py-2.5 font-elegant text-sm font-bold text-editorial-text transition hover:bg-editorial-gold/20"
          >
            <HandRaisedIcon />
            Pass da confermare
          </Link>
          {registerLink}
          {!state.hasActiveSessions ? (
            <button
              type="button"
              onClick={() => handleCancel('')}
              disabled={isPending}
              className="font-body text-xs font-semibold uppercase tracking-[0.18em] text-editorial-text-muted underline-offset-2 hover:text-editorial-terra hover:underline disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isPending ? 'Annullo…' : 'Annulla'}
            </button>
          ) : null}
        </div>
      )
    }

    return (
      <button
        type="button"
        onClick={() => handleRsvp('')}
        disabled={isPending}
        className="inline-flex items-center gap-2 rounded-full border-2 border-dashed border-editorial-gold/70 bg-editorial-gold/10 px-5 py-2.5 font-elegant text-sm font-bold text-editorial-text transition-all hover:border-solid hover:bg-editorial-gold/20 hover:shadow-[0_4px_12px_-4px_rgba(201,162,39,0.6)] disabled:cursor-not-allowed disabled:opacity-60"
      >
        <HandRaisedIcon />
        {isPending ? 'Aggiungo…' : 'Dicci che sarai'}
      </button>
    )
  }

  // Multi-day events: one row per day, each independently toggleable.
  return (
    <div className="inline-flex flex-col items-stretch gap-2">
      {days.map((day) => {
        const isPending = pendingDay === day
        const isConfirmed = state.confirmedAdmissionDays.includes(day)
        const isInCart = state.cartAdmissionDays.includes(day)

        if (isConfirmed) {
          return (
            <div key={day} className="inline-flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-2 rounded-full border border-editorial-forest/50 bg-editorial-forest/10 px-4 py-2 font-elegant text-sm font-bold text-editorial-forest">
                <CheckIcon />
                Ci sarai · {day}
              </span>
              {!state.hasActiveSessions ? (
                <button
                  type="button"
                  onClick={() => handleCancel(day)}
                  disabled={isPending}
                  className="font-body text-xs font-semibold uppercase tracking-[0.18em] text-editorial-text-muted underline-offset-2 hover:text-editorial-terra hover:underline disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {isPending ? 'Annullo…' : 'Annulla'}
                </button>
              ) : null}
            </div>
          )
        }

        if (isInCart) {
          return (
            <div key={day} className="inline-flex flex-wrap items-center gap-2">
              <Link
                href="/dice-fest/carrello"
                className="inline-flex items-center gap-2 rounded-full border border-editorial-gold/60 bg-editorial-gold/10 px-4 py-2 font-elegant text-sm font-bold text-editorial-text transition hover:bg-editorial-gold/20"
              >
                <HandRaisedIcon />
                {day} · da confermare
              </Link>
              {!state.hasActiveSessions ? (
                <button
                  type="button"
                  onClick={() => handleCancel(day)}
                  disabled={isPending}
                  className="font-body text-xs font-semibold uppercase tracking-[0.18em] text-editorial-text-muted underline-offset-2 hover:text-editorial-terra hover:underline disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {isPending ? 'Annullo…' : 'Annulla'}
                </button>
              ) : null}
            </div>
          )
        }

        return (
          <button
            key={day}
            type="button"
            onClick={() => handleRsvp(day)}
            disabled={isPending}
            className="inline-flex items-center gap-2 rounded-full border-2 border-dashed border-editorial-gold/70 bg-editorial-gold/10 px-4 py-2 font-elegant text-sm font-bold text-editorial-text transition-all hover:border-solid hover:bg-editorial-gold/20 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <HandRaisedIcon />
            {isPending ? 'Aggiungo…' : `Dicci che sarai · ${day}`}
          </button>
        )
      })}
      {registerLink}
    </div>
  )
}
