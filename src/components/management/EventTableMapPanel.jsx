'use client'

import { useCallback, useEffect, useState } from 'react'
import TableScheduleMap from './TableScheduleMap'
import AddSlotDialog from './AddSlotDialog'
import OneShotFormDialog from './OneShotFormDialog'
import EditOneShotDialog from './EditOneShotDialog'
import MainEventFormDialog from './MainEventFormDialog'
import EditMainEventDialog from './EditMainEventDialog'
import SlotCellDialog from './SlotCellDialog'

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
  slotsEndpointBase = '/api/admin/eventi',
  oneshotsEndpointBase = '/api/admin/oneshots',
  uploadEndpoint = '/api/admin/oneshots/upload-image',
  associationsEndpoint = '/api/admin/associazioni',
  mainEventsEndpointBase = '/api/admin/main-events',
  mainEventUploadEndpoint = '/api/admin/main-events/upload-image',
}) {
  const [slots, setSlots] = useState([])
  const [loadingSlots, setLoadingSlots] = useState(false)
  const [associations, setAssociations] = useState([])

  const [showAddSlot, setShowAddSlot] = useState(false)
  const [showCreateOneshot, setShowCreateOneshot] = useState(false)
  const [showEditOneshot, setShowEditOneshot] = useState(false)
  const [showCreateMainEvent, setShowCreateMainEvent] = useState(false)
  const [showEditMainEvent, setShowEditMainEvent] = useState(false)
  const [selectedSlot, setSelectedSlot] = useState(null)

  const loadSlots = useCallback(async () => {
    if (!eventId) { setSlots([]); return }
    setLoadingSlots(true)
    const res = await fetch(`${slotsEndpointBase}/${eventId}/slots`)
    setSlots(res.ok ? await res.json() : [])
    setLoadingSlots(false)
  }, [eventId, slotsEndpointBase])

  useEffect(() => { loadSlots() }, [loadSlots])

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

  return (
    <div className="space-y-4 rounded-xl border border-editorial-border bg-white p-6 shadow-soft">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="font-body text-xs font-semibold uppercase tracking-wider text-editorial-terra">Mappa tavoli</p>
          <p className="mt-1 font-body text-xs text-editorial-text-muted">
            Clicca su una cella libera per assegnare una one shot{canManageMainEvents ? ' o un main event' : ''}, su una occupata per vederne i dettagli e le prenotazioni.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {canAddSlot ? (
            <button
              type="button"
              onClick={() => setShowAddSlot(true)}
              className="rounded-lg bg-editorial-terra px-3 py-2 font-body text-xs font-semibold text-white transition-colors hover:bg-editorial-terra/90"
            >
              + Aggiungi slot
            </button>
          ) : null}
          <button
            type="button"
            onClick={() => setShowCreateOneshot(true)}
            className="rounded-lg border border-editorial-border px-3 py-2 font-body text-xs font-semibold text-editorial-text transition-colors hover:border-editorial-terra"
          >
            + Crea one shot
          </button>
          <button
            type="button"
            onClick={() => setShowEditOneshot(true)}
            className="rounded-lg border border-editorial-border px-3 py-2 font-body text-xs font-semibold text-editorial-text transition-colors hover:border-editorial-terra"
          >
            Modifica one shot
          </button>
          {canManageMainEvents ? (
            <>
              <button
                type="button"
                onClick={() => setShowCreateMainEvent(true)}
                className="rounded-lg border border-editorial-border px-3 py-2 font-body text-xs font-semibold text-editorial-text transition-colors hover:border-editorial-terra"
              >
                + Crea main event
              </button>
              <button
                type="button"
                onClick={() => setShowEditMainEvent(true)}
                className="rounded-lg border border-editorial-border px-3 py-2 font-body text-xs font-semibold text-editorial-text transition-colors hover:border-editorial-terra"
              >
                Modifica main event
              </button>
            </>
          ) : null}
        </div>
      </div>

      <TableScheduleMap slots={slots} loading={loadingSlots} onCellClick={setSelectedSlot} isCellClickable={isCellClickable} />

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
        mainEventsEndpointBase={mainEventsEndpointBase}
        mainEventUploadEndpoint={mainEventUploadEndpoint}
        onChanged={() => { setSelectedSlot(null); loadSlots() }}
      />
    </div>
  )
}
