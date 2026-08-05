'use client'

import { useEffect, useState } from 'react'

const EMPTY_FORM = {
  name: '',
  logo: '',
  bio: '',
  address: '',
  city: '',
  openingHours: '',
  email: '',
  website: '',
  instagram: '',
  facebook: '',
  whatsapp: '',
  tiktok: '',
  linktree: '',
}

export default function AssociationForm({ initial = EMPTY_FORM, onSave, onCancel, submitLabel, showLogoField = true, uploadEndpoint }) {
  const [form, setForm] = useState({ ...EMPTY_FORM, ...initial })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [logoUploading, setLogoUploading] = useState(false)
  const [logoError, setLogoError] = useState('')

  useEffect(() => {
    setForm({ ...EMPTY_FORM, ...initial })
    setError('')
    setSaving(false)
  }, [initial])

  const set = (field) => (event) => {
    setForm((current) => ({ ...current, [field]: event.target.value }))
  }

  const handleLogoChange = async (event) => {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return

    setLogoUploading(true)
    setLogoError('')

    try {
      const body = new FormData()
      body.append('file', file)
      const response = await fetch(uploadEndpoint, { method: 'POST', body })
      const data = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(data.error || 'Caricamento immagine non riuscito.')
      setForm((current) => ({ ...current, logo: data.url }))
    } catch (uploadError) {
      setLogoError(uploadError.message || 'Caricamento immagine non riuscito.')
    } finally {
      setLogoUploading(false)
    }
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
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
      {error ? <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 font-body text-sm text-red-600">{error}</p> : null}

      <div className="grid gap-4 md:grid-cols-2">
        <div className={showLogoField ? 'md:col-span-2' : ''}>
          <label className={labelClass}>Nome *</label>
          <input className={inputClass} value={form.name} onChange={set('name')} required />
        </div>
        {!showLogoField ? (
          <div>
            <label className={labelClass}>Email</label>
            <input type="email" className={inputClass} value={form.email} onChange={set('email')} />
          </div>
        ) : null}
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {showLogoField ? (
          <div>
            <label className={labelClass}>Logo</label>
            {logoError ? <p className="mb-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 font-body text-xs text-red-600">{logoError}</p> : null}
            <div className="flex items-center gap-3">
              {form.logo ? (
                <img src={form.logo} alt="" className="h-16 w-16 rounded-lg border border-editorial-border object-cover" />
              ) : null}
              <div className="flex flex-col gap-2">
                <input
                  type="file"
                  accept="image/png,image/jpeg,image/webp,image/gif"
                  onChange={handleLogoChange}
                  disabled={logoUploading}
                  className="font-body text-xs text-editorial-text-muted file:mr-3 file:rounded-lg file:border file:border-editorial-border file:bg-white file:px-3 file:py-1.5 file:font-body file:text-xs file:font-semibold file:text-editorial-text hover:file:border-editorial-terra"
                />
                {logoUploading ? <p className="font-body text-xs text-editorial-text-muted">Caricamento in corso...</p> : null}
                {form.logo && !logoUploading ? (
                  <button type="button" onClick={() => setForm((current) => ({ ...current, logo: '' }))} className="self-start font-body text-xs font-semibold text-red-600 hover:underline">
                    Rimuovi logo
                  </button>
                ) : null}
              </div>
            </div>
            <p className="mt-1 font-body text-xs text-editorial-text-muted">PNG, JPEG, WEBP o GIF, max 3MB.</p>
          </div>
        ) : null}
        <div className={showLogoField ? '' : 'hidden'}>
          <label className={labelClass}>Email</label>
          <input type="email" className={inputClass} value={form.email} onChange={set('email')} />
        </div>
      </div>

      <div>
        <label className={labelClass}>Bio</label>
        <textarea className={`${inputClass} resize-none`} rows={5} value={form.bio} onChange={set('bio')} placeholder="Presenta l'associazione" />
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <div>
          <label className={labelClass}>Indirizzo</label>
          <input className={inputClass} value={form.address} onChange={set('address')} />
        </div>
        <div>
          <label className={labelClass}>Citta</label>
          <input className={inputClass} value={form.city} onChange={set('city')} />
        </div>
        <div>
          <label className={labelClass}>Orari</label>
          <input className={inputClass} value={form.openingHours} onChange={set('openingHours')} placeholder="Mar-Ven 18:00-23:00" />
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <div>
          <label className={labelClass}>Website</label>
          <input className={inputClass} value={form.website} onChange={set('website')} placeholder="https://..." />
        </div>
        <div>
          <label className={labelClass}>Instagram</label>
          <input className={inputClass} value={form.instagram} onChange={set('instagram')} placeholder="https://instagram.com/..." />
        </div>
        <div>
          <label className={labelClass}>Facebook</label>
          <input className={inputClass} value={form.facebook} onChange={set('facebook')} placeholder="https://facebook.com/..." />
        </div>
        <div>
          <label className={labelClass}>WhatsApp</label>
          <input className={inputClass} value={form.whatsapp} onChange={set('whatsapp')} placeholder="https://wa.me/..." />
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div>
          <label className={labelClass}>TikTok</label>
          <input className={inputClass} value={form.tiktok} onChange={set('tiktok')} placeholder="https://tiktok.com/..." />
        </div>
        <div>
          <label className={labelClass}>Linktree</label>
          <input className={inputClass} value={form.linktree} onChange={set('linktree')} placeholder="https://linktr.ee/..." />
        </div>
      </div>

      <div className="flex gap-2 pt-2">
        <button type="submit" disabled={saving} className="rounded-lg bg-editorial-terra px-4 py-2 font-body text-sm font-semibold text-white transition-colors hover:bg-editorial-terra/90 disabled:opacity-60">
          {saving ? 'Salvataggio...' : submitLabel}
        </button>
        <button type="button" onClick={onCancel} className="rounded-lg border border-editorial-border px-4 py-2 font-body text-sm font-semibold text-editorial-text transition-colors hover:border-editorial-terra">
          Annulla
        </button>
      </div>
    </form>
  )
}