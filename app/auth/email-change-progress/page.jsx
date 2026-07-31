import { Suspense } from 'react'
import EmailChangeProgressPage from '../../../src/components/auth/EmailChangeProgressPage'

export default function EmailChangeProgressRoute() {
  return (
    <Suspense fallback={null}>
      <EmailChangeProgressPage />
    </Suspense>
  )
}
