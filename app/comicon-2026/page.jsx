import Comicon2026 from '../../src/components/pages/Comicon2026'
import { getAssociations } from '../../src/lib/associations'

export default async function Comicon2026Page() {
  const associations = await getAssociations()

  return <Comicon2026 associations={associations} />
}