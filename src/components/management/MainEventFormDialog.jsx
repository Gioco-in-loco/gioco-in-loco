'use client'

import { useEffect, useMemo, useState } from 'react'
import Modal from './Modal'
import MainEventForm, { EMPTY_MAIN_EVENT_FORM } from './MainEventForm'

export default function MainEventFormDialog({
  open,
  onClose,
  mode,
  mainEventId,
  mainEventsEndpointBase,
  uploadEndpoint,
  onSaved,
}) {
  const [detail, setDetail] = useState(null)
  const [loading, setLoading] = useState(false)
  const [loadError, setLoadError] = useState('')

  useEffect(() => {
    if (!open) {
      setDetail(null)
      setLoadError('')
      return undefined
    }

    if (mode !== 'edit' || !mainEventId) return undefined

    let cancelled = false
    setLoading(true)
    setLoadError('')

    fetch(`${mainEventsEndpointBase}/${mainEventId}`, { cache: 'no-store' })
      .then(async (res) => {
        const data = await res.json().catch(() => ({}))
        if (!res.ok) throw new Error(data.error || 'Main event non trovato.')
        return data
      })
      .then((data) => { if (!cancelled) setDetail(data) })
      .catch((err) => { if (!cancelled) setLoadError(err.message || 'Main event non trovato.') })
      .finally(() => { if (!cancelled) setLoading(false) })

    return () => { cancelled = true }
  }, [open, mode, mainEventId, mainEventsEndpointBase])

  const initial = useMemo(() => {
    if (mode !== 'edit') return EMPTY_MAIN_EVENT_FORM
    if (!detail) return null

    return {
      title: detail.title,
      game: detail.game || '',
      description: detail.description || '',
      price: detail.price ?? '',
      maxPlayers: detail.maxPlayers ?? 8,
      image: detail.image || '',
    }
  }, [mode, detail])

  const handleSave = async (form) => {
    const isEdit = mode === 'edit'
    const url = isEdit ? `${mainEventsEndpointBase}/${mainEventId}` : mainEventsEndpointBase
    const res = await fetch(url, {
      method: isEdit ? 'PATCH' : 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    })
    const data = await res.json().catch(() => ({}))
    if (!res.ok) return { error: data.error }
    onSaved()
    return { error: null }
  }

  return (
    <Modal open={open} onClose={onClose} title={mode === 'edit' ? 'Modifica main event' : 'Crea main event'} maxWidthClass="max-w-2xl">
      {mode === 'edit' && loading ? (
        <p className="font-body text-sm text-editorial-text-muted">Caricamento...</p>
      ) : mode === 'edit' && loadError ? (
        <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 font-body text-sm text-red-600">{loadError}</p>
      ) : initial ? (
        <MainEventForm
          isNew={mode !== 'edit'}
          initial={initial}
          uploadEndpoint={uploadEndpoint}
          onSave={handleSave}
          onCancel={onClose}
        />
      ) : null}
    </Modal>
  )
}
