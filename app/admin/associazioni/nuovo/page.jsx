'use client'

import { useRouter } from 'next/navigation'
import Link from 'next/link'
import ManagementPageHeader from '../../../../src/components/management/ManagementPageHeader'
import AssociationForm from '../../../../src/components/management/AssociationForm'

export default function AdminNewAssociationPage() {
  const router = useRouter()

  const handleCreate = async (form) => {
    const res = await fetch('/api/admin/associazioni', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    })
    const data = await res.json().catch(() => ({}))
    if (!res.ok) return { error: data.error || 'Creazione non riuscita' }
    router.push('/admin/associazioni')
    return { error: null }
  }

  return (
    <>
      <ManagementPageHeader
        eyebrow="Gestione"
        title="Nuova associazione"
        actions={(
          <Link href="/admin/associazioni" className="px-4 py-2 border border-editorial-border text-editorial-text rounded-lg font-body text-sm font-semibold hover:border-editorial-terra transition-colors">
            ← Torna alle associazioni
          </Link>
        )}
      />

      <div className="bg-white rounded-xl border border-editorial-border p-6 shadow-soft">
        <AssociationForm onSave={handleCreate} onCancel={() => router.push('/admin/associazioni')} submitLabel="Crea associazione" />
      </div>
    </>
  )
}
