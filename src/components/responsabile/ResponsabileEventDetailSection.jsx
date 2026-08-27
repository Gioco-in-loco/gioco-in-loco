'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import ManagementPageHeader from '../management/ManagementPageHeader'
import EventTableMapPanel from '../management/EventTableMapPanel'
import EventAnalyticsPanel from '../management/EventAnalyticsPanel'

const TABLE_MAP_TUTORIAL_SLIDES = [
  {
    title: 'La mappa dei tavoli',
    description: 'Ogni riquadro è un tavolo in un giorno e una fascia oraria. I tavoli colorati sono già assegnati, quelli tratteggiati sono liberi.',
    illustration: { type: 'tableMap', rows: 3, cols: 3, assignedCells: [[0, 0], [1, 2]], highlightRow: -1, highlightCol: -1 },
  },
  {
    title: 'Clicca un tavolo libero',
    description: 'Clicca su una cella libera per assegnarle una delle tue one shot.',
    illustration: { type: 'tableMap', rows: 3, cols: 3, assignedCells: [[0, 0], [1, 2]], highlightRow: 0, highlightCol: 1 },
  },
  {
    title: 'Assegna la one shot',
    description: 'Cerca una delle tue one shot nell\'elenco e premi "Assegna" per collegarla a quel tavolo.',
    illustration: { type: 'form', fields: ['Cerca one shot', 'Assegna one shot esistente'], highlightIndex: 2, submitLabel: 'Assegna' },
  },
  {
    title: 'Tavolo assegnato',
    description: 'Il tavolo ora mostra la tua one shot. Clicca di nuovo per vederne i dettagli o rimuovere l\'assegnazione.',
    illustration: { type: 'tableMap', rows: 3, cols: 3, assignedCells: [[0, 0], [1, 2], [0, 1]], highlightRow: -1, highlightCol: -1 },
  },
  {
    title: 'Segna le presenze',
    description: 'Apri la scheda "Prenotati" di un tavolo assegnato per vedere chi si è iscritto e segnare la presenza il giorno dell\'evento.',
    illustration: { type: 'list', columns: ['Giocatore', 'Stato'], rows: 3, highlightRow: 1 },
  },
]

export default function ResponsabileEventDetailSection({ eventExternalId, association }) {
  const [event, setEvent] = useState(null)
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState('')
  const [activeTab, setActiveTab] = useState('mappa')

  useEffect(() => {
    let cancelled = false

    const load = async () => {
      setLoading(true)
      const res = await fetch(`/api/responsabile/eventi/${eventExternalId}`)
      if (cancelled) return
      if (!res.ok) {
        setLoadError('Evento non trovato.')
        setLoading(false)
        return
      }
      setEvent(await res.json())
      setLoading(false)
    }

    load()
    return () => { cancelled = true }
  }, [eventExternalId])

  return (
    <>
      <ManagementPageHeader
        eyebrow="Responsabile"
        title={event?.name || 'Evento'}
        tutorialSlides={TABLE_MAP_TUTORIAL_SLIDES}
        actions={(
          <Link href="/responsabile/eventi" className="px-4 py-2 border border-editorial-border text-editorial-text rounded-lg font-body text-sm font-semibold hover:border-editorial-terra transition-colors">
            ← Torna agli eventi
          </Link>
        )}
      />

      {loading ? (
        <div className="py-16 text-center font-body text-sm text-editorial-text-muted">Caricamento...</div>
      ) : loadError ? (
        <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 font-body text-sm text-red-600">{loadError}</p>
      ) : (
        <>
          {event.sessionsLocked ? (
            <p className="mb-4 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 font-body text-sm text-amber-700">
              Le sessioni di questo evento sono bloccate: solo l&apos;amministratore può creare, modificare o riassegnare le one-shot. Puoi ancora gestire presenze e prenotazioni.
            </p>
          ) : null}

          <div className="mb-4 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setActiveTab('mappa')}
              className={`rounded-lg px-4 py-2 font-body text-sm font-semibold transition-colors ${
                activeTab === 'mappa'
                  ? 'bg-editorial-terra text-white shadow-soft'
                  : 'border border-editorial-border text-editorial-text hover:border-editorial-terra'
              }`}
            >
              Mappa tavoli
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('analitiche')}
              className={`rounded-lg px-4 py-2 font-body text-sm font-semibold transition-colors ${
                activeTab === 'analitiche'
                  ? 'bg-editorial-terra text-white shadow-soft'
                  : 'border border-editorial-border text-editorial-text hover:border-editorial-terra'
              }`}
            >
              Analitiche
            </button>
          </div>

          {activeTab === 'analitiche' ? (
            <EventAnalyticsPanel eventId={event.id} endpointBase="/api/responsabile/eventi" />
          ) : (
            <EventTableMapPanel
              eventId={event.id}
              fixedAssociation={{ id: association.id, name: association.name }}
              canAddSlot={false}
              canManageSlot={false}
              canManageReservations={false}
              canMarkAttendance
              canDeleteReservations={false}
              canManageMainEvents={false}
              canManageOneShots={!event.sessionsLocked}
              hideSensitiveFields
              slotsEndpointBase="/api/responsabile/eventi"
              oneshotsEndpointBase="/api/responsabile/oneshots"
              uploadEndpoint="/api/responsabile/oneshots/upload-image"
              associationsEndpoint={null}
            />
          )}
        </>
      )}
    </>
  )
}
