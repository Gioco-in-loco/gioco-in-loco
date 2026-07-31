'use client'

import Link from 'next/link'
import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useAuth } from '../../context/AuthContext'
import { useToast } from '../../context/ToastContext'
import { useCartHoldTimer } from '../../hooks/useCartHoldTimer'
import {
  clearExpiredGdrCartState,
  createEmptyGdrEventCartState,
  formatCartPrice,
  removeConfirmedMainEventReservation,
} from '../../lib/cart-ui'
import { getSlotKey } from '../../lib/event-booking'
import { DICE_FEST_BOOKING_CONFIG } from '../../lib/bookable-events'
import { ParchmentCard } from '../dice-fest/decorations'
import TableMap from '../dice-fest/TableMap'

const EMPTY_FILTERS = {
  association: '',
  game: '',
  master: '',
  onlyAvailable: false,
}

export default function DiceFestBookingPage({ event }) {
  const { user } = useAuth()
  const toast = useToast()

  const [cartState, setCartState] = useState(() => createEmptyGdrEventCartState())
  const [pendingSlotId, setPendingSlotId] = useState(null)
  const [requestError, setRequestError] = useState('')
  const [filters, setFilters] = useState(EMPTY_FILTERS)
  const [activeDay, setActiveDay] = useState('')
  const [openedEntry, setOpenedEntry] = useState(null)

  const [mainEventItems, setMainEventItems] = useState(event.mainEvents || [])
  const [pendingMainSessionKey, setPendingMainSessionKey] = useState(null)
  const [pendingWaitlistDay, setPendingWaitlistDay] = useState(null)

  const hasMainEvents = mainEventItems.length > 0

  // Synchronous lock against double-clicks: state updates are async, but rapid
  // clicks within the same tick can fire multiple handlers before React commits.
  const inFlightRef = useRef(false)
  // Block actions also during initial cart load: until /cart returns we don't
  // know which slots the user has already reserved, so any click could trigger
  // a wrong server call or mislead the user with stale UI.
  const busy = Boolean(cartState.loading || pendingSlotId || pendingMainSessionKey)

  // Sync main events when event prop changes
  useEffect(() => {
    setMainEventItems(event.mainEvents || [])
  }, [event.mainEvents])

  // Load unified event cart state
  useEffect(() => {
    let isActive = true
    const load = async () => {
      if (!user) {
        if (isActive) setCartState({ ...createEmptyGdrEventCartState(), loading: false })
        return
      }
      try {
        const response = await fetch(`${DICE_FEST_BOOKING_CONFIG.apiBasePath}/cart`, { cache: 'no-store', credentials: 'same-origin' })
        if (!response.ok) throw new Error('Impossibile caricare il registro.')
        const payload = await response.json()
        if (isActive) setCartState({ loading: false, ...payload })
      } catch {
        if (isActive) setCartState({ ...createEmptyGdrEventCartState(), loading: false })
      }
    }
    void load()
    return () => { isActive = false }
  }, [user])

  const timeRemaining = useCartHoldTimer(cartState.holdExpiresAt, () => {
    setCartState((current) => clearExpiredGdrCartState(current))
  })

  // ============ MAIN EVENT HANDLERS ============
  // Un main event non ha più un tavolo/slot fisico prenotabile: la sessione è
  // il gruppo giorno+fascia, identificato da mainEventId+day+slot.
  const mainSessionKey = useCallback((mainEventId, day, slot) => `${mainEventId}__${day}__${slot}`, [])

  const updateMainEventSessionCount = useCallback(({ mainEventId, day, slot }, delta) => {
    setMainEventItems((current) => current.map((me) => {
      if (me.id !== mainEventId) return me
      const nextSessions = (me.sessions || []).map((s) => {
        if (s.day !== day || s.slot !== slot) return s
        const next = Math.max(0, (s.currentReservations || 0) + delta)
        return { ...s, currentReservations: next, available: next < s.maxPlayers }
      })
      const nextTables = (me.tables || []).map((t) => {
        if (t.day !== day || t.slot !== slot) return t
        const next = Math.max(0, (t.currentReservations || 0) + delta)
        return { ...t, currentReservations: next, available: next < t.maxPlayers }
      })
      return { ...me, sessions: nextSessions, tables: nextTables }
    }))
  }, [])

  const handleAddOneshot = useCallback(async (slot) => {
    if (!user) {
      window.location.href = '/auth/login?next=/dice-fest/prenotazioni'
      return
    }
    if (inFlightRef.current) return
    inFlightRef.current = true
    setPendingSlotId(slot.id)
    setRequestError('')
    try {
      const response = await fetch(`${DICE_FEST_BOOKING_CONFIG.apiBasePath}/cart/slots`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify({ slotId: slot.id }),
      })
      const payload = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(payload.error || 'Impossibile prenotare il tavolo.')
      setCartState({ loading: false, ...payload })
      toast.success(`Tavolo prenotato per 10 minuti: ${slot.day} · ${slot.slot}.`)
    } catch (err) {
      const msg = err.message || 'Impossibile prenotare il tavolo.'
      setRequestError(msg)
      toast.error(msg)
    } finally {
      setPendingSlotId(null)
      inFlightRef.current = false
    }
  }, [toast, user])

  const handleRemoveOneshot = useCallback(async (slot) => {
    if (!user) return
    if (inFlightRef.current) return
    inFlightRef.current = true
    setPendingSlotId(slot.id)
    setRequestError('')
    try {
      const response = await fetch(`${DICE_FEST_BOOKING_CONFIG.apiBasePath}/cart/slots/${slot.id}`, {
        method: 'DELETE',
        credentials: 'same-origin',
      })
      const payload = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(payload.error || 'Impossibile rimuovere il tavolo.')
      setCartState({ loading: false, ...payload })
      toast.success(`Tavolo abbandonato: ${slot.day} · ${slot.slot}.`)
    } catch (err) {
      const msg = err.message || 'Impossibile rimuovere il tavolo.'
      setRequestError(msg)
      toast.error(msg)
    } finally {
      setPendingSlotId(null)
      inFlightRef.current = false
    }
  }, [toast, user])

  const handleJoinWaitlist = useCallback(async (day) => {
    if (!user) {
      window.location.href = '/auth/login?next=/dice-fest/prenotazioni'
      return
    }
    setPendingWaitlistDay(day)
    try {
      const response = await fetch(`${DICE_FEST_BOOKING_CONFIG.apiBasePath}/waitlist`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify({ day }),
      })
      const payload = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(payload.error || 'Impossibile iscriverti alla lista d\'attesa.')
      setCartState((current) => ({ ...current, waitlistDays: payload.waitlistDays || [] }))
      toast.success(`Iscritto alla lista d'attesa per ${day}.`)
    } catch (err) {
      toast.error(err.message || 'Impossibile iscriverti alla lista d\'attesa.')
    } finally {
      setPendingWaitlistDay(null)
    }
  }, [toast, user])

  const handleLeaveWaitlist = useCallback(async (day) => {
    setPendingWaitlistDay(day)
    try {
      const response = await fetch(`${DICE_FEST_BOOKING_CONFIG.apiBasePath}/waitlist`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify({ day }),
      })
      const payload = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(payload.error || 'Impossibile lasciare la lista d\'attesa.')
      setCartState((current) => ({ ...current, waitlistDays: payload.waitlistDays || [] }))
      toast.success(`Rimosso dalla lista d'attesa per ${day}.`)
    } catch (err) {
      toast.error(err.message || 'Impossibile lasciare la lista d\'attesa.')
    } finally {
      setPendingWaitlistDay(null)
    }
  }, [toast])

  const handleAddMainToCart = useCallback(async (session) => {
    if (!user) {
      window.location.href = '/auth/login?next=/dice-fest/prenotazioni'
      return
    }
    if (inFlightRef.current) return
    inFlightRef.current = true
    setPendingMainSessionKey(mainSessionKey(session.mainEventId, session.day, session.slot))
    setRequestError('')
    try {
      const response = await fetch(`${DICE_FEST_BOOKING_CONFIG.apiBasePath}/cart/main-events/slots`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify({ mainEventId: session.mainEventId, day: session.day, slot: session.slot }),
      })
      const payload = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(payload.error || 'Impossibile prenotare il posto.')
      setCartState({ loading: false, ...payload })
      updateMainEventSessionCount(session, 1)
      toast.success('Posto prenotato per 10 minuti.')
    } catch (err) {
      const msg = err.message || 'Impossibile prenotare il posto.'
      setRequestError(msg)
      toast.error(msg)
    } finally {
      setPendingMainSessionKey(null)
      inFlightRef.current = false
    }
  }, [mainSessionKey, toast, updateMainEventSessionCount, user])

  const handleRemoveMainFromCart = useCallback(async (session) => {
    if (inFlightRef.current) return
    inFlightRef.current = true
    setPendingMainSessionKey(mainSessionKey(session.mainEventId, session.day, session.slot))
    setRequestError('')
    try {
      const response = await fetch(`${DICE_FEST_BOOKING_CONFIG.apiBasePath}/cart/main-events/sessions`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify({ mainEventId: session.mainEventId, day: session.day, slot: session.slot }),
      })
      const payload = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(payload.error || 'Impossibile rimuovere il posto.')
      setCartState({ loading: false, ...payload })
      updateMainEventSessionCount(session, -1)
      toast.success('Prenotazione Main Event rimossa.')
    } catch (err) {
      const msg = err.message || 'Impossibile rimuovere il posto.'
      setRequestError(msg)
      toast.error(msg)
    } finally {
      setPendingMainSessionKey(null)
      inFlightRef.current = false
    }
  }, [mainSessionKey, toast, updateMainEventSessionCount])

  const handleCancelMain = useCallback(async (reservation) => {
    if (inFlightRef.current) return
    inFlightRef.current = true
    setPendingMainSessionKey(mainSessionKey(reservation.mainEventId, reservation.day, reservation.slot))
    try {
      const response = await fetch(`/api/main-events-reservations/${reservation.id}`, {
        method: 'DELETE',
        credentials: 'same-origin',
      })
      const payload = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(payload.error || 'Impossibile cancellare la prenotazione.')
      setCartState((current) => removeConfirmedMainEventReservation(current, reservation.id))
      updateMainEventSessionCount({ mainEventId: reservation.mainEventId, day: reservation.day, slot: reservation.slot }, -1)
      toast.success('Prenotazione cancellata.')
    } catch (err) {
      toast.error(err.message || 'Impossibile cancellare la prenotazione.')
    } finally {
      setPendingMainSessionKey(null)
      inFlightRef.current = false
    }
  }, [mainSessionKey, toast, updateMainEventSessionCount])

  const mainReservations = useMemo(
    () => (cartState.mainEventConfirmedReservations || []).filter((reservation) => reservation.eventId === event.id || !reservation.eventId),
    [cartState.mainEventConfirmedReservations, event.id]
  )

  // ============ DERIVED STATE ============
  const mainReservationsBySessionKey = useMemo(
    () => new Map(mainReservations.map((reservation) => [mainSessionKey(reservation.mainEventId, reservation.day, reservation.slot), reservation])),
    [mainReservations, mainSessionKey]
  )
  const mainReservedSlotKeys = useMemo(
    () => new Set(mainReservations.map((reservation) => getSlotKey({ day: reservation.day, slot: reservation.slot }))),
    [mainReservations]
  )
  const visibleMainEventSessionKeys = useMemo(
    () => new Set(mainEventItems.flatMap((item) => (item.sessions || []).map((session) => mainSessionKey(item.id, session.day, session.slot)))),
    [mainEventItems, mainSessionKey]
  )
  const filteredMainCartSlots = useMemo(
    () => (cartState.mainEventCartSlots || []).filter((slot) => visibleMainEventSessionKeys.has(mainSessionKey(slot.mainEventId, slot.day, slot.slot))),
    [cartState.mainEventCartSlots, visibleMainEventSessionKeys, mainSessionKey]
  )
  const mainCartSessionKeys = useMemo(
    () => new Set(cartState.mainEventCartSessionKeys || []),
    [cartState.mainEventCartSessionKeys]
  )
  const mainCartSlotKeys = useMemo(
    () => new Set(cartState.mainEventCartSlotKeys || []),
    [cartState.mainEventCartSlotKeys]
  )
  const oneshotConflictKeys = useMemo(
    () => new Set(cartState.cartSlotKeys.concat(cartState.confirmedSlotKeys)),
    [cartState.cartSlotKeys, cartState.confirmedSlotKeys]
  )

  const filterOptions = useMemo(() => ({
    associations: buildTextFilterOptions((event.oneshots || []).map((item) => item.association?.name)),
    games: buildTextFilterOptions([
      ...(event.oneshots || []).map((item) => item.game),
      ...mainEventItems.map((item) => item.game),
    ]),
    masters: buildTextFilterOptions((event.oneshots || []).map((item) => item.master)),
  }), [event.oneshots, mainEventItems])

  // Tutti i tavoli della sala, uniti in un'unica lista: la mappa mostra sempre
  // la struttura completa, i filtri attenuano invece di nascondere le celle
  // (altrimenti la griglia righe/colonne si romperebbe).
  const allEntries = useMemo(() => {
    const oneshotEntries = (event.oneshots || []).flatMap((oneshot) =>
      (oneshot.slots || []).map((slot) => ({ type: 'oneshot', oneshot, slot }))
    )
    const mainEventEntries = mainEventItems.flatMap((mainEvent) =>
      (mainEvent.tables || []).map((slot) => ({ type: 'mainEvent', mainEvent, slot }))
    )
    return [...oneshotEntries, ...mainEventEntries]
  }, [event.oneshots, mainEventItems])

  const isDimmed = useCallback((entry) => {
    const game = entry.type === 'oneshot' ? entry.oneshot.game : entry.mainEvent.game
    const association = entry.type === 'oneshot' ? entry.oneshot.association?.name : null
    const master = entry.type === 'oneshot' ? entry.oneshot.master : null

    if (filters.association && normalizeFilterValue(association) !== filters.association) return true
    if (filters.game && normalizeFilterValue(game) !== filters.game) return true
    if (filters.master && normalizeFilterValue(master) !== filters.master) return true

    if (filters.onlyAvailable && !entry.slot.available) {
      const isOwnedByUser = entry.type === 'oneshot'
        ? cartState.confirmedSlotIds.includes(entry.slot.id) || cartState.cartSlotIds.includes(entry.slot.id)
        : (() => {
            const key = mainSessionKey(entry.mainEvent.id, entry.slot.day, entry.slot.slot)
            return mainCartSessionKeys.has(key) || mainReservationsBySessionKey.has(key)
          })()
      if (!isOwnedByUser) return true
    }

    return false
  }, [filters, cartState.confirmedSlotIds, cartState.cartSlotIds, mainCartSessionKeys, mainReservationsBySessionKey, mainSessionKey])

  const matchingCount = useMemo(() => allEntries.filter((entry) => !isDimmed(entry)).length, [allEntries, isDimmed])

  const fullyBookedDays = useMemo(() => computeFullyBookedDays(event.oneshots), [event.oneshots])

  const cartItemsCount = cartState.cartSlots.length
  const mainCartItemsCount = filteredMainCartSlots.length
  const hasPendingPass = cartState.hasCartAdmission && !cartState.hasConfirmedAdmission
  const pendingOrderCount = cartItemsCount + mainCartItemsCount + (hasPendingPass ? 1 : 0)

  return (
    <div className="parchment-bg pb-24">
      <div className="mx-auto max-w-7xl px-5 py-10 md:px-8 lg:px-10">
        {/* HEADER */}
        <header className="parchment-reveal">
          <p className="fantasy-eyebrow">Il registro delle missioni</p>
          <h1 className="mt-3 font-elegant text-4xl font-bold text-editorial-text sm:text-5xl">
            La mappa dei tavoli
          </h1>
          <p className="mt-3 max-w-2xl font-body text-[15px] leading-relaxed text-editorial-text-secondary">
            {hasMainEvents ? (
              <>
                Ecco la sala: <strong className="text-editorial-text">one-shot</strong> dei nostri master e <strong className="text-editorial-text">Main Event</strong>, tavolo per tavolo.
                <br /> Tocca un tavolo per i dettagli e sigilla la scelta quando sei pronto.
              </>
            ) : (
              <>Ecco la sala: scegli il tuo tavolo tra le <strong className="text-editorial-text">one-shot</strong> dei nostri master e sigilla la scelta quando sei pronto.</>
            )}
          </p>
        </header>

        {requestError ? (
          <p className="mt-5 rounded-xl border border-red-200 bg-red-50/80 px-4 py-3 font-body text-sm text-red-700">{requestError}</p>
        ) : null}

        {cartState.loading && user ? (
          <p className="mt-5 inline-flex items-center gap-2 rounded-xl border border-editorial-gold/40 bg-editorial-gold/10 px-4 py-2.5 font-body text-sm text-editorial-text">
            <span className="inline-block h-2.5 w-2.5 animate-pulse rounded-full bg-editorial-gold" aria-hidden="true" />
            Carico le tue prenotazioni…
          </p>
        ) : null}

        <BookingFiltersPanel
          title="Filtri"
          description="Restringi per associazione, tipo di gioco o master: i tavoli che non corrispondono si attenuano, restano comunque visibili e prenotabili."
          fields={[
            { key: 'association', label: 'Associazione', placeholder: 'Tutte', options: filterOptions.associations },
            { key: 'game', label: 'Tipo di gioco', placeholder: 'Tutti', options: filterOptions.games },
            { key: 'master', label: 'Master', placeholder: 'Tutti', options: filterOptions.masters },
          ]}
          filters={filters}
          visibleCount={matchingCount}
          onChange={(field, value) => setFilters((current) => ({ ...current, [field]: value }))}
          onReset={() => setFilters(EMPTY_FILTERS)}
          toggle={{
            label: 'Solo posti disponibili',
            checked: filters.onlyAvailable,
            onChange: (checked) => setFilters((current) => ({ ...current, onlyAvailable: checked })),
          }}
        />

        {/* PANELS */}
        <div className="mt-8 grid gap-8 lg:grid-cols-[1fr_320px]">
          <main className="min-w-0">
            <div className="space-y-4">
              <WaitlistBanner
                fullyBookedDays={fullyBookedDays}
                waitlistDays={cartState.waitlistDays || []}
                pendingWaitlistDay={pendingWaitlistDay}
                onJoinWaitlist={handleJoinWaitlist}
                onLeaveWaitlist={handleLeaveWaitlist}
              />

              {allEntries.length === 0 ? (
                <ParchmentCard>
                  <div className="px-7 py-10 text-center">
                    <h2 className="font-elegant text-xl font-bold text-editorial-text">Il programma è ancora un mistero</h2>
                    <p className="mx-auto mt-2 max-w-md font-body text-sm leading-relaxed text-editorial-text-secondary">
                      I master stanno ancora forgiando le loro avventure. Tornate presto, viandanti.
                    </p>
                  </div>
                </ParchmentCard>
              ) : (
                <TableMap
                  entries={allEntries}
                  activeDay={activeDay}
                  onChangeDay={setActiveDay}
                  isDimmed={isDimmed}
                  renderCell={(entry) => {
                    if (entry.type === 'oneshot') {
                      return (
                        <OneShotMapCell
                          session={entry}
                          cartState={cartState}
                          pendingSlotId={pendingSlotId}
                          busy={busy}
                          onAdd={handleAddOneshot}
                          onRemove={handleRemoveOneshot}
                          onOpenDetails={() => setOpenedEntry(entry)}
                          isLoggedIn={Boolean(user)}
                        />
                      )
                    }
                    const key = mainSessionKey(entry.mainEvent.id, entry.slot.day, entry.slot.slot)
                    return (
                      <MainEventMapCell
                        session={entry}
                        sessionKey={key}
                        reservation={mainReservationsBySessionKey.get(key)}
                        hasReservedKey={mainReservedSlotKeys.has(getSlotKey(entry.slot))}
                        inCart={mainCartSessionKeys.has(key)}
                        hasCartKey={mainCartSlotKeys.has(getSlotKey(entry.slot))}
                        hasOneshotConflict={oneshotConflictKeys.has(getSlotKey(entry.slot))}
                        pendingSessionKey={pendingMainSessionKey}
                        busy={busy}
                        onAdd={handleAddMainToCart}
                        onRemove={handleRemoveMainFromCart}
                        onCancel={handleCancelMain}
                        onOpenDetails={() => setOpenedEntry(entry)}
                        isLoggedIn={Boolean(user)}
                      />
                    )
                  }}
                />
              )}
            </div>
          </main>

          <aside className="hidden lg:block">
            <BookingOrderSummary
              cartState={cartState}
              mainCartSlots={filteredMainCartSlots}
              timeRemaining={timeRemaining}
              isLoggedIn={Boolean(user)}
            />
          </aside>
        </div>
      </div>

      {/* MOBILE STICKY CART PILL */}
      {pendingOrderCount > 0 ? (
        <div className="fixed inset-x-0 bottom-3 z-30 flex justify-center px-4 lg:hidden">
          <Link
            href="/dice-fest/carrello"
            className="flex items-center gap-3 rounded-full bg-editorial-text px-5 py-3 font-body text-sm font-semibold text-editorial-bg shadow-2xl"
          >
            <span className="fantasy-badge fantasy-badge--gold">{pendingOrderCount}</span>
            <span>Vai alle Prenotazioni</span>
            {timeRemaining ? <span className="font-elegant text-editorial-gold">{timeRemaining}</span> : null}
          </Link>
        </div>
      ) : null}

      {openedEntry ? (
        openedEntry.type === 'oneshot' ? (
          <OneShotDetailsModal
            session={openedEntry}
            cartState={cartState}
            pendingSlotId={pendingSlotId}
            busy={busy}
            onAdd={handleAddOneshot}
            onRemove={handleRemoveOneshot}
            onClose={() => setOpenedEntry(null)}
            isLoggedIn={Boolean(user)}
          />
        ) : (() => {
          const key = mainSessionKey(openedEntry.mainEvent.id, openedEntry.slot.day, openedEntry.slot.slot)
          return (
            <MainEventDetailsModal
              session={openedEntry}
              sessionKey={key}
              reservation={mainReservationsBySessionKey.get(key)}
              hasReservedKey={mainReservedSlotKeys.has(getSlotKey(openedEntry.slot))}
              inCart={mainCartSessionKeys.has(key)}
              hasCartKey={mainCartSlotKeys.has(getSlotKey(openedEntry.slot))}
              hasOneshotConflict={oneshotConflictKeys.has(getSlotKey(openedEntry.slot))}
              pendingSessionKey={pendingMainSessionKey}
              busy={busy}
              onAdd={handleAddMainToCart}
              onRemove={handleRemoveMainFromCart}
              onCancel={handleCancelMain}
              onClose={() => setOpenedEntry(null)}
              isLoggedIn={Boolean(user)}
            />
          )
        })()
      ) : null}
    </div>
  )
}

