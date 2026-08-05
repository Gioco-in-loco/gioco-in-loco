'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import ManagementPageHeader from '../../../../src/components/management/ManagementPageHeader'
import AssociationForm from '../../../../src/components/management/AssociationForm'

export default function AdminAssociationDetailPage({ params }) {
  const [association, setAssociation] = useState(null)
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState('')
  const [isEditing, setIsEditing] = useState(false)

  useEffect(() => {
    let cancelled = false

    const load = async () => {
      setLoading(true)
      const res = await fetch(`/api/admin/associazioni/${params.id}`)
      if (cancelled) return
      if (!res.ok) {
        setLoadError('Associazione non trovata.')
        setLoading(false)
        return
      }
      setAssociation(await res.json())
      setLoading(false)
    }

    load()
    return () => { cancelled = true }
  }, [params.id])

  const handleSave = async (form) => {
    const res = await fetch(`/api/admin/associazioni/${params.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    })
    const data = await res.json().catch(() => ({}))
    if (!res.ok) return { error: data.error || 'Aggiornamento non riuscito' }
    setAssociation(data)
    setIsEditing(false)
    return { error: null }
  }

  return (
    <>
      <ManagementPageHeader
        eyebrow="Gestione"
        title={association?.name || 'Associazione'}
        actions={(
          <Link href="/admin/associazioni" className="px-4 py-2 border border-editorial-border text-editorial-text rounded-lg font-body text-sm font-semibold hover:border-editorial-terra transition-colors">
            ← Torna alle associazioni
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
            <AssociationForm
              initial={association}
              onSave={handleSave}
              onCancel={() => setIsEditing(false)}
              submitLabel="Salva modifiche"
              uploadEndpoint="/api/admin/associazioni/upload-image"
            />
          ) : (
            <div className="flex items-start justify-between gap-4">
              <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
                <div>
                  <dt className="font-body text-xs font-semibold uppercase tracking-wider text-editorial-text-muted">Email</dt>
                  <dd className="mt-1 font-body text-sm text-editorial-text">{association.email || '—'}</dd>
                </div>
                <div>
                  <dt className="font-body text-xs font-semibold uppercase tracking-wider text-editorial-text-muted">Città</dt>
                  <dd className="mt-1 font-body text-sm text-editorial-text">{association.city || '—'}</dd>
                </div>
                <div>
                  <dt className="font-body text-xs font-semibold uppercase tracking-wider text-editorial-text-muted">Indirizzo</dt>
                  <dd className="mt-1 font-body text-sm text-editorial-text">{association.address || '—'}</dd>
                </div>
                <div>
                  <dt className="font-body text-xs font-semibold uppercase tracking-wider text-editorial-text-muted">Orari</dt>
                  <dd className="mt-1 font-body text-sm text-editorial-text">{association.openingHours || '—'}</dd>
                </div>
                <div>
                  <dt className="font-body text-xs font-semibold uppercase tracking-wider text-editorial-text-muted">Website</dt>
                  <dd className="mt-1 font-body text-sm text-editorial-text">{association.website || '—'}</dd>
                </div>
                <div>
                  <dt className="font-body text-xs font-semibold uppercase tracking-wider text-editorial-text-muted">Instagram</dt>
                  <dd className="mt-1 font-body text-sm text-editorial-text">{association.instagram || '—'}</dd>
                </div>
                <div>
                  <dt className="font-body text-xs font-semibold uppercase tracking-wider text-editorial-text-muted">Facebook</dt>
                  <dd className="mt-1 font-body text-sm text-editorial-text">{association.facebook || '—'}</dd>
                </div>
                <div>
                  <dt className="font-body text-xs font-semibold uppercase tracking-wider text-editorial-text-muted">WhatsApp</dt>
                  <dd className="mt-1 font-body text-sm text-editorial-text">{association.whatsapp || '—'}</dd>
                </div>
                <div>
                  <dt className="font-body text-xs font-semibold uppercase tracking-wider text-editorial-text-muted">Logo</dt>
                  <dd className="mt-1 font-body text-sm text-editorial-text">
                    {association.logo ? (
                      <img src={association.logo} alt="" className="h-12 w-12 rounded-lg border border-editorial-border object-cover" />
                    ) : '—'}
                  </dd>
                </div>
                <div className="sm:col-span-2 xl:col-span-3">
                  <dt className="font-body text-xs font-semibold uppercase tracking-wider text-editorial-text-muted">Bio</dt>
                  <dd className="mt-1 font-body text-sm text-editorial-text whitespace-pre-line">{association.bio || '—'}</dd>
                </div>
              </dl>
              <button
                type="button"
                onClick={() => setIsEditing(true)}
                className="shrink-0 px-4 py-2 bg-editorial-terra text-white rounded-lg font-body text-sm font-semibold hover:bg-editorial-terra/90 transition-colors"
              >
                Modifica
              </button>
            </div>
          )}
        </div>
      )}
    </>
  )
}
