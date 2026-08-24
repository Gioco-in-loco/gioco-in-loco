'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import ManagementPageHeader from './ManagementPageHeader'
import MainEventForm, { formatMainEventPrice } from './MainEventForm'

export default function MainEventDetail({
  mainEventId,
  itemEndpointBase,
  uploadEndpoint,
  backHref,
}) {
  const router = useRouter()
  const [detail, setDetail] = useState(null)
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState('')
  const [isEditing, setIsEditing] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [deleting, setDeleting] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    setLoadError('')

    const detailRes = await fetch(`${itemEndpointBase}/${mainEventId}`, { cache: 'no-store' })

    const payload = await detailRes.json().catch(() => ({}))
    if (!detailRes.ok) {
      setLoadError(payload.error || 'Main event non trovato.')
      setLoading(false)
      return
    }

    setDetail(payload)
    setLoading(false)
  }, [itemEndpointBase, mainEventId])

  useEffect(() => { load() }, [load])

  const initial = useMemo(() => (detail ? {
    title: detail.title,
    game: detail.game || '',
    description: detail.description || '',
    price: detail.price ?? '',
    maxPlayers: detail.maxPlayers ?? 8,
    image: detail.image || '',
    tags: detail.tags || [],
  } : null), [detail])

  const handleSave = async (form) => {
    const res = await fetch(`${itemEndpointBase}/${mainEventId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    })
    const data = await res.json().catch(() => ({}))
    if (!res.ok) return { error: data.error }
    await load()
    setIsEditing(false)
    return { error: null }
  }

  const handleDelete = async () => {
    setDeleting(true)
    const res = await fetch(`${itemEndpointBase}/${mainEventId}`, { method: 'DELETE' })
    setDeleting(false)

    if (!res.ok) {
      setShowDeleteConfirm(false)
      return
    }

    router.push(backHref)
  }

  return (
    <>
      <ManagementPageHeader
        eyebrow="Gestione"
        title={detail?.title || 'Main event'}
        actions={(
          <div className="flex flex-wrap items-center gap-2">
            <Link href={backHref} className="px-4 py-2 border border-editorial-border text-editorial-text rounded-lg font-body text-sm font-semibold hover:border-editorial-terra transition-colors">
              ← Torna ai main event
            </Link>
            {detail ? (
              <button
                type="button"
                onClick={() => setShowDeleteConfirm(true)}
                className="px-4 py-2 border border-red-200 text-red-600 rounded-lg font-body text-sm font-semibold hover:bg-red-50 transition-colors"
              >
                Elimina main event
              </button>
            ) : null}
          </div>
        )}
      />

      {loading ? (
        <div className="py-16 text-center font-body text-sm text-editorial-text-muted">Caricamento...</div>
      ) : loadError ? (
        <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 font-body text-sm text-red-600">{loadError}</p>
      ) : (
        <div className="space-y-6">
          <div className="bg-white rounded-xl border border-editorial-border p-6 shadow-soft">
            {isEditing ? (
              <MainEventForm
                initial={initial}
                uploadEndpoint={uploadEndpoint}
                onSave={handleSave}
                onCancel={() => setIsEditing(false)}
              />
            ) : (
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-start gap-4">
                  {detail.image ? (
                    <img src={detail.image} alt="" className="hidden h-24 w-24 shrink-0 rounded-lg border border-editorial-border object-cover sm:block" />
                  ) : null}
                  <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <div>
                      <dt className="font-body text-xs font-semibold uppercase tracking-wider text-editorial-text-muted">Gioco</dt>
                      <dd className="mt-1 font-body text-sm text-editorial-text">{detail.game || '—'}</dd>
                    </div>
                    <div>
                      <dt className="font-body text-xs font-semibold uppercase tracking-wider text-editorial-text-muted">Prezzo</dt>
                      <dd className="mt-1 font-body text-sm text-editorial-text">{formatMainEventPrice(detail.price)}</dd>
                    </div>
                    <div>
                      <dt className="font-body text-xs font-semibold uppercase tracking-wider text-editorial-text-muted">Posti massimi</dt>
                      <dd className="mt-1 font-body text-sm text-editorial-text">{detail.maxPlayers}</dd>
                    </div>
                    <div>
                      <dt className="font-body text-xs font-semibold uppercase tracking-wider text-editorial-text-muted">Eventi collegati</dt>
                      <dd className="mt-1 font-body text-sm text-editorial-text">{detail.events?.length ? detail.events.map((e) => e.eventName).join(', ') : 'Nessuno'}</dd>
                    </div>
                    <div className="sm:col-span-2">
                      <dt className="font-body text-xs font-semibold uppercase tracking-wider text-editorial-text-muted">Descrizione</dt>
                      <dd className="mt-1 font-body text-sm text-editorial-text whitespace-pre-line">{detail.description || '—'}</dd>
                    </div>
                  </dl>
                </div>
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
        </div>
      )}

      {showDeleteConfirm ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="w-full max-w-sm rounded-xl border border-editorial-border bg-white p-6 shadow-soft-lg">
            <h3 className="mb-2 font-elegant text-xl font-bold text-editorial-text">Eliminare il main event?</h3>
            <p className="mb-6 font-body text-sm text-editorial-text-secondary">Questa operazione è irreversibile e rimuove anche le prenotazioni collegate; i tavoli tornano liberi nel pool degli eventi.</p>
            <div className="flex gap-2">
              <button onClick={handleDelete} disabled={deleting} className="flex-1 rounded-lg bg-red-600 py-2 font-body text-sm font-semibold text-white transition-colors hover:bg-red-700 disabled:opacity-60">
                {deleting ? 'Eliminazione...' : 'Sì, elimina'}
              </button>
              <button onClick={() => setShowDeleteConfirm(false)} disabled={deleting} className="flex-1 rounded-lg border border-editorial-border py-2 font-body text-sm font-semibold text-editorial-text transition-colors hover:border-editorial-terra">
                Annulla
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  )
}