/* ============ FILTER HELPERS ============ */

function normalizeFilterValue(value) {
  return String(value || '').trim().toLocaleLowerCase('it-IT')
}

function buildTextFilterOptions(values) {
  const unique = new Map()

  for (const value of values) {
    const label = String(value || '').trim()
    if (!label) continue

    const key = normalizeFilterValue(label)
    if (!unique.has(key)) {
      unique.set(key, { value: key, label })
    }
  }

  return Array.from(unique.values()).sort((left, right) => left.label.localeCompare(right.label, 'it'))
}

function pluralize(n, singular, plural) {
  return n === 1 ? singular : plural
}

function BookingFiltersPanel({ title, description, fields, filters, visibleCount, onChange, onReset, toggle }) {
  const hasActiveFilters = Object.values(filters).some(Boolean)

  return (
    <ParchmentCard className="mt-6">
      <div className="px-5 py-5 sm:px-6">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="fantasy-eyebrow">{title}</p>
            <p className="mt-2 font-body text-sm leading-relaxed text-editorial-text-secondary">{description}</p>
          </div>
          <div className="flex items-center gap-3">
            {toggle ? (
              <label className="flex items-center gap-2 font-body text-xs font-semibold text-editorial-text">
                <input
                  type="checkbox"
                  checked={toggle.checked}
                  onChange={(event) => toggle.onChange(event.target.checked)}
                  className="h-4 w-4 rounded border-editorial-border text-editorial-terra focus:ring-editorial-terra/30"
                />
                {toggle.label}
              </label>
            ) : null}
            <p className="font-body text-[11px] font-semibold uppercase tracking-[0.18em] text-editorial-text-muted">
              {visibleCount} {pluralize(visibleCount, 'tavolo in evidenza', 'tavoli in evidenza')}
            </p>
            <button
              type="button"
              onClick={onReset}
              disabled={!hasActiveFilters}
              className="rounded-full border border-editorial-border px-3 py-1.5 font-body text-xs font-semibold text-editorial-text transition-colors hover:border-editorial-terra disabled:cursor-not-allowed disabled:opacity-50"
            >
              Reset filtri
            </button>
          </div>
        </div>

        <div className="mt-4 grid gap-3 md:grid-cols-3">
          {fields.map((field) => (
            <label key={field.key} className="block">
              <span className="mb-1 block font-body text-[11px] font-semibold uppercase tracking-[0.16em] text-editorial-text-muted">
                {field.label}
              </span>
              <select
                value={filters[field.key] || ''}
                onChange={(event) => onChange(field.key, event.target.value)}
                className="w-full rounded-xl border border-editorial-border bg-white/80 px-3 py-2.5 font-body text-sm text-editorial-text outline-none transition-all focus:border-editorial-terra focus:ring-2 focus:ring-editorial-terra/10"
              >
                <option value="">{field.placeholder}</option>
                {field.options.map((option) => (
                  <option key={option.value} value={option.value}>{option.label}</option>
                ))}
              </select>
            </label>
          ))}
        </div>
      </div>
    </ParchmentCard>
  )
}

