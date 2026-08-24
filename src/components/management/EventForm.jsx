'use client'

import { useState } from 'react'
import { formatRomeDateTimeLocal } from '../../lib/rome-datetime'

const WEEK_DAYS = ['Lunedi', 'Martedi', 'Mercoledi', 'Giovedi', 'Venerdi', 'Sabato', 'Domenica']
const TIME_SLOT_PATTERN = '^([01]\\d|2[0-3]):[0-5]\\d-([01]\\d|2[0-3]):[0-5]\\d$'
const TIME_SLOT_REGEX = /^([01]\d|2[0-3]):[0-5]\d-([01]\d|2[0-3]):[0-5]\d$/

const EMPTY_FORM = { externalId: '', name: '', description: '', location: '', mapsUrl: '', price: '', dailyPrice: '', days: [], timeSlots: [], startDate: '', endDate: '', bookingOpensAt: '', visibility: 'REVEALED', sessionsLocked: false }

const VISIBILITY_OPTIONS = [
  { value: 'PREVIEW', label: 'Preview', description: 'La pagina principale è visibile, ma il programma (sessioni) resta nascosto.' },
  { value: 'REVEALED', label: 'Rivelato', description: 'Tutto visibile. Le prenotazioni si aprono alla data indicata sotto.' },
]

export function toInputDate(dateStr) {
  if (!dateStr) return ''
  return new Date(dateStr).toISOString().split('T')[0]
}

export function toInputDateTime(dateStr) {
  return formatRomeDateTimeLocal(dateStr)
}

