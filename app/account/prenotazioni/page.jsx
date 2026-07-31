import { Suspense } from 'react'
import AccountBookingsPage from '../../../src/components/auth/AccountBookingsPage'

export default function AccountBookingsRoute() {
  return (
    <Suspense fallback={null}>
      <AccountBookingsPage />
    </Suspense>
  )
}