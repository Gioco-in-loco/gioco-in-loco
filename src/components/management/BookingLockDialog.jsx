'use client'

import { useState } from 'react'
import Modal from './Modal'
import { useToast } from '../../context/ToastContext'

const EMPTY_FORM = { day: '', slot: '', bookingAction: '', visibilityAction: '' }

function describeScope(day, slot) {
  return slot ? `"${day}", fascia "${slot}"` : `tutta la giornata di "${day}"`
}

export default function BookingLockDialog({ open, onClose, eventId, eventDays, eventTimeSlots, slotsEndpointBase, onApplied }) {
  const toast = useToast()
  const [form, setForm] = useState(EMPTY_FORM)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const handleClose = () => {
    setForm(EMPTY_FORM)
    setError('')
    onClose()
  }

  const hasChange = Boolean(form.bookingAction || form.visibilityAction)

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!form.day || !hasChange) return

    const changes = []
    if (form.bookingAction) changes.push(form.bookingAction === 'unlock' ? 'sbloccare le prenotazioni' : 'bloccare le prenotazioni')
    if (form.visibilityAction) changes.push(form.visibilityAction === 'show' ? 'mostrare i tavoli' : 'nascondere i tavoli')

    if (!window.confirm(`Vuoi ${changes.join(' e ')} per ${describeScope(form.day, form.slot)}?`)) return

    setSaving(true)
    setError('')

    const body = { day: form.day, slot: form.slot || null }
    if (form.bookingAction) body.bookingEnabled = form.bookingAction === 'unlock'
    if (form.visibilityAction) body.isVisible = form.visibilityAction === 'show'

    const res = await fetch(`${slotsEndpointBase}/${eventId}/slots/set-booking`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
    const data = await res.json().catch(() => ({}))
    setSaving(false)

    if (!res.ok) {
      setError(data.error || 'Operazione non riuscita.')
      return
    }

    toast.success(data.count > 0 ? `Applicato a ${data.count} tavoli.` : 'Nessun tavolo trovato in questo giorno/fascia.')
    setForm(EMPTY_FORM)
    onApplied()
  }

  const inputClass = 'w-full rounded-lg border border-editorial-border px-3 py-2 font-body text-sm text-editorial-text outline-none focus:border-editorial-terra focus:ring-2 focus:ring-editorial-terra/10 transition-all'
  const labelClass = 'block font-body text-[11px] font-semibold text-editorial-text-muted uppercase tracking-wider mb-1'
  const notConfigured = (eventDays?.length || 0) === 0

  return (
    <Modal open={open} onClose={handleClose} title="Visibilità e prenotazioni">
      {notConfigured ? (
        <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 font-body text-sm text-amber-700">
          Configura prima i giorni dell&apos;evento nella tab Dettaglio evento.
        </p>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-3">
          {error ? <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 font-body text-sm text-red-600">{error}</p> : null}

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label className={labelClass}>Giorno</label>
              <select className={inputClass} value={form.day} onChange={(e) => setForm((current) => ({ ...current, day: e.target.value }))} required>
                <option value="">Seleziona</option>
                {eventDays.map((day) => <option key={day} value={day}>{day}</option>)}
              </select>
            </div>
            <div>
              <label className={labelClass}>Fascia oraria</label>
              <select className={inputClass} value={form.slot} onChange={(e) => setForm((current) => ({ ...current, slot: e.target.value }))}>
                <option value="">Tutta la giornata</option>
                {(eventTimeSlots || []).map((slotTime) => <option key={slotTime} value={slotTime}>{slotTime}</option>)}
              </select>
            </div>
          </div>

          <div>
            <label className={labelClass}>Prenotazione</label>
            <select
              className={inputClass}
              value={form.bookingAction}
              onChange={(e) => setForm((current) => ({ ...current, bookingAction: e.target.value }))}
            >
              <option value="">Non modificare</option>
              <option value="lock">Blocca prenotazioni</option>
              <option value="unlock">Sblocca prenotazioni</option>
            </select>
          </div>

          <div>
            <label className={labelClass}>Visibilità</label>
            <select
              className={inputClass}
              value={form.visibilityAction}
              onChange={(e) => setForm((current) => ({ ...current, visibilityAction: e.target.value }))}
            >
              <option value="">Non modificare</option>
              <option value="hide">Nascondi tavoli</option>
              <option value="show">Mostra tavoli</option>
            </select>
          </div>

          <p className="font-body text-xs text-editorial-text-muted">
            {form.day
              ? hasChange
                ? `Verrà applicato a ${describeScope(form.day, form.slot)}.`
                : 'Scegli almeno una modifica (prenotazione o visibilità) da applicare.'
              : 'Seleziona un giorno per continuare.'}
          </p>

          <div className="flex gap-2 pt-2">
            <button type="submit" disabled={saving || !form.day || !hasChange} className="rounded-lg bg-editorial-terra px-4 py-2 font-body text-sm font-semibold text-white transition-colors hover:bg-editorial-terra/90 disabled:cursor-not-allowed disabled:opacity-50">
              {saving ? 'Applico...' : 'Applica'}
            </button>
            <button type="button" onClick={handleClose} className="rounded-lg border border-editorial-border px-4 py-2 font-body text-sm font-semibold text-editorial-text transition-colors hover:border-editorial-terra">
              Annulla
            </button>
          </div>
        </form>
      )}
    </Modal>
  )
}
