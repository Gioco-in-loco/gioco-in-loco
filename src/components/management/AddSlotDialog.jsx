'use client'

import { useState } from 'react'
import Modal from './Modal'
import { useToast } from '../../context/ToastContext'

const EMPTY_FORM = { day: '', slot: '', table: '', maxPlayers: 5, quantity: 1, tableStart: 1, adminOnly: false }

export default function AddSlotDialog({ open, onClose, eventId, eventDays, eventTimeSlots, slotsEndpointBase, onCreated }) {
  const toast = useToast()
  const [form, setForm] = useState(EMPTY_FORM)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const set = (field) => (e) => setForm((current) => ({ ...current, [field]: e.target.value }))

  const handleClose = () => {
    setForm(EMPTY_FORM)
    setError('')
    onClose()
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSaving(true)
    setError('')

    const res = await fetch(`${slotsEndpointBase}/${eventId}/slots`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...form,
        maxPlayers: Number(form.maxPlayers),
        quantity: Number(form.quantity) || 1,
        tableStart: Number(form.tableStart) || 1,
        adminOnly: Boolean(form.adminOnly),
      }),
    })
    const data = await res.json().catch(() => ({}))
    setSaving(false)

    if (!res.ok) {
      setError(data.error || 'Creazione slot non riuscita.')
      return
    }

    const createdCount = typeof data?.count === 'number' ? data.count : 1
    toast.success(createdCount > 1 ? `${createdCount} slot aggiunti al pool.` : 'Slot aggiunto al pool.')
    setForm(EMPTY_FORM)
    onCreated()
  }

  const inputClass = 'w-full rounded-lg border border-editorial-border px-3 py-2 font-body text-sm text-editorial-text outline-none focus:border-editorial-terra focus:ring-2 focus:ring-editorial-terra/10 transition-all'
  const labelClass = 'block font-body text-[11px] font-semibold text-editorial-text-muted uppercase tracking-wider mb-1'
  const notConfigured = (eventDays?.length || 0) === 0 || (eventTimeSlots?.length || 0) === 0

  return (
    <Modal open={open} onClose={handleClose} title="Aggiungi slot">
      {notConfigured ? (
        <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 font-body text-sm text-amber-700">
          Configura prima i giorni e le fasce orarie dell&apos;evento nella tab Dettaglio evento.
        </p>
      ) : (
      <form onSubmit={handleSubmit} className="space-y-3">
        {error ? <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 font-body text-sm text-red-600">{error}</p> : null}

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div>
            <label className={labelClass}>Giorno</label>
            <select className={inputClass} value={form.day} onChange={set('day')} required>
              <option value="">Seleziona</option>
              {eventDays.map((day) => <option key={day} value={day}>{day}</option>)}
            </select>
          </div>
          <div>
            <label className={labelClass}>Fascia oraria</label>
            <select className={inputClass} value={form.slot} onChange={set('slot')} required>
              <option value="">Seleziona</option>
              {eventTimeSlots.map((slotTime) => <option key={slotTime} value={slotTime}>{slotTime}</option>)}
            </select>
          </div>
        </div>

        <div>
          <label className={labelClass}>{Number(form.quantity) > 1 ? 'Nome tavolo (prefisso)' : 'Tavolo'}</label>
          <input className={inputClass} value={form.table} onChange={set('table')} placeholder="Tavolo" required />
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <div>
            <label className={labelClass}>Posti per tavolo</label>
            <input type="number" min="1" className={inputClass} value={form.maxPlayers} onChange={set('maxPlayers')} required />
          </div>
          <div>
            <label className={labelClass}>Quantità tavoli</label>
            <input type="number" min="1" max="100" className={inputClass} value={form.quantity} onChange={set('quantity')} />
          </div>
          {Number(form.quantity) > 1 ? (
            <div>
              <label className={labelClass}>Numerazione da</label>
              <input type="number" min="1" className={inputClass} value={form.tableStart} onChange={set('tableStart')} />
            </div>
          ) : null}
        </div>

        {Number(form.quantity) > 1 ? (
          <p className="font-body text-xs text-editorial-text-muted">
            Verranno creati {form.quantity} slot per {form.day || '…'} {form.slot || '…'}, con tavoli da "{form.table || 'Tavolo'} {form.tableStart}" a "{form.table || 'Tavolo'} {Number(form.tableStart) + Number(form.quantity) - 1}".
          </p>
        ) : null}

        <label className="flex items-center gap-2 font-body text-sm text-editorial-text">
          <input
            type="checkbox"
            checked={form.adminOnly}
            onChange={(e) => setForm((current) => ({ ...current, adminOnly: e.target.checked }))}
          />
          Riservato all&apos;amministratore (il responsabile non potrà assegnarlo)
        </label>

        <div className="flex gap-2 pt-2">
          <button type="submit" disabled={saving} className="rounded-lg bg-editorial-terra px-4 py-2 font-body text-sm font-semibold text-white transition-colors hover:bg-editorial-terra/90 disabled:cursor-not-allowed disabled:opacity-50">
            {saving ? 'Aggiungo...' : Number(form.quantity) > 1 ? `+ Aggiungi ${form.quantity} tavoli` : '+ Aggiungi'}
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
