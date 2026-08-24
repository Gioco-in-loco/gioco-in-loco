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
import { getSlotKey, isBookingWindowOpen } from '../../lib/event-booking'
import { DICE_FEST_BOOKING_CONFIG } from '../../lib/bookable-events'
import { ParchmentCard } from '../dice-fest/decorations'
import TableMap from '../dice-fest/TableMap'
import Countdown from '../dice-fest/Countdown'
import CompanionInviteFields from '../booking/CompanionInviteFields'

function useCompanionInvites(maxCount) {
  const [companions, setCompanions] = useState([])
  const validCompanions = companions.filter((c) => c.firstName.trim() && c.lastName.trim() && c.email.trim())
  return { companions, setCompanions, validCompanions, maxCount: Math.max(0, maxCount) }
}

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
  // Stores a stable key rather than the entry object itself: the object
  // captured at click time would freeze the modal's seat count (remaining/
  // maxPlayers) at whatever it was when opened, so it wouldn't reflect a
  // reservation added/removed while the modal stays open (e.g. booking the
  // host's own seat, then inviting companions based on stale capacity).
  // Re-deriving from the live allEntries on every render keeps it current.
  const [openedEntryKey, setOpenedEntryKey] = useState(null)

  const [mainEventItems, setMainEventItems] = useState(event.mainEvents || [])
  const [oneshotItems, setOneshotItems] = useState(event.oneshots || [])
  const [pendingMainSessionKey, setPendingMainSessionKey] = useState(null)
  const [pendingWaitlistDay, setPendingWaitlistDay] = useState(null)
  const [showSummary, setShowSummary] = useState(false)
  const [showTutorial, setShowTutorial] = useState(false)

  const hasMainEvents = mainEventItems.length > 0

  // Synchronous lock against double-clicks: state updates are async, but rapid
  // clicks within the same tick can fire multiple handlers before React commits.
  const inFlightRef = useRef(false)
  // Block actions also during initial cart load: until /cart returns we don't
  // know which slots the user has already reserved, so any click could trigger
  // a wrong server call or mislead the user with stale UI.
  const busy = Boolean(cartState.loading || pendingSlotId || pendingMainSessionKey)

  // Sync main events / one-shots when event prop changes
  useEffect(() => {
    setMainEventItems(event.mainEvents || [])
  }, [event.mainEvents])

  useEffect(() => {
    setOneshotItems(event.oneshots || [])
  }, [event.oneshots])

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
        if (!response.ok) throw new Error('Impossibile caricare le sessioni.')
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

  // Applies the real, server-computed occupancy for one session/slot instead
  // of guessing a +1/-1 delta client-side — a delta broke as soon as
  // companions were involved (a host+2-friends booking only ever moved the
  // shown count by 1, understating how many seats were actually taken and
  // making it look like a seat wasn't really held until final checkout).
  const setMainEventSessionOccupancy = useCallback((occupancy) => {
    if (!occupancy) return
    const { mainEventId, day, slot, currentReservations } = occupancy
    setMainEventItems((current) => current.map((me) => {
      if (me.id !== mainEventId) return me
      const nextSessions = (me.sessions || []).map((s) => {
        if (s.day !== day || s.slot !== slot) return s
        return { ...s, currentReservations, available: currentReservations < s.maxPlayers }
      })
      const nextTables = (me.tables || []).map((t) => {
        if (t.day !== day || t.slot !== slot) return t
        return { ...t, currentReservations, available: currentReservations < t.maxPlayers }
      })
      return { ...me, sessions: nextSessions, tables: nextTables }
    }))
  }, [])

  const setOneshotSlotOccupancy = useCallback((occupancy) => {
    if (!occupancy) return
    const { slotId, currentReservations } = occupancy
    setOneshotItems((current) => current.map((oneshot) => {
      const nextSlots = (oneshot.slots || []).map((s) => {
        if (s.id !== slotId) return s
        return { ...s, currentReservations, available: currentReservations < s.maxPlayers }
      })
      return { ...oneshot, slots: nextSlots }
    }))
  }, [])

  const handleAddOneshot = useCallback(async (slot, companions = []) => {
    if (!user) {
      window.location.href = '/auth/login?redirect=/dice-fest/sessioni'
      return false
    }
    if (inFlightRef.current) return false
    inFlightRef.current = true
    setPendingSlotId(slot.id)
    setRequestError('')
    try {
      const response = await fetch(`${DICE_FEST_BOOKING_CONFIG.apiBasePath}/cart/slots`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify({ slotId: slot.id, companions }),
      })
      const payload = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(payload.error || 'Impossibile prenotare il tavolo.')
      const { slotOccupancy, ...cartStatePayload } = payload
      setCartState({ loading: false, ...cartStatePayload })
      setOneshotSlotOccupancy(slotOccupancy)
      toast.success(companions.length > 0
        ? `Tavolo aggiunto all’ordine. ${companions.length === 1 ? 'Il tuo amico riceverà' : 'I tuoi amici riceveranno'} l\'email di invito quando confermi l\'ordine.`
        : `Tavolo aggiunto all’ordine: ${slot.day} · ${slot.slot}.`)
      return true
    } catch (err) {
      const msg = err.message || 'Impossibile prenotare il tavolo.'
      setRequestError(msg)
      toast.error(msg)
      return false
    } finally {
      setPendingSlotId(null)
      inFlightRef.current = false
    }
  }, [toast, setOneshotSlotOccupancy, user])

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
      const { slotOccupancy, ...cartStatePayload } = payload
      setCartState({ loading: false, ...cartStatePayload })
      setOneshotSlotOccupancy(slotOccupancy)
      toast.success(`Tavolo abbandonato: ${slot.day} · ${slot.slot}.`)
    } catch (err) {
      const msg = err.message || 'Impossibile rimuovere il tavolo.'
      setRequestError(msg)
      toast.error(msg)
    } finally {
      setPendingSlotId(null)
      inFlightRef.current = false
    }
  }, [toast, setOneshotSlotOccupancy, user])

  const handleJoinWaitlist = useCallback(async (day) => {
    if (!user) {
      window.location.href = '/auth/login?redirect=/dice-fest/sessioni'
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

  const handleAddMainToCart = useCallback(async (session, companions = []) => {
    if (!user) {
      window.location.href = '/auth/login?redirect=/dice-fest/sessioni'
      return false
    }
    if (inFlightRef.current) return false
    inFlightRef.current = true
    setPendingMainSessionKey(mainSessionKey(session.mainEventId, session.day, session.slot))
    setRequestError('')
    try {
      const response = await fetch(`${DICE_FEST_BOOKING_CONFIG.apiBasePath}/cart/main-events/slots`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify({ mainEventId: session.mainEventId, day: session.day, slot: session.slot, companions }),
      })
      const payload = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(payload.error || 'Impossibile prenotare il posto.')
      const { sessionOccupancy, ...cartStatePayload } = payload
      setCartState({ loading: false, ...cartStatePayload })
      setMainEventSessionOccupancy(sessionOccupancy)
      toast.success(companions.length > 0
        ? `Posto prenotato. ${companions.length === 1 ? 'Il tuo amico riceverà' : 'I tuoi amici riceveranno'} l\'email di invito quando confermi l\'ordine.`
        : `Posto prenotato: ${session.day} · ${session.slot}.`)
      return true
    } catch (err) {
      const msg = err.message || 'Impossibile prenotare il posto.'
      setRequestError(msg)
      toast.error(msg)
      return false
    } finally {
      setPendingMainSessionKey(null)
      inFlightRef.current = false
    }
  }, [mainSessionKey, toast, setMainEventSessionOccupancy, user])

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
      const { sessionOccupancy, ...cartStatePayload } = payload
      setCartState({ loading: false, ...cartStatePayload })
      setMainEventSessionOccupancy(sessionOccupancy)
      toast.success('Prenotazione Main Event rimossa.')
    } catch (err) {
      const msg = err.message || 'Impossibile rimuovere il posto.'
      setRequestError(msg)
      toast.error(msg)
    } finally {
      setPendingMainSessionKey(null)
      inFlightRef.current = false
    }
  }, [mainSessionKey, toast, setMainEventSessionOccupancy])

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
      setMainEventSessionOccupancy(payload.reservation?.sessionOccupancy)
      toast.success('Prenotazione cancellata.')
    } catch (err) {
      toast.error(err.message || 'Impossibile cancellare la prenotazione.')
    } finally {
      setPendingMainSessionKey(null)
      inFlightRef.current = false
    }
  }, [mainSessionKey, toast, setMainEventSessionOccupancy])

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
    associations: buildTextFilterOptions(oneshotItems.map((item) => item.association?.name)),
    games: buildTextFilterOptions([
      ...oneshotItems.map((item) => item.game),
      ...mainEventItems.map((item) => item.game),
    ]),
    masters: buildTextFilterOptions(oneshotItems.map((item) => item.master)),
  }), [oneshotItems, mainEventItems])

  // Tutti i tavoli della sala, uniti in un'unica lista: la mappa mostra sempre
  // la struttura completa, i filtri attenuano invece di nascondere le celle
  // (altrimenti la griglia righe/colonne si romperebbe).
  const allEntries = useMemo(() => {
    const oneshotEntries = oneshotItems.flatMap((oneshot) =>
      (oneshot.slots || []).map((slot) => ({ type: 'oneshot', oneshot, slot }))
    )
    const mainEventEntries = mainEventItems.flatMap((mainEvent) =>
      (mainEvent.tables || []).map((slot) => ({ type: 'mainEvent', mainEvent, slot }))
    )
    return [...oneshotEntries, ...mainEventEntries]
  }, [oneshotItems, mainEventItems])

  const getEntryKey = useCallback((entry) => (
    entry.type === 'oneshot'
      ? `oneshot:${entry.slot.id}`
      : `mainEvent:${mainSessionKey(entry.mainEvent.id, entry.slot.day, entry.slot.slot)}`
  ), [mainSessionKey])

  // Re-derived every render from the live allEntries — see openedEntryKey comment above.
  const openedEntry = useMemo(
    () => (openedEntryKey ? allEntries.find((entry) => getEntryKey(entry) === openedEntryKey) || null : null),
    [allEntries, openedEntryKey, getEntryKey]
  )

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

  const fullyBookedDays = useMemo(() => computeFullyBookedDays(oneshotItems), [oneshotItems])

  const cartItemsCount = cartState.cartSlots.length
  const mainCartItemsCount = filteredMainCartSlots.length
  const hasPendingPass = cartState.hasCartAdmission && !cartState.hasConfirmedAdmission
  const pendingOrderCount = cartItemsCount + mainCartItemsCount + (hasPendingPass ? 1 : 0)
  const bookingWindowOpen = isBookingWindowOpen(event)

  return (
    <div className="dicefest-bg pb-24">
      <div className="mx-auto max-w-screen-2xl px-5 py-10 md:px-8 lg:px-10">
        {/* HEADER */}
        <header className="fade-stagger">
          <p className="dicefest-eyebrow">Sessioni</p>
          <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-3">
              <h1 className="font-df-display text-4xl uppercase text-dicefest-paper sm:text-5xl">
                La mappa dei tavoli
              </h1>
              <button
                type="button"
                onClick={() => setShowTutorial(true)}
                title="Come funziona la prenotazione"
                aria-label="Come funziona la prenotazione"
                className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full border-2 border-dicefest-green bg-dicefest-green/10 font-df-display text-base text-dicefest-green transition-colors hover:bg-dicefest-green/20"
              >
                ?
              </button>
            </div>
            {!bookingWindowOpen && event.bookingOpensAt ? (
              <Countdown
                startDate={event.bookingOpensAt}
                label="Prenotazioni aperte tra"
                completedLabel="Prenotazioni aperte!"
                className="w-full sm:ml-auto sm:w-auto sm:max-w-xs"
              />
            ) : null}
          </div>
          <p className="mt-3 max-w-2xl font-df-body text-[15px] leading-relaxed text-dicefest-paper/75">
            {hasMainEvents ? (
              <>
                Ecco la sala: <strong className="text-dicefest-paper">one-shot</strong> dei nostri master e <strong className="text-dicefest-paper">Main Event</strong>, tavolo per tavolo.
                <br /> Tocca un tavolo per i dettagli e conferma la scelta quando sei pronto.
              </>
            ) : (
              <>Ecco la sala: scegli il tuo tavolo tra le <strong className="text-dicefest-paper">one-shot</strong> dei nostri master e conferma la scelta quando sei pronto.</>
            )}
          </p>
        </header>

        {requestError ? (
          <p className="mt-5 border border-red-500/40 bg-red-500/10 px-4 py-3 font-df-body text-sm text-red-300">{requestError}</p>
        ) : null}

        {cartState.loading && user ? (
          <p className="mt-5 inline-flex items-center gap-2 border border-dicefest-green/40 bg-dicefest-green/10 px-4 py-2.5 font-df-body text-sm text-dicefest-paper">
            <span className="inline-block h-2.5 w-2.5 animate-pulse bg-dicefest-green" aria-hidden="true" />
            Carico il tuo ordine…
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

        {/* TABLE MAP — full width: the order summary lives in a popup (see below)
            so the room map gets all the horizontal space it needs and isn't
            squeezed by a permanently reserved sidebar column. */}
        <div className="mt-8">
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
                    <h2 className="font-df-display text-xl uppercase text-dicefest-paper">Il programma è ancora un mistero</h2>
                    <p className="mx-auto mt-2 max-w-md font-df-body text-sm leading-relaxed text-dicefest-paper/75">
                      I master stanno ancora preparando le loro avventure. Tornate presto.
                    </p>
                    {event.visibility === 'REVEALED' && event.bookingOpensAt ? (
                      <Countdown
                        startDate={event.bookingOpensAt}
                        label="Le prenotazioni aprono tra"
                        completedLabel="Le prenotazioni sono aperte!"
                        className="mx-auto mt-6 max-w-xs"
                      />
                    ) : null}
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
                          onRemove={handleRemoveOneshot}
                          onOpenDetails={() => setOpenedEntryKey(getEntryKey(entry))}
                          isLoggedIn={Boolean(user)}
                          isAdmin={Boolean(user?.isAdmin)}
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
                        onRemove={handleRemoveMainFromCart}
                        onCancel={handleCancelMain}
                        onOpenDetails={() => setOpenedEntryKey(getEntryKey(entry))}
                        isLoggedIn={Boolean(user)}
                        isAdmin={Boolean(user?.isAdmin)}
                      />
                    )
                  }}
                />
              )}
            </div>
          </main>
        </div>
      </div>

      {/* STICKY SUMMARY TRIGGER — same control on every breakpoint. Opens a
          quick-glance popup instead of reserving a permanent sidebar column
          or navigating away, so the table map keeps full width and the user
          doesn't lose their place while scanning tables. */}
      {pendingOrderCount > 0 ? (
        <div className="fixed inset-x-0 bottom-3 z-30 flex justify-center px-4">
          <button
            type="button"
            onClick={() => setShowSummary(true)}
            className="flex items-center gap-3 border-2 border-dicefest-ink bg-dicefest-pink px-5 py-3 font-df-mono text-sm font-bold uppercase tracking-wide text-dicefest-ink shadow-df-hard transition-transform hover:-translate-y-0.5"
          >
            <span className="dicefest-badge dicefest-badge--neutral">{pendingOrderCount}</span>
            <span>Clicca qui per confermare</span>
            {timeRemaining ? <span className="font-df-display text-dicefest-ink">{timeRemaining}</span> : null}
          </button>
        </div>
      ) : null}

      {showSummary ? (
        <ModalShell onClose={() => setShowSummary(false)}>
          <BookingOrderSummary
            cartState={cartState}
            mainCartSlots={filteredMainCartSlots}
            timeRemaining={timeRemaining}
            isLoggedIn={Boolean(user)}
            bare
          />
        </ModalShell>
      ) : null}

      {showTutorial ? (
        <ModalShell onClose={() => setShowTutorial(false)}>
          <BookingTutorial />
        </ModalShell>
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
            onClose={() => setOpenedEntryKey(null)}
            isLoggedIn={Boolean(user)}
            isAdmin={Boolean(user?.isAdmin)}
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
              onClose={() => setOpenedEntryKey(null)}
              isLoggedIn={Boolean(user)}
              isAdmin={Boolean(user?.isAdmin)}
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
            <p className="dicefest-eyebrow">{title}</p>
            <p className="mt-2 font-df-body text-sm leading-relaxed text-dicefest-paper/75">{description}</p>
          </div>
          <div className="flex items-center gap-3">
            {toggle ? (
              <label className="flex items-center gap-2 font-df-body text-xs font-semibold text-dicefest-paper">
                <input
                  type="checkbox"
                  checked={toggle.checked}
                  onChange={(event) => toggle.onChange(event.target.checked)}
                  className="h-4 w-4 border-dicefest-border text-dicefest-pink focus:ring-dicefest-pink/30"
                />
                {toggle.label}
              </label>
            ) : null}
            <p className="font-df-mono text-[11px] font-semibold uppercase tracking-[0.18em] text-dicefest-paper/50">
              {visibleCount} {pluralize(visibleCount, 'tavolo in evidenza', 'tavoli in evidenza')}
            </p>
            <button
              type="button"
              onClick={onReset}
              disabled={!hasActiveFilters}
              className="border border-dicefest-border px-3 py-1.5 font-df-mono text-xs font-semibold uppercase text-dicefest-paper transition-colors hover:border-dicefest-pink disabled:cursor-not-allowed disabled:opacity-50"
            >
              Reset filtri
            </button>
          </div>
        </div>

        <div className="mt-4 grid gap-3 md:grid-cols-3">
          {fields.map((field) => (
            <label key={field.key} className="block">
              <span className="mb-1 block font-df-mono text-[11px] font-semibold uppercase tracking-[0.16em] text-dicefest-paper/50">
                {field.label}
              </span>
              <select
                value={filters[field.key] || ''}
                onChange={(event) => onChange(field.key, event.target.value)}
                className="dicefest-input"
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
                <p className="dicefest-eyebrow">Tutto esaurito</p>
                <p className="mt-1 font-df-display text-base uppercase text-dicefest-paper">
                  Le one-shot di {day} sono al completo
                </p>
                <p className="mt-1 font-df-body text-xs text-dicefest-paper/75">
                  Iscriviti alla lista d&apos;attesa: ti avviseremo via email appena si libera un posto.
                </p>
              </div>
              <button
                type="button"
                onClick={() => (isWaitlisted ? onLeaveWaitlist(day) : onJoinWaitlist(day))}
                disabled={isPending}
                className={isWaitlisted ? 'dicefest-btn-secondary' : 'dicefest-btn-primary'}
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

function computeOneShotState({ slot, cartState, isLoggedIn, isAdmin = false, isPending, busy = false }) {
  const confirmed = cartState.confirmedSlotIds.includes(slot.id)
  const inCart = cartState.cartSlotIds.includes(slot.id)
  const sameSlotKey = getSlotKey(slot)
  const conflictConfirmed = cartState.confirmedSlotKeys.includes(sameSlotKey) && !confirmed
  const conflictCart = cartState.cartSlotKeys.includes(sameSlotKey) && !inCart
  const remaining = Math.max(0, slot.maxPlayers - slot.currentReservations)
  const fewLeft = remaining > 0 && remaining <= 2
  const full = !slot.available
  // Admin can always book even while closed, to test or handle walk-ins.
  const notYetOpen = slot.bookable === false && !isAdmin

  let label = 'Prenota'
  let verboseLabel = 'Prenota il posto'
  let actionKind = 'add'
  let disabled = false
  let variant = ''

  // Blocked states (not open yet / full) show as such regardless of login —
  // no point sending an anonymous visitor to login for a table they can't
  // book anyway.
  if (notYetOpen) {
    label = 'Non ancora aperto'
    verboseLabel = 'Prenotazioni non ancora aperte'
    disabled = true
    variant = 'not-open'
  } else if (full) {
    label = 'Pieno'
    verboseLabel = 'Sala piena'
    disabled = true
    variant = 'full'
  } else if (!isLoggedIn) {
    label = 'Prenota'
    verboseLabel = 'Vai al login per prenotare'
    actionKind = 'login'
  } else if (confirmed) {
    label = 'Confermata ✓'
    verboseLabel = 'Prenotazione confermata'
    disabled = true
    variant = 'confirmed'
  } else if (inCart) {
    label = isPending ? 'Cancella prenotazione…' : 'Cancella prenotazione'
    verboseLabel = isPending ? 'Cancellando prenotazione…' : 'Cancella la prenotazione'
    actionKind = 'remove'
    disabled = isPending
    variant = 'in-cart'
  } else if (conflictConfirmed) {
    label = 'Orario occupato'
    verboseLabel = 'Hai un\'altra sessione a questo orario'
    disabled = true
  } else if (conflictCart) {
    label = 'Orario occupato'
    verboseLabel = 'Hai un\'altra sessione a questo orario'
    disabled = true
  } else {
    label = 'Scopri di più'
    verboseLabel = isPending ? 'Aggiungo…' : 'Aggiungi all\'ordine'
    disabled = isPending
  }

  // Block all server-touching actions when another mutation is in flight.
  if (busy && actionKind !== 'login') {
    disabled = true
  }

  return { confirmed, inCart, full, notYetOpen, fewLeft, remaining, label, verboseLabel, actionKind, disabled, variant }
}

function OneShotMapCell({ session, cartState, pendingSlotId, busy, onRemove, onOpenDetails, isLoggedIn, isAdmin }) {
  const { oneshot, slot } = session
  const isPending = pendingSlotId === slot.id
  const state = computeOneShotState({ slot, cartState, isLoggedIn, isAdmin, isPending, busy })

  const handleAction = (e) => {
    e.stopPropagation()
    if (state.actionKind === 'login') {
      window.location.href = '/auth/login?redirect=/dice-fest/sessioni'
    } else if (state.actionKind === 'add') {
      onOpenDetails()
    } else if (state.actionKind === 'remove') {
      onRemove(slot)
    }
  }

  const cardVariant = state.variant === 'in-cart' ? 'dicefest-slot-card--in-cart'
    : state.variant === 'confirmed' ? 'dicefest-slot-card--confirmed'
      : state.variant === 'full' || state.variant === 'not-open' ? 'dicefest-slot-card--full' : ''

  return (
    <div
      className={`dicefest-slot-card ${cardVariant} flex h-full flex-col gap-2 cursor-pointer`}
      onClick={onOpenDetails}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          onOpenDetails()
        }
      }}
      aria-label={`Dettagli: ${oneshot.title}`}
    >
      <div className="dicefest-slot-card__top">
        <span className="dicefest-badge dicefest-badge--pink"><SwordsIcon />{oneshot.game || 'GDR'}</span>
        <span className="dicefest-slot-card__table">{slot.table}</span>
      </div>
      <div className="flex-1 text-left">
        <p className="font-df-display text-sm leading-tight text-dicefest-paper line-clamp-2">{oneshot.title}</p>
        <p className="mt-1 font-df-body text-[11px] text-dicefest-paper/60 line-clamp-1">Master {oneshot.master}</p>
        {state.fewLeft && !state.confirmed && !state.inCart ? (
          <span className="dicefest-badge dicefest-badge--pink mt-1.5">Ultimi posti</span>
        ) : null}
      </div>
      <div className="dicefest-slot-card__footer">
        <span className="dicefest-slot-card__seats">{state.remaining} posti</span>
        <button
          type="button"
          onClick={handleAction}
          disabled={state.disabled}
          className={state.actionKind === 'add' ? 'dicefest-btn-slot-primary' : 'dicefest-btn-slot-ghost'}
        >
          {state.label}
        </button>
      </div>
    </div>
  )
}

/* ============ MAIN EVENT CELL ============ */

function computeMainEventState({ slot, reservation, inCart, hasReservedKey, hasCartKey, isLoggedIn, isAdmin = false, isPending, busy = false }) {
  const remaining = Math.max(0, slot.maxPlayers - (slot.currentReservations || 0))
  const fewLeft = remaining > 0 && remaining <= 2
  const full = !slot.available && !reservation && !inCart
  // Admin can always book even while closed, to test or handle walk-ins.
  const notYetOpen = slot.bookable === false && !reservation && !inCart && !isAdmin
  const hasConflict = hasReservedKey && !reservation
  const hasCartConflict = hasCartKey && !inCart

  let label = 'Prenota'
  let verboseLabel = 'Prenota il posto'
  let actionKind = 'add'
  let disabled = false
  let variant = ''

  // Blocked states (not open yet / full) show as such regardless of login —
  // no point sending an anonymous visitor to login for a table they can't
  // book anyway.
  if (notYetOpen) {
    variant = 'not-open'
    label = 'Non ancora aperto'
    verboseLabel = 'Prenotazioni non ancora aperte'
    disabled = true
  } else if (full) {
    variant = 'full'
    label = 'Pieno'
    verboseLabel = 'Sala piena'
    disabled = true
  } else if (!isLoggedIn) {
    label = 'Accedi'
    verboseLabel = 'Accedi per prenotare'
    actionKind = 'login'
  } else if (reservation) {
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
  } else if (hasConflict) {
    label = 'Orario occupato'
    verboseLabel = 'Hai un\'altra sessione a questo orario'
    disabled = true
  } else if (hasCartConflict) {
    label = 'Orario occupato'
    verboseLabel = 'Hai un\'altra sessione a questo orario'
    disabled = true
  } else {
    label = 'Scopri di più'
    verboseLabel = isPending ? 'Aggiungo…' : 'Aggiungi all\'ordine'
    disabled = isPending
  }

  if (busy && actionKind !== 'login') {
    disabled = true
  }

  return { remaining, fewLeft, full, notYetOpen, hasConflict, hasCartConflict, label, verboseLabel, actionKind, disabled, variant }
}

function MainEventMapCell({ session, sessionKey, reservation, inCart, hasReservedKey, hasCartKey, hasOneshotConflict, pendingSessionKey, busy, onRemove, onCancel, onOpenDetails, isLoggedIn, isAdmin }) {
  const { mainEvent, slot } = session
  const isPending = pendingSessionKey === sessionKey
  const state = computeMainEventState({ slot, reservation, inCart, hasReservedKey, hasCartKey, isLoggedIn, isAdmin, isPending, busy })

  const handleAction = (e) => {
    e.stopPropagation()
    if (state.actionKind === 'login') {
      window.location.href = '/auth/login?redirect=/dice-fest/sessioni'
    } else if (state.actionKind === 'add') {
      onOpenDetails()
    } else if (state.actionKind === 'remove') {
      onRemove({ mainEventId: mainEvent.id, day: slot.day, slot: slot.slot })
    } else if (state.actionKind === 'cancel') {
      onCancel(reservation)
    }
  }

  const cardVariant = state.variant === 'confirmed' ? 'dicefest-slot-card--confirmed'
    : state.variant === 'in-cart' ? 'dicefest-slot-card--in-cart'
      : state.variant === 'full' || state.variant === 'not-open' ? 'dicefest-slot-card--full' : ''

  return (
    <div
      className={`dicefest-slot-card ${cardVariant} flex h-full flex-col gap-2 cursor-pointer`}
      onClick={onOpenDetails}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          onOpenDetails()
        }
      }}
      aria-label={`Dettagli: ${mainEvent.title}`}
    >
      <div className="dicefest-slot-card__top">
        <span className="dicefest-badge dicefest-badge--green"><CrownIcon />Main Event</span>
        <span className="dicefest-slot-card__table">{slot.table}</span>
      </div>
      <div className="flex-1 text-left">
        <p className="font-df-display text-sm leading-tight text-dicefest-paper line-clamp-2">{mainEvent.title}</p>
        {mainEvent.game ? <p className="mt-1 font-df-body text-[11px] text-dicefest-paper/60 line-clamp-1">{mainEvent.game}</p> : null}
        <div className="mt-1.5 flex flex-wrap gap-1.5">
          {state.fewLeft && !reservation && !inCart ? <span className="dicefest-badge dicefest-badge--pink">Ultimi posti</span> : null}
          {!reservation && hasOneshotConflict ? (
            <span className="dicefest-badge dicefest-badge--pink" title="Hai una one-shot in questa fascia">Conflitto</span>
          ) : null}
        </div>
      </div>
      <div className="dicefest-slot-card__footer">
        <span className="dicefest-slot-card__seats">{state.remaining} posti</span>
        <button
          type="button"
          onClick={handleAction}
          disabled={state.disabled}
          className={state.actionKind === 'add' ? 'dicefest-btn-slot-primary' : 'dicefest-btn-slot-ghost'}
        >
          {state.label}
        </button>
      </div>
    </div>
  )
}

