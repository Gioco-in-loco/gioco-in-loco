'use client'

import Link from 'next/link'
import { useState } from 'react'
import AssociationForm from '../management/AssociationForm'
import ManagementPageHeader from '../management/ManagementPageHeader'
import { toAssociationSlug } from '../../lib/association-slug'

const ASSOCIATION_TUTORIAL_SLIDES = [
  {
    title: 'La scheda della tua associazione',
    description: 'Qui trovi bio, città, orari e contatti pubblici: sono gli stessi dati mostrati sulla pagina pubblica della tua associazione.',
    illustration: { type: 'form', fields: ['Bio', 'Città', 'Orari', 'Contatti'], highlightIndex: -1 },
  },
  {
    title: 'Modifica i campi',
    description: 'Aggiorna liberamente i campi: le modifiche restano solo qui finché non le salvi.',
    illustration: { type: 'form', fields: ['Bio', 'Città', 'Orari', 'Contatti'], highlightIndex: 1 },
  },
  {
    title: 'Salva per pubblicare',
    description: 'Premi "Salva associazione": la pagina pubblica si aggiorna subito con i nuovi dati.',
    illustration: { type: 'form', fields: ['Bio', 'Città', 'Orari', 'Contatti'], highlightIndex: 4, submitLabel: 'Salva associazione' },
  },
]

export default function ResponsabileAssociationSection({ initialAssociation, showHeader = true }) {
  const [association, setAssociation] = useState(initialAssociation)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const publicAssociationHref = `/associazione/${toAssociationSlug(association.name) || association.id}`

  const handleSaveAssociation = async (form) => {
    setError('')
    setSuccess('')

    const response = await fetch('/api/responsabile/associazione', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    })

    const data = await response.json()

    if (!response.ok) {
      setError(data.error || 'Salvataggio non riuscito')
      return { error: data.error || 'Salvataggio non riuscito' }
    }

    setAssociation(data)
    setSuccess('Associazione aggiornata correttamente')
    return { error: null }
  }

  return (
    <div className="space-y-8">
      {showHeader ? (
        <ManagementPageHeader
          eyebrow="Responsabile"
          title="Associazione"
          description="Qui puoi vedere e aggiornare l'anagrafica pubblica della tua associazione."
          tutorialSlides={ASSOCIATION_TUTORIAL_SLIDES}
        />
      ) : null}

      <section className="grid gap-6 xl:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)]">
        <div className="rounded-2xl border border-editorial-border bg-white p-6 shadow-soft">
          <p className="font-body text-xs font-semibold uppercase tracking-widest text-editorial-terra">Area di responsabilita</p>
          <h1 className="mt-2 font-elegant text-3xl font-bold text-editorial-text">{association.name}</h1>
          <p className="mt-3 max-w-2xl font-body text-sm text-editorial-text-secondary">
            Qui puoi aggiornare i dati pubblici della tua associazione e mantenere allineata la scheda visibile sul sito.
          </p>
          <div className="mt-5 flex flex-wrap gap-3">
            <Link href={publicAssociationHref} className="rounded-lg bg-editorial-terra px-4 py-2 font-body text-sm font-semibold text-white">
              Apri pagina pubblica
            </Link>
            {association.website ? (
              <a href={association.website} target="_blank" rel="noreferrer" className="rounded-lg border border-editorial-border px-4 py-2 font-body text-sm font-semibold text-editorial-text transition-colors hover:border-editorial-terra">
                Vai al sito
              </a>
            ) : null}
          </div>
        </div>

        <div className="rounded-2xl border border-editorial-border bg-white p-6 shadow-soft">
          <p className="font-body text-xs font-semibold uppercase tracking-widest text-editorial-text-muted">Riepilogo</p>
          <dl className="mt-4 space-y-4">
            <div>
              <dt className="font-body text-xs uppercase tracking-widest text-editorial-text-muted">Email</dt>
              <dd className="mt-1 font-body text-sm font-semibold text-editorial-text">{association.email || 'Non impostata'}</dd>
            </div>
            <div>
              <dt className="font-body text-xs uppercase tracking-widest text-editorial-text-muted">Citta</dt>
              <dd className="mt-1 font-body text-sm font-semibold text-editorial-text">{association.city || 'Non impostata'}</dd>
            </div>
            <div>
              <dt className="font-body text-xs uppercase tracking-widest text-editorial-text-muted">Orari</dt>
              <dd className="mt-1 font-body text-sm font-semibold text-editorial-text">{association.openingHours || 'Non impostati'}</dd>
            </div>
          </dl>
        </div>
      </section>

      <section className="rounded-2xl border border-editorial-border bg-white p-6 shadow-soft">
        <div className="mb-6">
          <p className="font-body text-xs font-semibold uppercase tracking-widest text-editorial-terra">La tua associazione</p>
          <h2 className="mt-2 font-elegant text-2xl font-bold text-editorial-text">Modifica scheda</h2>
        </div>

        <div className="space-y-4">
          {error ? <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 font-body text-sm text-red-600">{error}</p> : null}
          {success ? <p className="rounded-lg border border-green-200 bg-green-50 px-3 py-2 font-body text-sm text-green-700">{success}</p> : null}
          <AssociationForm
            initial={association}
            onSave={handleSaveAssociation}
            onCancel={() => {
              setError('')
              setSuccess('')
            }}
            submitLabel="Salva associazione"
            showLogoField={false}
          />
        </div>
      </section>
    </div>
  )
}