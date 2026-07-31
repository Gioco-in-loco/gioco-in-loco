'use client'

import { useRouter } from 'next/navigation'
import Link from 'next/link'
import ManagementPageHeader from './ManagementPageHeader'
import MainEventForm from './MainEventForm'

export default function MainEventCreate({
  listEndpoint,
  uploadEndpoint,
  backHref,
}) {
  const router = useRouter()

  const handleCreate = async (form) => {
    const res = await fetch(listEndpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
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
        title="Nuovo main event"
        actions={(
          <Link href={backHref} className="px-4 py-2 border border-editorial-border text-editorial-text rounded-lg font-body text-sm font-semibold hover:border-editorial-terra transition-colors">
            ← Torna ai main event
          </Link>
        )}
      />

      <div className="bg-white rounded-xl border border-editorial-border p-6 shadow-soft">
        <MainEventForm
          isNew
          uploadEndpoint={uploadEndpoint}
          onSave={handleCreate}
          onCancel={() => router.push(backHref)}
        />
      </div>
    </>
  )
}