/* ============ DETAILS MODALS ============ */

const FOCUSABLE_SELECTOR = 'a[href], button:not([disabled]), textarea, input, select, [tabindex]:not([tabindex="-1"])'

function ModalShell({ children, onClose }) {
  const modalRef = useRef(null)
  const closeButtonRef = useRef(null)
  // onClose is often an inline arrow function that gets a new identity on
  // every parent re-render (e.g. the cart hold countdown ticks every
  // second) — reading it from a ref keeps the effect below from re-running
  // (and re-stealing focus onto the close button) on every parent render.
  const onCloseRef = useRef(onClose)

  useEffect(() => {
    onCloseRef.current = onClose
  }, [onClose])

  useEffect(() => {
    const triggerElement = document.activeElement

    const handler = (e) => {
      if (e.key === 'Escape') {
        onCloseRef.current()
        return
      }
      if (e.key !== 'Tab' || !modalRef.current) return

      const focusable = Array.from(modalRef.current.querySelectorAll(FOCUSABLE_SELECTOR))
      if (focusable.length === 0) return
      const first = focusable[0]
      const last = focusable[focusable.length - 1]

      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault()
        last.focus()
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault()
        first.focus()
      }
    }

    document.body.style.overflow = 'hidden'
    window.addEventListener('keydown', handler)
    closeButtonRef.current?.focus()

    return () => {
      document.body.style.overflow = ''
      window.removeEventListener('keydown', handler)
      if (triggerElement instanceof HTMLElement) triggerElement.focus()
    }
  }, [])

  return (
    <div
      className="dicefest-modal-backdrop"
      role="dialog"
      aria-modal="true"
      onClick={onClose}
    >
      <div className="dicefest-modal" ref={modalRef} onClick={(e) => e.stopPropagation()}>
        <button ref={closeButtonRef} type="button" onClick={onClose} className="dicefest-modal__close" aria-label="Chiudi">
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
            <path d="M2 2 L12 12 M12 2 L2 12" />
          </svg>
        </button>
        <div className="dicefest-modal__scroll">
          <div className="dicefest-surface">
            {children}
          </div>
        </div>
      </div>
    </div>
  )
}

