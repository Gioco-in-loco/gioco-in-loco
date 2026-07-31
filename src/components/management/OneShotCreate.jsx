'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import ManagementPageHeader from './ManagementPageHeader'
import OneShotForm from './OneShotForm'

export default function OneShotCreate({
  listEndpoint,
  uploadEndpoint,
  associationsEndpoint = null,
  fixedAssociation = null,
  backHref,
  tutorialSlides = null,
}) {
  const router = useRouter()
  const [associations, setAssociations] = useState(fixedAssociation ? [fixedAssociation] : [])
  const [loading, setLoading] = useState(!fixedAssociation && Boolean(associationsEndpoint))

  useEffect(() => {
    if (fixedAssociation || !associationsEndpoint) return undefined

    let cancelled = false
    fetch(associationsEndpoint).then(async (res) => {
      if (cancelled) return
      if (res.ok) setAssociations(await res.json())
      setLoading(false)
    })
    return () => { cancelled = true }
  }, [associationsEndpoint, fixedAssociation])

  const handleCreate = async (form) => {
    const res = await fetch(listEndpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...form, associationId: fixedAssociation?.id || form.associationId }),
    })
    const data = await res.json()
    if (!res.ok) return { error: data.error }
    router.push(backHref)
    return { error: null }
  }

  return (
    <>
      <ManagementPageHeader
        eyebrow="Gestione"
        title="Nuova one shot"
        tutorialSlides={tutorialSlides}
        actions={(
          <Link href={backHref} className="px-4 py-2 border border-editorial-border text-editorial-text rounded-lg font-body text-sm font-semibold hover:border-editorial-terra transition-colors">
            ← Torna alle one shot
          </Link>
        )}
      />

      {loading ? (
        <div className="py-16 text-center font-body text-sm text-editorial-text-muted">Caricamento...</div>
      ) : (
        <div className="bg-white rounded-xl border border-editorial-border p-6 shadow-soft">
          <OneShotForm
            isNew
            associations={associations}
            fixedAssociation={fixedAssociation}
            uploadEndpoint={uploadEndpoint}
            onSave={handleCreate}
            onCancel={() => router.push(backHref)}
          />
        </div>
      )}
    </>
  )
}
