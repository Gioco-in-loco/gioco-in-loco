'use client'

import { useEffect, useState } from 'react'

export const EMPTY_GAME_GDR_FORM = {
  nome: '',
  descrizione: '',
  autore: '',
  editore: '',
}

export default function GameGDRForm({ initial = EMPTY_GAME_GDR_FORM, onSave, onCancel, isNew }) {
  const [form, setForm] = useState(initial)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    setForm({ ...EMPTY_GAME_GDR_FORM, ...initial })
  }, [initial])

  const set = (field) => (e) => setForm((current) => ({ ...current, [field]: e.target.value }))

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSaving(true)
    setError('')

    const result = await onSave(form)
    setSaving(false)
    if (result?.error) setError(result.error)
  }

  const inputClass = 'w-full rounded-lg border border-editorial-border px-3 py-2 font-body text-sm text-editorial-text outline-none focus:border-editorial-terra focus:ring-2 focus:ring-editorial-terra/10 transition-all'
  const labelClass = 'block font-body text-xs font-semibold text-editorial-text-muted uppercase tracking-wider mb-1'

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && <p className="text-sm font-body text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</p>}
      <div>
        <label className={labelClass}>Nome *</label>
        <input className={inputClass} value={form.nome} onChange={set('nome')} placeholder="Dungeons & Dragons 5e" required />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div>
          <label className={labelClass}>Autore</label>
          <input className={inputClass} value={form.autore} onChange={set('autore')} placeholder="Gary Gygax" />
        </div>
        <div>
          <label className={labelClass}>Editore</label>
          <input className={inputClass} value={form.editore} onChange={set('editore')} placeholder="Wizards of the Coast" />
        </div>
      </div>
      <div>
        <label className={labelClass}>Descrizione</label>
        <textarea className={`${inputClass} resize-none`} rows={4} value={form.descrizione} onChange={set('descrizione')} placeholder="Descrizione del gioco..." />
      </div>
      <div className="flex gap-2 pt-2">
        <button type="submit" disabled={saving} className="px-4 py-2 bg-editorial-terra text-white rounded-lg font-body text-sm font-semibold hover:bg-editorial-terra/90 disabled:opacity-60 transition-colors">
          {saving ? 'Salvataggio...' : isNew ? 'Crea gioco' : 'Salva modifiche'}
        </button>
        <button type="button" onClick={onCancel} className="px-4 py-2 border border-editorial-border text-editorial-text rounded-lg font-body text-sm font-semibold hover:border-editorial-terra transition-colors">
          Annulla
        </button>
      </div>
    </form>
  )
}