/* ============ WAITLIST ============ */

const DAY_ORDER = ['Lunedi', 'Lunedì', 'Martedi', 'Martedì', 'Mercoledi', 'Mercoledì', 'Giovedi', 'Giovedì', 'Venerdi', 'Venerdì', 'Sabato', 'Domenica']

function dayIndex(day) {
  const idx = DAY_ORDER.indexOf(day)
  return idx === -1 ? 999 : idx
}

function computeFullyBookedDays(oneshots) {
  const slotsByDay = new Map()
  for (const oneshot of oneshots || []) {
    for (const slot of oneshot.slots || []) {
      if (!slot.day) continue
      if (!slotsByDay.has(slot.day)) slotsByDay.set(slot.day, [])
      slotsByDay.get(slot.day).push(slot)
    }
  }

  const fullDays = []
  for (const [day, slots] of slotsByDay) {
    if (slots.length > 0 && slots.every((slot) => !slot.available)) {
      fullDays.push(day)
    }
  }
  return fullDays.sort((left, right) => dayIndex(left) - dayIndex(right))
}

function WaitlistBanner({ fullyBookedDays, waitlistDays, pendingWaitlistDay, onJoinWaitlist, onLeaveWaitlist }) {
  if (fullyBookedDays.length === 0) return null

  return (
    <div className="space-y-3">
      {fullyBookedDays.map((day) => {
        const isWaitlisted = (waitlistDays || []).includes(day)
        const isPending = pendingWaitlistDay === day

        return (
          <ParchmentCard key={day}>
            <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-4 sm:px-6">
              <div>
                <p className="fantasy-eyebrow">Tutto esaurito</p>
                <p className="mt-1 font-elegant text-base font-bold text-editorial-text">
                  Le one-shot di {day} sono al completo
                </p>
                <p className="mt-1 font-body text-xs text-editorial-text-secondary">
                  Iscriviti alla lista d&apos;attesa: ti avviseremo via email appena si libera un posto.
                </p>
              </div>
              <button
                type="button"
                onClick={() => (isWaitlisted ? onLeaveWaitlist(day) : onJoinWaitlist(day))}
                disabled={isPending}
                className={isWaitlisted ? 'btn-ghost-fantasy' : 'btn-wax'}
              >
                {isPending
                  ? 'Attendere…'
                  : isWaitlisted ? 'Lascia la lista d\'attesa' : 'Iscriviti alla lista d\'attesa'}
              </button>
            </div>
          </ParchmentCard>
        )
      })}
    </div>
  )
}

