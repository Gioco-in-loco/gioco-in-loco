'use client'

import { useEffect, useState } from 'react'

export const EMPTY_MAIN_EVENT_FORM = {
  title: '',
  game: '',
  description: '',
  image: '',
  tags: [],
  price: '',
  maxPlayers: 8,
}

export function formatMainEventPrice(price) {
  if (price === null || price === undefined) return 'Gratuito'
  return new Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR' }).format(price)
}

export default function MainEventForm({ initial = EMPTY_MAIN_EVENT_FORM, onSave, onCancel, isNew, uploadEndpoint }) {
  // Il primo render usa `initial` così com'è, prima che l'effetto sotto lo
  // normalizzi: un chiamante che non passa ancora `tags` (o altri campi
  // opzionali) non deve far crashare il form al primo giro.
  const [form, setForm] = useState(() => ({ ...EMPTY_MAIN_EVENT_FORM, ...initial }))
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [imageUploading, setImageUploading] = useState(false)
  const [imageError, setImageError] = useState('')
  const [newTag, setNewTag] = useState('')

  useEffect(() => {
    setForm({
      ...EMPTY_MAIN_EVENT_FORM,
      ...initial,
      tags: Array.isArray(initial?.tags) ? initial.tags : [],
    })
  }, [initial])

  const set = (field) => (e) => setForm((current) => ({ ...current, [field]: e.target.value }))

  const addTag = () => {
    const value = newTag.trim()
    if (!value) return
    setForm((current) => ({ ...current, tags: Array.from(new Set([...current.tags, value])) }))
    setNewTag('')
  }

  const removeTag = (value) => {
    setForm((current) => ({ ...current, tags: current.tags.filter((tag) => tag !== value) }))
  }

  const handleImageChange = async (e) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return

    setImageUploading(true)
    setImageError('')

    try {
      const body = new FormData()
      body.append('file', file)
      const response = await fetch(uploadEndpoint, { method: 'POST', body })
      const data = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(data.error || 'Caricamento immagine non riuscito.')
      setForm((current) => ({ ...current, image: data.url }))
    } catch (uploadError) {
      setImageError(uploadError.message || 'Caricamento immagine non riuscito.')
    } finally {
      setImageUploading(false)
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSaving(true)
    setError('')

    const payload = {
      ...form,
      price: form.price === '' ? null : Number(form.price),
      maxPlayers: Number(form.maxPlayers),
    }

    const result = await onSave(payload)
    setSaving(false)
    if (result?.error) setError(result.error)
  }

  const inputClass = 'w-full rounded-lg border border-editorial-border px-3 py-2 font-body text-sm text-editorial-text outline-none focus:border-editorial-terra focus:ring-2 focus:ring-editorial-terra/10 transition-all'
  const labelClass = 'block font-body text-xs font-semibold text-editorial-text-muted uppercase tracking-wider mb-1'

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && <p className="text-sm font-body text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</p>}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div>
          <label className={labelClass}>Titolo *</label>
          <input className={inputClass} value={form.title} onChange={set('title')} placeholder="Torneo Splendor" required />
        </div>
        <div>
          <label className={labelClass}>Gioco</label>
          <input className={inputClass} value={form.game} onChange={set('game')} placeholder="Splendor" />
        </div>
      </div>
      <div>
        <label className={labelClass}>Posti massimi *</label>
        <input type="number" min="1" step="1" className={inputClass} value={form.maxPlayers} onChange={set('maxPlayers')} required />
        <p className="mt-1 font-body text-xs text-editorial-text-muted">
          Numero massimo di giocatori prenotabili per il main event, indipendente dai posti dei singoli tavoli assegnati.
        </p>
      </div>
      <div>
        <label className={labelClass}>Prezzo</label>
        <input type="number" min="0" step="0.01" className={`${inputClass} disabled:cursor-not-allowed disabled:bg-editorial-bg/60 disabled:text-editorial-text-muted`} value={form.price} onChange={set('price')} placeholder="0.00" disabled />
      </div>
      <div>
        <label className={labelClass}>Descrizione</label>
        <textarea className={`${inputClass} resize-none`} rows={3} value={form.description} onChange={set('description')} placeholder="Descrizione del main event..." />
      </div>
      <div>
        <label className={labelClass}>Tag (temi, difficoltà, content warning...)</label>
        <div className="flex gap-2">
          <input
            className={inputClass}
            value={newTag}
            onChange={(e) => setNewTag(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addTag() } }}
            placeholder="Competitivo, Squadre, Difficoltà: Alta..."
          />
          <button
            type="button"
            onClick={addTag}
            className="shrink-0 rounded-lg border border-editorial-border px-4 py-2 font-body text-sm font-semibold text-editorial-text transition-colors hover:border-editorial-terra"
          >
            + Aggiungi
          </button>
        </div>
        {form.tags.length > 0 ? (
          <div className="mt-2 flex flex-wrap gap-2">
            {form.tags.map((tag) => (
              <span
                key={tag}
                className="flex items-center gap-2 rounded-lg border border-editorial-border bg-editorial-bg/50 px-3 py-1.5 font-body text-sm text-editorial-text"
              >
                {tag}
                <button
                  type="button"
                  onClick={() => removeTag(tag)}
                  className="font-semibold text-editorial-text-muted hover:text-red-600"
                  aria-label={`Rimuovi tag ${tag}`}
                >
                  ✕
                </button>
              </span>
            ))}
          </div>
        ) : null}
        <p className="mt-1 font-body text-xs text-editorial-text-muted">Mostrati come badge colorati nel popup pubblico della sessione.</p>
      </div>
      <div>
        <label className={labelClass}>Immagine copertina</label>
        {imageError ? <p className="mb-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 font-body text-xs text-red-600">{imageError}</p> : null}
        <div className="flex items-center gap-3">
          {form.image ? (
            <img src={form.image} alt="" className="h-16 w-16 rounded-lg border border-editorial-border object-cover" />
          ) : null}
          <div className="flex flex-col gap-2">
            <input
              type="file"
              accept="image/png,image/jpeg,image/webp,image/gif"
              onChange={handleImageChange}
              disabled={imageUploading}
              className="font-body text-xs text-editorial-text-muted file:mr-3 file:rounded-lg file:border file:border-editorial-border file:bg-white file:px-3 file:py-1.5 file:font-body file:text-xs file:font-semibold file:text-editorial-text hover:file:border-editorial-terra"
            />
            {imageUploading ? <p className="font-body text-xs text-editorial-text-muted">Caricamento in corso...</p> : null}
            {form.image && !imageUploading ? (
              <button type="button" onClick={() => setForm((current) => ({ ...current, image: '' }))} className="self-start font-body text-xs font-semibold text-red-600 hover:underline">
                Rimuovi immagine
              </button>
            ) : null}
          </div>
        </div>
        <p className="mt-1 font-body text-xs text-editorial-text-muted">PNG, JPEG, WEBP o GIF, max 3MB.</p>
      </div>
      <div className="flex gap-2 pt-2">
        <button type="submit" disabled={saving} className="px-4 py-2 bg-editorial-terra text-white rounded-lg font-body text-sm font-semibold hover:bg-editorial-terra/90 disabled:opacity-60 transition-colors">
          {saving ? 'Salvataggio...' : isNew ? 'Crea main event' : 'Salva modifiche'}
        </button>
        <button type="button" onClick={onCancel} className="px-4 py-2 border border-editorial-border text-editorial-text rounded-lg font-body text-sm font-semibold hover:border-editorial-terra transition-colors">
          Annulla
        </button>
      </div>
    </form>
  )
}