/* ============ TUTORIAL ============ */

const TUTORIAL_STEPS = [
  {
    title: 'Scegli il giorno',
    description: 'Usa le linguette in alto per passare da un giorno all\'altro. Su schermi grandi puoi anche cambiare vista, da Tabella a Lista.',
  },
  {
    title: 'Leggi i colori dei tavoli',
    description: 'Ogni riquadro è un tavolo in una fascia oraria: il colore ti dice a che punto sei con quella sessione.',
    legend: [
      { swatch: 'bg-dicefest-pink/10 border-dicefest-pink', label: 'Nel carrello — bloccato per te per 10 minuti' },
      { swatch: 'bg-dicefest-green/10 border-dicefest-green', label: 'Confermato' },
      { swatch: 'bg-dicefest-surface border-dicefest-border opacity-60 grayscale', label: 'Pieno' },
    ],
  },
  {
    title: 'Clicca un tavolo per i dettagli',
    description: 'Apri la scheda della one-shot o del Main Event: descrizione, master, sistema di gioco e posti rimasti.',
  },
  {
    title: 'Invita degli amici (facoltativo)',
    description: 'Nella stessa scheda, prima di prenotare, trovi "Invita amici": aggiungi nome ed email di chi vuoi portare con te. Riceveranno un\'email per registrarsi e confermare il loro posto — non paghi né occupi il loro posto tu.',
  },
  {
    title: 'Prenota',
    description: 'Il tavolo entra nel tuo carrello e resta bloccato per 10 minuti: il countdown è visibile nel pulsante "Clicca qui per confermare" in basso. Anche gli amici invitati restano bloccati con te.',
  },
  {
    title: 'Conferma nelle Prenotazioni',
    description: 'Apri il riepilogo e vai a "Prenotazioni" prima che scada il tempo: se i 10 minuti passano senza conferma, il tavolo si libera automaticamente per gli altri.',
  },
]

