import ChiSiamoPage from '../../src/components/pages/ChiSiamo'
import { unstable_noStore as noStore } from 'next/cache'
import { getAssociations } from '../../src/lib/associations'

export default async function ChiSiamoRoute() {
  noStore()

  const associations = await getAssociations()

  return <ChiSiamoPage associations={associations} />
}