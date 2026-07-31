import { redirect } from 'next/navigation'
import ResponsabileEventDetailSection from '../../../../src/components/responsabile/ResponsabileEventDetailSection'
import { requireResponsabile } from '../../../../src/lib/admin-guard'
import { getResponsabileAssociation } from '../../../../src/lib/responsabile'

export default async function ResponsabileEventDetailPage({ params }) {
  const responsabile = await requireResponsabile()
  if (!responsabile) redirect('/')

  if (!responsabile.associationId) redirect('/responsabile')

  const association = await getResponsabileAssociation(responsabile.associationId)
  if (!association) redirect('/responsabile')

  return <ResponsabileEventDetailSection eventExternalId={params.id} association={association} />
}
