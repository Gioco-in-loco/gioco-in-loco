import { Suspense } from 'react'
import CheckEmailPage from '../../../src/components/auth/CheckEmailPage'

export default function CheckEmailRoute() {
  return (
    <Suspense fallback={null}>
      <CheckEmailPage />
    </Suspense>
  )
}
