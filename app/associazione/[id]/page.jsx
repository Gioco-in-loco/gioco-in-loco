import AssociazionePage from '../../../src/components/pages/AssociazionePage'
import { getAssociationBySlugOrId } from '../../../src/lib/associations'

export default async function AssociazioneRoute({ params }) {
  const association = await getAssociationBySlugOrId(params.id)

  return <AssociazionePage association={association} />
}