'use client'

import { useEffect, useState } from 'react'

export const USER_ROLES = [
  { value: 'USER', label: 'Utente' },
  { value: 'RESPONSABILE', label: 'Responsabile' },
]

const EMPTY_FORM = { email: '', name: '', phone: '', role: 'USER', associationId: '', isAdmin: false }

export default function UserForm({
  initial = EMPTY_FORM,
  associations,
  onSave,
  onCancel,
  isNew,
  accountActivated = false,
  onSendCredentialEmail,
  credentialActionState,
  onDelete,
}) {
  const [form, setForm] = useState({ ...EMPTY_FORM, ...initial })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    setForm({ ...EMPTY_FORM, ...initial })
    setError('')
    setSaving(false)
  }, [initial])

  const set = (field) => (e) => setForm((current) => ({ ...current, [field]: e.target.value }))
  const setChecked = (field) => (e) => setForm((current) => ({ ...current, [field]: e.target.checked }))

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setSaving(true)
    const result = await onSave({
      ...form,
      associationId: form.role === 'RESPONSABILE' ? form.associationId : '',
    })
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
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className={labelClass}>Email *</label>
          <input type="email" className={inputClass} value={form.email} onChange={set('email')} placeholder="utente@email.it" required />
        </div>
        <div>
          <label className={labelClass}>Ruolo</label>
          <select className={inputClass} value={form.role} onChange={set('role')}>
            {USER_ROLES.map((r) => <option key={r.value} value={r.value}>{r.label}</option>)}
          </select>
        </div>
      </div>

      {!isNew && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className={labelClass}>Nome e cognome</label>
            <input className={inputClass} value={form.name} onChange={set('name')} placeholder="Mario Rossi" />
          </div>
          <div>
            <label className={labelClass}>Telefono *</label>
            <input type="tel" className={inputClass} value={form.phone} onChange={set('phone')} placeholder="333 000 0000" required />
          </div>
        </div>
      )}

      {form.role === 'RESPONSABILE' && (
        <div>
          <label className={labelClass}>Associazione</label>
          <select className={inputClass} value={form.associationId} onChange={set('associationId')}>
            <option value="">— Nessuna —</option>
            {associations.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
          </select>
        </div>
      )}

      <label className="flex items-center gap-2 font-body text-sm text-editorial-text">
        <input type="checkbox" checked={form.isAdmin} onChange={setChecked('isAdmin')} className="h-4 w-4 rounded border-editorial-border text-editorial-terra focus:ring-editorial-terra/30" />
        Amministratore
      </label>
      <p className="font-body text-xs text-editorial-text-muted -mt-2">Privilegio indipendente dal ruolo: sblocca l'accesso al pannello admin oltre al ruolo scelto sopra.</p>

      {!isNew && (credentialActionState?.error || credentialActionState?.success) && (
        <p className={`font-body text-xs ${credentialActionState.error ? 'text-red-600' : 'text-emerald-600'}`}>
          {credentialActionState.error || credentialActionState.success}
        </p>
      )}

      <div className="flex flex-wrap gap-2 pt-2">
        <button
          type="submit"
          disabled={saving}
          className="px-4 py-2 bg-editorial-terra text-white rounded-lg font-body text-sm font-semibold hover:bg-editorial-terra/90 disabled:opacity-60 transition-colors"
        >
          {saving ? 'Salvataggio...' : isNew ? 'Crea utente' : 'Salva modifiche'}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2 border border-editorial-border text-editorial-text rounded-lg font-body text-sm font-semibold hover:border-editorial-terra transition-colors"
        >
          Annulla
        </button>
        {!isNew && onSendCredentialEmail && (
          <button
            type="button"
            onClick={onSendCredentialEmail}
            disabled={credentialActionState?.sending}
            className="px-4 py-2 border border-editorial-border text-editorial-text rounded-lg font-body text-sm font-semibold hover:border-editorial-terra hover:text-editorial-terra transition-colors disabled:opacity-60"
          >
            {credentialActionState?.sending ? 'Invio...' : (accountActivated ? 'Reset password' : 'Rinvia email di benvenuto')}
          </button>
        )}
        {!isNew && onDelete && (
          <button
            type="button"
            onClick={onDelete}
            className="ml-auto px-4 py-2 border border-red-200 text-red-600 rounded-lg font-body text-sm font-semibold hover:bg-red-50 transition-colors"
          >
            Elimina utente
          </button>
        )}
      </div>
    </form>
  )
}