export default function EventForm({ initial = EMPTY_FORM, onSave, onCancel, isNew }) {
  const [form, setForm] = useState(initial)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [newTimeSlot, setNewTimeSlot] = useState('')
  const [timeSlotError, setTimeSlotError] = useState('')

  const set = (field) => (e) => setForm((f) => ({ ...f, [field]: e.target.value }))

  const toggleDay = (day) => {
    setForm((f) => ({
      ...f,
      days: f.days.includes(day) ? f.days.filter((d) => d !== day) : [...f.days, day],
    }))
  }

  const addTimeSlot = () => {
    const value = newTimeSlot.trim()
    if (!TIME_SLOT_REGEX.test(value)) {
      setTimeSlotError('Formato non valido, usa HH:mm-HH:mm (es. 14:00-16:00).')
      return
    }
    if (form.timeSlots.includes(value)) {
      setTimeSlotError('Questa fascia oraria è già presente.')
      return
    }
    setForm((f) => ({ ...f, timeSlots: [...f.timeSlots, value] }))
    setNewTimeSlot('')
    setTimeSlotError('')
  }

  const removeTimeSlot = (value) => {
    setForm((f) => ({ ...f, timeSlots: f.timeSlots.filter((s) => s !== value) }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setSaving(true)
    const result = await onSave(form)
    setSaving(false)
    if (result?.error) setError(result.error)
  }

  const inputClass = 'w-full rounded-lg border border-editorial-border px-3 py-2 font-body text-sm text-editorial-text outline-none focus:border-editorial-terra focus:ring-2 focus:ring-editorial-terra/10 transition-all'
  const labelClass = 'block font-body text-xs font-semibold text-editorial-text-muted uppercase tracking-wider mb-1'

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && (
        <p className="text-sm font-body text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</p>
      )}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div>
          <label className={labelClass}>ID Esterno *</label>
          <input className={inputClass} value={form.externalId} onChange={set('externalId')} placeholder="comicon-2027" required />
          <p className="font-body text-xs text-editorial-text-muted mt-1">
            {isNew ? 'Es. "napoli-gioco-2027"' : 'Usato nell\'URL della pagina: cambiarlo aggiorna il link.'}
          </p>
        </div>
        <div>
          <label className={labelClass}>Nome *</label>
          <input className={inputClass} value={form.name} onChange={set('name')} placeholder="COMICON 2027" required />
        </div>
      </div>
      <div>
        <label className={labelClass}>Location</label>
        <input className={`${inputClass} py-3 text-base`} value={form.location} onChange={set('location')} placeholder="Napoli, Mostra d'Oltremare" />
      </div>
      <div>
        <label className={labelClass}>Posizione Maps</label>
        <input type="url" className={`${inputClass} py-3 text-base`} value={form.mapsUrl} onChange={set('mapsUrl')} placeholder="https://maps.app.goo.gl/..." />
        <p className="font-body text-xs text-editorial-text-muted mt-1">Link a Google Maps (o altra mappa) con la posizione dell'evento.</p>
      </div>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div>
          <label className={labelClass}>Prezzo pass evento</label>
          <input type="number" min="0" step="0.01" className={inputClass} value={form.price} onChange={set('price')} placeholder="12.00" />
          <p className="font-body text-xs text-editorial-text-muted mt-1">Copre l'ingresso a tutte le giornate con un pagamento unico.</p>
        </div>
        <div>
          <label className={labelClass}>Prezzo ingresso giornaliero</label>
          <input type="number" min="0" step="0.01" className={inputClass} value={form.dailyPrice} onChange={set('dailyPrice')} placeholder="8.00" />
          <p className="font-body text-xs text-editorial-text-muted mt-1">Ignorato se c'è un prezzo pass evento. Vuoti entrambi = gratuito.</p>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className={labelClass}>Data inizio</label>
          <input type="date" className={inputClass} value={form.startDate} onChange={set('startDate')} />
        </div>
        <div>
          <label className={labelClass}>Data fine</label>
          <input type="date" className={inputClass} value={form.endDate} onChange={set('endDate')} />
        </div>
      </div>
      <div>
        <label className={labelClass}>Stato pagina evento</label>
        <select className={inputClass} value={form.visibility} onChange={set('visibility')}>
          {VISIBILITY_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>{option.label}</option>
          ))}
        </select>
        <p className="font-body text-xs text-editorial-text-muted mt-1">
          {VISIBILITY_OPTIONS.find((option) => option.value === form.visibility)?.description}
          {' '}Admin e responsabile vedono sempre le pagine reali, a prescindere da questo stato.
        </p>
      </div>
      <div>
        <label className="flex items-center gap-2 font-body text-sm text-editorial-text">
          <input
            type="checkbox"
            checked={form.sessionsLocked}
            onChange={(e) => setForm((f) => ({ ...f, sessionsLocked: e.target.checked }))}
          />
          Blocca modifiche one-shot ai responsabili
        </label>
        <p className="font-body text-xs text-editorial-text-muted mt-1">
          Da questo momento solo l&apos;amministratore può creare, modificare o riassegnare le one-shot di questo evento. I responsabili continuano a gestire presenze e prenotazioni.
        </p>
      </div>
      <div>
        <label className={labelClass}>Apertura prenotazioni</label>
        <input type="datetime-local" className={inputClass} value={form.bookingOpensAt} onChange={set('bookingOpensAt')} />
        <p className="font-body text-xs text-editorial-text-muted mt-1">Con stato "Rivelato", le prenotazioni sono permesse solo da questa data e ora in poi. Vuoto = nessun limite.</p>
      </div>
      <div>
        <label className={labelClass}>Giorni evento</label>
        <div className="flex flex-wrap gap-2">
          {WEEK_DAYS.map((day) => {
            const checked = form.days.includes(day)
            return (
              <button
                key={day}
                type="button"
                onClick={() => toggleDay(day)}
                className={`rounded-lg border px-3 py-1.5 font-body text-sm transition-colors ${
                  checked
                    ? 'border-editorial-terra bg-editorial-terra/10 font-semibold text-editorial-text'
                    : 'border-editorial-border bg-white text-editorial-text hover:border-editorial-terra'
                }`}
              >
                {day}
              </button>
            )
          })}
        </div>
        <p className="font-body text-xs text-editorial-text-muted mt-1">Giorni in cui si svolge l'evento. Limitano i giorni selezionabili quando si creano gli slot dei tavoli.</p>
      </div>
      <div>
        <label className={labelClass}>Fasce orarie evento</label>
        {timeSlotError ? <p className="mb-2 font-body text-xs text-red-600">{timeSlotError}</p> : null}
        <div className="flex gap-2">
          <input
            className={inputClass}
            value={newTimeSlot}
            onChange={(e) => { setNewTimeSlot(e.target.value); setTimeSlotError('') }}
            placeholder="14:00-16:00"
            pattern={TIME_SLOT_PATTERN}
            title="Formato HH:mm-HH:mm, es. 14:00-16:00"
          />
          <button
            type="button"
            onClick={addTimeSlot}
            className="shrink-0 rounded-lg border border-editorial-border px-4 py-2 font-body text-sm font-semibold text-editorial-text transition-colors hover:border-editorial-terra"
          >
            + Aggiungi
          </button>
        </div>
        {form.timeSlots.length > 0 ? (
          <div className="mt-2 flex flex-wrap gap-2">
            {form.timeSlots.map((slotTime) => (
              <span
                key={slotTime}
                className="flex items-center gap-2 rounded-lg border border-editorial-border bg-editorial-bg/50 px-3 py-1.5 font-body text-sm text-editorial-text"
              >
                {slotTime}
                <button
                  type="button"
                  onClick={() => removeTimeSlot(slotTime)}
                  className="font-semibold text-editorial-text-muted hover:text-red-600"
                  aria-label={`Rimuovi fascia ${slotTime}`}
                >
                  ✕
                </button>
              </span>
            ))}
          </div>
        ) : null}
        <p className="font-body text-xs text-editorial-text-muted mt-1">Fasce orarie disponibili per gli slot dei tavoli.</p>
      </div>
      <div>
        <label className={labelClass}>Descrizione</label>
        <textarea className={`${inputClass} resize-none py-3 text-base`} rows={5} value={form.description} onChange={set('description')} placeholder="Descrizione dell'evento..." />
      </div>
      <div className="flex gap-2 pt-2">
        <button
          type="submit"
          disabled={saving}
          className="px-4 py-2 bg-editorial-terra text-white rounded-lg font-body text-sm font-semibold hover:bg-editorial-terra/90 disabled:opacity-60 transition-colors"
        >
          {saving ? 'Salvataggio...' : isNew ? 'Crea evento' : 'Salva modifiche'}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2 border border-editorial-border text-editorial-text rounded-lg font-body text-sm font-semibold hover:border-editorial-terra transition-colors"
        >
          Annulla
        </button>
      </div>
    </form>
  )
}
