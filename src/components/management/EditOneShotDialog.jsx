'use client'

import { useEffect, useState } from 'react'
import Modal from './Modal'
import OneShotFormDialog from './OneShotFormDialog'

export default function EditOneShotDialog({
  open,
  onClose,
  eventId,
  associations,
  fixedAssociation = null,
  oneshotsEndpointBase,
  uploadEndpoint,
  onSaved,
}) {
  const [oneshots, setOneshots] = useState([])
  const [loading, setLoading] = useState(false)
  const [selectedId, setSelectedId] = useState('')

  useEffect(() => {
    if (!open) {
      setSelectedId('')
      return undefined
    }

    let cancelled = false
    setLoading(true)

    fetch(`${oneshotsEndpointBase}?eventId=${eventId}&pageSize=200`)
      .then((res) => (res.ok ? res.json() : { items: [] }))
      .then((data) => { if (!cancelled) setOneshots(data.items || []) })
      .finally(() => { if (!cancelled) setLoading(false) })

    return () => { cancelled = true }
  }, [open, eventId, oneshotsEndpointBase])

  if (selectedId) {
    return (
      <OneShotFormDialog
        open
        onClose={onClose}
        mode="edit"
        oneshotId={selectedId}
        associations={associations}
        fixedAssociation={fixedAssociation}
        oneshotsEndpointBase={oneshotsEndpointBase}
        uploadEndpoint={uploadEndpoint}
        onSaved={onSaved}
      />
    )
  }

  const inputClass = 'w-full rounded-lg border border-editorial-border px-3 py-2 font-body text-sm text-editorial-text outline-none focus:border-editorial-terra focus:ring-2 focus:ring-editorial-terra/10 transition-all'

  return (
    <Modal open={open} onClose={onClose} title="Modifica one shot">
      <div className="space-y-4">
        <p className="font-body text-sm text-editorial-text-muted">Scegli la one shot da modificare.</p>

        {loading ? (
          <p className="font-body text-sm text-editorial-text-muted">Caricamento...</p>
        ) : oneshots.length === 0 ? (
          <p className="rounded-lg border border-editorial-border bg-editorial-bg/40 px-3 py-2 font-body text-sm text-editorial-text-muted">
            Nessuna one shot collegata a questo evento.
          </p>
        ) : (
          <select className={inputClass} value={selectedId} onChange={(e) => setSelectedId(e.target.value)}>
            <option value="">Seleziona una one shot</option>
            {oneshots.map((oneshot) => (
              <option key={oneshot.id} value={oneshot.id}>
                {oneshot.title} · {oneshot.game}{oneshot.associationName ? ` · ${oneshot.associationName}` : ''}
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
