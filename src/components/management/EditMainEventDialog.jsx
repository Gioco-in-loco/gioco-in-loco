'use client'

import { useEffect, useState } from 'react'
import Modal from './Modal'
import MainEventFormDialog from './MainEventFormDialog'

export default function EditMainEventDialog({
  open,
  onClose,
  eventId,
  mainEventsEndpointBase,
  uploadEndpoint,
  onSaved,
}) {
  const [mainEvents, setMainEvents] = useState([])
  const [loading, setLoading] = useState(false)
  const [selectedId, setSelectedId] = useState('')

  useEffect(() => {
    if (!open) {
      setSelectedId('')
      return undefined
    }

    let cancelled = false
    setLoading(true)

    fetch(`${mainEventsEndpointBase}?eventId=${eventId}&pageSize=200`)
      .then((res) => (res.ok ? res.json() : { items: [] }))
      .then((data) => { if (!cancelled) setMainEvents(data.items || []) })
      .finally(() => { if (!cancelled) setLoading(false) })

    return () => { cancelled = true }
  }, [open, eventId, mainEventsEndpointBase])

  if (selectedId) {
    return (
      <MainEventFormDialog
        open
        onClose={onClose}
        mode="edit"
        mainEventId={selectedId}
        mainEventsEndpointBase={mainEventsEndpointBase}
        uploadEndpoint={uploadEndpoint}
        onSaved={onSaved}
      />
    )
  }

  const inputClass = 'w-full rounded-lg border border-editorial-border px-3 py-2 font-body text-sm text-editorial-text outline-none focus:border-editorial-terra focus:ring-2 focus:ring-editorial-terra/10 transition-all'

  return (
    <Modal open={open} onClose={onClose} title="Modifica main event">
      <div className="space-y-4">
        <p className="font-body text-sm text-editorial-text-muted">Scegli il main event da modificare.</p>

        {loading ? (
          <p className="font-body text-sm text-editorial-text-muted">Caricamento...</p>
        ) : mainEvents.length === 0 ? (
          <p className="rounded-lg border border-editorial-border bg-editorial-bg/40 px-3 py-2 font-body text-sm text-editorial-text-muted">
            Nessun main event collegato a questo evento.
          </p>
        ) : (
          <select className={inputClass} value={selectedId} onChange={(e) => setSelectedId(e.target.value)}>
            <option value="">Seleziona un main event</option>
            {mainEvents.map((mainEvent) => (
              <option key={mainEvent.id} value={mainEvent.id}>
                {mainEvent.title}
              </option>
            ))}
          </select>
        )}

        <div className="flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-editorial-border px-4 py-2 font-body text-sm font-semibold text-editorial-text transition-colors hover:border-editorial-terra"
          >
            Annulla
          </button>
        </div>
      </div>
    </Modal>
  )
}
