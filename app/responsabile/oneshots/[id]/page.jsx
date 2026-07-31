import { redirect } from 'next/navigation'
import { requireResponsabile } from '../../../../src/lib/admin-guard'
import { getResponsabileAssociation } from '../../../../src/lib/responsabile'
import OneShotDetail from '../../../../src/components/management/OneShotDetail'

const ONESHOT_DETAIL_TUTORIAL_SLIDES = [
  {
    title: 'Dettagli della one shot',
    description: 'Qui vedi descrizione, posti e a quale tavolo dell\'evento è collegata.',
    illustration: { type: 'form', fields: ['Titolo', 'Gioco', 'Master', 'Posti min/max'], highlightIndex: -1 },
  },
  {
    title: 'Modifica o riassegna',
    description: 'Premi "Modifica" per aggiornare i dati o per cambiare a quale tavolo è collegata la one shot.',
    illustration: { type: 'form', fields: ['Titolo', 'Gioco', 'Master', 'Posti min/max'], highlightIndex: 4, submitLabel: 'Modifica' },
  },
]

export default async function ResponsabileOneShotDetailPage({ params }) {
  const responsabile = await requireResponsabile()
  if (!responsabile) redirect('/')

  if (!responsabile.associationId) redirect('/responsabile')

  const association = await getResponsabileAssociation(responsabile.associationId)
  if (!association) redirect('/responsabile')

  return (
    <OneShotDetail
      oneshotId={params.id}
      itemEndpointBase="/api/responsabile/oneshots"
      uploadEndpoint="/api/responsabile/oneshots/upload-image"
      fixedAssociation={{ id: association.id, name: association.name }}
      backHref="/responsabile/oneshots"
      tutorialSlides={ONESHOT_DETAIL_TUTORIAL_SLIDES}
    />
  )
}
