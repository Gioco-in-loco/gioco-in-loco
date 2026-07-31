'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { USER_ROLES } from '../../../src/components/management/UserForm'

const ROLE_STYLE = {
  RESPONSABILE: 'bg-editorial-forest/10 text-editorial-forest',
  USER: 'bg-editorial-border text-editorial-text-muted',
}

const ADMIN_BADGE_STYLE = 'bg-editorial-terra/10 text-editorial-terra'

function formatDate(dateStr) {
  if (!dateStr) return '—'
  return new Date(dateStr).toLocaleDateString('it-IT', { day: '2-digit', month: 'short', year: 'numeric' })
}

export default function UtentiPage() {
  const router = useRouter()
  const [users, setUsers] = useState([])
  const [associations, setAssociations] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [roleFilter, setRoleFilter] = useState('')
  const [associationFilter, setAssociationFilter] = useState('')

  const loadData = useCallback(async () => {
    setLoading(true)
    const [usersRes, assocRes] = await Promise.all([
      fetch('/api/admin/utenti'),
      fetch('/api/admin/associazioni').catch(() => ({ ok: false })),
    ])
    if (usersRes.ok) setUsers(await usersRes.json())
    if (assocRes.ok) setAssociations(await assocRes.json())
    setLoading(false)
  }, [])

  useEffect(() => { loadData() }, [loadData])

  const filtered = users.filter((u) => {
    const matchesSearch = !search || u.email.toLowerCase().includes(search.toLowerCase()) || u.name?.toLowerCase().includes(search.toLowerCase())
    const matchesRole = !roleFilter || u.role === roleFilter
    const matchesAssociation = !associationFilter || u.managedAssociation?.id === associationFilter
    return matchesSearch && matchesRole && matchesAssociation
  })

  return (
    <>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <p className="font-body text-xs uppercase tracking-widest text-editorial-terra mb-1 font-semibold">Gestione</p>
          <h1 className="font-elegant text-3xl text-editorial-text font-bold">Utenti</h1>
        </div>
        <Link
          href="/admin/utenti/nuovo"
          className="px-4 py-2 bg-editorial-terra text-white rounded-lg font-body text-sm font-semibold hover:bg-editorial-terra/90 transition-colors"
        >
          + Nuovo utente
        </Link>
      </div>

      <div className="bg-white rounded-xl border border-editorial-border shadow-soft overflow-hidden">
        <div className="px-4 py-3 border-b border-editorial-border flex flex-col gap-3 lg:flex-row lg:items-center">
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Cerca per email o nome..."
            className="w-full max-w-xs rounded-lg border border-editorial-border px-3 py-1.5 font-body text-sm text-editorial-text outline-none focus:border-editorial-terra transition-all"
          />
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              className="w-full sm:w-48 rounded-lg border border-editorial-border px-3 py-1.5 font-body text-sm text-editorial-text outline-none focus:border-editorial-terra transition-all"
            >
              <option value="">Tutti i ruoli</option>
              {USER_ROLES.map((role) => <option key={role.value} value={role.value}>{role.label}</option>)}
            </select>
            <select
              value={associationFilter}
              onChange={(e) => setAssociationFilter(e.target.value)}
              className="w-full sm:w-56 rounded-lg border border-editorial-border px-3 py-1.5 font-body text-sm text-editorial-text outline-none focus:border-editorial-terra transition-all"
            >
              <option value="">Tutte le associazioni</option>
              {associations.map((association) => <option key={association.id} value={association.id}>{association.name}</option>)}
            </select>
          </div>
        </div>

        {loading ? (
          <div className="py-16 text-center font-body text-sm text-editorial-text-muted">Caricamento...</div>
        ) : filtered.length === 0 ? (
          <div className="py-16 text-center font-body text-sm text-editorial-text-muted">
            {search ? 'Nessun risultato.' : 'Nessun utente trovato.'}
          </div>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="border-b border-editorial-border bg-editorial-bg">
                <th className="text-left px-4 py-3 font-body text-xs uppercase tracking-wider text-editorial-text-muted">Utente</th>
                <th className="text-left px-4 py-3 font-body text-xs uppercase tracking-wider text-editorial-text-muted hidden sm:table-cell">Registrato</th>
                <th className="text-left px-4 py-3 font-body text-xs uppercase tracking-wider text-editorial-text-muted hidden md:table-cell">Associazione</th>
                <th className="text-left px-4 py-3 font-body text-xs uppercase tracking-wider text-editorial-text-muted">Ruolo</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-editorial-border">
              {filtered.map((u) => (
                <tr
                  key={u.id}
                  className="hover:bg-editorial-bg/50 transition-colors cursor-pointer"
                  onClick={() => router.push(`/admin/utenti/${u.id}`)}
                >
                  <td className="px-4 py-3">
                    <p className="font-body text-sm font-semibold text-editorial-text">{u.name || '—'}</p>
                    <p className="font-body text-xs text-editorial-text-muted">{u.email}</p>
                    {u.managedAssociation && (
                      <p className="font-body text-xs text-editorial-forest mt-0.5">{u.managedAssociation.name}</p>
                    )}
                  </td>
                  <td className="px-4 py-3 font-body text-sm text-editorial-text-secondary hidden sm:table-cell">
                    {formatDate(u.createdAt)}
                  </td>
                  <td className="px-4 py-3 font-body text-sm text-editorial-text-secondary hidden md:table-cell">
                    {u.managedAssociation?.name || '—'}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-1.5">
                      <span className={`inline-flex rounded-full px-3 py-1 font-body text-xs font-semibold ${ROLE_STYLE[u.role] || ROLE_STYLE.USER}`}>
                        {USER_ROLES.find((role) => role.value === u.role)?.label || 'Utente'}
                      </span>
                      {u.isAdmin && (
                        <span className={`inline-flex rounded-full px-3 py-1 font-body text-xs font-semibold ${ADMIN_BADGE_STYLE}`}>
                          Admin
                        </span>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

    </>
  )
}