function BookingTutorial() {
  return (
    <div className="px-6 py-7 sm:px-8 sm:py-8">
      <p className="dicefest-eyebrow">Come funziona</p>
      <h2 className="mt-3 font-df-display text-2xl uppercase leading-tight text-dicefest-paper sm:text-3xl">
        Prenotare un tavolo
      </h2>
      <p className="mt-3 font-df-body text-sm leading-relaxed text-dicefest-paper/75">
        Dalla mappa alla conferma, ecco tutto il percorso in {TUTORIAL_STEPS.length} passi.
      </p>

      <ol className="mt-6 space-y-5">
        {TUTORIAL_STEPS.map((step, idx) => (
          <li key={step.title} className="flex gap-4">
            <span className="flex h-8 w-8 shrink-0 items-center justify-center border-2 border-dicefest-pink bg-dicefest-pink/10 font-df-display text-sm text-dicefest-pink">
              {idx + 1}
            </span>
            <div className="min-w-0">
              <p className="font-df-display text-base uppercase text-dicefest-paper">{step.title}</p>
              <p className="mt-1 font-df-body text-sm leading-relaxed text-dicefest-paper/75">{step.description}</p>
              {step.legend ? (
                <ul className="mt-3 space-y-1.5">
                  {step.legend.map((item) => (
                    <li key={item.label} className="flex items-center gap-2.5">
                      <span className={`h-4 w-6 shrink-0 border-2 ${item.swatch}`} aria-hidden="true" />
                      <span className="font-df-body text-xs text-dicefest-paper/75">{item.label}</span>
                    </li>
                  ))}
                </ul>
              ) : null}
            </div>
          </li>
        ))}
      </ol>
    </div>
  )
}

