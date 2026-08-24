'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import TableScheduleMap from './TableScheduleMap'
import AddSlotDialog from './AddSlotDialog'
import OneShotFormDialog from './OneShotFormDialog'
import EditOneShotDialog from './EditOneShotDialog'
import MainEventFormDialog from './MainEventFormDialog'
import EditMainEventDialog from './EditMainEventDialog'
import SlotCellDialog from './SlotCellDialog'
import BookingLockDialog from './BookingLockDialog'
import ActionsMenu, { ActionsMenuItem } from './ActionsMenu'
import { useToast } from '../../context/ToastContext'

const AT_RISK_MAX_PLAYERS = 2
const EMPTY_FILTERS = { association: '', game: '', master: '', atRisk: false }

function normalizeFilterValue(value) {
  return String(value || '').trim().toLocaleLowerCase('it-IT')
}

function buildFilterOptions(values) {
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

export default function EventTableMapPanel({
  eventId,
  eventDays = [],
  eventTimeSlots = [],
  fixedAssociation = null,
  canAddSlot = true,
  canManageSlot = true,
  canManageReservations = true,
  canMarkAttendance = false,
  canDeleteReservations = true,
  canManageMainEvents = true,
  canManageOneShots = true,
  slotsEndpointBase = '/api/admin/eventi',
  oneshotsEndpointBase = '/api/admin/oneshots',
  uploadEndpoint = '/api/admin/oneshots/upload-image',
  associationsEndpoint = '/api/admin/associazioni',
  mainEventsEndpointBase = '/api/admin/main-events',
  mainEventUploadEndpoint = '/api/admin/main-events/upload-image',
}) {
  const toast = useToast()
  const [slots, setSlots] = useState([])
  const [loadingSlots, setLoadingSlots] = useState(false)
  const [associations, setAssociations] = useState([])

  const [showAddSlot, setShowAddSlot] = useState(false)
  const [showCreateOneshot, setShowCreateOneshot] = useState(false)
  const [showEditOneshot, setShowEditOneshot] = useState(false)
  const [showCreateMainEvent, setShowCreateMainEvent] = useState(false)
  const [showEditMainEvent, setShowEditMainEvent] = useState(false)
  const [selectedSlot, setSelectedSlot] = useState(null)
  const [filters, setFilters] = useState(EMPTY_FILTERS)
  const [showBookingLockDialog, setShowBookingLockDialog] = useState(false)

  const loadSlots = useCallback(async () => {
    if (!eventId) { setSlots([]); return [] }
    setLoadingSlots(true)
    const res = await fetch(`${slotsEndpointBase}/${eventId}/slots`)
    const data = res.ok ? await res.json() : []
    setSlots(data)
    setLoadingSlots(false)
    return data
  }, [eventId, slotsEndpointBase])

  useEffect(() => { loadSlots() }, [loadSlots])

  // Rinfresca i dati dello slot mostrati dietro la dialog (mappa tavoli,
  // conteggio prenotati) senza chiuderla — a differenza di onChanged, usato
  // dopo assegnazioni/modifiche che concludono l'interazione con lo slot.
  const refreshSlotsKeepingSelection = useCallback(async () => {
    const data = await loadSlots()
    setSelectedSlot((current) => (current ? data.find((s) => s.id === current.id) || current : current))
  }, [loadSlots])

  const handleMoveSlot = useCallback(async (sourceSlotId, targetSlotId) => {
    const res = await fetch(`${slotsEndpointBase}/${eventId}/slots/move`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sourceSlotId, targetSlotId }),
    })
    const data = await res.json().catch(() => ({}))

    if (!res.ok) {
      toast.error(data.error || 'Spostamento non riuscito.')
      return
    }

    toast.success(data.swapped ? 'Sessioni scambiate.' : 'Sessione spostata.')
    loadSlots()
  }, [eventId, slotsEndpointBase, toast, loadSlots])

  useEffect(() => {
    if (!associationsEndpoint) return undefined

    let cancelled = false
    fetch(associationsEndpoint).then(async (res) => {
      if (cancelled || !res.ok) return
      setAssociations(await res.json())
    })
    return () => { cancelled = true }
  }, [associationsEndpoint])

  // Una cella libera è sempre cliccabile, tranne quelle marcate "adminOnly" per
  // chi non gestisce lo slot (il responsabile) — restano visibili in griglia ma
  // non selezionabili. Una cella occupata da una one-shot è cliccabile solo se
  // non c'è un'associazione fissa (vista admin) oppure se lo slot appartiene
  // proprio a quell'associazione. Una cella occupata da un main event è
  // cliccabile solo per chi può gestire i main event (mai il responsabile).
  const isCellClickable = useCallback((cell) => {
    if (!cell.oneshotId && !cell.mainEventId && cell.adminOnly && !canManageSlot) return false
    if (cell.mainEventId) return canManageMainEvents
    if (!fixedAssociation) return true
    if (!cell.oneshotId) return true
    return cell.associationId === fixedAssociation.id
  }, [fixedAssociation, canManageSlot, canManageMainEvents])

  const filterOptions = useMemo(() => ({
    associations: buildFilterOptions(slots.filter((s) => s.oneshotId).map((s) => s.associationName)),
    games: buildFilterOptions(slots.map((s) => s.oneshotGame || s.mainEventGame)),
    masters: buildFilterOptions(slots.filter((s) => s.oneshotId).map((s) => s.oneshotMaster)),
  }), [slots])

  const hasActiveFilters = Object.values(filters).some(Boolean)

  // Le sessioni che non corrispondono ai filtri si oscurano ma restano al
  // loro posto in griglia (come nella mappa pubblica): admin/responsabile
  // devono poter continuare a vedere e gestire la struttura completa della
  // sala, i filtri servono solo a far risaltare quello che stanno cercando.
  const isSlotDimmed = useCallback((cell) => {
    if (!hasActiveFilters) return false

    const game = cell.oneshotId ? cell.oneshotGame : cell.mainEventGame
    const association = cell.oneshotId ? cell.associationName : null
    const master = cell.oneshotId ? cell.oneshotMaster : null

    if (filters.association && normalizeFilterValue(association) !== filters.association) return true
    if (filters.game && normalizeFilterValue(game) !== filters.game) return true
    if (filters.master && normalizeFilterValue(master) !== filters.master) return true

    // "A rischio": una sessione assegnata (one-shot o main event) con pochi
    // iscritti — le celle libere non c'entrano, non c'è nulla che rischi di
    // saltare se non è mai stato programmato nulla.
    if (filters.atRisk) {
      const isBookable = Boolean(cell.oneshotId || cell.mainEventId)
      if (!isBookable || (cell.reservationsCount || 0) > AT_RISK_MAX_PLAYERS) return true
    }

    return false
  }, [filters, hasActiveFilters])

  return (
    <div className="space-y-4 rounded-xl border border-editorial-border bg-white p-6 shadow-soft">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="font-body text-xs font-semibold uppercase tracking-wider text-editorial-terra">Mappa tavoli</p>
          <p className="mt-1 font-body text-xs text-editorial-text-muted">
            Clicca su una cella libera per assegnare una one shot{canManageMainEvents ? ' o un main event' : ''}, su una occupata per vederne i dettagli e le prenotazioni.
          </p>
        </div>
        <ActionsMenu label="Azioni">
          {canAddSlot ? (
            <ActionsMenuItem onClick={() => setShowAddSlot(true)}>
              + Aggiungi slot
            </ActionsMenuItem>
          ) : null}
          {canManageOneShots ? (
            <>
              <ActionsMenuItem onClick={() => setShowCreateOneshot(true)}>
                + Crea one shot
              </ActionsMenuItem>
              <ActionsMenuItem onClick={() => setShowEditOneshot(true)}>
                Modifica one shot
              </ActionsMenuItem>
            </>
          ) : null}
          {canManageMainEvents ? (
            <>
              <ActionsMenuItem onClick={() => setShowCreateMainEvent(true)}>
                + Crea main event
              </ActionsMenuItem>
              <ActionsMenuItem onClick={() => setShowEditMainEvent(true)}>
                Modifica main event
              </ActionsMenuItem>
            </>
          ) : null}
          {canManageSlot ? (
            <ActionsMenuItem as="a" href={`${slotsEndpointBase}/${eventId}/slots/export`} className="text-editorial-forest">
              Esporta Excel
            </ActionsMenuItem>
          ) : null}
          {canManageSlot ? (
            <ActionsMenuItem onClick={() => setShowBookingLockDialog(true)}>
              Visibilità / prenotazioni per giorno o fascia
            </ActionsMenuItem>
          ) : null}
        </ActionsMenu>
      </div>

      <div className="flex flex-wrap items-end gap-3 rounded-lg border border-editorial-border bg-editorial-bg/30 p-3">
        <div>
          <label className="mb-1 block font-body text-[11px] font-semibold uppercase tracking-wider text-editorial-text-muted">Associazione</label>
          <select
            value={filters.association}
            onChange={(e) => setFilters((current) => ({ ...current, association: e.target.value }))}
            className="rounded-lg border border-editorial-border px-3 py-1.5 font-body text-sm text-editorial-text outline-none focus:border-editorial-terra"
          >
            <option value="">Tutte</option>
            {filterOptions.associations.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
          </select>
        </div>
        <div>
          <label className="mb-1 block font-body text-[11px] font-semibold uppercase tracking-wider text-editorial-text-muted">Gioco</label>
          <select
            value={filters.game}
            onChange={(e) => setFilters((current) => ({ ...current, game: e.target.value }))}
            className="rounded-lg border border-editorial-border px-3 py-1.5 font-body text-sm text-editorial-text outline-none focus:border-editorial-terra"
          >
            <option value="">Tutti</option>
            {filterOptions.games.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
          </select>
        </div>
        <div>
          <label className="mb-1 block font-body text-[11px] font-semibold uppercase tracking-wider text-editorial-text-muted">Master</label>
          <select
            value={filters.master}
            onChange={(e) => setFilters((current) => ({ ...current, master: e.target.value }))}
            className="rounded-lg border border-editorial-border px-3 py-1.5 font-body text-sm text-editorial-text outline-none focus:border-editorial-terra"
          >
            <option value="">Tutti</option>
            {filterOptions.masters.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
          </select>
        </div>
        <div>
          <label className="mb-1 block font-body text-[11px] font-semibold uppercase tracking-wider text-editorial-text-muted">&nbsp;</label>
          <label className="flex items-center gap-2 rounded-lg border border-editorial-border px-3 py-1.5 font-body text-sm text-editorial-text">
            <input
              type="checkbox"
              checked={filters.atRisk}
              onChange={(e) => setFilters((current) => ({ ...current, atRisk: e.target.checked }))}
            />
            A rischio (≤ {AT_RISK_MAX_PLAYERS} prenotati)
          </label>
        </div>
        <button
          type="button"
          onClick={() => setFilters(EMPTY_FILTERS)}
          disabled={!hasActiveFilters}
          className="rounded-lg border border-editorial-border px-3 py-1.5 font-body text-xs font-semibold text-editorial-text transition-colors hover:border-editorial-terra disabled:cursor-not-allowed disabled:opacity-40"
        >
          Reset filtri
        </button>
      </div>

      <TableScheduleMap
        slots={slots}
        loading={loadingSlots}
        onCellClick={setSelectedSlot}
        isCellClickable={isCellClickable}
        onMoveSlot={handleMoveSlot}
        canDragAssignments={canManageSlot}
        isDimmed={isSlotDimmed}
      />

      {canAddSlot ? (
        <AddSlotDialog
          open={showAddSlot}
          onClose={() => setShowAddSlot(false)}
          eventId={eventId}
          eventDays={eventDays}
          eventTimeSlots={eventTimeSlots}
          slotsEndpointBase={slotsEndpointBase}
          onCreated={() => { setShowAddSlot(false); loadSlots() }}
        />
      ) : null}

      {canManageSlot ? (
        <BookingLockDialog
          open={showBookingLockDialog}
          onClose={() => setShowBookingLockDialog(false)}
          eventId={eventId}
          eventDays={eventDays}
          eventTimeSlots={eventTimeSlots}
          slotsEndpointBase={slotsEndpointBase}
          onApplied={() => { setShowBookingLockDialog(false); loadSlots() }}
        />
      ) : null}

      <OneShotFormDialog
        open={showCreateOneshot}
        onClose={() => setShowCreateOneshot(false)}
        mode="create"
        associations={associations}
        fixedAssociation={fixedAssociation}
        oneshotsEndpointBase={oneshotsEndpointBase}
        uploadEndpoint={uploadEndpoint}
        onSaved={() => { setShowCreateOneshot(false); loadSlots() }}
      />

      <EditOneShotDialog
        open={showEditOneshot}
        onClose={() => setShowEditOneshot(false)}
        eventId={eventId}
        associations={associations}
        fixedAssociation={fixedAssociation}
        oneshotsEndpointBase={oneshotsEndpointBase}
        uploadEndpoint={uploadEndpoint}
        onSaved={() => { setShowEditOneshot(false); loadSlots() }}
      />

      {canManageMainEvents ? (
        <>
          <MainEventFormDialog
            open={showCreateMainEvent}
            onClose={() => setShowCreateMainEvent(false)}
            mode="create"
            mainEventsEndpointBase={mainEventsEndpointBase}
            uploadEndpoint={mainEventUploadEndpoint}
            onSaved={() => { setShowCreateMainEvent(false); loadSlots() }}
          />

          <EditMainEventDialog
            open={showEditMainEvent}
            onClose={() => setShowEditMainEvent(false)}
            eventId={eventId}
            mainEventsEndpointBase={mainEventsEndpointBase}
            uploadEndpoint={mainEventUploadEndpoint}
            onSaved={() => { setShowEditMainEvent(false); loadSlots() }}
          />
        </>
      ) : null}

      <SlotCellDialog
        open={Boolean(selectedSlot)}
        onClose={() => setSelectedSlot(null)}
        eventId={eventId}
        slot={selectedSlot}
        eventDays={eventDays}
        eventTimeSlots={eventTimeSlots}
        associations={associations}
        fixedAssociation={fixedAssociation}
        slotsEndpointBase={slotsEndpointBase}
        oneshotsEndpointBase={oneshotsEndpointBase}
        uploadEndpoint={uploadEndpoint}
        canManageSlot={canManageSlot}
        canManageReservations={canManageReservations}
        canMarkAttendance={canMarkAttendance}
        canDeleteReservations={canDeleteReservations}
        canManageMainEvents={canManageMainEvents}
        canManageOneShots={canManageOneShots}
        mainEventsEndpointBase={mainEventsEndpointBase}
        mainEventUploadEndpoint={mainEventUploadEndpoint}
        onChanged={() => { setSelectedSlot(null); loadSlots() }}
        onReservationsChanged={refreshSlotsKeepingSelection}
      />
    </div>
  )
}
