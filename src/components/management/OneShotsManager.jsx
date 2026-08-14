'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import ManagementPageHeader from './ManagementPageHeader'

const PAGE_SIZE = 20

export default function OneShotsManager({
  eyebrow = 'Gestione',
  title = 'One shot',
  description = null,
  listEndpoint,
  routeBasePath,
  fixedAssociation = null,
  tutorialSlides = null,
}) {
  const router = useRouter()
  const [oneshots, setOneshots] = useState([])
  const [loading, setLoading] = useState(false)
  const [page, setPage] = useState(1)
  const [pagination, setPagination] = useState({ page: 1, pageSize: PAGE_SIZE, totalItems: 0, totalPages: 0 })
  const [search, setSearch] = useState('')
  const [masterSearch, setMasterSearch] = useState('')
  const [associationSearch, setAssociationSearch] = useState('')

  const showAssociationControls = !fixedAssociation

  const loadOneShots = useCallback(async (nextPage = 1, filters) => {
    const activeSearch = filters?.search ?? search
    const activeMaster = filters?.master ?? masterSearch
    const activeAssociation = showAssociationControls ? (filters?.association ?? associationSearch) : ''

    setLoading(true)
    const params = new URLSearchParams({ page: String(nextPage), pageSize: String(PAGE_SIZE) })
    if (activeSearch) params.set('search', activeSearch)
    if (activeMaster) params.set('master', activeMaster)
    if (activeAssociation) params.set('association', activeAssociation)

    const res = await fetch(`${listEndpoint}?${params.toString()}`)
    if (res.ok) {
      const data = await res.json()
      setOneshots(data.items || [])
      setPagination(data.pagination || { page: nextPage, pageSize: PAGE_SIZE, totalItems: 0, totalPages: 0 })
      setPage(nextPage)
    }
    setLoading(false)
  }, [listEndpoint, search, masterSearch, associationSearch, showAssociationControls])

  useEffect(() => {
    loadOneShots(1)
    // Il primo caricamento basta farlo una volta: i cambi di filtro richiamano
    // loadOneShots esplicitamente con i valori aggiornati.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const hasActiveFilters = Boolean(search || masterSearch || associationSearch)

  const inputClass = 'w-full rounded-lg border border-editorial-border px-3 py-2 font-body text-sm text-editorial-text outline-none transition-all focus:border-editorial-terra focus:ring-2 focus:ring-editorial-terra/10'
  const labelClass = 'mb-1 block font-body text-xs font-semibold uppercase tracking-wider text-editorial-text-muted'

  return (
    <>
      <ManagementPageHeader
        eyebrow={eyebrow}
        title={title}
        description={description}
        tutorialSlides={tutorialSlides}
        actions={(
          <Link
            href={`${routeBasePath}/nuovo`}
            className="rounded-lg bg-editorial-terra px-4 py-2 font-body text-sm font-semibold text-white transition-colors hover:bg-editorial-terra/90"
          >
            + Aggiungi
          </Link>
        )}
      />

      <div className="mb-6 space-y-4 rounded-xl border border-editorial-border bg-white p-6 shadow-soft">
        <div className={`grid grid-cols-1 items-end gap-3 ${showAssociationControls ? 'md:grid-cols-[1fr_1fr_1fr_auto]' : 'md:grid-cols-[1fr_1fr_auto]'}`}>
          <div>
            <label className={labelClass}>Cerca per nome</label>
            <input
              className={inputClass}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') loadOneShots(1) }}
              placeholder="Titolo one shot..."
            />
          </div>
          <div>
            <label className={labelClass}>Cerca per master</label>
            <input
              className={inputClass}
              value={masterSearch}
              onChange={(e) => setMasterSearch(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') loadOneShots(1) }}
              placeholder="Nome master..."
            />
          </div>
          {showAssociationControls ? (
            <div>
              <label className={labelClass}>Cerca per associazione</label>
              <input
                className={inputClass}
                value={associationSearch}
                onChange={(e) => setAssociationSearch(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') loadOneShots(1) }}
                placeholder="Nome associazione..."
              />
            </div>
          ) : null}
          <button
            type="button"
            onClick={() => loadOneShots(1)}
            disabled={loading}
            className="rounded-lg bg-editorial-text px-4 py-2 font-body text-sm font-semibold text-white transition-colors hover:bg-editorial-text/90 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {loading ? 'Cerco...' : 'Cerca'}
          </button>
        </div>

        {hasActiveFilters ? (
          <div className="flex items-center justify-between gap-3">
            <p className="font-body text-sm text-editorial-text-secondary">Filtri attivi.</p>
            <button
              type="button"
              onClick={() => {
                setSearch('')
                setMasterSearch('')
                setAssociationSearch('')
                loadOneShots(1, { search: '', master: '', association: '' })
              }}
              className="rounded-lg border border-editorial-border px-3 py-2 font-body text-sm font-semibold text-editorial-text transition-colors hover:border-editorial-terra"
            >
              Reset filtri
            </button>
          </div>
        ) : null}
      </div>

      <div className="overflow-x-auto rounded-xl border border-editorial-border bg-white shadow-soft">
        {loading ? (
          <div className="py-16 text-center font-body text-sm text-editorial-text-muted">Caricamento...</div>
        ) : oneshots.length === 0 ? (
          <div className="py-16 text-center font-body text-sm text-editorial-text-muted">Nessuna one shot trovata.</div>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="border-b border-editorial-border bg-editorial-bg">
                <th className="px-4 py-3 text-left font-body text-xs uppercase tracking-wider text-editorial-text-muted">One shot</th>
                {showAssociationControls ? <th className="hidden px-4 py-3 text-left font-body text-xs uppercase tracking-wider text-editorial-text-muted lg:table-cell">Associazione</th> : null}
              </tr>
            </thead>
            <tbody className="divide-y divide-editorial-border">
              {oneshots.map((oneshot) => (
                <tr key={oneshot.id} className="cursor-pointer transition-colors hover:bg-editorial-bg/40" onClick={() => router.push(`${routeBasePath}/${oneshot.id}`)}>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      {oneshot.image ? (
                        <img src={oneshot.image} alt="" className="hidden h-10 w-10 shrink-0 rounded-lg border border-editorial-border object-cover sm:block" />
                      ) : null}
                      <div>
                        <p className="font-body text-sm font-semibold text-editorial-text">{oneshot.title}</p>
                        <p className="font-body text-xs text-editorial-text-muted">{oneshot.game} · {oneshot.master}</p>
                      </div>
                    </div>
                  </td>
                  {showAssociationControls ? <td className="hidden px-4 py-3 font-body text-sm text-editorial-text-secondary lg:table-cell">{oneshot.associationName || '—'}</td> : null}
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {pagination.totalPages > 1 ? (
        <div className="mt-4 flex items-center justify-between gap-4">
          <p className="font-body text-sm text-editorial-text-muted">Pagina {pagination.page} di {pagination.totalPages} · {pagination.totalItems} one shot</p>
          <div className="flex items-center gap-2">
            <button type="button" onClick={() => loadOneShots(page - 1)} disabled={page <= 1 || loading} className="rounded-lg border border-editorial-border px-3 py-2 font-body text-sm font-semibold text-editorial-text transition-colors hover:border-editorial-terra disabled:cursor-not-allowed disabled:opacity-50">
              Precedente
            </button>
            <button type="button" onClick={() => loadOneShots(page + 1)} disabled={page >= pagination.totalPages || loading} className="rounded-lg border border-editorial-border px-3 py-2 font-body text-sm font-semibold text-editorial-text transition-colors hover:border-editorial-terra disabled:cursor-not-allowed disabled:opacity-50">
              Successiva
            </button>
          </div>
        </div>
      ) : null}
    </>
  )
}
