'use client'

import Link from 'next/link'
import { useAuth } from '../../context/AuthContext'
import TutorialPopup from '../tutorial/TutorialPopup'

function formatRole(role) {
  switch ((role || 'USER').toUpperCase()) {
    case 'RESPONSABILE':
      return 'Responsabile'
    default:
      return 'Utente'
  }
}

export default function AccountDashboardPage() {
  const { user } = useAuth()

  const cards = [
    {
      href: '/account/profilo',
      label: 'Gestisci',
      title: 'Profilo',
      description: 'Aggiorna dati personali, email, password e impostazioni del tuo account.',
    },
    {
      href: '/account/prenotazioni',
      label: 'Gestisci',
      title: 'Prenotazioni',
      description: 'Consulta e gestisci solo le prenotazioni dei tuoi eventi futuri.',
    },
  ]

  const dashboardTutorialSlides = [
    {
      title: 'Benvenuto nella tua area personale',
      description: 'Da qui accedi rapidamente alle sezioni dedicate al tuo account: profilo e prenotazioni.',
      illustration: { type: 'cards', items: cards.map((c) => ({ label: c.title })), highlightIndex: -1 },
    },
    {
      title: 'Profilo',
      description: 'Aggiorna nome, telefono, email e password del tuo account.',
      illustration: { type: 'cards', items: cards.map((c) => ({ label: c.title })), highlightIndex: 0 },
    },
    {
      title: 'Prenotazioni',
      description: 'Consulta le tue prenotazioni per gli eventi futuri e cancellale se non ti servono più.',
      illustration: { type: 'cards', items: cards.map((c) => ({ label: c.title })), highlightIndex: 1 },
    },
  ]

  return (
    <div className="space-y-8">
      <div className="rounded-2xl border border-editorial-border bg-white p-8 shadow-soft">
        <p className="font-body text-xs font-semibold uppercase tracking-widest text-editorial-terra">Area utente</p>
        <div className="mt-2 flex items-center gap-2">
          <h1 className="font-elegant text-4xl font-bold text-editorial-text">Dashboard</h1>
          <TutorialPopup label="Dashboard" slides={dashboardTutorialSlides} />
        </div>
        <p className="mt-3 font-body text-sm text-editorial-text-secondary max-w-2xl">
          Qui trovi l&apos;accesso rapido alle sezioni personali del tuo account e alle aree gestionali abilitate per il tuo ruolo.
        </p>

        <div className="mt-6 grid gap-4 md:grid-cols-3">
          <div className="rounded-xl border border-editorial-border bg-editorial-bg/60 p-4">
            <p className="font-body text-xs uppercase tracking-widest text-editorial-text-muted mb-2">Nome</p>
            <p className="font-body text-sm font-semibold text-editorial-text">{user?.name || 'Da completare'}</p>
          </div>
          <div className="rounded-xl border border-editorial-border bg-editorial-bg/60 p-4">
            <p className="font-body text-xs uppercase tracking-widest text-editorial-text-muted mb-2">Email</p>
            <p className="font-body text-sm font-semibold text-editorial-text break-all">{user?.email || 'Non disponibile'}</p>
          </div>
          <div className="rounded-xl border border-editorial-border bg-editorial-bg/60 p-4">
            <p className="font-body text-xs uppercase tracking-widest text-editorial-text-muted mb-2">Ruolo</p>
            <p className="font-body text-sm font-semibold text-editorial-text">
              {formatRole(user?.role)}
              {user?.isAdmin ? ' · Amministratore' : ''}
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
        {cards.map((card) => (
          <Link
            key={card.href}
            href={card.href}
            className="rounded-xl border border-editorial-border bg-white p-6 shadow-soft transition-all hover:border-editorial-terra hover:shadow-soft-md"
          >
            <p className="mb-2 font-body text-xs uppercase tracking-widest text-editorial-text-muted">{card.label}</p>
            <h2 className="mb-2 font-elegant text-2xl font-bold text-editorial-text">{card.title}</h2>
            <p className="font-body text-sm text-editorial-text-secondary">{card.description}</p>
          </Link>
        ))}
      </div>
    </div>
  )
}