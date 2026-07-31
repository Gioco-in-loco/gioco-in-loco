import { Suspense } from 'react'
import CompleteAccountPage from '../../../src/components/auth/CompleteAccountPage'

export default function CompleteAccountRoute() {
  return (
    <Suspense fallback={null}>
      <CompleteAccountPage />
    </Suspense>
  )
}