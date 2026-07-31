import Link from 'next/link'
import { prisma } from '../../src/lib/prisma'

export default async function AdminDashboard() {
  const [totalUsers, totalEvents, totalOneShots, totalMainEvents, responsabili, admins] = await Promise.all([
    prisma.user.count(),
    prisma.event.count(),
    prisma.oneShot.count(),
    prisma.mainEvent.count(),
    prisma.user.count({ where: { role: 'RESPONSABILE' } }),
    prisma.user.count({ where: { isAdmin: true } }),
  ])

  const stats = [
    { label: 'Utenti totali', value: totalUsers, color: 'text-editorial-terra' },
    { label: 'Responsabili', value: responsabili, color: 'text-editorial-forest' },
    { label: 'Amministratori', value: admins, color: 'text-editorial-gold' },
    { label: 'Eventi', value: totalEvents, color: 'text-editorial-terra' },
    { label: 'One shot', value: totalOneShots, color: 'text-editorial-forest' },
    { label: 'Main event', value: totalMainEvents, color: 'text-editorial-gold' },
  ]

  const sections = [
    {
      href: '/admin/associazioni',
      label: 'Gestisci',
      title: 'Associazioni',
      description: 'Gestisci anagrafica, contatti e profili pubblici delle associazioni.',
    },
    {
      href: '/admin/eventi',
      label: 'Gestisci',
      title: 'Eventi',
      description: 'Crea, modifica ed elimina eventi fieristici.',
    },
    {
      href: '/admin/oneshots',
      label: 'Gestisci',
      title: 'One shot',
      description: 'Gestisci titoli, master, prezzi e slot delle sessioni GDR.',
    },
    {
      href: '/admin/main-events',
      label: 'Gestisci',
      title: 'Main event',
      description: 'Gestisci eventi principali con prezzi, associazioni e slot.',
    },
    {
      href: '/admin/utenti',
      label: 'Gestisci',
      title: 'Utenti',
      description: 'Visualizza account, cambia ruoli e crea nuovi utenti.',
    },
    {
      href: '/admin/analytics',
      label: 'Analizza',
      title: 'Analytics',
      description: 'Consulta traffico, visitatori unici, pagine piu viste e trend di utilizzo.',
    },
  ]

  return (
    <>
      <div className="mb-8">
        <p className="font-body text-xs uppercase tracking-widest text-editorial-terra mb-1 font-semibold">
          Pannello di controllo
        </p>
        <h1 className="font-elegant text-4xl text-editorial-text font-bold">Dashboard</h1>
      </div>

      <div className="grid grid-cols-2 xl:grid-cols-6 gap-4 mb-10">
        {stats.map((s) => (
          <div key={s.label} className="bg-white rounded-xl border border-editorial-border p-6 shadow-soft">
            <p className="font-body text-xs uppercase tracking-widest text-editorial-text-muted mb-3">{s.label}</p>
            <p className={`font-elegant text-5xl font-bold ${s.color}`}>{s.value}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-6 gap-4">
        {sections.map((s) => (
          <Link
            key={s.href}
            href={s.href}
            className="bg-white rounded-xl border border-editorial-border p-6 shadow-soft hover:border-editorial-terra hover:shadow-soft-md transition-all group"
          >
            <p className="font-body text-xs uppercase tracking-widest text-editorial-text-muted mb-2">{s.label}</p>
            <h2 className="font-elegant text-2xl text-editorial-text font-bold mb-1 group-hover:text-editorial-terra transition-colors">
              {s.title}
            </h2>
            <p className="font-body text-sm text-editorial-text-secondary">{s.description}</p>
          </Link>
        ))}
      </div>
    </>
  )
}
