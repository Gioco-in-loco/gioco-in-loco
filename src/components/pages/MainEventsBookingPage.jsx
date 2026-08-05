'use client'

import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'
import { useAuth } from '../../context/AuthContext'
import { useToast } from '../../context/ToastContext'
import { useCartHoldTimer } from '../../hooks/useCartHoldTimer'
import {
  createEmptyMainEventCartState,
  formatCartPrice,
} from '../../lib/cart-ui'
import { getSlotKey } from '../../lib/event-booking'
import CompanionInviteFields from '../booking/CompanionInviteFields'

function getEventLabel(mainEvent) {
  return mainEvent.eventName || 'Evento non specificato'
}

function sessionKey({ mainEventId, eventId, day, slot }) {
  return `${mainEventId}__${eventId}__${day}__${slot}`
}

export default function MainEventsBookingPage({ mainEvents }) {
  const { user, isLoading } = useAuth()
  const toast = useToast()
  const [items, setItems] = useState(mainEvents)
  const [requestState, setRequestState] = useState({ loading: false, error: '', success: '' })
  const [reservationsState, setReservationsState] = useState({ loading: true, reservations: [] })
  const [cartState, setCartState] = useState(() => createEmptyMainEventCartState())
  const [pendingSessionKey, setPendingSessionKey] = useState(null)
  const [expandedCompanionKey, setExpandedCompanionKey] = useState(null)
  const [companionsBySessionKey, setCompanionsBySessionKey] = useState({})

  useEffect(() => {
    setItems(mainEvents)
  }, [mainEvents])

  useEffect(() => {
    let isActive = true

    const loadReservations = async () => {
      if (!user) {
        if (isActive) {
          setReservationsState({ loading: false, reservations: [] })
        }
        return
      }

      try {
        const response = await fetch('/api/main-events-reservations', {
          cache: 'no-store',
          credentials: 'same-origin',
        })

        const payload = await response.json().catch(() => ({}))

        if (!response.ok) {
          throw new Error(payload.error || 'Impossibile caricare le prenotazioni main event.')
        }

        if (isActive) {
          setReservationsState({ loading: false, reservations: payload.reservations || [] })
        }
      } catch {
        if (isActive) {
          setReservationsState({ loading: false, reservations: [] })
        }
      }
    }

    void loadReservations()

    return () => {
      isActive = false
    }
  }, [user])

  useEffect(() => {
    let isActive = true

    const loadCart = async () => {
      if (!user) {
        if (isActive) {
          setCartState({ ...createEmptyMainEventCartState(), loading: false })
        }
        return
      }

      try {
        const response = await fetch('/api/main-events/cart', {
          cache: 'no-store',
          credentials: 'same-origin',
        })

        const payload = await response.json().catch(() => ({}))

        if (!response.ok) {
          throw new Error(payload.error || 'Impossibile caricare le prenotazioni del Main Event.')
        }

        if (isActive) {
          setCartState({ loading: false, ...payload })
        }
      } catch {
        if (isActive) {
          setCartState({ ...createEmptyMainEventCartState(), loading: false })
        }
      }
    }

    void loadCart()

    return () => {
      isActive = false
    }
  }, [user])

  const timeRemaining = useCartHoldTimer(cartState.holdExpiresAt, () => {
    window.location.reload()
  })

  const reservationsBySessionKey = useMemo(() => {
    return new Map(reservationsState.reservations.map((reservation) => [sessionKey(reservation), reservation]))
  }, [reservationsState.reservations])

  const reservedSlotKeys = useMemo(() => {
    return new Set(
      reservationsState.reservations.map((reservation) => getSlotKey({ day: reservation.day, slot: reservation.slot }))
    )
  }, [reservationsState.reservations])

  const cartSessionKeys = useMemo(() => new Set(cartState.cartSessionKeys || []), [cartState.cartSessionKeys])
  const cartSlotKeys = useMemo(() => new Set(cartState.cartSlotKeys || []), [cartState.cartSlotKeys])
  const cartCount = cartState.cartSlots?.length || 0
  const isUserStateLoading = Boolean(user) && (reservationsState.loading || cartState.loading)

  const updateSessionAvailability = (session, delta) => {
    setItems((current) => current.map((mainEvent) => {
      if (mainEvent.id !== session.mainEventId || mainEvent.eventId !== session.eventId) return mainEvent

      return {
        ...mainEvent,
        sessions: mainEvent.sessions.map((item) => {
          if (item.day !== session.day || item.slot !== session.slot) return item

          const currentReservations = Math.max(0, (item.currentReservations || 0) + delta)

          return {
            ...item,
            currentReservations,
            available: currentReservations < item.maxPlayers,
          }
        }),
      }
    }))
  }

  const handleAddToCart = async (mainEvent, session) => {
    if (!user) {
      window.location.href = '/auth/login'
      return
    }

    const fullSession = { mainEventId: mainEvent.id, eventId: mainEvent.eventId, day: session.day, slot: session.slot }
    const key = sessionKey(fullSession)
    const companions = (companionsBySessionKey[key] || []).filter((c) => c.firstName.trim() && c.lastName.trim() && c.email.trim())
    setPendingSessionKey(key)
    setRequestState({ loading: true, error: '', success: '' })

    try {
      const response = await fetch('/api/main-events/cart/slots', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify({ ...fullSession, companions }),
      })

      const payload = await response.json().catch(() => ({}))

      if (!response.ok) {
          throw new Error(payload.error || 'Impossibile aggiungere questa sessione.')
      }

      setCartState({ loading: false, ...payload })
      updateSessionAvailability(fullSession, 1)
      setCompanionsBySessionKey((current) => { const next = { ...current }; delete next[key]; return next })
      setExpandedCompanionKey(null)
      setRequestState({ loading: false, error: '', success: `Sessione aggiunta per ${session.day} ${session.slot}.` })
      toast.success('Sessione aggiunta.')
    } catch (error) {
      const message = error.message || 'Impossibile aggiungere questa sessione.'
      setRequestState({ loading: false, error: message, success: '' })
      toast.error(message)
    } finally {
      setPendingSessionKey(null)
    }
  }

  const handleRemoveFromCart = async (mainEvent, session) => {
    const fullSession = { mainEventId: mainEvent.id, eventId: mainEvent.eventId, day: session.day, slot: session.slot }
    setPendingSessionKey(sessionKey(fullSession))
    setRequestState({ loading: true, error: '', success: '' })

    try {
      const response = await fetch('/api/main-events/cart/sessions', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify(fullSession),
      })

      const payload = await response.json().catch(() => ({}))

      if (!response.ok) {
        throw new Error(payload.error || 'Impossibile rimuovere la sessione.')
      }

      setCartState({ loading: false, ...payload })
      updateSessionAvailability(fullSession, -1)
      setRequestState({ loading: false, error: '', success: 'Sessione rimossa.' })
      toast.success('Sessione rimossa.')
    } catch (error) {
      const message = error.message || 'Impossibile rimuovere la sessione.'
      setRequestState({ loading: false, error: message, success: '' })
      toast.error(message)
    } finally {
      setPendingSessionKey(null)
    }
  }

  const handleCancel = async (reservation) => {
    setPendingSessionKey(sessionKey(reservation))
    setRequestState({ loading: true, error: '', success: '' })

    try {
      const response = await fetch(`/api/main-events-reservations/${reservation.id}`, {
        method: 'DELETE',
        credentials: 'same-origin',
      })

      const payload = await response.json().catch(() => ({}))

      if (!response.ok) {
        throw new Error(payload.error || 'Impossibile cancellare la prenotazione.')
      }

      setReservationsState((current) => ({
        loading: false,
        reservations: current.reservations.filter((currentReservation) => currentReservation.id !== reservation.id),
      }))
      updateSessionAvailability(reservation, -1)
      setRequestState({ loading: false, error: '', success: 'Prenotazione cancellata.' })
      toast.success('Prenotazione cancellata.')
    } catch (error) {
      const message = error.message || 'Impossibile cancellare la prenotazione.'
      setRequestState({ loading: false, error: message, success: '' })
      toast.error(message)
    } finally {
      setPendingSessionKey(null)
    }
  }

  return (
    <div className="px-6 py-12 md:px-10 lg:px-16">
      <div className="mx-auto max-w-7xl space-y-8">
        <section className="rounded-2xl border border-editorial-border bg-white p-8 shadow-soft">
          <p className="font-body text-xs font-semibold uppercase tracking-widest text-editorial-terra">Prenotazioni</p>
          <h1 className="mt-2 font-elegant text-4xl font-bold text-editorial-text">Main event</h1>
          <p className="mt-3 max-w-3xl font-body text-sm leading-relaxed text-editorial-text-secondary">
            Qui puoi consultare tutti i main event pubblicati, aggiungere le sessioni e confermare tutto dalla pagina Prenotazioni dedicata.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link href="/dice-fest/carrello" className="inline-flex items-center justify-center rounded-lg bg-editorial-terra px-5 py-3 font-body text-sm font-semibold text-white transition-colors hover:bg-editorial-terra/90">
              Conferma ordine{cartCount > 0 ? ` (${cartCount})` : ''}
            </Link>
            <Link href="/account" className="inline-flex items-center justify-center rounded-lg border border-editorial-border px-5 py-3 font-body text-sm font-semibold text-editorial-text transition-colors hover:border-editorial-terra">
              Vai all&apos;area utente
            </Link>
            {!user && !isLoading ? (
              <Link href="/auth/login" className="inline-flex items-center justify-center rounded-lg border border-editorial-border px-5 py-3 font-body text-sm font-semibold text-editorial-text transition-colors hover:border-editorial-terra">
                Accedi per prenotare
              </Link>
            ) : null}
            {timeRemaining ? (
              <span className="inline-flex items-center rounded-lg border border-editorial-border bg-editorial-bg/60 px-4 py-3 font-body text-sm font-semibold text-editorial-text">
                Prenotazione valida per: {timeRemaining} minuti.
              </span>
            ) : null}
          </div>
        </section>

        {requestState.error ? <p className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 font-body text-sm text-red-600">{requestState.error}</p> : null}
        {requestState.success ? <p className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 font-body text-sm text-emerald-700">{requestState.success}</p> : null}

        {items.length === 0 ? (
          <section className="rounded-2xl border border-editorial-border bg-white p-8 shadow-soft">
            <h2 className="font-elegant text-2xl font-bold text-editorial-text">Nessun main event disponibile</h2>
            <p className="mt-3 font-body text-sm text-editorial-text-secondary">
              Non ci sono ancora main event pubblicati per la prenotazione.
            </p>
          </section>
        ) : (
          <section className="space-y-5">
            <div>
              <p className="font-body text-xs font-semibold uppercase tracking-widest text-editorial-terra">Programma prenotabile</p>
              <h2 className="mt-1 font-elegant text-3xl font-bold text-editorial-text">Scegli la tua sessione</h2>
            </div>

            {items.map((mainEvent) => (
              <article key={`${mainEvent.id}-${mainEvent.eventId}`} className="rounded-2xl border border-editorial-border bg-white p-6 shadow-soft">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <div className="flex gap-4">
                    {mainEvent.image ? (
                      <img
                        src={mainEvent.image}
                        alt=""
                        className="h-20 w-20 shrink-0 rounded-xl border border-editorial-border object-cover"
                      />
                    ) : null}
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="font-body text-xs uppercase tracking-widest text-editorial-terra">{getEventLabel(mainEvent)}</p>
                      </div>
                      <h3 className="mt-2 font-elegant text-2xl font-bold text-editorial-text">{mainEvent.title}</h3>
                      {mainEvent.game ? <p className="mt-1 font-body text-sm text-editorial-text-secondary">{mainEvent.game}</p> : null}
                      {mainEvent.description ? (
                        <p className="mt-4 max-w-3xl font-body text-sm leading-relaxed text-editorial-text-secondary">{mainEvent.description}</p>
                      ) : null}
                    </div>
                  </div>
                  <div className="rounded-xl border border-editorial-border bg-editorial-bg/60 px-4 py-3">
                    <p className="font-body text-xs uppercase tracking-widest text-editorial-text-muted mb-1">Prezzo</p>
                    <p className="font-body text-sm font-semibold text-editorial-text">{formatCartPrice(mainEvent.price)}</p>
                  </div>
                </div>

                <div className="mt-5 grid gap-3 md:grid-cols-2">
                  {mainEvent.sessions.map((session) => {
                    const key = sessionKey({ mainEventId: mainEvent.id, eventId: mainEvent.eventId, day: session.day, slot: session.slot })
                    const reservation = reservationsBySessionKey.get(key)
                    const inCart = cartSessionKeys.has(key)
                    const hasConfirmedConflict = reservedSlotKeys.has(getSlotKey(session)) && !reservation
                    const hasCartConflict = cartSlotKeys.has(getSlotKey(session)) && !inCart
                    const hasConflict = hasConfirmedConflict || hasCartConflict
                    const isPending = pendingSessionKey === key
                    const notYetOpen = session.bookable === false && !reservation && !inCart
                    const disabled = requestState.loading || isPending || isUserStateLoading || notYetOpen || (!session.available && !reservation && !inCart)
                    const remainingSeats = Math.max(0, session.maxPlayers - (session.currentReservations || 0))
                    const canInviteCompanions = !reservation && !inCart && !notYetOpen && remainingSeats > 1
                    const isCompanionPanelOpen = expandedCompanionKey === key

                    return (
                      <div key={key} className="rounded-xl border border-editorial-border bg-editorial-bg/40 p-4">
                        <div className="flex items-start justify-between gap-4">
                          <div>
                            <p className="font-body text-sm font-semibold text-editorial-text">{session.day} · {session.slot}</p>
                            <p className="mt-1 font-body text-xs text-editorial-text-muted">
                              Posti: {Math.max(0, session.maxPlayers - (session.currentReservations || 0))} / {session.maxPlayers}
                            </p>
                          </div>

                          {reservation ? (
                            <button
                              type="button"
                              onClick={() => handleCancel(reservation)}
                              disabled={disabled}
                              className="rounded-lg border border-red-200 px-4 py-2 font-body text-sm font-semibold text-red-600 transition-colors hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-60"
                            >
                              {isPending ? 'Annullamento...' : 'Cancella'}
                            </button>
                          ) : inCart ? (
                            <button
                              type="button"
                              onClick={() => handleRemoveFromCart(mainEvent, session)}
                              disabled={disabled}
                              className="rounded-lg border border-editorial-border px-4 py-2 font-body text-sm font-semibold text-editorial-text transition-colors hover:border-editorial-terra disabled:cursor-not-allowed disabled:opacity-60"
                            >
                              {isPending ? 'Rimozione...' : 'Rimuovi'}
                            </button>
                          ) : (
                            <button
                              type="button"
                              onClick={() => handleAddToCart(mainEvent, session)}
                              disabled={disabled || hasConflict}
                              className={[
                                'rounded-lg px-4 py-2 font-body text-sm font-semibold transition-colors',
                                disabled || hasConflict
                                  ? 'bg-editorial-border text-editorial-text-muted cursor-not-allowed'
                                  : 'border border-editorial-border text-editorial-text hover:border-editorial-terra',
                              ].join(' ')}
                            >
                              {isPending
                                ? 'Aggiornamento...'
                                : isUserStateLoading
                                  ? 'Verifica...'
                                  : notYetOpen
                                    ? 'Prenotazioni non ancora aperte'
                                    : hasConflict
                                      ? 'Hai già una sessione in orario'
                                      : !session.available
                                        ? 'Al completo'
                                        : 'Aggiungi'}
                            </button>
                          )}
                        </div>

                        {reservation ? (
                          <p className="mt-3 font-body text-xs font-semibold uppercase tracking-widest text-emerald-700">
                            Prenotazione attiva
                          </p>
                        ) : inCart ? (
                          <p className="mt-3 font-body text-xs font-semibold uppercase tracking-widest text-editorial-terra">
                            Prenotato
                          </p>
                        ) : null}

                        {canInviteCompanions ? (
                          <button
                            type="button"
                            onClick={() => setExpandedCompanionKey(isCompanionPanelOpen ? null : key)}
                            className="mt-3 font-body text-xs font-semibold text-editorial-terra hover:underline"
                          >
                            {isCompanionPanelOpen ? 'Nascondi invito amici' : '+ Invita amici'}
                          </button>
                        ) : null}

                        {canInviteCompanions && isCompanionPanelOpen ? (
                          <CompanionInviteFields
                            companions={companionsBySessionKey[key] || []}
                            onChange={(next) => setCompanionsBySessionKey((current) => ({ ...current, [key]: next }))}
                            maxCount={remainingSeats - 1}
                            className="mt-3"
                          />
                        ) : null}
                      </div>
                    )
                  })}
                </div>
              </article>
            ))}
          </section>
        )}
      </div>
    </div>
  )
}
