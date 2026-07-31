'use client'

import OneShotsManager from '../management/OneShotsManager'

const ONESHOTS_TUTORIAL_SLIDES = [
  {
    title: 'Le tue one shot',
    description: 'Qui trovi tutte le one shot della tua associazione, collegate o meno a un evento.',
    illustration: { type: 'list', columns: ['Titolo', 'Gioco', 'Master'], rows: 3, highlightRow: -1 },
  },
  {
    title: 'Cerca velocemente',
    description: 'Usa i filtri per nome o master per trovare subito la one shot che ti serve.',
    illustration: { type: 'form', fields: ['Cerca per titolo', 'Cerca per master'], highlightIndex: 0, submitLabel: 'Cerca' },
  },
  {
    title: 'Crea una nuova one shot',
    description: 'Premi "+ Aggiungi" per creare una nuova sessione da collegare in seguito a un tavolo libero.',
    illustration: { type: 'cards', items: [{ label: '+ Aggiungi' }], highlightIndex: 0 },
  },
  {
    title: 'Apri i dettagli',
    description: 'Clicca su una riga per modificarla o vedere a quale evento e tavolo è collegata.',
    illustration: { type: 'list', columns: ['Titolo', 'Gioco', 'Master'], rows: 3, highlightRow: 1 },
  },
]

export default function ResponsabileOneShotsSection({ association }) {
  return (
    <OneShotsManager
      eyebrow="Responsabile"
      title="One shot"
      description="Qui puoi vedere, creare e modificare le one shot della tua associazione legandole a un evento."
      listEndpoint="/api/responsabile/oneshots"
      routeBasePath="/responsabile/oneshots"
      fixedAssociation={{ id: association.id, name: association.name }}
      tutorialSlides={ONESHOTS_TUTORIAL_SLIDES}
    />
  )
}