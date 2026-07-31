import Home from '../src/components/pages/Home'
import { getAssociations } from '../src/lib/associations'

export default async function HomePage() {
  const associations = await getAssociations()

  return <Home associations={associations} />
}