function OneShotDetailsModal({ session, cartState, pendingSlotId, busy, onAdd, onRemove, onClose, isLoggedIn, isAdmin }) {
  const { oneshot, slot } = session
  const isPending = pendingSlotId === slot.id
  const state = computeOneShotState({ slot, cartState, isLoggedIn, isAdmin, isPending, busy })
  // Already confirmed or already in cart (HOLD) both mean the host's own
  // seat is already taken/counted — it doesn't need to be reserved again, so
  // every remaining seat can go to a companion.
  const hostSeatTaken = state.confirmed || state.inCart
  const invite = useCompanionInvites(hostSeatTaken ? state.remaining : state.remaining - 1)

  const handleAction = async () => {
    if (state.actionKind === 'login') {
      window.location.href = '/auth/login?redirect=/dice-fest/sessioni'
    } else if (state.actionKind === 'add') {
      const ok = await onAdd(slot, invite.validCompanions)
      if (ok) invite.setCompanions([])
    } else if (state.actionKind === 'remove') {
      onRemove(slot)
    }
  }

  const handleInviteOnly = async () => {
    const ok = await onAdd(slot, invite.validCompanions)
    if (ok) invite.setCompanions([])
  }

  const actionClass = state.actionKind === 'add' && !state.disabled ? 'dicefest-btn-primary w-full' : 'dicefest-btn-secondary w-full'

  return (
    <ModalShell onClose={onClose}>
      <div className="px-6 py-7 sm:px-8 sm:py-8">
        {oneshot.image ? (
          <img
            src={oneshot.image}
            alt=""
            className="mb-5 h-40 w-full border border-dicefest-border object-cover sm:h-48"
          />
        ) : null}
        <p className="dicefest-eyebrow">{slot.day} · {slot.slot} · {slot.table}</p>
        <h2 className="mt-3 font-df-display text-2xl uppercase leading-tight text-dicefest-paper sm:text-3xl">{oneshot.title}</h2>

        <div className="mt-3 flex flex-wrap items-center gap-x-2 gap-y-1">
          <span className="dicefest-badge dicefest-badge--pink">{oneshot.game || 'Sistema GDR'}</span>
          {oneshot.association?.name ? (
            <span className="font-df-body text-xs text-dicefest-paper/50">{oneshot.association.name}</span>
          ) : null}
        </div>

        <p className="mt-3 font-df-body text-sm text-dicefest-paper/75">
          Master · <span className="font-bold text-dicefest-paper">{oneshot.master}</span>
        </p>

        {oneshot.description ? (
          <p className="dicefest-passage mt-5 text-[14px] leading-[1.7]">{oneshot.description}</p>
        ) : (
          <p className="mt-5 font-df-body text-sm italic text-dicefest-paper/50">Nessuna descrizione disponibile.</p>
        )}

        <div className="mt-6 grid grid-cols-2 gap-3 border-t border-dashed border-dicefest-border pt-5">
          <div>
            <p className="font-df-mono text-[10px] font-bold uppercase tracking-[0.22em] text-dicefest-paper/50">Posti disponibili</p>
            <p className="mt-1 font-df-display text-lg text-dicefest-paper">{state.remaining}</p>
          </div>
          {typeof oneshot.price === 'number' && oneshot.price > 0 ? (
            <div>
              <p className="font-df-mono text-[10px] font-bold uppercase tracking-[0.22em] text-dicefest-paper/50">Per tavolo</p>
              <p className="mt-1 font-df-display text-lg text-dicefest-pink">{formatCartPrice(oneshot.price, { hideWhenMissing: true })}</p>
            </div>
          ) : null}
        </div>

        {(state.actionKind === 'add' || hostSeatTaken) && invite.maxCount > 0 ? (
          <CompanionInviteFields
            companions={invite.companions}
            onChange={invite.setCompanions}
            maxCount={invite.maxCount}
            className="mt-6 border-t border-dashed border-dicefest-border pt-5"
          />
        ) : null}

        {hostSeatTaken ? (
          <button
            type="button"
            onClick={handleInviteOnly}
            disabled={busy || invite.validCompanions.length === 0}
            className="dicefest-btn-primary w-full mt-6"
          >
            Invita amici
          </button>
        ) : null}

        

        <button
          type="button"
          onClick={handleAction}
          disabled={state.disabled}
          className={`${actionClass} mt-6`}
        >
          {state.verboseLabel}
        </button>
        
          {state.actionKind === 'add' ? (
          <p className="mt-4 border border-dicefest-green/30 bg-dicefest-green/5 px-3 py-2 font-df-body text-xs leading-relaxed text-dicefest-paper">
            Ricorda che l&apos;ordine va confermato entro 10 minuti.
          </p>
        ) : null}
      </div>
    </ModalShell>
  )
}

