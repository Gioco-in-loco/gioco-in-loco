'use client'

import { useEffect, useMemo, useState } from 'react'
import Modal from './Modal'
import OneShotForm, { EMPTY_ONESHOT_FORM } from './OneShotForm'

export default function OneShotFormDialog({
  open,
  onClose,
  mode,
  oneshotId,
  associations,
  fixedAssociation = null,
  oneshotsEndpointBase,
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

    if (mode !== 'edit' || !oneshotId) return undefined

    let cancelled = false
    setLoading(true)
    setLoadError('')

    fetch(`${oneshotsEndpointBase}/${oneshotId}`, { cache: 'no-store' })
      .then(async (res) => {
        const data = await res.json().catch(() => ({}))
        if (!res.ok) throw new Error(data.error || 'One shot non trovata.')
        return data
      })
      .then((data) => { if (!cancelled) setDetail(data) })
      .catch((err) => { if (!cancelled) setLoadError(err.message || 'One shot non trovata.') })
      .finally(() => { if (!cancelled) setLoading(false) })

    return () => { cancelled = true }
  }, [open, mode, oneshotId, oneshotsEndpointBase])

  const initial = useMemo(() => {
    if (mode !== 'edit') return EMPTY_ONESHOT_FORM
    if (!detail) return null

    return {
      title: detail.title,
      game: detail.game,
      master: detail.master,
      description: detail.description || '',
      price: detail.price ?? '',
      minPlayers: detail.minPlayers ?? 1,
      maxPlayers: detail.maxPlayers ?? 6,
      associationId: detail.associationId || '',
      image: detail.image || '',
      tags: detail.tags || [],
      slotIds: detail.slots?.map((slot) => slot.id) || [],
    }
  }, [mode, detail])

  const handleSave = async (form) => {
    const isEdit = mode === 'edit'
    const url = isEdit ? `${oneshotsEndpointBase}/${oneshotId}` : oneshotsEndpointBase
    const payload = { ...form, associationId: fixedAssociation?.id || form.associationId }
    const res = await fetch(url, {
      method: isEdit ? 'PATCH' : 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
    const data = await res.json().catch(() => ({}))
    if (!res.ok) return { error: data.error }
    onSaved()
    return { error: null }
  }

  return (
    <Modal open={open} onClose={onClose} title={mode === 'edit' ? 'Modifica one shot' : 'Crea one shot'} maxWidthClass="max-w-2xl">
      {mode === 'edit' && loading ? (
        <p className="font-body text-sm text-editorial-text-muted">Caricamento...</p>
      ) : mode === 'edit' && loadError ? (
        <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 font-body text-sm text-red-600">{loadError}</p>
      ) : initial ? (
        <OneShotForm
          isNew={mode !== 'edit'}
          initial={initial}
          associations={associations}
          fixedAssociation={fixedAssociation}
          uploadEndpoint={uploadEndpoint}
          onSave={handleSave}
          onCancel={onClose}
        />
      ) : null}
    </Modal>
  )
}
