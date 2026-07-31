import { Suspense } from 'react'
import AccountPage from '../../../src/components/auth/AccountPage'

export default function AccountProfileRoute() {
  return (
    <Suspense fallback={null}>
      <AccountPage />
    </Suspense>
  )
}