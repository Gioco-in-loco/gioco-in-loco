'use client'

import Link from 'next/link'
import { toAssociationSlug } from '../../lib/association-slug'
import TutorialPopup from '../tutorial/TutorialPopup'

export default function ResponsabileDashboard({ initialAssociation }) {
  const publicAssociationHref = `/associazione/${toAssociationSlug(initialAssociation.name) || initialAssociation.id}`

  const sections = [
    {
      href: '/responsabile/associazione',
      label: 'Gestisci',
      title: 'Associazione',
      description: 'Vedi e modifica l’anagrafica pubblica della tua associazione.',
    },
    {
      href: '/responsabile/eventi',
      label: 'Gestisci',
      title: 'Eventi',
      description: 'Apri un evento per vedere la mappa dei tavoli e assegnare le tue one shot agli slot liberi.',
    },
    {
      href: '/responsabile/oneshots',
      label: 'Gestisci',
      title: 'One shot',
      description: 'Vedi, crea e modifica le one shot della tua associazione collegate agli eventi.',
    },
    {
      href: '/responsabile/analytics',
      label: 'Monitora',
      title: 'Analytics',
      description: 'Consulta le visite anonime della pagina pubblica della tua associazione e il trend nel tempo.',
    },
  ]

  const dashboardTutorialSlides = [
    {
      title: 'Benvenuto nell’area responsabile',
      description: 'Da qui gestisci tutto quello che riguarda la tua associazione: anagrafica pubblica, eventi con tavoli da assegnare, one shot e statistiche di visita.',
      illustration: { type: 'cards', items: sections.map((s) => ({ label: s.title })), highlightIndex: -1 },
    },
    {
      title: 'Associazione',
      description: 'Aggiorna bio, contatti e orari: quello che scrivi qui appare subito sulla pagina pubblica della tua associazione.',
      illustration: { type: 'cards', items: sections.map((s) => ({ label: s.title })), highlightIndex: 0 },
    },
    {
      title: 'Eventi',
      description: 'Apri un evento per vedere la mappa dei tavoli disponibili e assegnare le tue one shot agli slot liberi.',
      illustration: { type: 'cards', items: sections.map((s) => ({ label: s.title })), highlightIndex: 1 },
    },
    {
      title: 'One shot',
      description: 'Crea le sessioni della tua associazione e collegale a un tavolo libero di un evento: qui puoi anche vedere chi si è prenotato.',
      illustration: { type: 'cards', items: sections.map((s) => ({ label: s.title })), highlightIndex: 2 },
    },
    {
      title: 'Analytics',
      description: 'Controlla quante persone hanno visitato la pagina pubblica della tua associazione e come cambia nel tempo.',
      illustration: { type: 'cards', items: sections.map((s) => ({ label: s.title })), highlightIndex: 3 },
    },
  ]

  return (
    <div className="space-y-8">
      <section className="rounded-2xl border border-editorial-border bg-white p-8 shadow-soft">
        <p className="font-body text-xs font-semibold uppercase tracking-widest text-editorial-terra">Area responsabile</p>
        <div className="mt-2 flex items-center gap-2">
          <h1 className="font-elegant text-4xl font-bold text-editorial-text">{initialAssociation.name}</h1>
          <TutorialPopup label="Dashboard" slides={dashboardTutorialSlides} />
        </div>
        <p className="mt-3 max-w-3xl font-body text-sm text-editorial-text-secondary">
          Da qui puoi accedere alle sezioni dedicate per gestire l'associazione e le one shot collegate alla tua area di responsabilita.
        </p>
        <div className="mt-5 flex flex-wrap gap-3">
          <Link href={publicAssociationHref} className="rounded-lg bg-editorial-terra px-4 py-2 font-body text-sm font-semibold text-white">
            Apri pagina pubblica
          </Link>
          {initialAssociation.website ? (
            <a href={initialAssociation.website} target="_blank" rel="noreferrer" className="rounded-lg border border-editorial-border px-4 py-2 font-body text-sm font-semibold text-editorial-text transition-colors hover:border-editorial-terra">
              Vai al sito
            </a>
          ) : null}
        </div>
      </section>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
        {sections.map((section) => (
          <Link key={section.href} href={section.href} className="rounded-xl border border-editorial-border bg-white p-6 shadow-soft transition-all hover:border-editorial-terra hover:shadow-soft-md group">
            <p className="mb-2 font-body text-xs uppercase tracking-widest text-editorial-text-muted">{section.label}</p>
            <h2 className="mb-1 font-elegant text-2xl font-bold text-editorial-text transition-colors group-hover:text-editorial-terra">{section.title}</h2>
            <p className="font-body text-sm text-editorial-text-secondary">{section.description}</p>
          </Link>
        ))}
      </div>
    </div>
  )
}