/* ============ ONE-SHOT CELL ============ */

function computeOneShotState({ slot, cartState, isLoggedIn, isPending, busy = false }) {
  const confirmed = cartState.confirmedSlotIds.includes(slot.id)
  const inCart = cartState.cartSlotIds.includes(slot.id)
  const sameSlotKey = getSlotKey(slot)
  const conflictConfirmed = cartState.confirmedSlotKeys.includes(sameSlotKey) && !confirmed
  const conflictCart = cartState.cartSlotKeys.includes(sameSlotKey) && !inCart
  const remaining = Math.max(0, slot.maxPlayers - slot.currentReservations)
  const fewLeft = remaining > 0 && remaining <= 2
  const full = !slot.available

  let label = 'Prenota'
  let verboseLabel = 'Prenota il posto'
  let actionKind = 'add'
  let disabled = false
  let variant = ''

  if (!isLoggedIn) {
    label = 'Prenota'
    verboseLabel = 'Vai al login per prenotare'
    actionKind = 'login'
  } else if (confirmed) {
    label = 'Confermata ✓'
    verboseLabel = 'Prenotazione confermata'
    disabled = true
    variant = 'confirmed'
  } else if (inCart) {
    label = isPending ? 'Libero slot…' : 'Libera slot'
    verboseLabel = isPending ? 'Libero slot…' : 'Libera lo slot'
    actionKind = 'remove'
    disabled = isPending
    variant = 'in-cart'
  } else if (full) {
    label = 'Pieno'
    verboseLabel = 'Sala piena'
    disabled = true
    variant = 'full'
  } else if (conflictConfirmed) {
    label = 'Slot occupato'
    verboseLabel = 'Hai già un\'altra prenotazione in questa fascia'
    disabled = true
  } else if (conflictCart) {
    label = 'Slot occupato'
    verboseLabel = 'Hai già un\'altra prenotazione in questa fascia'
    disabled = true
  } else {
    label = isPending ? 'Prenoto…' : 'Prenota'
    verboseLabel = isPending ? 'Prenoto…' : 'Prenota il posto'
    disabled = isPending
  }

  // Block all server-touching actions when another mutation is in flight.
  if (busy && actionKind !== 'login') {
    disabled = true
  }

  return { confirmed, inCart, full, fewLeft, remaining, label, verboseLabel, actionKind, disabled, variant }
}

