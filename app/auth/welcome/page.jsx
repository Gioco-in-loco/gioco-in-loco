import { Suspense } from 'react'
import WelcomePage from '../../../src/components/auth/WelcomePage'

export default function WelcomeRoute() {
  return (
    <Suspense fallback={null}>
      <WelcomePage />
    </Suspense>
  )
}
