'use client'

import { useRouter } from 'next/navigation'
import Link from 'next/link'
import ManagementPageHeader from '../../../../src/components/management/ManagementPageHeader'
import EventForm from '../../../../src/components/management/EventForm'

export default function AdminNewEventPage() {
  const router = useRouter()

  const handleCreate = async (form) => {
    const res = await fetch('/api/admin/eventi', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    })
    const data = await res.json()
    if (!res.ok) return { error: data.error }
    router.push('/admin/eventi')
    return { error: null }
  }

  return (
    <>
      <ManagementPageHeader
        eyebrow="Gestione"
        title="Nuovo evento"
        actions={(
          <Link href="/admin/eventi" className="px-4 py-2 border border-editorial-border text-editorial-text rounded-lg font-body text-sm font-semibold hover:border-editorial-terra transition-colors">
            ← Torna agli eventi
          </Link>
        )}
      />

      <div className="bg-white rounded-xl border border-editorial-border p-6 shadow-soft">
        <EventForm isNew onSave={handleCreate} onCancel={() => router.push('/admin/eventi')} />
      </div>
    </>
  )
}