function OneShotMapCell({ session, cartState, pendingSlotId, busy, onAdd, onRemove, onOpenDetails, isLoggedIn }) {
  const { oneshot, slot } = session
  const isPending = pendingSlotId === slot.id
  const state = computeOneShotState({ slot, cartState, isLoggedIn, isPending, busy })

  const handleAction = (e) => {
    e.stopPropagation()
    if (state.actionKind === 'login') {
      window.location.href = '/auth/login?next=/dice-fest/prenotazioni'
    } else if (state.actionKind === 'add') {
      onAdd(slot)
    } else if (state.actionKind === 'remove') {
      onRemove(slot)
    }
  }

  const cardVariant = state.variant === 'in-cart' ? 'slot-card--in-cart'
    : state.variant === 'confirmed' ? 'slot-card--confirmed'
      : state.variant === 'full' ? 'slot-card--full' : ''

  return (
    <div className={`slot-card ${cardVariant} flex h-full flex-col gap-2`}>
      <button
        type="button"
        onClick={onOpenDetails}
        className="flex flex-1 flex-col items-start gap-1 text-left"
        aria-label={`Dettagli: ${oneshot.title}`}
      >
        <span className="fantasy-badge fantasy-badge--terra"><SwordsIcon />{oneshot.game || 'GDR'}</span>
        <p className="font-elegant text-[13px] font-bold leading-tight text-editorial-text line-clamp-2">{oneshot.title}</p>
        <p className="font-body text-[11px] text-editorial-text-muted line-clamp-1">{oneshot.master}</p>
        {state.fewLeft && !state.confirmed && !state.inCart ? <span className="fantasy-badge fantasy-badge--terra">Ultimi</span> : null}
      </button>
      <div className="flex items-center justify-between gap-2">
        <span className="font-body text-[10px] uppercase tracking-wide text-editorial-text-muted">{state.remaining}/{slot.maxPlayers}</span>
        <button
          type="button"
          onClick={handleAction}
          disabled={state.disabled}
          className={state.actionKind === 'add' ? 'btn-slot-wax' : 'btn-slot-ghost'}
        >
          {state.label}
        </button>
      </div>
    </div>
  )
}

