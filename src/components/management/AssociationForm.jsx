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

export default function AssociationForm({ initial = EMPTY_FORM, onSave, onCancel, submitLabel, showLogoField = true }) {
  const [form, setForm] = useState({ ...EMPTY_FORM, ...initial })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    setForm({ ...EMPTY_FORM, ...initial })
    setError('')
    setSaving(false)
  }, [initial])

  const set = (field) => (event) => {
    setForm((current) => ({ ...current, [field]: event.target.value }))
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
            <input className={inputClass} value={form.logo} onChange={set('logo')} placeholder="/images/logo.png oppure URL" />
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