'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import ManagementPageHeader from '../../../../src/components/management/ManagementPageHeader'
import UserForm from '../../../../src/components/management/UserForm'

export default function AdminNewUserPage() {
  const router = useRouter()
  const [associations, setAssociations] = useState([])

  useEffect(() => {
    let cancelled = false
    fetch('/api/admin/associazioni').then(async (res) => {
      if (!cancelled && res.ok) setAssociations(await res.json())
    })
    return () => { cancelled = true }
  }, [])

  const handleCreate = async (form) => {
    const res = await fetch('/api/admin/utenti', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    })
    const data = await res.json()
    if (!res.ok) return { error: data.error }
    router.push('/admin/utenti')
    return { error: null }
  }

  return (
    <>
      <ManagementPageHeader
        eyebrow="Gestione"
        title="Nuovo utente"
        actions={(
          <Link href="/admin/utenti" className="px-4 py-2 border border-editorial-border text-editorial-text rounded-lg font-body text-sm font-semibold hover:border-editorial-terra transition-colors">
            ← Torna agli utenti
          </Link>
        )}
      />

      <div className="bg-white rounded-xl border border-editorial-border p-6 shadow-soft">
        <UserForm isNew associations={associations} onSave={handleCreate} onCancel={() => router.push('/admin/utenti')} />
      </div>
    </>
  )
}