/* ============ MAIN EVENT CELL ============ */

function computeMainEventState({ slot, reservation, inCart, hasReservedKey, hasCartKey, isLoggedIn, isPending, busy = false }) {
  const remaining = Math.max(0, slot.maxPlayers - (slot.currentReservations || 0))
  const fewLeft = remaining > 0 && remaining <= 2
  const full = !slot.available && !reservation && !inCart
  const hasConflict = hasReservedKey && !reservation
  const hasCartConflict = hasCartKey && !inCart

  let label = 'Prenota'
  let verboseLabel = 'Prenota il posto'
  let actionKind = 'add'
  let disabled = false
  let variant = ''

  if (reservation) {
    variant = 'confirmed'
    label = isPending ? 'Cancello…' : 'Cancella'
    verboseLabel = isPending ? 'Cancellazione…' : 'Cancella la prenotazione'
    actionKind = 'cancel'
    disabled = isPending
  } else if (inCart) {
    variant = 'in-cart'
    label = isPending ? 'Cancellazione…' : 'Prenotato'
    verboseLabel = isPending ? 'Cancellazione…' : 'Cancella la prenotazione'
    actionKind = 'remove'
    disabled = isPending
  } else if (!isLoggedIn) {
    label = 'Accedi'
    verboseLabel = 'Accedi per prenotare'
    actionKind = 'login'
  } else if (full) {
    variant = 'full'
    label = 'Pieno'
    verboseLabel = 'Sala piena'
    disabled = true
  } else if (hasConflict) {
    label = 'Slot occupato'
    verboseLabel = 'Hai già un altro tavolo in questa fascia'
    disabled = true
  } else if (hasCartConflict) {
    label = 'Slot occupato'
    verboseLabel = 'Hai già un altro tavolo in questa fascia'
    disabled = true
  } else {
    label = isPending ? 'Aggiungo…' : 'Prenota'
    verboseLabel = isPending ? 'Aggiungo…' : 'Prenota il posto'
    disabled = isPending
  }

  if (busy && actionKind !== 'login') {
    disabled = true
  }

  return { remaining, fewLeft, full, hasConflict, hasCartConflict, label, verboseLabel, actionKind, disabled, variant }
}

function MainEventMapCell({ session, sessionKey, reservation, inCart, hasReservedKey, hasCartKey, hasOneshotConflict, pendingSessionKey, busy, onAdd, onRemove, onCancel, onOpenDetails, isLoggedIn }) {
  const { mainEvent, slot } = session
  const isPending = pendingSessionKey === sessionKey
  const state = computeMainEventState({ slot, reservation, inCart, hasReservedKey, hasCartKey, isLoggedIn, isPending, busy })

  const handleAction = (e) => {
    e.stopPropagation()
    if (state.actionKind === 'login') {
      window.location.href = '/auth/login?next=/dice-fest/prenotazioni'
    } else if (state.actionKind === 'add') {
      onAdd({ mainEventId: mainEvent.id, day: slot.day, slot: slot.slot })
    } else if (state.actionKind === 'remove') {
      onRemove({ mainEventId: mainEvent.id, day: slot.day, slot: slot.slot })
    } else if (state.actionKind === 'cancel') {
      onCancel(reservation)
    }
  }

  const cardVariant = state.variant === 'confirmed' ? 'slot-card--confirmed'
    : state.variant === 'in-cart' ? 'slot-card--in-cart'
      : state.variant === 'full' ? 'slot-card--full' : ''

  return (
    <div className={`slot-card ${cardVariant} flex h-full flex-col gap-2`}>
      <button
        type="button"
        onClick={onOpenDetails}
        className="flex flex-1 flex-col items-start gap-1 text-left"
        aria-label={`Dettagli: ${mainEvent.title}`}
      >
        <span className="fantasy-badge fantasy-badge--forest"><CrownIcon />Main Event</span>
        <p className="font-elegant text-[13px] font-bold leading-tight text-editorial-text line-clamp-2">{mainEvent.title}</p>
        {mainEvent.game ? <p className="font-body text-[11px] text-editorial-text-muted line-clamp-1">{mainEvent.game}</p> : null}
        {state.fewLeft && !reservation && !inCart ? <span className="fantasy-badge fantasy-badge--terra">Ultimi</span> : null}
        {!reservation && hasOneshotConflict ? (
          <span className="fantasy-badge fantasy-badge--gold" title="Hai una one-shot in questa fascia">Conflitto</span>
        ) : null}
      </button>
      <div className="flex items-center justify-between gap-2">
        <span className="font-body text-[10px] uppercase tracking-wide text-editorial-text-muted">{state.remaining}/{slot.maxPlayers}</span>
        <button
          type="button"
          onClick={handleAction}
          disabled={state.disabled}
          className={state.actionKind === 'add' ? 'btn-slot-wax' : 'btn-slot-ghost'}
        >
          {state.label}
        </button>
      </div>
    </div>
  )
}

/* ============ DETAILS MODALS ============ */

