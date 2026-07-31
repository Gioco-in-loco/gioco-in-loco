'use client'

import { useEffect, useState } from 'react'

export const EMPTY_ONESHOT_FORM = {
  title: '',
  game: '',
  master: '',
  description: '',
  image: '',
  price: '',
  minPlayers: 1,
  maxPlayers: 6,
  eventId: '',
  associationId: '',
  slotIds: [],
}

export function formatOneShotPrice(price) {
  if (price === null || price === undefined) return 'Gratuito'
  return new Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR' }).format(price)
}

export default function OneShotForm({ initial = EMPTY_ONESHOT_FORM, associations, fixedAssociation, onSave, onCancel, isNew, uploadEndpoint }) {
  const [form, setForm] = useState(initial)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [imageUploading, setImageUploading] = useState(false)
  const [imageError, setImageError] = useState('')

  useEffect(() => {
    setForm({
      ...EMPTY_ONESHOT_FORM,
      ...initial,
      associationId: fixedAssociation?.id || initial?.associationId || '',
      slotIds: Array.isArray(initial?.slotIds) ? initial.slotIds : [],
    })
  }, [fixedAssociation?.id, initial])

  const set = (field) => (e) => setForm((current) => ({ ...current, [field]: e.target.value }))

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
      associationId: fixedAssociation?.id || form.associationId,
      price: form.price === '' ? null : Number(form.price),
      minPlayers: Number(form.minPlayers),
      maxPlayers: Number(form.maxPlayers),
      slotIds: form.slotIds,
    }

    const result = await onSave(payload)
    setSaving(false)
    if (result?.error) setError(result.error)
  }

  const inputClass = 'w-full rounded-lg border border-editorial-border px-3 py-2 font-body text-sm text-editorial-text outline-none focus:border-editorial-terra focus:ring-2 focus:ring-editorial-terra/10 transition-all'
  const labelClass = 'block font-body text-xs font-semibold text-editorial-text-muted uppercase tracking-wider mb-1'

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error ? <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 font-body text-sm text-red-600">{error}</p> : null}
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        <div>
          <label className={labelClass}>Titolo *</label>
          <input className={inputClass} value={form.title} onChange={set('title')} placeholder="Il richiamo della nebbia" required />
        </div>
        <div>
          <label className={labelClass}>Gioco *</label>
          <input className={inputClass} value={form.game} onChange={set('game')} placeholder="Call of Cthulhu" required />
        </div>
      </div>
      <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
        <div>
          <label className={labelClass}>Master *</label>
          <input className={inputClass} value={form.master} onChange={set('master')} placeholder="Mario Rossi" required />
        </div>
        <div>
          <label className={labelClass}>Associazione</label>
          {fixedAssociation ? (
            <div className="rounded-lg border border-editorial-border bg-editorial-bg/40 px-3 py-2 font-body text-sm text-editorial-text">
              {fixedAssociation.name}
            </div>
          ) : (
            <select className={inputClass} value={form.associationId} onChange={set('associationId')}>
              <option value="">Nessuna</option>
              {associations.map((association) => (
                <option key={association.id} value={association.id}>{association.name}</option>
              ))}
            </select>
          )}
        </div>
        <div>
          <label className={labelClass}>Prezzo</label>
          <input type="number" min="0" step="0.01" className={`${inputClass} disabled:cursor-not-allowed disabled:bg-editorial-bg/60 disabled:text-editorial-text-muted`} value={form.price} onChange={set('price')} placeholder="0.00" disabled />
        </div>
      </div>
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        <div>
          <label className={labelClass}>Posti minimi *</label>
          <input type="number" min="1" className={inputClass} value={form.minPlayers} onChange={set('minPlayers')} required />
        </div>
        <div>
          <label className={labelClass}>Posti massimi *</label>
          <input type="number" min={form.minPlayers || 1} className={inputClass} value={form.maxPlayers} onChange={set('maxPlayers')} required />
        </div>
      </div>
      <div>
        <label className={labelClass}>Descrizione</label>
        <textarea className={`${inputClass} resize-none`} rows={3} value={form.description} onChange={set('description')} placeholder="Descrizione della one shot..." />
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
        <button type="submit" disabled={saving} className="rounded-lg bg-editorial-terra px-4 py-2 font-body text-sm font-semibold text-white transition-colors hover:bg-editorial-terra/90 disabled:opacity-60">
          {saving ? 'Salvataggio...' : isNew ? 'Crea one shot' : 'Salva modifiche'}
        </button>
        <button type="button" onClick={onCancel} className="rounded-lg border border-editorial-border px-4 py-2 font-body text-sm font-semibold text-editorial-text transition-colors hover:border-editorial-terra">
          Annulla
        </button>
      </div>
    </form>
  )
}
