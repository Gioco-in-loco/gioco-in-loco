'use client'

import { useEffect, useState, useCallback } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import ManagementPageHeader from '../../../../src/components/management/ManagementPageHeader'
import UserForm, { USER_ROLES } from '../../../../src/components/management/UserForm'

function formatDate(dateStr) {
  if (!dateStr) return '—'
  return new Date(dateStr).toLocaleDateString('it-IT', { day: '2-digit', month: 'short', year: 'numeric' })
}

export default function AdminUserDetailPage({ params }) {
  const router = useRouter()
  const [user, setUser] = useState(null)
  const [associations, setAssociations] = useState([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState('')
  const [isEditing, setIsEditing] = useState(false)
  const [credentialActionState, setCredentialActionState] = useState(null)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [deleting, setDeleting] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    const [userRes, assocRes] = await Promise.all([
      fetch(`/api/admin/utenti/${params.id}`),
      fetch('/api/admin/associazioni'),
    ])

    if (assocRes.ok) setAssociations(await assocRes.json())

    if (!userRes.ok) {
      setLoadError('Utente non trovato.')
      setLoading(false)
      return
    }

    setUser(await userRes.json())
    setLoading(false)
  }, [params.id])

  useEffect(() => { load() }, [load])

  const handleSave = async (form) => {
    const res = await fetch(`/api/admin/utenti/${params.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    })
    const data = await res.json().catch(() => ({}))
    if (!res.ok) return { error: data.error || 'Salvataggio non riuscito.' }
    await load()
    setIsEditing(false)
    return { error: null }
  }

  const handleSendCredentialEmail = async () => {
    setCredentialActionState({ sending: true, error: '', success: '' })

    const endpoint = user.accountActivated ? 'reset-password' : 'welcome-email'
    const res = await fetch(`/api/admin/utenti/${params.id}/${endpoint}`, { method: 'POST' })
    const data = await res.json().catch(() => ({}))

    if (!res.ok) {
      setCredentialActionState({ sending: false, error: data.error || 'Invio non riuscito.', success: '' })
      return
    }

    setCredentialActionState({ sending: false, error: '', success: user.accountActivated ? 'Email reset password inviata.' : 'Invito inviato.' })
  }

  const handleDelete = async () => {
    setDeleting(true)
    await fetch(`/api/admin/utenti/${params.id}`, { method: 'DELETE' })
    setDeleting(false)
    setShowDeleteConfirm(false)
    router.push('/admin/utenti')
  }

  return (
    <>
      <ManagementPageHeader
        eyebrow="Gestione"
        title={user?.name || user?.email || 'Utente'}
        actions={(
          <Link href="/admin/utenti" className="px-4 py-2 border border-editorial-border text-editorial-text rounded-lg font-body text-sm font-semibold hover:border-editorial-terra transition-colors">
            ← Torna agli utenti
          </Link>
        )}
      />

      {loading ? (
        <div className="py-16 text-center font-body text-sm text-editorial-text-muted">Caricamento...</div>
      ) : loadError ? (
        <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 font-body text-sm text-red-600">{loadError}</p>
      ) : (
        <div className="bg-white rounded-xl border border-editorial-border p-6 shadow-soft">
          {isEditing ? (
            <UserForm
              initial={{
                email: user.email || '',
                name: user.name || '',
                phone: user.phone || '',
                role: user.role || 'USER',
                associationId: user.associationId || '',
                isAdmin: user.isAdmin || false,
              }}
              associations={associations}
              onSave={handleSave}
              onCancel={() => { setCredentialActionState(null); setIsEditing(false) }}
              accountActivated={user.accountActivated}
              onSendCredentialEmail={handleSendCredentialEmail}
              credentialActionState={credentialActionState}
              onDelete={() => setShowDeleteConfirm(true)}
            />
          ) : (
            <div className="flex items-start justify-between gap-4">
              <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <dt className="font-body text-xs font-semibold uppercase tracking-wider text-editorial-text-muted">Email</dt>
                  <dd className="mt-1 font-body text-sm text-editorial-text">{user.email || '—'}</dd>
                </div>
                <div>
                  <dt className="font-body text-xs font-semibold uppercase tracking-wider text-editorial-text-muted">Nome e cognome</dt>
                  <dd className="mt-1 font-body text-sm text-editorial-text">{user.name || '—'}</dd>
                </div>
                <div>
                  <dt className="font-body text-xs font-semibold uppercase tracking-wider text-editorial-text-muted">Telefono</dt>
                  <dd className="mt-1 font-body text-sm text-editorial-text">{user.phone || '—'}</dd>
                </div>
                <div>
                  <dt className="font-body text-xs font-semibold uppercase tracking-wider text-editorial-text-muted">Ruolo</dt>
                  <dd className="mt-1 font-body text-sm text-editorial-text">
                    {USER_ROLES.find((r) => r.value === user.role)?.label || 'Utente'}
                    {user.isAdmin ? ' · Amministratore' : ''}
                  </dd>
                </div>
                <div>
                  <dt className="font-body text-xs font-semibold uppercase tracking-wider text-editorial-text-muted">Associazione</dt>
                  <dd className="mt-1 font-body text-sm text-editorial-text">{user.managedAssociation?.name || '—'}</dd>
                </div>
                <div>
                  <dt className="font-body text-xs font-semibold uppercase tracking-wider text-editorial-text-muted">Registrato il</dt>
                  <dd className="mt-1 font-body text-sm text-editorial-text">{formatDate(user.createdAt)}</dd>
                </div>
                <div>
                  <dt className="font-body text-xs font-semibold uppercase tracking-wider text-editorial-text-muted">Account</dt>
                  <dd className="mt-1 font-body text-sm text-editorial-text">{user.accountActivated ? 'Attivato' : 'In attesa di attivazione'}</dd>
                </div>
              </dl>
              <button
                type="button"
                onClick={() => { setCredentialActionState(null); setIsEditing(true) }}
                className="shrink-0 px-4 py-2 bg-editorial-terra text-white rounded-lg font-body text-sm font-semibold hover:bg-editorial-terra/90 transition-colors"
              >
                Modifica
              </button>
            </div>
          )}
        </div>
      )}

      {showDeleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="bg-white rounded-xl border border-editorial-border p-6 shadow-soft-lg max-w-sm w-full">
            <h3 className="font-elegant text-xl text-editorial-text font-bold mb-2">Eliminare l&apos;utente?</h3>
            <p className="font-body text-sm text-editorial-text-secondary mb-6">
              Verrà rimosso dal database. L&apos;account Supabase rimarrà attivo finché non viene eliminato separatamente.
            </p>
            <div className="flex gap-2">
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="flex-1 py-2 bg-red-600 text-white rounded-lg font-body text-sm font-semibold hover:bg-red-700 disabled:opacity-60 transition-colors"
              >
                {deleting ? 'Eliminazione...' : 'Sì, elimina'}
              </button>
              <button
                onClick={() => setShowDeleteConfirm(false)}
                disabled={deleting}
                className="flex-1 py-2 border border-editorial-border text-editorial-text rounded-lg font-body text-sm font-semibold hover:border-editorial-terra transition-colors"
              >
                Annulla
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