function ModalShell({ children, onClose }) {
  useEffect(() => {
    const handler = (e) => { if (e.key === 'Escape') onClose() }
    document.body.style.overflow = 'hidden'
    window.addEventListener('keydown', handler)
    return () => {
      document.body.style.overflow = ''
      window.removeEventListener('keydown', handler)
    }
  }, [onClose])

  return (
    <div
      className="fantasy-modal-backdrop"
      role="dialog"
      aria-modal="true"
      onClick={onClose}
    >
      <div className="fantasy-modal" onClick={(e) => e.stopPropagation()}>
        <button type="button" onClick={onClose} className="fantasy-modal__close" aria-label="Chiudi">
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
            <path d="M2 2 L12 12 M12 2 L2 12" />
          </svg>
        </button>
        <div className="parchment-surface">
          {children}
        </div>
      </div>
    </div>
  )
}

function OneShotDetailsModal({ session, cartState, pendingSlotId, busy, onAdd, onRemove, onClose, isLoggedIn }) {
  const { oneshot, slot } = session
  const isPending = pendingSlotId === slot.id
  const state = computeOneShotState({ slot, cartState, isLoggedIn, isPending, busy })

  const handleAction = () => {
    if (state.actionKind === 'login') {
      window.location.href = '/auth/login?next=/dice-fest/prenotazioni'
    } else if (state.actionKind === 'add') {
      onAdd(slot)
    } else if (state.actionKind === 'remove') {
      onRemove(slot)
    }
  }

  const actionClass = state.actionKind === 'add' && !state.disabled ? 'btn-wax w-full' : 'btn-ghost-fantasy w-full'

  return (
    <ModalShell onClose={onClose}>
      <div className="px-6 py-7 sm:px-8 sm:py-8">
        {oneshot.image ? (
          <img
            src={oneshot.image}
            alt=""
            className="mb-5 h-40 w-full rounded-xl border border-editorial-border object-cover sm:h-48"
          />
        ) : null}
        <p className="fantasy-eyebrow">{slot.day} · {slot.slot} · {slot.table}</p>
        <h2 className="mt-3 font-elegant text-2xl font-bold leading-tight text-editorial-text sm:text-3xl">{oneshot.title}</h2>

        <div className="mt-3 flex flex-wrap items-center gap-x-2 gap-y-1">
          <span className="fantasy-badge fantasy-badge--terra">{oneshot.game || 'Sistema GDR'}</span>
          {oneshot.association?.name ? (
            <span className="font-body text-xs text-editorial-text-muted">{oneshot.association.name}</span>
          ) : null}
        </div>

        <p className="mt-3 font-body text-sm text-editorial-text-secondary">
          Master · <span className="font-bold text-editorial-text">{oneshot.master}</span>
        </p>

        {oneshot.description ? (
          <p className="passage mt-5 text-[14px] leading-[1.7]">{oneshot.description}</p>
        ) : (
          <p className="mt-5 font-body text-sm italic text-editorial-text-muted">Nessuna descrizione disponibile.</p>
        )}

        <div className="mt-6 grid grid-cols-2 gap-3 border-t border-dashed border-editorial-border pt-5">
          <div>
            <p className="font-body text-[10px] font-bold uppercase tracking-[0.22em] text-editorial-text-muted">Posti</p>
            <p className="mt-1 font-elegant text-lg font-bold text-editorial-text">{state.remaining}/{slot.maxPlayers}</p>
          </div>
          {typeof oneshot.price === 'number' && oneshot.price > 0 ? (
            <div>
              <p className="font-body text-[10px] font-bold uppercase tracking-[0.22em] text-editorial-text-muted">Per tavolo</p>
              <p className="mt-1 font-elegant text-lg font-bold text-editorial-terra">{formatCartPrice(oneshot.price, { hideWhenMissing: true })}</p>
            </div>
          ) : null}
        </div>

        <button
          type="button"
          onClick={handleAction}
          disabled={state.disabled}
          className={`${actionClass} mt-6`}
        >
          {state.verboseLabel}
        </button>
      </div>
    </ModalShell>
  )
}

function MainEventDetailsModal({ session, sessionKey, reservation, inCart, hasReservedKey, hasCartKey, hasOneshotConflict, pendingSessionKey, busy, onAdd, onRemove, onCancel, onClose, isLoggedIn }) {
  const { mainEvent, slot } = session
  const isPending = pendingSessionKey === sessionKey
  const state = computeMainEventState({ slot, reservation, inCart, hasReservedKey, hasCartKey, isLoggedIn, isPending, busy })

  const handleAction = () => {
    if (state.actionKind === 'login') {
      window.location.href = '/auth/login?next=/dice-fest/prenotazioni'
    } else if (state.actionKind === 'add') {
      onAdd({ mainEventId: mainEvent.id, day: slot.day, slot: slot.slot })
    } else if (state.actionKind === 'remove') {
      onRemove({ mainEventId: mainEvent.id, day: slot.day, slot: slot.slot })
    } else if (state.actionKind === 'cancel') {
      onCancel(reservation)
    }
  }

  const actionClass = state.actionKind === 'add' && !state.disabled ? 'btn-wax w-full' : 'btn-ghost-fantasy w-full'

  return (
    <ModalShell onClose={onClose}>
      <div className="px-6 py-7 sm:px-8 sm:py-8">
        {mainEvent.image ? (
          <img
            src={mainEvent.image}
            alt=""
            className="mb-5 h-40 w-full rounded-xl border border-editorial-border object-cover sm:h-48"
          />
        ) : null}
        <p className="fantasy-eyebrow">{slot.day} · {slot.slot}</p>
        <h2 className="mt-3 font-elegant text-2xl font-bold leading-tight text-editorial-text sm:text-3xl">{mainEvent.title}</h2>

        <div className="mt-3 flex flex-wrap items-center gap-x-2 gap-y-1">
          <span className="fantasy-badge fantasy-badge--forest">Main Event</span>
          {mainEvent.game ? <span className="font-body text-xs text-editorial-text-muted">{mainEvent.game}</span> : null}
        </div>

        {mainEvent.description ? (
          <p className="passage mt-5 text-[14px] leading-[1.7]">{mainEvent.description}</p>
        ) : (
          <p className="mt-5 font-body text-sm italic text-editorial-text-muted">Nessuna descrizione disponibile.</p>
        )}

        {hasOneshotConflict && !reservation ? (
          <p className="mt-4 rounded-lg border border-editorial-gold/40 bg-editorial-gold/10 px-3 py-2 font-body text-xs leading-relaxed text-editorial-text">
            Attenzione: hai una one-shot nello stesso giorno e fascia oraria.
          </p>
        ) : null}

        {!reservation ? (
          <p className="mt-4 rounded-lg border border-editorial-forest/20 bg-editorial-forest/5 px-3 py-2 font-body text-xs leading-relaxed text-editorial-text">
            Questo tavolo entra nello stesso ordine del DICE FEST e si conferma insieme alle eventuali one-shot nello stesso checkout finale.
          </p>
        ) : null}

        <div className="mt-6 grid grid-cols-2 gap-3 border-t border-dashed border-editorial-border pt-5">
          <div>
            <p className="font-body text-[10px] font-bold uppercase tracking-[0.22em] text-editorial-text-muted">Posti</p>
            <p className="mt-1 font-elegant text-lg font-bold text-editorial-text">{state.remaining}/{slot.maxPlayers}</p>
          </div>
          {typeof mainEvent.price === 'number' && mainEvent.price > 0 ? (
            <div>
              <p className="font-body text-[10px] font-bold uppercase tracking-[0.22em] text-editorial-text-muted">Per tavolo</p>
              <p className="mt-1 font-elegant text-lg font-bold text-editorial-forest">{formatCartPrice(mainEvent.price, { hideWhenMissing: true })}</p>
            </div>
          ) : null}
        </div>

        <button
          type="button"
          onClick={handleAction}
          disabled={state.disabled}
          className={`${actionClass} mt-6`}
        >
          {state.verboseLabel}
        </button>
      </div>
    </ModalShell>
  )
}

