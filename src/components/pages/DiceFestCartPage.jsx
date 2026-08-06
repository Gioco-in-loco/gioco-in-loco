'use client'

import Link from 'next/link'
import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useAuth } from '../../context/AuthContext'
import { useToast } from '../../context/ToastContext'
import { useCartHoldTimer } from '../../hooks/useCartHoldTimer'
import {
  createEmptyGdrEventCartState,
  formatCartPrice,
  removeConfirmedMainEventReservation,
} from '../../lib/cart-ui'
import { DICE_FEST_BOOKING_CONFIG } from '../../lib/bookable-events'
import { ParchmentCard, SigilDivider, WaxSeal } from '../dice-fest/decorations'

export default function DiceFestCartPage({ event }) {
  const { user, isLoading } = useAuth()
  const toast = useToast()
  const [cartState, setCartState] = useState(() => createEmptyGdrEventCartState())
  const [requestState, setRequestState] = useState({ loading: false, error: '' })
  const [justConfirmed, setJustConfirmed] = useState(false)

  const [pendingMainResId, setPendingMainResId] = useState(null)

  // Synchronous lock against double-clicks (state updates are async)
  const inFlightRef = useRef(false)
  // Also block during initial cart load to avoid acting on a stale empty state.
  const busy = cartState.loading || requestState.loading || pendingMainResId !== null

  const loadCart = useCallback(async () => {
    if (!user) {
      setCartState({ ...createEmptyGdrEventCartState(), loading: false })
      return
    }
    try {
      const response = await fetch(`${DICE_FEST_BOOKING_CONFIG.apiBasePath}/cart`, { cache: 'no-store', credentials: 'same-origin' })
      if (!response.ok) throw new Error('Impossibile caricare le tue Prenotazioni.')
      const payload = await response.json()
      setCartState({ loading: false, ...payload })
    } catch (err) {
      setCartState({ ...createEmptyGdrEventCartState(), loading: false })
      setRequestState({ loading: false, error: err.message || 'Impossibile caricare le tue Prenotazioni.' })
    }
  }, [user])

  useEffect(() => {
    void loadCart()
  }, [loadCart])

  const timeRemaining = useCartHoldTimer(cartState.holdExpiresAt, () => {
    void loadCart()
  })

  const filteredMainCartSlots = useMemo(() => cartState.mainEventCartSlots || [], [cartState.mainEventCartSlots])

  const companions = useMemo(() => [
    ...(cartState.companionCartSlots || []).map((companion) => ({ ...companion, type: 'oneshot' })),
    ...(cartState.mainEventCompanionCartSlots || []).map((companion) => ({ ...companion, type: 'main-event' })),
  ], [cartState.companionCartSlots, cartState.mainEventCompanionCartSlots])

  const cartAdmissions = cartState.cartAdmissions || []

  const total = useMemo(() => {
    const sessionsTotal = cartState.cartSlots.reduce((sum, slot) => sum + (slot.price ?? 0), 0)
    const mainEventsTotal = (cartState.mainEventCartSlots || []).reduce((sum, slot) => sum + (slot.price ?? 0), 0)
    const passTotal = cartAdmissions.reduce((sum, admission) => sum + (admission.price ?? 0), 0)
    return sessionsTotal + mainEventsTotal + passTotal
  }, [cartState.cartSlots, cartState.mainEventCartSlots, cartAdmissions])

  const summaryRows = useMemo(() => {
    const rows = []

    for (const admission of cartAdmissions) {
      rows.push({
        key: `pass-${admission.day || 'evento'}`,
        label: 'Pass giornaliero',
        meta: admission.day || 'Ingresso completo evento',
        value: formatCartPrice(admission.price),
      })
    }

    for (const slot of filteredMainCartSlots) {
      rows.push({
        key: `main-event-${slot.mainEventId}-${slot.day}-${slot.slot}`,
        label: slot.mainEventTitle
          ? `Evento principale · ${slot.mainEventTitle}`
          : 'Evento principale',
        meta: `${slot.day} · ${slot.slot}`,
        value: formatCartPrice(slot.price),
      })
    }

    const oneshotGroups = new Map()
    for (const slot of cartState.cartSlots) {
      const price = slot.price ?? 0
      const key = String(price)
      const current = oneshotGroups.get(key) || { count: 0, total: 0, unitPrice: price }
      current.count += 1
      current.total += price
      oneshotGroups.set(key, current)
    }

    const sortedGroups = Array.from(oneshotGroups.values()).sort((left, right) => left.unitPrice - right.unitPrice)
    for (const group of sortedGroups) {
      const isFree = Number(group.unitPrice) <= 0
      rows.push({
        key: `oneshot-${group.unitPrice}`,
        label: isFree
          ? `One-shot libera x${group.count}`
          : `One-shot ${formatCartPrice(group.unitPrice)} x${group.count}`,
        value: formatCartPrice(group.total),
      })
    }

    return rows
  }, [cartState.cartSlots, cartAdmissions, filteredMainCartSlots])

  const handleRemove = useCallback(async (slotId, slotLabel) => {
    if (inFlightRef.current) return
    inFlightRef.current = true
    setRequestState({ loading: true, error: '' })
    try {
      const response = await fetch(`${DICE_FEST_BOOKING_CONFIG.apiBasePath}/cart/slots/${slotId}`, {
        method: 'DELETE',
        credentials: 'same-origin',
      })
      const payload = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(payload.error || 'Impossibile rimuovere il tavolo.')
      setCartState({ loading: false, ...payload })
      setRequestState({ loading: false, error: '' })
      toast.success(`Tavolo abbandonato: ${slotLabel}.`)
    } catch (err) {
      const msg = err.message || 'Impossibile rimuovere il tavolo.'
      setRequestState({ loading: false, error: msg })
      toast.error(msg)
    } finally {
      inFlightRef.current = false
    }
  }, [toast])

  const handleRemoveMainFromCart = useCallback(async (session, slotLabel) => {
    if (inFlightRef.current) return
    inFlightRef.current = true
    setRequestState({ loading: true, error: '' })
    try {
      const response = await fetch(`${DICE_FEST_BOOKING_CONFIG.apiBasePath}/cart/main-events/sessions`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify({ mainEventId: session.mainEventId, day: session.day, slot: session.slot }),
      })
      const payload = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(payload.error || 'Impossibile rimuovere il posto principale.')
      setCartState({ loading: false, ...payload })
      setRequestState({ loading: false, error: '' })
      toast.success(`Posto principale abbandonato: ${slotLabel}.`)
    } catch (err) {
      const msg = err.message || 'Impossibile rimuovere il posto principale.'
      setRequestState({ loading: false, error: msg })
      toast.error(msg)
    } finally {
      inFlightRef.current = false
    }
  }, [toast])

  const handleRemoveCompanion = useCallback(async (companion) => {
    if (inFlightRef.current) return
    inFlightRef.current = true
    setRequestState({ loading: true, error: '' })
    try {
      const path = companion.type === 'main-event'
        ? `${DICE_FEST_BOOKING_CONFIG.apiBasePath}/cart/main-events/companions/${companion.reservationId}`
        : `${DICE_FEST_BOOKING_CONFIG.apiBasePath}/cart/companions/${companion.reservationId}`
      const response = await fetch(path, { method: 'DELETE', credentials: 'same-origin' })
      const payload = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(payload.error || 'Impossibile ritirare l\'invito.')
      setCartState({ loading: false, ...payload })
      setRequestState({ loading: false, error: '' })
      toast.success(`Invito ritirato: ${companion.name}.`)
    } catch (err) {
      const msg = err.message || 'Impossibile ritirare l\'invito.'
      setRequestState({ loading: false, error: msg })
      toast.error(msg)
    } finally {
      inFlightRef.current = false
    }
  }, [toast])

  const handleConfirm = useCallback(async () => {
    if (inFlightRef.current) return
    inFlightRef.current = true
    setRequestState({ loading: true, error: '' })
    try {
      const response = await fetch(`${DICE_FEST_BOOKING_CONFIG.apiBasePath}/cart/confirm`, {
        method: 'POST',
        credentials: 'same-origin',
      })
      const payload = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(payload.error || 'Impossibile confermare la prenotazione.')
      setCartState({ loading: false, ...payload })
      setRequestState({ loading: false, error: '' })
      setJustConfirmed(true)
      toast.success('Prepara i dadi! Le tue prenotazioni sono confermate, ci vediamo tavolo!')
    } catch (err) {
      const msg = err.message || 'Impossibile confermare la prenotazione.'
      setRequestState({ loading: false, error: msg })
      toast.error(msg)
      await loadCart()
    } finally {
      inFlightRef.current = false
    }
  }, [loadCart, toast])

  const handleClearCart = useCallback(async () => {
    if (inFlightRef.current) return
    const shouldClear = window.confirm('Vuoi svuotare le Prenotazioni correnti? I tavoli bloccati e l\'eventuale pass in attesa verranno rimossi.')
    if (!shouldClear) return

    inFlightRef.current = true
    setRequestState({ loading: true, error: '' })
    try {
      const response = await fetch(`${DICE_FEST_BOOKING_CONFIG.apiBasePath}/cart`, {
        method: 'DELETE',
        credentials: 'same-origin',
      })
      const payload = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(payload.error || 'Impossibile svuotare le Prenotazioni.')
      setCartState({ loading: false, ...payload })
      setRequestState({ loading: false, error: '' })
      toast.success('Prenotazioni correnti svuotate.')
    } catch (err) {
      const msg = err.message || 'Impossibile svuotare le Prenotazioni.'
      setRequestState({ loading: false, error: msg })
      toast.error(msg)
    } finally {
      inFlightRef.current = false
    }
  }, [toast])

  const handleCancelMain = useCallback(async (reservation) => {
    if (inFlightRef.current) return
    inFlightRef.current = true
    setPendingMainResId(reservation.id)
    try {
      const response = await fetch(`/api/main-events-reservations/${reservation.id}`, {
        method: 'DELETE',
        credentials: 'same-origin',
      })
      const payload = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(payload.error || 'Impossibile cancellare la prenotazione.')
      setCartState((current) => removeConfirmedMainEventReservation(current, reservation.id))
      toast.success('Prenotazione Main Event cancellata.')
    } catch (err) {
      toast.error(err.message || 'Impossibile cancellare la prenotazione.')
    } finally {
      setPendingMainResId(null)
      inFlightRef.current = false
    }
  }, [toast])

  // NOT LOGGED IN
  if (!user && !isLoading) {
    return (
      <div className="dicefest-bg">
        <div className="mx-auto max-w-3xl px-5 py-16 md:px-8">
          <ParchmentCard>
            <div className="px-7 py-10 text-center sm:px-10 sm:py-12">
              <div className="mx-auto wax-stamp" style={{ width: 'fit-content' }}>
                <WaxSeal size={80} label="DF" />
              </div>
              <h1 className="mt-6 font-df-display text-3xl uppercase text-dicefest-paper sm:text-4xl">
                Solo i nomi in prenotazione
              </h1>
              <p className="mx-auto mt-3 max-w-md font-df-body text-[15px] leading-relaxed text-dicefest-paper/75">
                Le tue Prenotazioni sono personali e le prenotazioni durano 10 minuti. Accedi per vedere i tavoli che hai bloccato e confermare la tua prenotazione.
              </p>
              <div className="mt-7 flex flex-wrap justify-center gap-3">
                <Link href="/auth/login?next=/dice-fest/carrello" className="dicefest-btn-primary">Accedi</Link>
              </div>
            </div>
          </ParchmentCard>
        </div>
      </div>
    )
  }

  const lowTime = timeRemaining && timeRemaining < '01:00'
  const hasPendingPassOnly = cartState.hasCartAdmission && cartState.cartSlots.length === 0 && filteredMainCartSlots.length === 0
  const isEmpty = !cartState.loading && cartState.cartSlots.length === 0 && filteredMainCartSlots.length === 0 && !cartState.hasCartAdmission
  const canClearCart = cartState.hasCartAdmission || cartState.cartSlots.length > 0 || filteredMainCartSlots.length > 0
  const filteredMainReservations = useMemo(
    () => (cartState.mainEventConfirmedReservations || []).filter((reservation) => reservation.eventId === event.id || !reservation.eventId),
    [cartState.mainEventConfirmedReservations, event.id]
  )

  return (
    <div className="dicefest-bg pb-16">
      <div className="mx-auto max-w-5xl px-5 py-10 md:px-8 lg:px-10">
        {/* HEADER */}
        <header className="fade-stagger flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="dicefest-eyebrow">Conferma Prenotazioni</p>
            <h1 className="mt-3 font-df-display text-4xl uppercase text-dicefest-paper sm:text-5xl">
              Le tue Prenotazioni
            </h1>
            <p className="mt-3 max-w-xl font-df-body text-[15px] leading-relaxed text-dicefest-paper/75">
              I tavoli che hai prenotato rimangono bloccati per dieci minuti. Confermali per renderli definitivi.
            </p>
          </div>
          {timeRemaining && !justConfirmed ? (
            <div className="flex flex-col items-start gap-1 lg:items-end">
              <p className="font-df-mono text-[10px] font-bold uppercase tracking-[0.22em] text-dicefest-paper/50">Tempo rimasto</p>
              <p className={`font-df-display text-5xl tabular-nums ${lowTime ? 'text-dicefest-pink clock-pulse' : 'text-dicefest-green'}`}>
                {timeRemaining}
              </p>
            </div>
          ) : null}
        </header>

        {requestState.error ? (
          <p className="mt-6 border border-red-500/40 bg-red-500/10 px-4 py-3 font-df-body text-sm text-red-300">{requestState.error}</p>
        ) : null}

        {/* CONFIRMED STATE */}
        {justConfirmed ? (
          <ParchmentCard className="mt-8 dicefest-surface--accent">
            <div className="px-7 py-10 text-center sm:px-10 sm:py-14">
              <div className="mx-auto wax-stamp" style={{ width: 'fit-content' }}>
                <WaxSeal size={112} label="✓" />
              </div>
              <h2 className="mt-6 font-df-display text-3xl uppercase text-dicefest-paper sm:text-4xl">
                Prepara i Dadi!
              </h2>
              <p className="mx-auto mt-3 max-w-md font-df-body text-[15px] leading-relaxed text-dicefest-paper/75">
                Le tue prenotazioni sono confermate. Ci vediamo al tavolo.
              </p>
              <div className="mt-7 flex flex-wrap justify-center gap-3">
                <Link href="/account" className="dicefest-btn-primary">Vedi le tue prenotazioni</Link>
                <Link href="/dice-fest" className="dicefest-btn-secondary">Torna all&apos;evento</Link>
              </div>
            </div>
          </ParchmentCard>
        ) : null}

        {/* EMPTY STATE */}
        {!justConfirmed && cartState.loading ? (
          <ParchmentCard className="mt-8">
            <div className="px-7 py-10">
              <p className="font-df-body text-sm text-dicefest-paper/75">Apertura della prenotazione in corso…</p>
            </div>
          </ParchmentCard>
        ) : null}

        {!justConfirmed && isEmpty ? (
          <ParchmentCard className="mt-8">
            <div className="px-7 py-12 text-center sm:px-10">
              <h2 className="font-df-display text-2xl uppercase text-dicefest-paper">Nessuna sessione prenotata</h2>
              <p className="mx-auto mt-3 max-w-md font-df-body text-[15px] leading-relaxed text-dicefest-paper/75">
                Torna alle sessioni e scegli a cosa giocare!
              </p>
              <Link href="/dice-fest/sessioni" className="dicefest-btn-primary mt-7">
                Vai alle sessioni
              </Link>
            </div>
          </ParchmentCard>
        ) : null}

        {/* CART CONTENT */}
        {!justConfirmed && !isEmpty && !cartState.loading ? (
          <PendingOrderLayout
            event={event}
            cartState={cartState}
            filteredMainCartSlots={filteredMainCartSlots}
            companions={companions}
            summaryRows={summaryRows}
            total={total}
            busy={busy}
            canClearCart={canClearCart}
            isSubmitting={requestState.loading}
            onRemove={handleRemove}
            onRemoveMainFromCart={handleRemoveMainFromCart}
            onRemoveCompanion={handleRemoveCompanion}
            onConfirm={handleConfirm}
            onClearCart={handleClearCart}
          />
        ) : null}

        {/* MAIN EVENT RESERVATIONS */}
        <ConfirmedMainReservationsSection
          reservations={filteredMainReservations}
          busy={busy}
          pendingMainResId={pendingMainResId}
          onCancelMain={handleCancelMain}
        />
      </div>
    </div>
  )
}