function MainEventDetailsModal({ session, sessionKey, reservation, inCart, hasReservedKey, hasCartKey, hasOneshotConflict, pendingSessionKey, busy, onAdd, onRemove, onCancel, onClose, isLoggedIn, isAdmin }) {
  const { mainEvent, slot } = session
  const isPending = pendingSessionKey === sessionKey
  const state = computeMainEventState({ slot, reservation, inCart, hasReservedKey, hasCartKey, isLoggedIn, isAdmin, isPending, busy })
  // Already reserved or already in cart (HOLD) both mean the host's own seat
  // is already taken/counted — it doesn't need to be reserved again, so
  // every remaining seat can go to a companion.
  const hostSeatTaken = Boolean(reservation) || inCart
  const invite = useCompanionInvites(hostSeatTaken ? state.remaining : state.remaining - 1)

  const handleInviteOnly = async () => {
    const ok = await onAdd({ mainEventId: mainEvent.id, day: slot.day, slot: slot.slot }, invite.validCompanions)
    if (ok) invite.setCompanions([])
  }

  const handleAction = async () => {
    if (state.actionKind === 'login') {
      window.location.href = '/auth/login?redirect=/dice-fest/sessioni'
    } else if (state.actionKind === 'add') {
      const ok = await onAdd({ mainEventId: mainEvent.id, day: slot.day, slot: slot.slot }, invite.validCompanions)
      if (ok) invite.setCompanions([])
    } else if (state.actionKind === 'remove') {
      onRemove({ mainEventId: mainEvent.id, day: slot.day, slot: slot.slot })
    } else if (state.actionKind === 'cancel') {
      onCancel(reservation)
    }
  }

  const actionClass = state.actionKind === 'add' && !state.disabled ? 'dicefest-btn-primary w-full' : 'dicefest-btn-secondary w-full'

  return (
    <ModalShell onClose={onClose}>
      <div className="px-6 py-7 sm:px-8 sm:py-8">
        {mainEvent.image ? (
          <img
            src={mainEvent.image}
            alt=""
            className="mb-5 h-40 w-full border border-dicefest-border object-cover sm:h-48"
          />
        ) : null}
        <p className="dicefest-eyebrow">{slot.day} · {slot.slot}</p>
        <h2 className="mt-3 font-df-display text-2xl uppercase leading-tight text-dicefest-paper sm:text-3xl">{mainEvent.title}</h2>

        <div className="mt-3 flex flex-wrap items-center gap-x-2 gap-y-1">
          <span className="dicefest-badge dicefest-badge--green">Main Event</span>
          {mainEvent.game ? <span className="font-df-body text-xs text-dicefest-paper/50">{mainEvent.game}</span> : null}
        </div>

        {mainEvent.description ? (
          <p className="dicefest-passage mt-5 text-[14px] leading-[1.7]">{mainEvent.description}</p>
        ) : (
          <p className="mt-5 font-df-body text-sm italic text-dicefest-paper/50">Nessuna descrizione disponibile.</p>
        )}

        {hasOneshotConflict && !reservation ? (
          <p className="mt-4 border border-dicefest-pink/40 bg-dicefest-pink/10 px-3 py-2 font-df-body text-xs leading-relaxed text-dicefest-paper">
            Attenzione: hai una one-shot nello stesso giorno e fascia oraria.
          </p>
        ) : null}

        <div className="mt-6 grid grid-cols-2 gap-3 border-t border-dashed border-dicefest-border pt-5">
          <div>
            <p className="font-df-mono text-[10px] font-bold uppercase tracking-[0.22em] text-dicefest-paper/50">Posti disponibili</p>
            <p className="mt-1 font-df-display text-lg text-dicefest-paper">{state.remaining}</p>
          </div>
          {typeof mainEvent.price === 'number' && mainEvent.price > 0 ? (
            <div>
              <p className="font-df-mono text-[10px] font-bold uppercase tracking-[0.22em] text-dicefest-paper/50">Per tavolo</p>
              <p className="mt-1 font-df-display text-lg text-dicefest-green">{formatCartPrice(mainEvent.price, { hideWhenMissing: true })}</p>
            </div>
          ) : null}
        </div>

        {(state.actionKind === 'add' || hostSeatTaken) && invite.maxCount > 0 ? (
          <CompanionInviteFields
            companions={invite.companions}
            onChange={invite.setCompanions}
            maxCount={invite.maxCount}
            className="mt-6 border-t border-dashed border-dicefest-border pt-5"
          />
        ) : null}

        {hostSeatTaken ? (
          <button
            type="button"
            onClick={handleInviteOnly}
            disabled={busy || invite.validCompanions.length === 0}
            className="dicefest-btn-primary w-full mt-6"
          >
            Invita amici
          </button>
        ) : null}

        <button
          type="button"
          onClick={handleAction}
          disabled={state.disabled}
          className={`${actionClass} mt-6`}
        >
          {state.verboseLabel}
        </button>

         {state.actionKind === 'add' ? (
          <p className="mt-4 border border-dicefest-green/30 bg-dicefest-green/5 px-3 py-2 font-df-body text-xs leading-relaxed text-dicefest-paper">
            Ricorda che l&apos;ordine va confermato entro 10 minuti.
          </p>
        ) : null}
        
      </div>
    </ModalShell>
  )
}

