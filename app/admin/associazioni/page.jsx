'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

export default function AdminAssociazioniPage() {
  const router = useRouter()
  const [associations, setAssociations] = useState([])
  const [loading, setLoading] = useState(true)
  const [deleteAssociationId, setDeleteAssociationId] = useState(null)
  const [deleting, setDeleting] = useState(false)
  const [deleteError, setDeleteError] = useState('')
  const [search, setSearch] = useState('')

  const loadAssociations = useCallback(async () => {
    setLoading(true)
    const response = await fetch('/api/admin/associazioni')
    if (response.ok) {
      setAssociations(await response.json())
    }
    setLoading(false)
  }, [])

  useEffect(() => {
    loadAssociations()
  }, [loadAssociations])

  const handleDelete = async () => {
    setDeleting(true)
    setDeleteError('')
    const response = await fetch(`/api/admin/associazioni/${deleteAssociationId}`, { method: 'DELETE' })
    if (!response.ok) {
      const data = await response.json().catch(() => ({}))
      setDeleting(false)
      setDeleteError(data.error || 'Eliminazione non riuscita')
      return
    }
    setDeleting(false)
    setDeleteAssociationId(null)
    loadAssociations()
  }

  const filteredAssociations = associations.filter((association) => {
    const needle = search.trim().toLowerCase()
    if (!needle) return true
    return [association.name, association.city, association.email]
      .filter(Boolean)
      .some((value) => value.toLowerCase().includes(needle))
  })

  return (
    <>
      <div className="mb-6 flex items-center justify-between gap-4">
        <div>
          <p className="mb-1 font-body text-xs font-semibold uppercase tracking-widest text-editorial-terra">Gestione</p>
          <h1 className="font-elegant text-3xl font-bold text-editorial-text">Associazioni</h1>
        </div>
        <Link href="/admin/associazioni/nuovo" className="rounded-lg bg-editorial-terra px-4 py-2 font-body text-sm font-semibold text-white transition-colors hover:bg-editorial-terra/90">
          + Nuova associazione
        </Link>
      </div>

      <div className="mb-6 rounded-xl border border-editorial-border bg-white p-6 shadow-soft">
        <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_auto] md:items-end">
          <div>
            <label className="mb-1 block font-body text-xs font-semibold uppercase tracking-wider text-editorial-text-muted">Ricerca</label>
            <input
              className="w-full rounded-lg border border-editorial-border px-3 py-2 font-body text-sm text-editorial-text outline-none transition-all focus:border-editorial-terra focus:ring-2 focus:ring-editorial-terra/10"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Cerca per nome, citta o email"
            />
          </div>
          <div className="rounded-lg border border-editorial-border bg-editorial-bg/50 px-4 py-3">
            <p className="font-body text-xs font-semibold uppercase tracking-widest text-editorial-text-muted">Totale</p>
            <p className="mt-1 font-elegant text-2xl font-bold text-editorial-text">{filteredAssociations.length}</p>
          </div>
        </div>
      </div>

      <div className="overflow-hidden rounded-xl border border-editorial-border bg-white shadow-soft">
        {loading ? (
          <div className="py-16 text-center font-body text-sm text-editorial-text-muted">Caricamento...</div>
        ) : filteredAssociations.length === 0 ? (
          <div className="py-16 text-center font-body text-sm text-editorial-text-muted">Nessuna associazione trovata.</div>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="border-b border-editorial-border bg-editorial-bg">
                <th className="px-4 py-3 text-left font-body text-xs uppercase tracking-wider text-editorial-text-muted">Associazione</th>
                <th className="hidden px-4 py-3 text-left font-body text-xs uppercase tracking-wider text-editorial-text-muted lg:table-cell">Contatti</th>
                <th className="hidden px-4 py-3 text-left font-body text-xs uppercase tracking-wider text-editorial-text-muted md:table-cell">Luogo</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-editorial-border">
              {filteredAssociations.map((association) => (
                <tr key={association.id} className="cursor-pointer transition-colors hover:bg-editorial-bg/40" onClick={() => router.push(`/admin/associazioni/${association.id}`)}>
                  <td className="px-4 py-3">
                    <p className="font-body text-sm font-semibold text-editorial-text">{association.name}</p>
                    <p className="font-body text-xs text-editorial-text-muted">{association.email || association.website || 'Scheda associazione'}</p>
                  </td>
                  <td className="hidden px-4 py-3 font-body text-sm text-editorial-text-secondary lg:table-cell">{association.email || association.website || '—'}</td>
                  <td className="hidden px-4 py-3 font-body text-sm text-editorial-text-secondary md:table-cell">{association.city || association.address || '—'}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-2">
                      <Link href={`/admin/associazioni/${association.id}`} onClick={(event) => event.stopPropagation()} className="rounded-lg border border-editorial-border px-3 py-1.5 font-body text-xs font-semibold text-editorial-text transition-colors hover:border-editorial-terra">
                        Modifica
                      </Link>
                      <button onClick={(event) => { event.stopPropagation(); setDeleteAssociationId(association.id) }} className="rounded-lg border border-red-200 px-3 py-1.5 font-body text-xs font-semibold text-red-600 transition-colors hover:bg-red-50">
                        Elimina
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {deleteAssociationId ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="w-full max-w-sm rounded-xl border border-editorial-border bg-white p-6 shadow-soft-lg">
            <h3 className="mb-2 font-elegant text-xl font-bold text-editorial-text">Eliminare l'associazione?</h3>
            <p className="mb-6 font-body text-sm text-editorial-text-secondary">L'operazione fallira se l'associazione e ancora collegata a utenti o contenuti.</p>
            {deleteError ? <p className="mb-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 font-body text-sm text-red-600">{deleteError}</p> : null}
            <div className="flex gap-2">
              <button onClick={handleDelete} disabled={deleting} className="flex-1 rounded-lg bg-red-600 py-2 font-body text-sm font-semibold text-white transition-colors hover:bg-red-700 disabled:opacity-60">
                {deleting ? 'Eliminazione...' : 'Si, elimina'}
              </button>
              <button onClick={() => { setDeleteAssociationId(null); setDeleteError('') }} className="flex-1 rounded-lg border border-editorial-border py-2 font-body text-sm font-semibold text-editorial-text transition-colors hover:border-editorial-terra">
                Annulla
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  )
}
