'use client'

import { useState } from 'react'
import { useToast } from '../../context/ToastContext'

function formatReservationStatus(status) {
  switch (status) {
    case 'PENDING':
      return 'In attesa'
    case 'CONFIRMED':
      return 'Confermato'
    case 'ATTENDED':
      return 'Presente'
    case 'CANCELLED':
      return 'Annullato'
    default:
      return status || 'Sconosciuto'
  }
}

function formatReservationDate(value) {
  if (!value) return null

  return new Intl.DateTimeFormat('it-IT', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value))
}

const EMPTY_ADD_FORM = { playerName: '', playerEmail: '', notes: '' }

export default function ReservationsPanel({ oneshot, itemEndpointBase, addPlayerEndpoint = null, canManageReservations, canMarkAttendance, canDeleteReservations = false, hideSlotHeader = false, onRefresh }) {
  const canToggleAttendance = canManageReservations || canMarkAttendance
  const toast = useToast()
  const [pendingReservationId, setPendingReservationId] = useState(null)
  const [cancelReasonReservationId, setCancelReasonReservationId] = useState(null)
  const [cancelReason, setCancelReason] = useState('')
  const [confirmDeleteId, setConfirmDeleteId] = useState(null)
  const [deletingReservationId, setDeletingReservationId] = useState(null)
  const [error, setError] = useState('')

  const [showAddForm, setShowAddForm] = useState(false)
  const [addForm, setAddForm] = useState(EMPTY_ADD_FORM)
  const [addingPlayer, setAddingPlayer] = useState(false)
  const [addError, setAddError] = useState('')

  const handleAddPlayer = async (event) => {
    event.preventDefault()
    if (!addPlayerEndpoint) return

    setAddingPlayer(true)
    setAddError('')

    try {
      const response = await fetch(addPlayerEndpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(addForm),
      })
      const payload = await response.json().catch(() => ({}))
      if (!response.ok) {
        throw new Error(payload.error || 'Aggiunta giocatore non riuscita.')
      }

      setAddForm(EMPTY_ADD_FORM)
      setShowAddForm(false)
      await onRefresh()
      toast.success('Giocatore aggiunto al tavolo.')
    } catch (addPlayerError) {
      setAddError(addPlayerError.message || 'Aggiunta giocatore non riuscita.')
    } finally {
      setAddingPlayer(false)
    }
  }

  const handleReservationAction = async (reservationId, status, cancellationReason = '') => {
    setPendingReservationId(reservationId)
    setError('')

    try {
      const response = await fetch(`${itemEndpointBase}/${oneshot.id}/reservations/${reservationId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status, cancellationReason }),
      })

      const payload = await response.json().catch(() => ({}))
      if (!response.ok) {
        throw new Error(payload.error || 'Aggiornamento prenotazione non riuscito.')
      }

      setCancelReasonReservationId(null)
      setCancelReason('')
      await onRefresh()
      toast.success(
        status === 'CANCELLED'
          ? 'Prenotazione annullata.'
          : status === 'ATTENDED'
            ? 'Presenza confermata.'
            : 'Stato prenotazione aggiornato.',
      )
    } catch (reservationError) {
      const message = reservationError.message || 'Aggiornamento prenotazione non riuscito.'
      setError(message)
      toast.error(message)
    } finally {
      setPendingReservationId(null)
    }
  }

  const handleDeleteReservation = async (reservationId) => {
    setDeletingReservationId(reservationId)
    setError('')

    try {
      const response = await fetch(`${itemEndpointBase}/${oneshot.id}/reservations/${reservationId}`, { method: 'DELETE' })

      if (!response.ok) {
        const payload = await response.json().catch(() => ({}))
        throw new Error(payload.error || 'Eliminazione prenotazione non riuscita.')
      }

      setConfirmDeleteId(null)
      await onRefresh()
      toast.success('Prenotazione eliminata definitivamente.')
    } catch (deleteError) {
      const message = deleteError.message || 'Eliminazione prenotazione non riuscita.'
      setError(message)
      toast.error(message)
    } finally {
      setDeletingReservationId(null)
    }
  }

  return (
    <section className="space-y-4 border-t border-editorial-border pt-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="mt-1 font-elegant text-xl font-bold text-editorial-text">Lista prenotati</h3>
        </div>
        <div className="flex items-center gap-3">
          <p className="font-body text-sm text-editorial-text-muted">
            {oneshot.slots.reduce((total, slot) => total + (slot.reservations?.length || 0), 0)} prenotazioni attive
          </p>
          {addPlayerEndpoint && canManageReservations ? (
            <button
              type="button"
              onClick={() => { setShowAddForm((current) => !current); setAddError('') }}
              className="rounded-lg border border-editorial-terra px-3 py-1.5 font-body text-xs font-semibold text-editorial-terra transition-colors hover:bg-editorial-terra/10"
            >
              {showAddForm ? 'Annulla' : '+ Aggiungi giocatore'}
            </button>
          ) : null}
        </div>
      </div>

      {addPlayerEndpoint && showAddForm ? (
        <form onSubmit={handleAddPlayer} className="space-y-3 rounded-xl border border-editorial-terra/40 bg-editorial-terra/5 p-4">
          {addError ? <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 font-body text-sm text-red-600">{addError}</p> : null}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label className="mb-1 block font-body text-[11px] font-semibold uppercase tracking-wider text-editorial-text-muted">Nome giocatore</label>
              <input
                required
                className="w-full rounded-lg border border-editorial-border px-3 py-2 font-body text-sm text-editorial-text outline-none focus:border-editorial-terra focus:ring-2 focus:ring-editorial-terra/10"
                value={addForm.playerName}
                onChange={(event) => setAddForm((current) => ({ ...current, playerName: event.target.value }))}
              />
            </div>
            <div>
              <label className="mb-1 block font-body text-[11px] font-semibold uppercase tracking-wider text-editorial-text-muted">Email (opzionale)</label>
              <input
                type="email"
                className="w-full rounded-lg border border-editorial-border px-3 py-2 font-body text-sm text-editorial-text outline-none focus:border-editorial-terra focus:ring-2 focus:ring-editorial-terra/10"
                value={addForm.playerEmail}
                onChange={(event) => setAddForm((current) => ({ ...current, playerEmail: event.target.value }))}
              />
            </div>
          </div>
          <div>
            <label className="mb-1 block font-body text-[11px] font-semibold uppercase tracking-wider text-editorial-text-muted">Note (opzionale)</label>
            <textarea
              rows={2}
              className="w-full rounded-lg border border-editorial-border px-3 py-2 font-body text-sm text-editorial-text outline-none focus:border-editorial-terra focus:ring-2 focus:ring-editorial-terra/10"
              value={addForm.notes}
              onChange={(event) => setAddForm((current) => ({ ...current, notes: event.target.value }))}
            />
          </div>
          <button
            type="submit"
            disabled={addingPlayer}
            className="rounded-lg bg-editorial-terra px-4 py-2 font-body text-sm font-semibold text-white transition-colors hover:bg-editorial-terra/90 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {addingPlayer ? 'Aggiungo...' : 'Aggiungi al tavolo'}
          </button>
        </form>
      ) : null}

      {error ? <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 font-body text-sm text-red-600">{error}</p> : null}

      {oneshot.slots.length === 0 ? (
        <p className="rounded-xl border border-editorial-border bg-editorial-bg/40 px-4 py-3 font-body text-sm text-editorial-text-muted">
          Nessuno slot configurato per questa one shot.
        </p>
      ) : (
        <div className="space-y-4">
          {oneshot.slots.map((slot) => (
            <div key={slot.id} className={hideSlotHeader ? 'space-y-3' : 'rounded-xl border border-editorial-border bg-editorial-bg/30 p-4'}>
              {hideSlotHeader ? null : (
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-editorial-border pb-3">
                  <div>
                    <p className="font-body text-sm font-semibold text-editorial-text">{slot.day} · {slot.slot}</p>
                    <p className="font-body text-xs text-editorial-text-muted">{slot.table} · Max {slot.maxPlayers} posti</p>
                  </div>
                  <p className="font-body text-sm text-editorial-text-secondary">{slot.reservations?.length || 0} prenotati</p>
                </div>
              )}

              {slot.reservations?.length ? (
                <div className={hideSlotHeader ? 'space-y-3' : 'mt-3 space-y-3'}>
                  {slot.reservations.map((reservation) => (
                    <div key={reservation.id} className="rounded-lg border border-editorial-border bg-white p-3">
                      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                        <div className="space-y-1">
                          <p className="font-body text-sm font-semibold text-editorial-text">{reservation.playerName || 'Nome non disponibile'}</p>
                          <p className="font-body text-sm text-editorial-text-secondary">{reservation.playerEmail || 'Email non disponibile'}</p>
                          <p className="font-body text-sm text-editorial-text-secondary">{reservation.playerPhone || 'Telefono non disponibile'}</p>
                          <p className="font-body text-xs text-editorial-text-muted">Stato: {formatReservationStatus(reservation.status)}</p>
                          {formatReservationDate(reservation.createdAt) ? (
                            <p className="font-body text-xs text-editorial-text-muted">Prenotato il {formatReservationDate(reservation.createdAt)}</p>
                          ) : null}
                          {reservation.notes ? <p className="whitespace-pre-line font-body text-xs text-editorial-text-muted">Note: {reservation.notes}</p> : null}
                        </div>
                        {canManageReservations || canMarkAttendance || canDeleteReservations ? (
                          <div className="flex flex-wrap gap-2 lg:justify-end">
                            {canManageReservations && reservation.status !== 'CONFIRMED' && reservation.status !== 'ATTENDED' ? (
                              <button
                                type="button"
                                disabled={pendingReservationId === reservation.id}
                                onClick={() => handleReservationAction(reservation.id, 'CONFIRMED')}
                                className="rounded-lg border border-editorial-border px-3 py-2 font-body text-xs font-semibold text-editorial-text transition-colors hover:border-editorial-terra disabled:opacity-50"
                              >
                                Conferma
                              </button>
                            ) : null}
                            {canToggleAttendance && reservation.status !== 'ATTENDED' ? (
                              <button
                                type="button"
                                disabled={pendingReservationId === reservation.id}
                                onClick={() => handleReservationAction(reservation.id, 'ATTENDED')}
                                className="rounded-lg border border-emerald-200 px-3 py-2 font-body text-xs font-semibold text-emerald-700 transition-colors hover:bg-emerald-50 disabled:opacity-50"
                              >
                                Segna presente
                              </button>
                            ) : null}
                            {canToggleAttendance && reservation.status === 'ATTENDED' ? (
                              <button
                                type="button"
                                disabled={pendingReservationId === reservation.id}
                                onClick={() => handleReservationAction(reservation.id, 'CONFIRMED')}
                                className="rounded-lg border border-amber-200 px-3 py-2 font-body text-xs font-semibold text-amber-700 transition-colors hover:bg-amber-50 disabled:opacity-50"
                              >
                                Segna non presente
                              </button>
                            ) : null}
                            {canManageReservations ? (
                              <button
                                type="button"
                                disabled={pendingReservationId === reservation.id}
                                onClick={() => {
                                  setError('')
                                  setConfirmDeleteId(null)
                                  setCancelReasonReservationId((current) => (current === reservation.id ? null : reservation.id))
                                  setCancelReason('')
                                }}
                                className="rounded-lg border border-red-200 px-3 py-2 font-body text-xs font-semibold text-red-600 transition-colors hover:bg-red-50 disabled:opacity-50"
                              >
                                Annulla prenotazione
                              </button>
                            ) : null}
                            {canDeleteReservations ? (
                              <button
                                type="button"
                                disabled={deletingReservationId === reservation.id}
                                onClick={() => {
                                  setError('')
                                  setCancelReasonReservationId(null)
                                  setConfirmDeleteId((current) => (current === reservation.id ? null : reservation.id))
                                }}
                                className="rounded-lg border border-red-300 px-3 py-2 font-body text-xs font-semibold text-red-700 transition-colors hover:bg-red-100 disabled:opacity-50"
                              >
                                Elimina definitivamente
                              </button>
                            ) : null}
                          </div>
                        ) : null}
                      </div>
                      {canManageReservations && cancelReasonReservationId === reservation.id ? (
                        <div className="mt-3 rounded-lg border border-red-200 bg-red-50/60 p-3">
                          <label className="mb-1 block font-body text-[11px] font-semibold uppercase tracking-wider text-red-700">Motivo annullamento</label>
                          <textarea
                            className="w-full rounded-lg border border-red-200 bg-white px-3 py-2 font-body text-sm text-editorial-text outline-none transition-all focus:border-red-400 focus:ring-2 focus:ring-red-100"
                            rows={3}
                            value={cancelReason}
                            onChange={(event) => setCancelReason(event.target.value)}
                            placeholder="Scrivi il motivo dell'annullamento..."
                          />
                          <div className="mt-3 flex flex-wrap justify-end gap-2">
                            <button
                              type="button"
                              onClick={() => {
                                setCancelReasonReservationId(null)
                                setCancelReason('')
                              }}
                              className="rounded-lg border border-editorial-border px-3 py-2 font-body text-xs font-semibold text-editorial-text transition-colors hover:border-editorial-terra"
                            >
                              Annulla azione
                            </button>
                            <button
                              type="button"
                              disabled={pendingReservationId === reservation.id}
                              onClick={() => handleReservationAction(reservation.id, 'CANCELLED', cancelReason)}
                              className="rounded-lg bg-red-600 px-3 py-2 font-body text-xs font-semibold text-white transition-colors hover:bg-red-700 disabled:opacity-50"
                            >
                              Conferma annullamento
                            </button>
                          </div>
                        </div>
                      ) : null}
                      {canDeleteReservations && confirmDeleteId === reservation.id ? (
                        <div className="mt-3 rounded-lg border border-red-300 bg-red-50/80 p-3">
                          <p className="mb-3 font-body text-xs text-red-700">
                            Eliminare definitivamente questa prenotazione? A differenza di &quot;Annulla prenotazione&quot;, questa operazione rimuove il record e non può essere annullata.
                          </p>
                          <div className="flex flex-wrap justify-end gap-2">
                            <button
                              type="button"
                              onClick={() => setConfirmDeleteId(null)}
                              className="rounded-lg border border-editorial-border px-3 py-2 font-body text-xs font-semibold text-editorial-text transition-colors hover:border-editorial-terra"
                            >
                              Annulla azione
                            </button>
                            <button
                              type="button"
                              disabled={deletingReservationId === reservation.id}
                              onClick={() => handleDeleteReservation(reservation.id)}
                              className="rounded-lg bg-red-700 px-3 py-2 font-body text-xs font-semibold text-white transition-colors hover:bg-red-800 disabled:opacity-50"
                            >
                              {deletingReservationId === reservation.id ? 'Elimino...' : 'Sì, elimina definitivamente'}
                            </button>
                          </div>
                        </div>
                      ) : null}
                    </div>
                  ))}
                </div>
              ) : (
                <p className={hideSlotHeader ? 'font-body text-sm text-editorial-text-muted' : 'mt-3 font-body text-sm text-editorial-text-muted'}>Nessun prenotato attivo per questo slot.</p>
              )}
            </div>
          ))}
        </div>
      )}
    </section>
  )
}