/* ============ ORDER SUMMARY ============ */

const BookingOrderSummary = memo(function BookingOrderSummary({ cartState, mainCartSlots, timeRemaining, isLoggedIn, bare = false }) {
  const lowTime = timeRemaining && timeRemaining < '01:00'
  // Inside the popup (ModalShell already provides a dark surface) we
  // render a plain div instead of nesting a second ParchmentCard.
  const Wrapper = bare ? 'div' : ParchmentCard
  const wrapperProps = bare ? {} : { className: 'lg:sticky lg:top-24' }

  if (!isLoggedIn) {
    return (
      <Wrapper {...wrapperProps}>
        <div className="px-6 py-6 text-center">
          <h3 className="font-df-display text-lg uppercase text-dicefest-paper">Il tuo ordine</h3>
          <p className="mt-2 font-df-body text-sm leading-relaxed text-dicefest-paper/75">
            Accedi per prenotare il tuo posto al tavolo.
          </p>
          <Link href="/auth/login?redirect=/dice-fest/sessioni" className="dicefest-btn-primary mt-5 w-full">
            Accedi
          </Link>
        </div>
      </Wrapper>
    )
  }

  const cartAdmissions = cartState.cartAdmissions || []
  const entries = [
    ...cartAdmissions.map((admission) => ({
      key: `pass-${admission.day || 'evento'}`,
      badge: 'Pass',
      badgeClass: 'dicefest-badge dicefest-badge--pink',
      title: 'Pass giornaliero DICE FEST',
      subtitle: admission.day || 'Ingresso completo evento',
      price: admission.price ?? 0,
    })),
    ...mainCartSlots.map((slot) => ({
      key: `main-${slot.mainEventId}-${slot.day}-${slot.slot}`,
      badge: 'Main Event',
      badgeClass: 'dicefest-badge dicefest-badge--green',
      title: slot.mainEventTitle,
      subtitle: `${slot.day} · ${slot.slot}`,
      price: slot.price ?? 0,
    })),
    ...cartState.cartSlots.map((slot) => ({
      key: `oneshot-${slot.id}`,
      badge: 'One-shot',
      badgeClass: 'dicefest-badge dicefest-badge--pink',
      title: slot.oneshotTitle,
      subtitle: `${slot.day} · ${slot.slot}`,
      price: slot.price ?? 0,
    })),
  ]

  const grandTotal = entries.reduce((sum, entry) => sum + (entry.price ?? 0), 0)
  const hasPendingItems = entries.length > 0

  return (
    <Wrapper {...wrapperProps}>
      <div className="px-6 py-6">
        <div className="flex items-center justify-between gap-3">
          <h3 className="font-df-display text-lg uppercase text-dicefest-paper">Il tuo ordine</h3>
          {timeRemaining ? (
            <span className={`font-df-display text-base ${lowTime ? 'text-dicefest-pink' : 'text-dicefest-green'}`}>
              {timeRemaining}
            </span>
          ) : null}
        </div>

        {!hasPendingItems ? (
          <p className="mt-4 font-df-body text-sm leading-relaxed text-dicefest-paper/75">
            Nessuna sessione aggiunta.
          </p>
        ) : (
          <ul className="mt-4 space-y-3">
            {entries.map((entry) => (
              <li key={entry.key} className="border border-dicefest-border bg-dicefest-surface-2 px-3 py-2">
                <div className="flex items-start justify-between gap-3">
                  <span className={entry.badgeClass}>{entry.badge}</span>
                  <p className="shrink-0 font-df-body text-xs font-semibold text-dicefest-pink">{formatCartPrice(entry.price, { hideWhenMissing: true })}</p>
                </div>
                <p className="mt-2 font-df-display text-sm text-dicefest-paper line-clamp-1">{entry.title}</p>
                <p className="mt-0.5 font-df-body text-xs text-dicefest-paper/75">{entry.subtitle}</p>
              </li>
            ))}
          </ul>
        )}

        {hasPendingItems ? (
          <div className="mt-5 flex items-center justify-between border-t border-dashed border-dicefest-border pt-4">
            <span className="font-df-mono text-xs uppercase tracking-[0.18em] text-dicefest-paper/50">Totale</span>
            <span className="font-df-display text-2xl text-dicefest-green">{formatCartPrice(grandTotal)}</span>
          </div>
        ) : null}

        <Link href="/dice-fest/carrello" className="dicefest-btn-primary mt-5 w-full">
          Conferma la tua prenotazione
        </Link>

        <p className="mt-3 text-center font-df-body text-[11px] leading-relaxed text-dicefest-paper/50">
          Le prenotazioni scadono in 10 minuti dall&apos;ultima aggiunta.
        </p>
      </div>
    </Wrapper>
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