/* ============ ORDER SUMMARY ============ */

const BookingOrderSummary = memo(function BookingOrderSummary({ cartState, mainCartSlots, timeRemaining, isLoggedIn }) {
  const lowTime = timeRemaining && timeRemaining < '01:00'

  if (!isLoggedIn) {
    return (
      <ParchmentCard className="lg:sticky lg:top-24">
        <div className="px-6 py-6 text-center">
          <h3 className="font-elegant text-lg font-bold text-editorial-text">Le tue prenotazioni</h3>
          <p className="mt-2 font-body text-sm leading-relaxed text-editorial-text-secondary">
            Accedi per prenotare il tuo posto al tavolo.
          </p>
          <Link href="/auth/login?next=/dice-fest/prenotazioni" className="btn-wax mt-5 w-full">
            Accedi
          </Link>
        </div>
      </ParchmentCard>
    )
  }

  const cartAdmissions = cartState.cartAdmissions || []
  const entries = [
    ...cartAdmissions.map((admission) => ({
      key: `pass-${admission.day || 'evento'}`,
      badge: 'Pass',
      badgeClass: 'fantasy-badge fantasy-badge--gold',
      title: 'Pass giornaliero DICE FEST',
      subtitle: admission.day || 'Ingresso completo evento',
      price: admission.price ?? 0,
    })),
    ...mainCartSlots.map((slot) => ({
      key: `main-${slot.mainEventId}-${slot.day}-${slot.slot}`,
      badge: 'Main Event',
      badgeClass: 'fantasy-badge fantasy-badge--forest',
      title: slot.mainEventTitle,
      subtitle: `${slot.day} · ${slot.slot}`,
      price: slot.price ?? 0,
    })),
    ...cartState.cartSlots.map((slot) => ({
      key: `oneshot-${slot.id}`,
      badge: 'One-shot',
      badgeClass: 'fantasy-badge fantasy-badge--gold',
      title: slot.oneshotTitle,
      subtitle: `${slot.day} · ${slot.slot}`,
      price: slot.price ?? 0,
    })),
  ]

  const grandTotal = entries.reduce((sum, entry) => sum + (entry.price ?? 0), 0)
  const hasPendingItems = entries.length > 0

  return (
    <ParchmentCard className="lg:sticky lg:top-24">
      <div className="px-6 py-6">
        <div className="flex items-center justify-between gap-3">
          <h3 className="font-elegant text-lg font-bold text-editorial-text">Le tue prenotazioni</h3>
          {timeRemaining ? (
            <span className={`font-elegant text-base font-bold ${lowTime ? 'text-editorial-terra clock-pulse' : 'text-editorial-gold'}`}>
              {timeRemaining}
            </span>
          ) : null}
        </div>

        {!hasPendingItems ? (
          <p className="mt-4 font-body text-sm leading-relaxed text-editorial-text-secondary">
            Nessuna prenotazione aggiunta.
          </p>
        ) : (
          <ul className="mt-4 space-y-3">
            {entries.map((entry) => (
              <li key={entry.key} className="rounded-lg border border-editorial-border bg-white/60 px-3 py-2">
                <div className="flex items-start justify-between gap-3">
                  <span className={entry.badgeClass}>{entry.badge}</span>
                  <p className="shrink-0 font-body text-xs font-semibold text-editorial-terra">{formatCartPrice(entry.price, { hideWhenMissing: true })}</p>
                </div>
                <p className="mt-2 font-elegant text-sm font-bold text-editorial-text line-clamp-1">{entry.title}</p>
                <p className="mt-0.5 font-body text-xs text-editorial-text-secondary">{entry.subtitle}</p>
              </li>
            ))}
          </ul>
        )}

        {hasPendingItems ? (
          <div className="mt-5 flex items-center justify-between border-t border-dashed border-editorial-border pt-4">
            <span className="font-body text-xs uppercase tracking-[0.18em] text-editorial-text-muted">Totale</span>
            <span className="font-elegant text-2xl font-bold text-editorial-gold">{formatCartPrice(grandTotal)}</span>
          </div>
        ) : null}

        <Link href="/dice-fest/carrello" className="btn-wax mt-5 w-full">
          Vai alle Prenotazioni
        </Link>

        <p className="mt-3 text-center font-body text-[11px] leading-relaxed text-editorial-text-muted">
          Le prenotazioni scadono in 10 minuti dall&apos;ultima aggiunta.
        </p>
      </div>
    </ParchmentCard>
  )
})

/* ============ ICONS ============ */

function SwordsIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M14 14L21 21M3 3l7 7M14 10l7-7v4M10 14l-7 7v-4M16 16l4 4M4 4l4 4" />
    </svg>
  )
}

function CrownIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M3 8l4 5 5-8 5 8 4-5v11H3z" />
      <path d="M3 19h18" />
    </svg>
  )
}
