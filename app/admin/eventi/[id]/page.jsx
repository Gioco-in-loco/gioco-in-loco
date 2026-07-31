'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import ManagementPageHeader from '../../../../src/components/management/ManagementPageHeader'
import EventForm, { toInputDate } from '../../../../src/components/management/EventForm'
import EventTableMapPanel from '../../../../src/components/management/EventTableMapPanel'
import EventWaitlistPanel from '../../../../src/components/management/EventWaitlistPanel'

function formatDate(dateStr) {
  if (!dateStr) return '—'
  return new Date(dateStr).toLocaleDateString('it-IT', { day: '2-digit', month: 'short', year: 'numeric' })
}

export default function AdminEventDetailPage({ params }) {
  const router = useRouter()
  const [event, setEvent] = useState(null)
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState('')
  const [isEditing, setIsEditing] = useState(false)
  const [activeTab, setActiveTab] = useState('dettaglio')
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [deleting, setDeleting] = useState(false)

  useEffect(() => {
    let cancelled = false

    const load = async () => {
      setLoading(true)
      const res = await fetch(`/api/admin/eventi/${params.id}`)
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
  }, [params.id])

  const handleSave = async (form) => {
    const res = await fetch(`/api/admin/eventi/${params.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    })
    const data = await res.json()
    if (!res.ok) return { error: data.error }
    setEvent(data)
    setIsEditing(false)
    if (data.externalId && data.externalId !== params.id) {
      router.replace(`/admin/eventi/${data.externalId}`)
    }
    return { error: null }
  }

  const handleDelete = async () => {
    setDeleting(true)
    const res = await fetch(`/api/admin/eventi/${params.id}`, { method: 'DELETE' })
    setDeleting(false)

    if (!res.ok) {
      setShowDeleteConfirm(false)
      return
    }

    router.push('/admin/eventi')
  }

  return (
    <>
      <ManagementPageHeader
        eyebrow="Gestione"
        title={event?.name || 'Evento'}
        actions={(
          <div className="flex flex-wrap items-center gap-2">
            <Link href="/admin/eventi" className="px-4 py-2 border border-editorial-border text-editorial-text rounded-lg font-body text-sm font-semibold hover:border-editorial-terra transition-colors">
              ← Torna agli eventi
            </Link>
            {event ? (
              <button
                type="button"
                onClick={() => setShowDeleteConfirm(true)}
                className="px-4 py-2 border border-red-200 text-red-600 rounded-lg font-body text-sm font-semibold hover:bg-red-50 transition-colors"
              >
                Elimina evento
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
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setActiveTab('dettaglio')}
              className={`rounded-lg px-4 py-2 font-body text-sm font-semibold transition-colors ${
                activeTab === 'dettaglio'
                  ? 'bg-editorial-terra text-white shadow-soft'
                  : 'border border-editorial-border text-editorial-text hover:border-editorial-terra'
              }`}
            >
              Dettaglio evento
            </button>
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
              onClick={() => setActiveTab('attesa')}
              className={`rounded-lg px-4 py-2 font-body text-sm font-semibold transition-colors ${
                activeTab === 'attesa'
                  ? 'bg-editorial-terra text-white shadow-soft'
                  : 'border border-editorial-border text-editorial-text hover:border-editorial-terra'
              }`}
            >
              Lista d&apos;attesa
            </button>
          </div>

          {activeTab === 'dettaglio' ? (
          <div className="bg-white rounded-xl border border-editorial-border p-6 shadow-soft">
            {isEditing ? (
              <EventForm
                initial={{
                  externalId: event.externalId || '',
                  name: event.name || '',
                  description: event.description || '',
                  location: event.location || '',
                  mapsUrl: event.mapsUrl || '',
                  price: event.price ?? '',
                  dailyPrice: event.dailyPrice ?? '',
                  days: event.days || [],
                  timeSlots: event.timeSlots || [],
                  startDate: toInputDate(event.startDate),
                  endDate: toInputDate(event.endDate),
                }}
                onSave={handleSave}
                onCancel={() => setIsEditing(false)}
              />
            ) : (
              <>
                <div className="flex items-start justify-between gap-4">
                  <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <div>
                      <dt className="font-body text-xs font-semibold uppercase tracking-wider text-editorial-text-muted">ID Esterno</dt>
                      <dd className="mt-1 font-body text-sm text-editorial-text">{event.externalId}</dd>
                    </div>
                    <div>
                      <dt className="font-body text-xs font-semibold uppercase tracking-wider text-editorial-text-muted">Location</dt>
                      <dd className="mt-1 font-body text-sm text-editorial-text">{event.location || '—'}</dd>
                    </div>
                    <div>
                      <dt className="font-body text-xs font-semibold uppercase tracking-wider text-editorial-text-muted">Posizione Maps</dt>
                      <dd className="mt-1 font-body text-sm text-editorial-text">
                        {event.mapsUrl ? (
                          <a
                            href={event.mapsUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-editorial-terra hover:underline"
                          >
                            Apri in Maps ↗
                          </a>
                        ) : '—'}
                      </dd>
                    </div>
                    <div>
                      <dt className="font-body text-xs font-semibold uppercase tracking-wider text-editorial-text-muted">Prezzo pass evento</dt>
                      <dd className="mt-1 font-body text-sm text-editorial-text">{event.price != null ? `EUR ${Number(event.price).toFixed(2)}` : 'Non impostato'}</dd>
                    </div>
                    <div>
                      <dt className="font-body text-xs font-semibold uppercase tracking-wider text-editorial-text-muted">Prezzo ingresso giornaliero</dt>
                      <dd className="mt-1 font-body text-sm text-editorial-text">
                        {event.price != null
                          ? 'Ignorato (pass evento unico attivo)'
                          : event.dailyPrice != null ? `EUR ${Number(event.dailyPrice).toFixed(2)}` : 'Gratuito'}
                      </dd>
                    </div>
                    <div>
                      <dt className="font-body text-xs font-semibold uppercase tracking-wider text-editorial-text-muted">Date</dt>
                      <dd className="mt-1 font-body text-sm text-editorial-text">
                        {formatDate(event.startDate)}{event.endDate ? ` → ${formatDate(event.endDate)}` : ''}
                      </dd>
                    </div>
                    <div>
                      <dt className="font-body text-xs font-semibold uppercase tracking-wider text-editorial-text-muted">Giorni evento</dt>
                      <dd className="mt-1 font-body text-sm text-editorial-text">{event.days?.length ? event.days.join(', ') : '—'}</dd>
                    </div>
                    <div>
                      <dt className="font-body text-xs font-semibold uppercase tracking-wider text-editorial-text-muted">Fasce orarie evento</dt>
                      <dd className="mt-1 font-body text-sm text-editorial-text">{event.timeSlots?.length ? event.timeSlots.join(', ') : '—'}</dd>
                    </div>
                    <div className="sm:col-span-2">
                      <dt className="font-body text-xs font-semibold uppercase tracking-wider text-editorial-text-muted">Descrizione</dt>
                      <dd className="mt-1 font-body text-sm text-editorial-text whitespace-pre-line">{event.description || '—'}</dd>
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
              </>
            )}
          </div>

          ) : activeTab === 'mappa' ? (
            <EventTableMapPanel eventId={event.id} eventDays={event.days || []} eventTimeSlots={event.timeSlots || []} />
          ) : (
            <EventWaitlistPanel eventId={event.id} waitlistEndpointBase="/api/admin/eventi" />
          )}
        </div>
      )}

      {showDeleteConfirm ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="bg-white rounded-xl border border-editorial-border p-6 shadow-soft-lg max-w-sm w-full">
            <h3 className="font-elegant text-xl text-editorial-text font-bold mb-2">Eliminare l&apos;evento?</h3>
            <p className="font-body text-sm text-editorial-text-secondary mb-6">
              Questa operazione è irreversibile. Le relazioni associate (prenotazioni, one-shot, giochi) potrebbero essere rimosse.
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
      ) : null}
    </>
  )
}
