'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import ManagementPageHeader from './ManagementPageHeader'

const PAGE_SIZE = 20

export default function MainEventsManager({
  eyebrow = 'Gestione',
  title = 'Main event',
  description = null,
  listEndpoint,
  routeBasePath,
}) {
  const router = useRouter()
  const [mainEvents, setMainEvents] = useState([])
  const [loading, setLoading] = useState(false)
  const [page, setPage] = useState(1)
  const [pagination, setPagination] = useState({ page: 1, pageSize: PAGE_SIZE, totalItems: 0, totalPages: 0 })
  const [search, setSearch] = useState('')

  const loadMainEvents = useCallback(async (nextPage = 1, filters) => {
    const activeSearch = filters?.search ?? search

    setLoading(true)
    const params = new URLSearchParams({ page: String(nextPage), pageSize: String(PAGE_SIZE) })
    if (activeSearch) params.set('search', activeSearch)

    const res = await fetch(`${listEndpoint}?${params.toString()}`)
    if (res.ok) {
      const data = await res.json()
      setMainEvents(data.items || [])
      setPagination(data.pagination || { page: nextPage, pageSize: PAGE_SIZE, totalItems: 0, totalPages: 0 })
      setPage(nextPage)
    }
    setLoading(false)
  }, [listEndpoint, search])

  useEffect(() => {
    loadMainEvents(1)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const hasActiveFilters = Boolean(search)

  const inputClass = 'w-full rounded-lg border border-editorial-border px-3 py-2 font-body text-sm text-editorial-text outline-none transition-all focus:border-editorial-terra focus:ring-2 focus:ring-editorial-terra/10'
  const labelClass = 'mb-1 block font-body text-xs font-semibold uppercase tracking-wider text-editorial-text-muted'

  return (
    <>
      <ManagementPageHeader
        eyebrow={eyebrow}
        title={title}
        description={description}
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
        <div className="grid grid-cols-1 items-end gap-3 md:grid-cols-[1fr_auto]">
          <div>
            <label className={labelClass}>Cerca per nome</label>
            <input
              className={inputClass}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') loadMainEvents(1) }}
              placeholder="Titolo main event..."
            />
          </div>
          <button
            type="button"
            onClick={() => loadMainEvents(1)}
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
                loadMainEvents(1, { search: '' })
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
        ) : mainEvents.length === 0 ? (
          <div className="py-16 text-center font-body text-sm text-editorial-text-muted">Nessun main event trovato.</div>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="border-b border-editorial-border bg-editorial-bg">
                <th className="px-4 py-3 text-left font-body text-xs uppercase tracking-wider text-editorial-text-muted">Main event</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-editorial-border">
              {mainEvents.map((mainEvent) => (
                <tr key={mainEvent.id} className="cursor-pointer transition-colors hover:bg-editorial-bg/40" onClick={() => router.push(`${routeBasePath}/${mainEvent.id}`)}>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      {mainEvent.image ? (
                        <img src={mainEvent.image} alt="" className="hidden h-10 w-10 shrink-0 rounded-lg border border-editorial-border object-cover sm:block" />
                      ) : null}
                      <div>
                        <p className="font-body text-sm font-semibold text-editorial-text">{mainEvent.title}</p>
                        <p className="font-body text-xs text-editorial-text-muted">{mainEvent.game || 'Senza gioco specifico'}</p>
                      </div>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {pagination.totalPages > 1 ? (
        <div className="mt-4 flex items-center justify-between gap-4">
          <p className="font-body text-sm text-editorial-text-muted">Pagina {pagination.page} di {pagination.totalPages} · {pagination.totalItems} main event</p>
          <div className="flex items-center gap-2">
            <button type="button" onClick={() => loadMainEvents(page - 1)} disabled={page <= 1 || loading} className="rounded-lg border border-editorial-border px-3 py-2 font-body text-sm font-semibold text-editorial-text transition-colors hover:border-editorial-terra disabled:cursor-not-allowed disabled:opacity-50">
              Precedente
            </button>
            <button type="button" onClick={() => loadMainEvents(page + 1)} disabled={page >= pagination.totalPages || loading} className="rounded-lg border border-editorial-border px-3 py-2 font-body text-sm font-semibold text-editorial-text transition-colors hover:border-editorial-terra disabled:cursor-not-allowed disabled:opacity-50">
              Successiva
            </button>
          </div>
        </div>
      ) : null}
    </>
  )
}
