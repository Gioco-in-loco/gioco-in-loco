import { redirect } from 'next/navigation'
import ResponsabileAssociationSection from '../../../src/components/responsabile/ResponsabileAssociationSection'
import { requireResponsabile } from '../../../src/lib/admin-guard'
import { getResponsabileAssociation } from '../../../src/lib/responsabile'

export default async function ResponsabileAssociazionePage() {
  const responsabile = await requireResponsabile()
  if (!responsabile) redirect('/')

  if (!responsabile.associationId) redirect('/responsabile')

  const association = await getResponsabileAssociation(responsabile.associationId)
  if (!association) redirect('/responsabile')

  return <ResponsabileAssociationSection initialAssociation={association} />
}