const PendingOrderLayout = memo(function PendingOrderLayout({
  event,
  cartState,
  filteredMainCartSlots,
  companions,
  summaryRows,
  total,
  busy,
  canClearCart,
  isSubmitting,
  onRemove,
  onRemoveMainFromCart,
  onRemoveCompanion,
  onConfirm,
  onClearCart,
}) {
  return (
    <div className="mt-8 grid gap-7 lg:grid-cols-[1.4fr_1fr]">
      <section className="space-y-5">
        <ParchmentCard>
          <div className="px-6 py-5 sm:px-7">
            <p className="dicefest-eyebrow">Pass d&apos;ingresso</p>
            {(cartState.cartAdmissions || []).length > 0 ? (
              <>
                <ul className="mt-3 space-y-2">
                  {cartState.cartAdmissions.map((admission) => (
                    <li key={admission.day || 'evento'} className="flex items-start justify-between gap-3">
                      <p className="font-df-display text-base uppercase text-dicefest-paper">
                        Ingresso · {admission.day || 'Evento completo'}
                      </p>
                      <p className="shrink-0 font-df-display text-base text-dicefest-pink">{formatCartPrice(admission.price)}</p>
                    </li>
                  ))}
                </ul>
                <p className="mt-2 font-df-body text-sm text-dicefest-paper/75">
                  Bloccato insieme a one-shot e Main Event per 10 minuti.
                </p>
              </>
            ) : (
              <p className="mt-4 font-df-body text-sm leading-relaxed text-dicefest-paper/75">
                {cartState.hasConfirmedAdmission
                  ? 'Sei già in possesso dell\'ingresso.'
                  : 'Nessun pass nelle Prenotazioni.'}
              </p>
            )}
          </div>
        </ParchmentCard>

        {filteredMainCartSlots.length > 0 ? (
          <ParchmentCard>
            <div className="px-6 py-5 sm:px-7">
              <p className="dicefest-eyebrow">Evento principale nelle tue Prenotazioni</p>
              <ul className="mt-4 space-y-3">
                {filteredMainCartSlots.map((slot) => (
                  <li key={`${slot.mainEventId}-${slot.day}-${slot.slot}`} className="dicefest-slot-card dicefest-slot-card--in-cart">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <span className="dicefest-badge dicefest-badge--green">Main Event</span>
                        <p className="mt-2 font-df-display text-base text-dicefest-paper">{slot.mainEventTitle}</p>
                        <p className="mt-1 font-df-body text-sm text-dicefest-paper/75">
                          {slot.day} · {slot.slot}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-df-display text-base text-dicefest-pink">{formatCartPrice(slot.price)}</p>
                        <button
                          type="button"
                          onClick={() => onRemoveMainFromCart({ mainEventId: slot.mainEventId, day: slot.day, slot: slot.slot }, `${slot.day} ${slot.slot}`)}
                          disabled={busy}
                          className="mt-2 font-df-mono text-xs font-semibold uppercase tracking-widest text-dicefest-paper/50 underline-offset-2 hover:text-dicefest-pink hover:underline disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          Lascia il posto
                        </button>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          </ParchmentCard>
        ) : null}

        <ParchmentCard>
          <div className="px-6 py-5 sm:px-7">
            <p className="dicefest-eyebrow">One-shot prenotate</p>
            {cartState.cartSlots.length === 0 ? (
              <p className="mt-4 font-df-body text-sm leading-relaxed text-dicefest-paper/75">
                Nessuna one-shot nelle Prenotazioni.
              </p>
            ) : (
              <ul className="mt-4 space-y-3">
                {cartState.cartSlots.map((slot) => (
                  <li key={slot.id} className="dicefest-slot-card dicefest-slot-card--in-cart">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="font-df-display text-base text-dicefest-paper">{slot.oneshotTitle}</p>
                        <p className="mt-1 font-df-body text-sm text-dicefest-paper/75">
                          {slot.day} · {slot.slot} · {slot.table}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-df-display text-base text-dicefest-pink">{formatCartPrice(slot.price)}</p>
                        <button
                          type="button"
                          onClick={() => onRemove(slot.id, `${slot.day} ${slot.slot}`)}
                          disabled={busy}
                          className="mt-2 font-df-mono text-xs font-semibold uppercase tracking-widest text-dicefest-paper/50 underline-offset-2 hover:text-dicefest-pink hover:underline disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          Cancella prenotazione
                        </button>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </ParchmentCard>

        {companions.length > 0 ? (
          <ParchmentCard>
            <div className="px-6 py-5 sm:px-7">
              <p className="dicefest-eyebrow">Amici che stai invitando</p>
              <p className="mt-2 font-df-body text-sm leading-relaxed text-dicefest-paper/75">
                Riceveranno un&apos;email per registrarsi e confermare il loro posto: include anche il pass giornaliero per quel giorno, gratuito. Se ci ripensi, puoi ritirare l&apos;invito prima di confermare le Prenotazioni.
              </p>
              <ul className="mt-4 space-y-3">
                {companions.map((companion) => (
                  <li key={companion.reservationId} className="dicefest-slot-card dicefest-slot-card--in-cart">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="font-df-display text-base text-dicefest-paper">{companion.name}</p>
                        <p className="mt-1 font-df-body text-sm text-dicefest-paper/75">{companion.email}</p>
                        <p className="mt-1 font-df-body text-xs text-dicefest-paper/50">
                          {companion.type === 'main-event'
                            ? `Main Event · ${companion.mainEventTitle} · ${companion.day} · ${companion.slot}`
                            : `${companion.oneshotTitle} · ${companion.day} · ${companion.slot} · ${companion.table}`}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => onRemoveCompanion(companion)}
                        disabled={busy}
                        className="shrink-0 font-df-mono text-xs font-semibold uppercase tracking-widest text-dicefest-paper/50 underline-offset-2 hover:text-dicefest-pink hover:underline disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        Annulla invito
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          </ParchmentCard>
        ) : null}
      </section>

      <aside className="lg:sticky lg:top-24 lg:self-start">
        <ParchmentCard className="dicefest-surface--accent">
          <div className="px-6 py-6 sm:px-7">
            <p className="dicefest-eyebrow">Riepilogo</p>
            <h2 className="mt-3 font-df-display text-2xl uppercase text-dicefest-paper">Conferma le tue prenotazioni</h2>
            <p className="mt-2 font-df-body text-sm leading-relaxed text-dicefest-paper/75">
              Finché il timer è attivo, tutte le scelte selezionate sono bloccate ma non confermate. Alla conferma diventano definitive.
            </p>

            <div className="mt-5 space-y-2 border-t border-dashed border-dicefest-border pt-4">
              {summaryRows.map((row) => (
                <Row key={row.key} label={row.label} meta={row.meta} value={row.value} />
              ))}
            </div>
            <div className="mt-4 flex items-end justify-between border-t border-dicefest-border pt-4">
              <span className="font-df-mono text-xs uppercase tracking-[0.18em] text-dicefest-paper/50">Totale</span>
              <span className="font-df-display text-3xl text-dicefest-green">{formatCartPrice(total)}</span>
            </div>

            <button
              type="button"
              onClick={onConfirm}
              disabled={busy || (!cartState.hasCartAdmission && cartState.cartSlots.length === 0 && filteredMainCartSlots.length === 0)}
              className="dicefest-btn-primary mt-6 w-full"
            >
              {isSubmitting ? 'Conferma in corso…' : 'Conferma Prenotazioni'}
            </button>

            <button
              type="button"
              onClick={onClearCart}
              disabled={busy || !canClearCart}
              className="mt-3 w-full border border-dicefest-pink/40 bg-dicefest-surface-2 px-4 py-2.5 font-df-display text-sm uppercase text-dicefest-pink transition hover:bg-dicefest-pink/10 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Svuota l'ordine
            </button>

            <p className="mt-3 text-center font-df-body text-[11px] leading-relaxed text-dicefest-paper/50">
              Se il tempo scade, il blocco decade e tutte le scelte vengono annullate.
            </p>
          </div>
        </ParchmentCard>
      </aside>
    </div>
  )
})

const ConfirmedMainReservationsSection = memo(function ConfirmedMainReservationsSection({ reservations, busy, pendingMainResId, onCancelMain }) {
  if (reservations.length === 0) {
    return null
  }

  return (
    <>
      <SigilDivider className="my-12" />
      <section>
        <p className="dicefest-eyebrow">Evento Principale</p>
        <h2 className="mt-3 font-df-display text-2xl uppercase text-dicefest-paper sm:text-3xl">Le tue prenotazioni Main Event</h2>
        <p className="mt-2 max-w-2xl font-df-body text-sm leading-relaxed text-dicefest-paper/75">
          Le prenotazioni del Main Event sono già confermate. Da qui puoi cancellarle se non potrai più partecipare.
        </p>
        <ul className="mt-6 grid gap-4 sm:grid-cols-2">
          {reservations.map((reservation) => (
            <li key={reservation.id}>
              <div className="dicefest-slot-card dicefest-slot-card--confirmed">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <span className="dicefest-badge dicefest-badge--green">Main Event</span>
                    <p className="mt-2 font-df-display text-base text-dicefest-paper">{reservation.mainEventTitle}</p>
                    <p className="mt-1 font-df-body text-sm text-dicefest-paper/75">
                      {reservation.day} · {reservation.slot}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => onCancelMain(reservation)}
                  disabled={busy}
                  className="mt-3 w-full inline-flex items-center justify-center border border-dicefest-pink/40 bg-dicefest-surface-2 px-4 py-2 font-df-display text-sm uppercase text-dicefest-pink transition hover:bg-dicefest-pink/10 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {pendingMainResId === reservation.id ? 'Cancello…' : 'Cancella prenotazione'}
                </button>
              </div>
            </li>
          ))}
        </ul>
      </section>
    </>
  )
})

function Row({ label, meta, value }) {
  return (
    <div className="flex items-start justify-between gap-3">
      <div className="min-w-0">
        <p className="font-df-body text-sm text-dicefest-paper/75">{label}</p>
        {meta ? (
          <p className="mt-0.5 font-df-body text-[11px] leading-relaxed text-dicefest-paper/50">{meta}</p>
        ) : null}
      </div>
      <span className="shrink-0 font-df-display text-base text-dicefest-paper">{value}</span>
    </div>
  )
}
