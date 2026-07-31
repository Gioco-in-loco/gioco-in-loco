import { redirect } from 'next/navigation'
import { requireResponsabile } from '../../../../src/lib/admin-guard'
import { getResponsabileAssociation } from '../../../../src/lib/responsabile'
import OneShotCreate from '../../../../src/components/management/OneShotCreate'

const NEW_ONESHOT_TUTORIAL_SLIDES = [
  {
    title: 'Crea la tua one shot',
    description: 'Compila titolo, gioco, master e numero di posti minimi e massimi.',
    illustration: { type: 'form', fields: ['Titolo', 'Gioco', 'Master', 'Posti min/max'], highlightIndex: -1 },
  },
  {
    title: 'Posti richiesti',
    description: 'I posti minimi e massimi determinano su quali tavoli potrà essere assegnata in seguito.',
    illustration: { type: 'form', fields: ['Titolo', 'Gioco', 'Master', 'Posti min/max'], highlightIndex: 3 },
  },
  {
    title: 'Salva',
    description: 'Premi "Crea one shot": potrai assegnarla a un tavolo libero di un evento in un secondo momento.',
    illustration: { type: 'form', fields: ['Titolo', 'Gioco', 'Master', 'Posti min/max'], highlightIndex: 4, submitLabel: 'Crea one shot' },
  },
]

export default async function ResponsabileNewOneShotPage() {
  const responsabile = await requireResponsabile()
  if (!responsabile) redirect('/')

  if (!responsabile.associationId) redirect('/responsabile')

  const association = await getResponsabileAssociation(responsabile.associationId)
  if (!association) redirect('/responsabile')

  return (
    <OneShotCreate
      listEndpoint="/api/responsabile/oneshots"
      uploadEndpoint="/api/responsabile/oneshots/upload-image"
      fixedAssociation={{ id: association.id, name: association.name }}
      backHref="/responsabile/oneshots"
      tutorialSlides={NEW_ONESHOT_TUTORIAL_SLIDES}
    />
  )
}
