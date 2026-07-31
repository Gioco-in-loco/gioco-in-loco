'use client'

import Link from 'next/link'
import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
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

const EMPTY_ONESHOT_FILTERS = {
  association: '',
  game: '',
  master: '',
  slot: '',
  onlyAvailable: false,
}

const EMPTY_MAIN_EVENT_FILTERS = {
  game: '',
  slot: '',
}

export default function DiceFestBookingPage({ event }) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const { user } = useAuth()
  const toast = useToast()

  const [cartState, setCartState] = useState(() => createEmptyGdrEventCartState())
  const [pendingSlotId, setPendingSlotId] = useState(null)
  const [requestError, setRequestError] = useState('')
  const [oneShotFilters, setOneShotFilters] = useState(EMPTY_ONESHOT_FILTERS)
  const [mainEventFilters, setMainEventFilters] = useState(EMPTY_MAIN_EVENT_FILTERS)

  const [mainEventItems, setMainEventItems] = useState(event.mainEvents || [])
  const [pendingMainSessionKey, setPendingMainSessionKey] = useState(null)

  const hasMainEvents = mainEventItems.length > 0
  const activeTab = searchParams.get('tab') === 'main-event' && hasMainEvents ? 'main-event' : 'one-shots'

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

  const setActiveTab = useCallback((tab) => {
    const params = new URLSearchParams(searchParams.toString())
    if (tab === 'main-event') params.set('tab', 'main-event')
    else params.delete('tab')
    const query = params.toString()
    router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false })
  }, [pathname, router, searchParams])

  // ============ MAIN EVENT HANDLERS ============
  // Un main event non ha più un tavolo/slot fisico prenotabile: la sessione è
  // il gruppo giorno+fascia, identificato da mainEventId+day+slot.
  const mainSessionKey = useCallback((mainEventId, day, slot) => `${mainEventId}__${day}__${slot}`, [])

  const updateMainEventSessionCount = useCallback(({ mainEventId, day, slot }, delta) => {
    setMainEventItems((current) => current.map((me) => {
      if (me.id !== mainEventId) return me
      return {
        ...me,
        sessions: (me.sessions || []).map((s) => {
          if (s.day !== day || s.slot !== slot) return s
          const next = Math.max(0, (s.currentReservations || 0) + delta)
          return { ...s, currentReservations: next, available: next < s.maxPlayers }
        }),
      }
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

  const [pendingWaitlistDay, setPendingWaitlistDay] = useState(null)

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
      window.location.href = '/auth/login?next=/dice-fest/prenotazioni?tab=main-event'
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
  const oneShotFilterOptions = useMemo(() => ({
    associations: buildTextFilterOptions((event.oneshots || []).map((item) => item.association?.name)),
    games: buildTextFilterOptions((event.oneshots || []).map((item) => item.game)),
    masters: buildTextFilterOptions((event.oneshots || []).map((item) => item.master)),
    slots: buildSlotFilterOptions(event.oneshots || []),
  }), [event.oneshots])
  const mainEventFilterOptions = useMemo(() => ({
    games: buildTextFilterOptions(mainEventItems.map((item) => item.game)),
    slots: buildSlotFilterOptions(mainEventItems, 'sessions'),
  }), [mainEventItems])
  const filteredOneShots = useMemo(() => {
    return (event.oneshots || [])
      .filter((item) => {
        return (!oneShotFilters.association || normalizeFilterValue(item.association?.name) === oneShotFilters.association)
          && (!oneShotFilters.game || normalizeFilterValue(item.game) === oneShotFilters.game)
          && (!oneShotFilters.master || normalizeFilterValue(item.master) === oneShotFilters.master)
      })
      .map((item) => ({
        ...item,
        slots: (item.slots || []).filter((slot) => {
          if (oneShotFilters.slot && getTimeSlotFilterValue(slot) !== oneShotFilters.slot) return false
          if (oneShotFilters.onlyAvailable && !slot.available
            && !cartState.confirmedSlotIds.includes(slot.id)
            && !cartState.cartSlotIds.includes(slot.id)) return false
          return true
        }),
      }))
      .filter((item) => (item.slots || []).length > 0)
  }, [event.oneshots, oneShotFilters, cartState.confirmedSlotIds, cartState.cartSlotIds])
  const filteredMainEventItems = useMemo(() => {
    return mainEventItems
      .filter((item) => {
        return !mainEventFilters.game || normalizeFilterValue(item.game) === mainEventFilters.game
      })
      .map((item) => ({
        ...item,
        sessions: (item.sessions || []).filter((session) => !mainEventFilters.slot || getTimeSlotFilterValue(session) === mainEventFilters.slot),
      }))
      .filter((item) => (item.sessions || []).length > 0)
  }, [mainEventFilters, mainEventItems])
  const oneShotGroups = useMemo(() => groupByTimeSlot(filteredOneShots, 'oneshot'), [filteredOneShots])
  const mainEventGroups = useMemo(() => groupByTimeSlot(filteredMainEventItems, 'mainEvent', 'sessions'), [filteredMainEventItems])
  const visibleOneShotCount = useMemo(() => countGroupedSessions(oneShotGroups), [oneShotGroups])
  const visibleMainEventCount = useMemo(() => countGroupedSessions(mainEventGroups), [mainEventGroups])
  const hasActiveOneShotFilters = useMemo(() => Object.values(oneShotFilters).some(Boolean), [oneShotFilters])
  const hasActiveMainEventFilters = useMemo(() => Object.values(mainEventFilters).some(Boolean), [mainEventFilters])

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
            Scegli la tua missione
          </h1>
          <p className="mt-3 max-w-2xl font-body text-[15px] leading-relaxed text-editorial-text-secondary">
            {hasMainEvents ? (
              <>
                Due strade: un <strong className="text-editorial-text">evento principale</strong>, oppure <strong className="text-editorial-text">one-shot</strong> dei nostri master.
                <br/> Scegli la missione che preferisci e sigilla la tua scelta quando sei pronto.
              </>
            ) : (
              <>Scegli tra le <strong className="text-editorial-text">one-shot</strong> dei nostri master e sigilla la tua scelta quando sei pronto.</>
            )}
          </p>
        </header>

        {/* TABS */}
        {hasMainEvents ? (
        <div className="mt-8 flex w-full max-w-lg" role="tablist" aria-label="Scegli cosa prenotare">
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'one-shots'}
            className="tab-fantasy"
            onClick={() => setActiveTab('one-shots')}
          >
            <SwordsIcon />
            One-Shot
            {cartItemsCount > 0 ? (
              <span className="fantasy-badge fantasy-badge--gold ml-1">{cartItemsCount}</span>
            ) : null}
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'main-event'}
            className="tab-fantasy"
            onClick={() => setActiveTab('main-event')}
          >
            <CrownIcon />
            Main Event
            {mainCartItemsCount > 0 ? (
              <span className="fantasy-badge fantasy-badge--gold ml-1">{mainCartItemsCount}</span>
            ) : mainReservations.length > 0 ? (
              <span className="fantasy-badge fantasy-badge--forest ml-1">{mainReservations.length}</span>
            ) : null}
          </button>
        </div>
        ) : null}

        {requestError ? (
          <p className="mt-5 rounded-xl border border-red-200 bg-red-50/80 px-4 py-3 font-body text-sm text-red-700">{requestError}</p>
        ) : null}

        {cartState.loading && user ? (
          <p className="mt-5 inline-flex items-center gap-2 rounded-xl border border-editorial-gold/40 bg-editorial-gold/10 px-4 py-2.5 font-body text-sm text-editorial-text">
            <span className="inline-block h-2.5 w-2.5 animate-pulse rounded-full bg-editorial-gold" aria-hidden="true" />
            Carico le tue prenotazioni…
          </p>
        ) : null}

        {activeTab === 'one-shots' ? (
          <BookingFiltersPanel
            title="Filtri one-shot"
            description="Restringi per associazione, tipo di gioco, master o slot per trovare il tavolo giusto piu in fretta."
            fields={[
              { key: 'association', label: 'Associazione', placeholder: 'Tutte', options: oneShotFilterOptions.associations },
              { key: 'game', label: 'Tipo di gioco', placeholder: 'Tutti', options: oneShotFilterOptions.games },
              { key: 'master', label: 'Master', placeholder: 'Tutti', options: oneShotFilterOptions.masters },
              { key: 'slot', label: 'Slot', placeholder: 'Tutti', options: oneShotFilterOptions.slots },
            ]}
            filters={oneShotFilters}
            visibleCount={visibleOneShotCount}
            onChange={(field, value) => setOneShotFilters((current) => ({ ...current, [field]: value }))}
            onReset={() => setOneShotFilters(EMPTY_ONESHOT_FILTERS)}
            toggle={{
              label: 'Solo posti disponibili',
              checked: oneShotFilters.onlyAvailable,
              onChange: (checked) => setOneShotFilters((current) => ({ ...current, onlyAvailable: checked })),
            }}
          />
        ) : (
          <BookingFiltersPanel
            title="Filtri main event"
            description="Restringi per tipo di gioco o slot per confrontare piu rapidamente i tavoli disponibili."
            fields={[
              { key: 'game', label: 'Tipo di gioco', placeholder: 'Tutti', options: mainEventFilterOptions.games },
              { key: 'slot', label: 'Slot', placeholder: 'Tutti', options: mainEventFilterOptions.slots },
            ]}
            filters={mainEventFilters}
            visibleCount={visibleMainEventCount}
            onChange={(field, value) => setMainEventFilters((current) => ({ ...current, [field]: value }))}
            onReset={() => setMainEventFilters(EMPTY_MAIN_EVENT_FILTERS)}
          />
        )}

        {/* PANELS */}
        <div className="mt-8 grid gap-8 lg:grid-cols-[1fr_320px]">
          <main role="tabpanel" className="min-w-0">
            {activeTab === 'one-shots' ? (
              <OneShotsPanel
                groups={oneShotGroups}
                hasActiveFilters={hasActiveOneShotFilters}
                cartState={cartState}
                pendingSlotId={pendingSlotId}
                busy={busy}
                onAdd={handleAddOneshot}
                onRemove={handleRemoveOneshot}
                isLoggedIn={Boolean(user)}
                oneshots={event.oneshots}
                waitlistDays={cartState.waitlistDays || []}
                pendingWaitlistDay={pendingWaitlistDay}
                onJoinWaitlist={handleJoinWaitlist}
                onLeaveWaitlist={handleLeaveWaitlist}
              />
            ) : (
              <MainEventPanel
                groups={mainEventGroups}
                hasActiveFilters={hasActiveMainEventFilters}
                reservationsBySessionKey={mainReservationsBySessionKey}
                reservedSlotKeys={mainReservedSlotKeys}
                cartSessionKeys={mainCartSessionKeys}
                cartSlotKeys={mainCartSlotKeys}
                busy={busy}
                pendingSessionKey={pendingMainSessionKey}
                mainSessionKey={mainSessionKey}
                onAdd={handleAddMainToCart}
                onRemove={handleRemoveMainFromCart}
                onCancel={handleCancelMain}
                isLoggedIn={Boolean(user)}
                oneshotConflictKeys={oneshotConflictKeys}
              />
            )}
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
    </div>
  )
}

/* ============ GROUPING HELPERS ============ */

const DAY_ORDER = ['Lunedi', 'Lunedì', 'Martedi', 'Martedì', 'Mercoledi', 'Mercoledì', 'Giovedi', 'Giovedì', 'Venerdi', 'Venerdì', 'Sabato', 'Domenica']

function normalizeFilterValue(value) {
  return String(value || '').trim().toLocaleLowerCase('it-IT')
}

function getTimeSlotFilterValue(slot) {
  return `${normalizeFilterValue(slot?.day)}__${normalizeFilterValue(slot?.slot)}`
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

function buildSlotFilterOptions(items, listKey = 'slots') {
  const unique = new Map()

  for (const item of items) {
    for (const slot of item[listKey] || []) {
      const value = getTimeSlotFilterValue(slot)
      if (!slot?.day || !slot?.slot || unique.has(value)) continue

      unique.set(value, {
        value,
        label: `${slot.day} · ${slot.slot}`,
        day: slot.day,
        slot: slot.slot,
      })
    }
  }

  return Array.from(unique.values())
    .sort((left, right) => {
      const dayDiff = dayIndex(left.day) - dayIndex(right.day)
      if (dayDiff !== 0) return dayDiff
      return left.slot.localeCompare(right.slot, undefined, { numeric: true })
    })
    .map(({ value, label }) => ({ value, label }))
}

function dayIndex(day) {
  const idx = DAY_ORDER.indexOf(day)
  return idx === -1 ? 999 : idx
}

function groupByTimeSlot(items, itemKey, listKey = 'slots') {
  const groups = new Map()
  for (const item of items) {
    for (const slot of item[listKey] || []) {
      const key = `${slot.day}__${slot.slot}`
      if (!groups.has(key)) {
        groups.set(key, { day: slot.day, slot: slot.slot, sessions: [] })
      }
      groups.get(key).sessions.push({ [itemKey]: item, slot })
    }
  }
  return Array.from(groups.values()).sort((a, b) => {
    const dd = dayIndex(a.day) - dayIndex(b.day)
    if (dd !== 0) return dd
    return a.slot.localeCompare(b.slot, undefined, { numeric: true })
  })
}

function countGroupedSessions(groups) {
  return groups.reduce((total, group) => total + group.sessions.length, 0)
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
              {visibleCount} {pluralize(visibleCount, 'tavolo visibile', 'tavoli visibili')}
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

        <div className={`mt-4 grid gap-3 ${fields.length >= 4 ? 'md:grid-cols-2 xl:grid-cols-4' : 'md:grid-cols-3'}`}>
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

/* ============ ONE-SHOTS PANEL ============ */

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

const OneShotsPanel = memo(function OneShotsPanel({ groups, hasActiveFilters, cartState, pendingSlotId, busy, onAdd, onRemove, isLoggedIn, oneshots, waitlistDays, pendingWaitlistDay, onJoinWaitlist, onLeaveWaitlist }) {
  const [openedSession, setOpenedSession] = useState(null)
  const fullyBookedDays = useMemo(() => computeFullyBookedDays(oneshots), [oneshots])

  return (
    <div className="space-y-4">
      <WaitlistBanner
        fullyBookedDays={fullyBookedDays}
        waitlistDays={waitlistDays}
        pendingWaitlistDay={pendingWaitlistDay}
        onJoinWaitlist={onJoinWaitlist}
        onLeaveWaitlist={onLeaveWaitlist}
      />

      {groups.length === 0 ? (
        <ParchmentCard>
          <div className="px-7 py-10 text-center">
            <h2 className="font-elegant text-xl font-bold text-editorial-text">{hasActiveFilters ? 'Nessun tavolo trovato' : 'Il programma è ancora un mistero'}</h2>
            <p className="mx-auto mt-2 max-w-md font-body text-sm leading-relaxed text-editorial-text-secondary">
              {hasActiveFilters
                ? 'Nessuna one-shot corrisponde ai filtri selezionati. Prova a cambiarli o azzerarli.'
                : 'I master stanno ancora forgiando le loro avventure. Tornate presto, viandanti.'}
            </p>
          </div>
        </ParchmentCard>
      ) : (
        <div className="space-y-4">
          {groups.map((group, idx) => (
            <TimeslotGroup
              key={`${group.day}__${group.slot}`}
              group={group}
              idx={idx}
              renderSession={(session) => (
                <OneShotSessionRow
                  key={session.slot.id}
                  session={session}
                  cartState={cartState}
                  pendingSlotId={pendingSlotId}
                  busy={busy}
                  onAdd={onAdd}
                  onRemove={onRemove}
                  onOpenDetails={() => setOpenedSession(session)}
                  isLoggedIn={isLoggedIn}
                />
              )}
            />
          ))}
        </div>
      )}

      {openedSession ? (
        <OneShotDetailsModal
          session={openedSession}
          cartState={cartState}
          pendingSlotId={pendingSlotId}
          busy={busy}
          onAdd={onAdd}
          onRemove={onRemove}
          onClose={() => setOpenedSession(null)}
          isLoggedIn={isLoggedIn}
        />
      ) : null}
    </div>
  )
})

function TimeslotGroup({ group, idx, renderSession }) {
  return (
    <article
      className="parchment-scroll fade-stagger"
      style={{ animationDelay: `${idx * 0.05}s` }}
    >
      <div className="px-5 py-4 sm:px-6 sm:py-5">
        <header className="flex items-end justify-between gap-3 border-b border-dashed border-editorial-border pb-3">
          <div className="timeslot-marker">
            <span className="timeslot-marker__day">{group.day}</span>
            <span className="timeslot-marker__hour">{group.slot}</span>
          </div>
          <span className="font-body text-[11px] uppercase tracking-[0.18em] text-editorial-text-muted">
            {group.sessions.length} {pluralize(group.sessions.length, 'tavolo', 'tavoli')}
          </span>
        </header>
        <ul className="mt-2 divide-y divide-dashed divide-editorial-border/60">
          {group.sessions.map(renderSession)}
        </ul>
      </div>
    </article>
  )
}

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

function OneShotSessionRow({ session, cartState, pendingSlotId, busy, onAdd, onRemove, onOpenDetails, isLoggedIn }) {
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

  const rowVariant = state.variant === 'in-cart'
    ? 'session-row--in-cart'
    : state.variant === 'confirmed'
      ? 'session-row--confirmed'
      : state.variant === 'full'
        ? 'session-row--full'
        : ''

  return (
    <li className={`session-row ${rowVariant}`}>
      <button
        type="button"
        className="session-row__main flex items-center gap-3"
        onClick={onOpenDetails}
        aria-label={`Dettagli: ${oneshot.title}`}
      >
        {oneshot.image ? (
          <img
            src={oneshot.image}
            alt=""
            className="h-12 w-12 shrink-0 rounded-lg border border-editorial-border object-cover"
          />
        ) : null}
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
            <h4 className="font-elegant text-[15px] font-bold leading-tight text-editorial-text">{oneshot.title}</h4>
            <span className="fantasy-badge fantasy-badge--terra">{oneshot.game || 'GDR'}</span>
          </div>
          <p className="mt-0.5 font-body text-xs text-editorial-text-secondary">
            <span className="text-editorial-text-muted">Master · </span>
            <span className="font-semibold text-editorial-text">{oneshot.master}</span>
            <span className="text-editorial-text-muted"> · {slot.table}</span>
            {typeof oneshot.price === 'number' && oneshot.price > 0 ? (
              <>
                <span className="text-editorial-text-muted"> · </span>
                <span className="font-semibold text-editorial-terra">{formatCartPrice(oneshot.price, { hideWhenMissing: true })}</span>
              </>
            ) : null}
          </p>
          <div className="mt-1 flex items-center gap-1.5 text-[10.5px] uppercase tracking-[0.12em] text-editorial-text-muted">
            <span><strong className="text-editorial-text">{state.remaining}</strong>/{slot.maxPlayers} posti</span>
            {state.fewLeft && !state.confirmed && !state.inCart ? <span className="fantasy-badge fantasy-badge--terra">Ultimi</span> : null}
            {state.confirmed ? <span className="fantasy-badge fantasy-badge--forest">Prenotato</span> : null}
            {state.inCart ? <span className="fantasy-badge fantasy-badge--gold">Da confermare</span> : null}
          </div>
        </div>
      </button>
      <button
        type="button"
        onClick={handleAction}
        disabled={state.disabled}
        className={state.actionKind === 'add' ? 'btn-slot-wax' : 'btn-slot-ghost'}
      >
        {state.label}
      </button>
    </li>
  )
}

/* ============ MAIN EVENT PANEL ============ */

const MainEventPanel = memo(function MainEventPanel({ groups, hasActiveFilters, reservationsBySessionKey, reservedSlotKeys, cartSessionKeys, cartSlotKeys, pendingSessionKey, mainSessionKey, busy, onAdd, onRemove, onCancel, isLoggedIn, oneshotConflictKeys }) {
  const [openedSession, setOpenedSession] = useState(null)

  return (
    <div className="space-y-4">

      {groups.length === 0 ? (
        <ParchmentCard>
          <div className="px-7 py-10 text-center">
            <h2 className="font-elegant text-xl font-bold text-editorial-text">{hasActiveFilters ? 'Nessun tavolo trovato' : 'Nessun evento principale annunciato'}</h2>
            <p className="mx-auto mt-2 max-w-md font-body text-sm leading-relaxed text-editorial-text-secondary">
              {hasActiveFilters
                ? 'Nessun main event corrisponde ai filtri selezionati. Prova a cambiarli o azzerarli.'
                : 'Per questa edizione l&apos;evento principale non è ancora stato svelato. Tornate presto.'}
            </p>
          </div>
        </ParchmentCard>
      ) : (
        <div className="space-y-4">
          {groups.map((group, idx) => (
            <TimeslotGroup
              key={`${group.day}__${group.slot}`}
              group={group}
              idx={idx}
              renderSession={(session) => {
                const key = mainSessionKey(session.mainEvent.id, session.slot.day, session.slot.slot)
                return (
                  <MainEventSessionRow
                    key={key}
                    session={session}
                    sessionKey={key}
                    reservation={reservationsBySessionKey.get(key)}
                    hasReservedKey={reservedSlotKeys.has(getSlotKey(session.slot))}
                    inCart={cartSessionKeys.has(key)}
                    hasCartKey={cartSlotKeys.has(getSlotKey(session.slot))}
                    hasOneshotConflict={oneshotConflictKeys.has(getSlotKey(session.slot))}
                    pendingSessionKey={pendingSessionKey}
                    busy={busy}
                    onAdd={onAdd}
                    onRemove={onRemove}
                    onCancel={onCancel}
                    onOpenDetails={() => setOpenedSession(session)}
                    isLoggedIn={isLoggedIn}
                  />
                )
              }}
            />
          ))}
        </div>
      )}

      {openedSession ? (() => {
        const key = mainSessionKey(openedSession.mainEvent.id, openedSession.slot.day, openedSession.slot.slot)
        return (
          <MainEventDetailsModal
            session={openedSession}
            sessionKey={key}
            reservation={reservationsBySessionKey.get(key)}
            hasReservedKey={reservedSlotKeys.has(getSlotKey(openedSession.slot))}
            inCart={cartSessionKeys.has(key)}
            hasCartKey={cartSlotKeys.has(getSlotKey(openedSession.slot))}
            hasOneshotConflict={oneshotConflictKeys.has(getSlotKey(openedSession.slot))}
            pendingSessionKey={pendingSessionKey}
            busy={busy}
            onAdd={onAdd}
            onRemove={onRemove}
            onCancel={onCancel}
            onClose={() => setOpenedSession(null)}
            isLoggedIn={isLoggedIn}
          />
        )
      })() : null}
    </div>
  )
})

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

function MainEventSessionRow({ session, sessionKey, reservation, inCart, hasReservedKey, hasCartKey, hasOneshotConflict, pendingSessionKey, busy, onAdd, onRemove, onCancel, onOpenDetails, isLoggedIn }) {
  const { mainEvent, slot } = session
  const isPending = pendingSessionKey === sessionKey
  const state = computeMainEventState({ slot, reservation, inCart, hasReservedKey, hasCartKey, isLoggedIn, isPending, busy })

  const handleAction = (e) => {
    e.stopPropagation()
    if (state.actionKind === 'login') {
      window.location.href = '/auth/login?next=/dice-fest/prenotazioni%3Ftab%3Dmain-event'
    } else if (state.actionKind === 'add') {
      onAdd({ mainEventId: mainEvent.id, day: slot.day, slot: slot.slot })
    } else if (state.actionKind === 'remove') {
      onRemove({ mainEventId: mainEvent.id, day: slot.day, slot: slot.slot })
    } else if (state.actionKind === 'cancel') {
      onCancel(reservation)
    }
  }

  const rowVariant = state.variant === 'confirmed'
    ? 'session-row--confirmed'
    : state.variant === 'in-cart'
      ? 'session-row--in-cart'
    : state.variant === 'full'
      ? 'session-row--full'
      : ''

  return (
    <li className={`session-row ${rowVariant}`}>
      <button
        type="button"
        className="session-row__main flex items-center gap-3"
        onClick={onOpenDetails}
        aria-label={`Dettagli: ${mainEvent.title}`}
      >
        {mainEvent.image ? (
          <img
            src={mainEvent.image}
            alt=""
            className="h-12 w-12 shrink-0 rounded-lg border border-editorial-border object-cover"
          />
        ) : null}
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
            <h4 className="font-elegant text-[15px] font-bold leading-tight text-editorial-text">{mainEvent.title}</h4>
            <span className="fantasy-badge fantasy-badge--forest">Main Event</span>
          </div>
          <p className="mt-0.5 font-body text-xs text-editorial-text-secondary">
            {mainEvent.game ? <span className="text-editorial-text-muted">{mainEvent.game}</span> : null}
            {typeof mainEvent.price === 'number' && mainEvent.price > 0 ? (
              <>
                <span className="text-editorial-text-muted"> · </span>
                <span className="font-semibold text-editorial-forest">{formatCartPrice(mainEvent.price, { hideWhenMissing: true })}</span>
              </>
            ) : null}
          </p>
          <div className="mt-1 flex items-center gap-1.5 text-[10.5px] uppercase tracking-[0.12em] text-editorial-text-muted">
            <span><strong className="text-editorial-text">{state.remaining}</strong>/{slot.maxPlayers} posti</span>
            {state.fewLeft && !reservation && !inCart ? <span className="fantasy-badge fantasy-badge--terra">Ultimi</span> : null}
            {reservation ? <span className="fantasy-badge fantasy-badge--forest">Prenotato</span> : null}
            {inCart ? <span className="fantasy-badge fantasy-badge--gold">Da confermare</span> : null}
            {!reservation && hasOneshotConflict ? (
              <span className="fantasy-badge fantasy-badge--gold" title="Hai una one-shot in questa fascia">Conflitto</span>
            ) : null}
          </div>
        </div>
      </button>
      <button
        type="button"
        onClick={handleAction}
        disabled={state.disabled}
        className={state.actionKind === 'add' ? 'btn-slot-wax' : 'btn-slot-ghost'}
      >
        {state.label}
      </button>
    </li>
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
      window.location.href = '/auth/login?next=/dice-fest/prenotazioni%3Ftab%3Dmain-event'
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
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M14 14L21 21M3 3l7 7M14 10l7-7v4M10 14l-7 7v-4M16 16l4 4M4 4l4 4" />
    </svg>
  )
}

function CrownIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M3 8l4 5 5-8 5 8 4-5v11H3z" />
      <path d="M3 19h18" />
    </svg>
  )
}
