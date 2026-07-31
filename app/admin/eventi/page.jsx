'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import ManagementPageHeader from '../../../src/components/management/ManagementPageHeader'

function formatDate(dateStr) {
  if (!dateStr) return '—'
  return new Date(dateStr).toLocaleDateString('it-IT', { day: '2-digit', month: 'short', year: 'numeric' })
}

export default function EventiPage() {
  const router = useRouter()
  const [events, setEvents] = useState([])
  const [loading, setLoading] = useState(true)

  const loadEvents = useCallback(async () => {
    setLoading(true)
    const res = await fetch('/api/admin/eventi')
    if (res.ok) setEvents(await res.json())
    setLoading(false)
  }, [])

  useEffect(() => { loadEvents() }, [loadEvents])

  return (
    <>
      <ManagementPageHeader
        eyebrow="Gestione"
        title="Eventi"
        actions={(
          <Link
            href="/admin/eventi/nuovo"
            className="px-4 py-2 bg-editorial-terra text-white rounded-lg font-body text-sm font-semibold hover:bg-editorial-terra/90 transition-colors"
          >
            + Nuovo evento
          </Link>
        )}
      />

      <div className="bg-white rounded-xl border border-editorial-border shadow-soft overflow-hidden">
        {loading ? (
          <div className="py-16 text-center font-body text-sm text-editorial-text-muted">Caricamento...</div>
        ) : events.length === 0 ? (
          <div className="py-16 text-center font-body text-sm text-editorial-text-muted">Nessun evento creato.</div>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="border-b border-editorial-border bg-editorial-bg">
                <th className="text-left px-4 py-3 font-body text-xs uppercase tracking-wider text-editorial-text-muted">Nome</th>
                <th className="text-left px-4 py-3 font-body text-xs uppercase tracking-wider text-editorial-text-muted hidden md:table-cell">Location</th>
                <th className="text-left px-4 py-3 font-body text-xs uppercase tracking-wider text-editorial-text-muted hidden sm:table-cell">Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-editorial-border">
              {events.map((ev) => (
                <tr key={ev.id} className="cursor-pointer transition-colors hover:bg-editorial-bg/40" onClick={() => router.push(`/admin/eventi/${ev.externalId}`)}>
                  <td className="px-4 py-3">
                    <p className="font-body text-sm font-semibold text-editorial-text">{ev.name}</p>
                    <p className="font-body text-xs text-editorial-text-muted">{ev.externalId}</p>
                    <p className="font-body text-xs text-editorial-text-secondary mt-1">
                      Pass: {ev.price != null ? `EUR ${Number(ev.price).toFixed(2)}` : 'gratuito'}
                    </p>
                  </td>
                  <td className="px-4 py-3 font-body text-sm text-editorial-text-secondary hidden md:table-cell">
                    {ev.location || '—'}
                  </td>
                  <td className="px-4 py-3 font-body text-sm text-editorial-text-secondary hidden sm:table-cell">
                    {formatDate(ev.startDate)}{ev.endDate ? ` → ${formatDate(ev.endDate)}` : ''}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </>
  )
}
