import { Suspense } from 'react'
import AccountDashboardPage from '../../src/components/auth/AccountDashboardPage'

export default async function AccountRoute() {
  return (
    <Suspense fallback={null}>
      <AccountDashboardPage />
    </Suspense>
  )
}