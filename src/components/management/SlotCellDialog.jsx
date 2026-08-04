'use client'

import { useEffect, useState } from 'react'
import Modal from './Modal'
import OneShotFormDialog from './OneShotFormDialog'
import MainEventFormDialog from './MainEventFormDialog'
import ReservationsPanel from './ReservationsPanel'
import { useToast } from '../../context/ToastContext'

export default function SlotCellDialog({
  open,
  onClose,
  eventId,
  slot,
  eventDays,
  eventTimeSlots,
  associations,
  fixedAssociation = null,
  slotsEndpointBase,
  oneshotsEndpointBase,
  uploadEndpoint,
  canManageSlot = true,
  canManageReservations = true,
  canMarkAttendance = false,
  canDeleteReservations = true,
  canManageMainEvents = true,
  mainEventsEndpointBase = '/api/admin/main-events',
  mainEventUploadEndpoint = '/api/admin/main-events/upload-image',
  onChanged,
  onReservationsChanged,
}) {
  const toast = useToast()
  const defaultTab = (slotArg) => {
    if (canManageSlot) return 'slot'
    if (slotArg?.oneshotId) return 'oneshot'
    if (slotArg?.mainEventId) return 'mainevent'
    return 'oneshot'
  }
  const [activeTab, setActiveTab] = useState(defaultTab(slot))
  const [editingOneshot, setEditingOneshot] = useState(false)
  const [editingMainEvent, setEditingMainEvent] = useState(false)

  const [slotForm, setSlotForm] = useState(null)
  const [savingSlot, setSavingSlot] = useState(false)
  const [deletingSlot, setDeletingSlot] = useState(false)
  const [slotError, setSlotError] = useState('')

  const [oneshotDetail, setOneshotDetail] = useState(null)
  const [loadingOneshot, setLoadingOneshot] = useState(false)

  const [slotReservations, setSlotReservations] = useState(null)
  const [loadingSlotReservations, setLoadingSlotReservations] = useState(false)

  const [assignableOneshots, setAssignableOneshots] = useState([])
  const [loadingAssignable, setLoadingAssignable] = useState(false)
  const [assignSearch, setAssignSearch] = useState('')
  const [selectedAssignId, setSelectedAssignId] = useState('')
  const [assigning, setAssigning] = useState(false)
  const [detaching, setDetaching] = useState(false)
  const [oneshotError, setOneshotError] = useState('')

  const [mainEventDetail, setMainEventDetail] = useState(null)
  const [loadingMainEvent, setLoadingMainEvent] = useState(false)

  const [assignableMainEvents, setAssignableMainEvents] = useState([])
  const [loadingAssignableMainEvents, setLoadingAssignableMainEvents] = useState(false)
  const [mainEventAssignSearch, setMainEventAssignSearch] = useState('')
  const [selectedMainEventAssignId, setSelectedMainEventAssignId] = useState('')
  const [assigningMainEvent, setAssigningMainEvent] = useState(false)
  const [detachingMainEvent, setDetachingMainEvent] = useState(false)
  const [mainEventError, setMainEventError] = useState('')

  useEffect(() => {
    if (!open || !slot) return
    setSlotForm({ day: slot.day, slot: slot.slot, table: slot.table, maxPlayers: slot.maxPlayers, adminOnly: Boolean(slot.adminOnly), isVisible: slot.isVisible !== false })
    setSlotError('')
    setOneshotError('')
    setMainEventError('')
    setSelectedAssignId('')
    setAssignSearch('')
    setSelectedMainEventAssignId('')
    setMainEventAssignSearch('')
    setEditingOneshot(false)
    setEditingMainEvent(false)
    setActiveTab(defaultTab(slot))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, slot, canManageSlot])

  useEffect(() => {
    if (!open || !slot) return undefined

    let cancelled = false

    if (slot.oneshotId) {
      setLoadingOneshot(true)
      fetch(`${oneshotsEndpointBase}/${slot.oneshotId}`, { cache: 'no-store' })
        .then((res) => (res.ok ? res.json() : null))
        .then((data) => { if (!cancelled) setOneshotDetail(data) })
        .finally(() => { if (!cancelled) setLoadingOneshot(false) })

      setLoadingSlotReservations(true)
      fetch(`${slotsEndpointBase}/${eventId}/slots/${slot.id}`, { cache: 'no-store' })
        .then((res) => (res.ok ? res.json() : null))
        .then((data) => { if (!cancelled) setSlotReservations(data) })
        .finally(() => { if (!cancelled) setLoadingSlotReservations(false) })
    } else if (slot.mainEventId) {
      if (canManageMainEvents) {
        setLoadingMainEvent(true)
        fetch(`${mainEventsEndpointBase}/${slot.mainEventId}`, { cache: 'no-store' })
          .then((res) => (res.ok ? res.json() : null))
          .then((data) => { if (!cancelled) setMainEventDetail(data) })
          .finally(() => { if (!cancelled) setLoadingMainEvent(false) })
      }
    } else if (slot.adminOnly && !canManageSlot) {
      setSlotReservations(null)
    } else {
      setSlotReservations(null)
      setLoadingAssignable(true)
      fetch(`${oneshotsEndpointBase}?pageSize=200`)
        .then((res) => (res.ok ? res.json() : { items: [] }))
        .then((data) => {
          if (cancelled) return
          const items = (data.items || []).filter((oneshot) => {
            return !(oneshot.slots || []).some((s) => s.day === slot.day && s.slot === slot.slot)
          })
          setAssignableOneshots(items)
        })
        .finally(() => { if (!cancelled) setLoadingAssignable(false) })

      if (canManageMainEvents) {
        setLoadingAssignableMainEvents(true)
        fetch(`${mainEventsEndpointBase}?pageSize=200`)
          .then((res) => (res.ok ? res.json() : { items: [] }))
          .then((data) => { if (!cancelled) setAssignableMainEvents(data.items || []) })
          .finally(() => { if (!cancelled) setLoadingAssignableMainEvents(false) })
      }
    }

    return () => { cancelled = true }
  }, [open, slot, eventId, oneshotsEndpointBase, slotsEndpointBase, canManageSlot, canManageMainEvents, mainEventsEndpointBase])

  if (!slot) return null

  const handleClose = () => {
    setOneshotDetail(null)
    setSlotReservations(null)
    setAssignableOneshots([])
    setMainEventDetail(null)
    setAssignableMainEvents([])
    onClose()
  }

  const handleChanged = () => {
    onChanged()
  }

  if (editingOneshot) {
    return (
      <OneShotFormDialog
        open
        onClose={() => setEditingOneshot(false)}
        mode="edit"
        oneshotId={slot.oneshotId}
        associations={associations}
        fixedAssociation={fixedAssociation}
        oneshotsEndpointBase={oneshotsEndpointBase}
        uploadEndpoint={uploadEndpoint}
        onSaved={() => { setEditingOneshot(false); handleChanged() }}
      />
    )
  }

  if (editingMainEvent) {
    return (
      <MainEventFormDialog
        open
        onClose={() => setEditingMainEvent(false)}
        mode="edit"
        mainEventId={slot.mainEventId}
        mainEventsEndpointBase={mainEventsEndpointBase}
        uploadEndpoint={mainEventUploadEndpoint}
        onSaved={() => { setEditingMainEvent(false); handleChanged() }}
      />
    )
  }

  const setSlotField = (field) => (e) => setSlotForm((current) => ({ ...current, [field]: e.target.value }))
  const hasReservations = slot.reservationsCount > 0

  const handleSaveSlot = async (e) => {
    e.preventDefault()
    setSavingSlot(true)
    setSlotError('')

    const res = await fetch(`${slotsEndpointBase}/${eventId}/slots/${slot.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...slotForm, maxPlayers: Number(slotForm.maxPlayers) }),
    })
    const data = await res.json().catch(() => ({}))
    setSavingSlot(false)

    if (!res.ok) {
      setSlotError(data.error || 'Aggiornamento slot non riuscito.')
      return
    }

    toast.success('Slot aggiornato.')
    handleChanged()
  }

  const handleDeleteSlot = async () => {
    setDeletingSlot(true)
    setSlotError('')

    const res = await fetch(`${slotsEndpointBase}/${eventId}/slots/${slot.id}`, { method: 'DELETE' })
    const data = res.ok ? null : await res.json().catch(() => ({}))
    setDeletingSlot(false)

    if (!res.ok) {
      setSlotError(data?.error || 'Eliminazione slot non riuscita.')
      return
    }

    toast.success('Slot eliminato.')
    handleChanged()
  }

  const handleAssign = async () => {
    const chosen = assignableOneshots.find((oneshot) => oneshot.id === selectedAssignId)
    if (!chosen) return

    setAssigning(true)
    setOneshotError('')

    const nextSlotIds = [...(chosen.slots || []).map((s) => s.id), slot.id]
    const res = await fetch(`${oneshotsEndpointBase}/${chosen.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ slotIds: nextSlotIds }),
    })
    const data = await res.json().catch(() => ({}))
    setAssigning(false)

    if (!res.ok) {
      setOneshotError(data.error || 'Assegnazione non riuscita.')
      return
    }

    toast.success('One shot assegnata allo slot.')
    handleChanged()
  }

  const handleDetach = async () => {
    if (!oneshotDetail) return

    setDetaching(true)
    setOneshotError('')

    const nextSlotIds = (oneshotDetail.slots || []).map((s) => s.id).filter((id) => id !== slot.id)
    const res = await fetch(`${oneshotsEndpointBase}/${oneshotDetail.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ slotIds: nextSlotIds }),
    })
    const data = await res.json().catch(() => ({}))
    setDetaching(false)

    if (!res.ok) {
      setOneshotError(data.error || 'Rimozione assegnazione non riuscita.')
      return
    }

    toast.success('Assegnazione rimossa.')
    handleChanged()
  }

  const handleAssignMainEvent = async () => {
    const chosen = assignableMainEvents.find((mainEvent) => mainEvent.id === selectedMainEventAssignId)
    if (!chosen) return

    setAssigningMainEvent(true)
    setMainEventError('')

    const nextSlotIds = [...(chosen.slots || []).map((s) => s.id), slot.id]
    const res = await fetch(`${mainEventsEndpointBase}/${chosen.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ slotIds: nextSlotIds }),
    })
    const data = await res.json().catch(() => ({}))
    setAssigningMainEvent(false)

    if (!res.ok) {
      setMainEventError(data.error || 'Assegnazione non riuscita.')
      return
    }

    toast.success('Main event assegnato al tavolo.')
    handleChanged()
  }

  const handleDetachMainEvent = async () => {
    if (!mainEventDetail) return

    setDetachingMainEvent(true)
    setMainEventError('')

    const nextSlotIds = (mainEventDetail.slots || []).map((s) => s.id).filter((id) => id !== slot.id)
    const res = await fetch(`${mainEventsEndpointBase}/${mainEventDetail.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ slotIds: nextSlotIds }),
    })
    const data = await res.json().catch(() => ({}))
    setDetachingMainEvent(false)

    if (!res.ok) {
      setMainEventError(data.error || 'Rimozione assegnazione non riuscita.')
      return
    }

    toast.success('Assegnazione rimossa.')
    handleChanged()
  }

  const inputClass = 'w-full rounded-lg border border-editorial-border px-3 py-2 font-body text-sm text-editorial-text outline-none focus:border-editorial-terra focus:ring-2 focus:ring-editorial-terra/10 transition-all disabled:cursor-not-allowed disabled:bg-editorial-bg/60 disabled:text-editorial-text-muted'
  const labelClass = 'block font-body text-[11px] font-semibold text-editorial-text-muted uppercase tracking-wider mb-1'

  const dayOptions = Array.from(new Set([...(eventDays || []), slot.day]))
  const timeSlotOptions = Array.from(new Set([...(eventTimeSlots || []), slot.slot]))

  const visibleAssignableOneshots = assignSearch.trim()
    ? assignableOneshots.filter((oneshot) => {
        const needle = assignSearch.trim().toLowerCase()
        return oneshot.title.toLowerCase().includes(needle) || (oneshot.master || '').toLowerCase().includes(needle)
      })
    : assignableOneshots

  const visibleAssignableMainEvents = mainEventAssignSearch.trim()
    ? assignableMainEvents.filter((mainEvent) => mainEvent.title.toLowerCase().includes(mainEventAssignSearch.trim().toLowerCase()))
    : assignableMainEvents

  const isFree = !slot.oneshotId && !slot.mainEventId
  const showOneshotTab = Boolean(slot.oneshotId) || isFree
  const showMainEventTab = Boolean(slot.mainEventId) || (isFree && canManageMainEvents)
  const showPrenotatiTab = Boolean(slot.oneshotId)

  const tabButtonClass = (isActive) => `rounded-lg px-4 py-2 font-body text-sm font-semibold transition-colors ${
    isActive
      ? 'bg-editorial-terra text-white shadow-soft'
      : 'border border-editorial-border text-editorial-text hover:border-editorial-terra'
  }`

  return (
    <Modal open={open} onClose={handleClose} title={`${slot.table} · ${slot.day} ${slot.slot}`} maxWidthClass="max-w-2xl">
      <div className="space-y-4">
        <div className="flex flex-wrap gap-2 border-b border-editorial-border pb-4">
          {canManageSlot ? (
            <button type="button" onClick={() => setActiveTab('slot')} className={tabButtonClass(activeTab === 'slot')}>
              Dettaglio slot
            </button>
          ) : null}
          {showOneshotTab ? (
            <button type="button" onClick={() => setActiveTab('oneshot')} className={tabButtonClass(activeTab === 'oneshot')}>
              {slot.oneshotId ? 'Dettaglio one shot' : 'Assegna one shot'}
            </button>
          ) : null}
          {showMainEventTab ? (
            <button type="button" onClick={() => setActiveTab('mainevent')} className={tabButtonClass(activeTab === 'mainevent')}>
              {slot.mainEventId ? 'Dettaglio main event' : 'Assegna main event'}
            </button>
          ) : null}
          {showPrenotatiTab ? (
            <button type="button" onClick={() => setActiveTab('prenotati')} className={tabButtonClass(activeTab === 'prenotati')}>
              Prenotati ({slot.reservationsCount})
            </button>
          ) : null}
        </div>

        {activeTab === 'slot' ? (
        <section className="space-y-3">
          {hasReservations ? (
            <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 font-body text-xs text-amber-700">
              Questo slot ha prenotazioni attive ricordati di avvisare i partecipanti delle modifiche.
            </p>
          ) : null}
          {slotError ? <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 font-body text-sm text-red-600">{slotError}</p> : null}

          {slotForm ? (
            <form onSubmit={handleSaveSlot} className="space-y-3">
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div>
                  <label className={labelClass}>Giorno</label>
                  <select className={inputClass} value={slotForm.day} onChange={setSlotField('day')} required>
                    {dayOptions.map((day) => <option key={day} value={day}>{day}</option>)}
                  </select>
                </div>
                <div>
                  <label className={labelClass}>Fascia oraria</label>
                  <select className={inputClass} value={slotForm.slot} onChange={setSlotField('slot')} required>
                    {timeSlotOptions.map((slotTime) => <option key={slotTime} value={slotTime}>{slotTime}</option>)}
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div>
                  <label className={labelClass}>Tavolo</label>
                  <input className={inputClass} value={slotForm.table} onChange={setSlotField('table')} required />
                </div>
                <div>
                  <label className={labelClass}>Posti</label>
                  <input type="number" min="1" className={inputClass} value={slotForm.maxPlayers} onChange={setSlotField('maxPlayers')} required />
                </div>
              </div>
              <label className="flex items-center gap-2 font-body text-sm text-editorial-text">
                <input
                  type="checkbox"
                  checked={slotForm.adminOnly}
                  onChange={(e) => setSlotForm((current) => ({ ...current, adminOnly: e.target.checked }))}
                />
                Riservato all&apos;amministratore (il responsabile non potrà assegnarlo)
              </label>
              <label className="flex items-center gap-2 font-body text-sm text-editorial-text">
                <input
                  type="checkbox"
                  checked={slotForm.isVisible}
                  onChange={(e) => setSlotForm((current) => ({ ...current, isVisible: e.target.checked }))}
                />
                Visibile agli utenti per la prenotazione
              </label>
              <div className="flex flex-wrap gap-2 pt-1">
                <button type="submit" disabled={savingSlot} className="rounded-lg bg-editorial-terra px-4 py-2 font-body text-sm font-semibold text-white transition-colors hover:bg-editorial-terra/90 disabled:cursor-not-allowed disabled:opacity-50">
                  {savingSlot ? 'Salvo...' : 'Salva slot'}
                </button>
                <button
                  type="button"
                  onClick={handleDeleteSlot}
                  disabled={hasReservations || Boolean(slot.oneshotId) || Boolean(slot.mainEventId) || deletingSlot}
                  title={slot.oneshotId ? 'Rimuovi prima l\'assegnazione one shot.' : slot.mainEventId ? 'Rimuovi prima l\'assegnazione main event.' : hasReservations ? 'Non puoi eliminare uno slot con prenotazioni attive.' : undefined}
                  className="rounded-lg border border-red-200 px-4 py-2 font-body text-sm font-semibold text-red-600 transition-colors hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  {deletingSlot ? 'Elimino...' : 'Elimina slot'}
                </button>
              </div>
            </form>
          ) : null}
        </section>
        ) : activeTab === 'oneshot' ? (
        <section className="space-y-3">
          {oneshotError ? <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 font-body text-sm text-red-600">{oneshotError}</p> : null}

          {slot.oneshotId ? (
            loadingOneshot ? (
              <p className="font-body text-sm text-editorial-text-muted">Caricamento...</p>
            ) : oneshotDetail ? (
              <div className="flex flex-wrap items-start justify-between gap-3 rounded-xl border border-editorial-border bg-editorial-bg/30 p-4">
                <button type="button" onClick={() => setEditingOneshot(true)} className="group min-w-0 text-left">
                  <p className="font-body text-sm font-semibold text-editorial-text group-hover:text-editorial-terra group-hover:underline">{oneshotDetail.title}</p>
                  <p className="font-body text-xs text-editorial-text-muted">{oneshotDetail.game} · Master {oneshotDetail.master}</p>
                  {oneshotDetail.associationName ? <p className="font-body text-xs text-editorial-text-muted">{oneshotDetail.associationName}</p> : null}
                </button>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={handleDetach}
                    disabled={hasReservations || detaching}
                    title={hasReservations ? 'Non puoi rimuovere l\'assegnazione: ci sono prenotazioni attive.' : undefined}
                    className="rounded-lg border border-red-200 px-3 py-1.5 font-body text-xs font-semibold text-red-600 transition-colors hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    {detaching ? 'Rimuovo...' : 'Rimuovi assegnazione'}
                  </button>
                </div>
              </div>
            ) : (
              <p className="font-body text-sm text-editorial-text-muted">One shot non trovata.</p>
            )
          ) : slot.adminOnly && !canManageSlot ? (
            <p className="rounded-lg border border-editorial-border bg-editorial-bg/40 px-3 py-2 font-body text-sm text-editorial-text-muted">
              Questo tavolo è riservato all&apos;amministratore: non puoi assegnargli una one shot.
            </p>
          ) : loadingAssignable ? (
            <p className="font-body text-sm text-editorial-text-muted">Caricamento one shot disponibili...</p>
          ) : assignableOneshots.length === 0 ? (
            <p className="rounded-lg border border-editorial-border bg-editorial-bg/40 px-3 py-2 font-body text-sm text-editorial-text-muted">
              Nessuna one shot compatibile con questo slot (fascia oraria già occupata).
            </p>
          ) : (
            <div className="space-y-3">
              <div>
                <label className={labelClass}>Filtra per nome o master</label>
                <input
                  className={inputClass}
                  value={assignSearch}
                  onChange={(e) => { setAssignSearch(e.target.value); setSelectedAssignId('') }}
                  placeholder="Cerca one shot o master..."
                />
              </div>
              {visibleAssignableOneshots.length === 0 ? (
                <p className="rounded-lg border border-editorial-border bg-editorial-bg/40 px-3 py-2 font-body text-sm text-editorial-text-muted">
                  Nessuna one shot corrisponde alla ricerca.
                </p>
              ) : (
                <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
                  <div className="flex-1">
                    <label className={labelClass}>Assegna one shot esistente</label>
                    <select className={inputClass} value={selectedAssignId} onChange={(e) => setSelectedAssignId(e.target.value)}>
                      <option value="">Seleziona</option>
                      {visibleAssignableOneshots.map((oneshot) => (
                        <option key={oneshot.id} value={oneshot.id}>
                          {oneshot.title} · {oneshot.game}{oneshot.master ? ` · Master ${oneshot.master}` : ''}{oneshot.associationName ? ` · ${oneshot.associationName}` : ''}
                        </option>
                      ))}
                    </select>
                  </div>
                  <button
                    type="button"
                    onClick={handleAssign}
                    disabled={!selectedAssignId || assigning}
                    className="rounded-lg bg-editorial-terra px-4 py-2 font-body text-sm font-semibold text-white transition-colors hover:bg-editorial-terra/90 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {assigning ? 'Assegno...' : 'Assegna'}
                  </button>
                </div>
              )}
            </div>
          )}
        </section>
        ) : activeTab === 'mainevent' ? (
        <section className="space-y-3">
          {mainEventError ? <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 font-body text-sm text-red-600">{mainEventError}</p> : null}

          {slot.mainEventId ? (
            loadingMainEvent ? (
              <p className="font-body text-sm text-editorial-text-muted">Caricamento...</p>
            ) : mainEventDetail ? (
              <div className="flex flex-wrap items-start justify-between gap-3 rounded-xl border border-editorial-border bg-editorial-bg/30 p-4">
                <button type="button" onClick={() => setEditingMainEvent(true)} className="group min-w-0 text-left">
                  <p className="font-body text-sm font-semibold text-editorial-text group-hover:text-editorial-terra group-hover:underline">{mainEventDetail.title}</p>
                  {mainEventDetail.game ? <p className="font-body text-xs text-editorial-text-muted">{mainEventDetail.game}</p> : null}
                </button>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={handleDetachMainEvent}
                    disabled={detachingMainEvent}
                    className="rounded-lg border border-red-200 px-3 py-1.5 font-body text-xs font-semibold text-red-600 transition-colors hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    {detachingMainEvent ? 'Rimuovo...' : 'Rimuovi assegnazione'}
                  </button>
                </div>
              </div>
            ) : (
              <p className="font-body text-sm text-editorial-text-muted">Main event non trovato.</p>
            )
          ) : loadingAssignableMainEvents ? (
            <p className="font-body text-sm text-editorial-text-muted">Caricamento main event disponibili...</p>
          ) : assignableMainEvents.length === 0 ? (
            <p className="rounded-lg border border-editorial-border bg-editorial-bg/40 px-3 py-2 font-body text-sm text-editorial-text-muted">
              Nessun main event disponibile. Creane uno dalla mappa.
            </p>
          ) : (
            <div className="space-y-3">
              <div>
                <label className={labelClass}>Filtra per nome</label>
                <input
                  className={inputClass}
                  value={mainEventAssignSearch}
                  onChange={(e) => { setMainEventAssignSearch(e.target.value); setSelectedMainEventAssignId('') }}
                  placeholder="Cerca main event..."
                />
              </div>
              {visibleAssignableMainEvents.length === 0 ? (
                <p className="rounded-lg border border-editorial-border bg-editorial-bg/40 px-3 py-2 font-body text-sm text-editorial-text-muted">
                  Nessun main event corrisponde alla ricerca.
                </p>
              ) : (
                <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
                  <div className="flex-1">
                    <label className={labelClass}>Assegna main event esistente</label>
                    <select className={inputClass} value={selectedMainEventAssignId} onChange={(e) => setSelectedMainEventAssignId(e.target.value)}>
                      <option value="">Seleziona</option>
                      {visibleAssignableMainEvents.map((mainEvent) => (
                        <option key={mainEvent.id} value={mainEvent.id}>
                          {mainEvent.title}
                        </option>
                      ))}
                    </select>
                  </div>
                  <button
                    type="button"
                    onClick={handleAssignMainEvent}
                    disabled={!selectedMainEventAssignId || assigningMainEvent}
                    className="rounded-lg bg-editorial-terra px-4 py-2 font-body text-sm font-semibold text-white transition-colors hover:bg-editorial-terra/90 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {assigningMainEvent ? 'Assegno...' : 'Assegna'}
                  </button>
                </div>
              )}
              <p className="font-body text-xs text-editorial-text-muted">
                Più tavoli nella stessa fascia possono essere assegnati allo stesso main event: aumentano semplicemente la capienza totale.
              </p>
            </div>
          )}
        </section>
        ) : (
        <section className="space-y-3">
          {loadingSlotReservations ? (
            <p className="font-body text-sm text-editorial-text-muted">Caricamento...</p>
          ) : slotReservations ? (
            <ReservationsPanel
              oneshot={{ id: slotReservations.oneshotId, slots: [slotReservations] }}
              itemEndpointBase={oneshotsEndpointBase}
              canManageReservations={canManageReservations}
              canMarkAttendance={canMarkAttendance}
              canDeleteReservations={canDeleteReservations}
              hideSlotHeader
              onRefresh={async () => {
                const res = await fetch(`${slotsEndpointBase}/${eventId}/slots/${slot.id}`, { cache: 'no-store' })
                if (res.ok) setSlotReservations(await res.json())
                // La lista prenotati qui sopra si aggiorna da sola, ma il
                // conteggio "Prenotati (N)" nella tab, il blocco "elimina
                // slot" e il badge nella mappa tavoli sotto la dialog usano
                // tutti lo snapshot dello slot passato dal pannello padre:
                // senza questo, restano coi vecchi numeri finché non si
                // chiude e riapre la dialog (o si ricarica la pagina).
                onReservationsChanged?.()
              }}
            />
          ) : (
            <p className="font-body text-sm text-editorial-text-muted">One shot non trovata.</p>
          )}
        </section>
        )}
      </div>
    </Modal>
  )
}
