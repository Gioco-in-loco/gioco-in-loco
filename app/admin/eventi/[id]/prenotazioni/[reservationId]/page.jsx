'use client'

import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import ManagementPageHeader from '../../../../../../src/components/management/ManagementPageHeader'
import EventReservationEditPanel from '../../../../../../src/components/management/EventReservationEditPanel'

export default function AdminReservationEditRoute({ params }) {
  const searchParams = useSearchParams()
  const type = searchParams.get('type') || ''

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

      <EventReservationEditPanel eventId={params.id} reservationId={params.reservationId} type={type} />
    </>
  )
}
