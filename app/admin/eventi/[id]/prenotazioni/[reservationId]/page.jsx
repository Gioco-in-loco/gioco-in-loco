'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import ManagementPageHeader from '../../../../../../src/components/management/ManagementPageHeader'
import EventReservationEditPanel from '../../../../../../src/components/management/EventReservationEditPanel'

// params.id qui è l'externalId (slug) dell'evento (stessa convenzione di
// app/admin/eventi/[id]/page.jsx), ma le query sulle prenotazioni filtrano
// per l'id interno reale — va risolto un id dall'altro prima di renderizzare
// il pannello, così l'URL resta leggibile senza far trapelare il cuid.
export default function AdminReservationEditRoute({ params }) {
  const searchParams = useSearchParams()
  const type = searchParams.get('type') || ''
  const [eventId, setEventId] = useState(null)
  const [loadError, setLoadError] = useState('')

  useEffect(() => {
    let cancelled = false

    fetch(`/api/admin/eventi/${params.id}`)
      .then(async (res) => {
        if (!res.ok) throw new Error('Evento non trovato.')
        return res.json()
      })
      .then((data) => { if (!cancelled) setEventId(data.id) })
      .catch((err) => { if (!cancelled) setLoadError(err.message || 'Evento non trovato.') })

    return () => { cancelled = true }
  }, [params.id])

  return (
    <>
      <ManagementPageHeader
        eyebrow="Gestione"
        title="Modifica prenotazione"
        actions={(
          <Link
            href={`/admin/eventi/${params.id}?tab=prenotazioni`}
            className="px-4 py-2 border border-editorial-border text-editorial-text rounded-lg font-body text-sm font-semibold hover:border-editorial-terra transition-colors"
          >
            ← Torna alle prenotazioni
          </Link>
        )}
      />

      {loadError ? (
        <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 font-body text-sm text-red-600">{loadError}</p>
      ) : eventId ? (
        <EventReservationEditPanel eventId={eventId} eventExternalId={params.id} reservationId={params.reservationId} type={type} />
      ) : (
        <p className="font-body text-sm text-editorial-text-muted">Caricamento...</p>
      )}
    </>
  )
}
