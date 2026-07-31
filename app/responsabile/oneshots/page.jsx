import { redirect } from 'next/navigation'
import ResponsabileOneShotsSection from '../../../src/components/responsabile/ResponsabileOneShotsSection'
import { requireResponsabile } from '../../../src/lib/admin-guard'
import { getResponsabileAssociation } from '../../../src/lib/responsabile'

export default async function ResponsabileOneShotsPage() {
  const responsabile = await requireResponsabile()
  if (!responsabile) redirect('/')

  if (!responsabile.associationId) redirect('/responsabile')

  const association = await getResponsabileAssociation(responsabile.associationId)
  if (!association) redirect('/responsabile')

  return <ResponsabileOneShotsSection association={association} />
}