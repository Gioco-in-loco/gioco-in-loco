import { Suspense } from 'react'
import InviteClaimPage from '../../../src/components/auth/InviteClaimPage'

export default function InviteClaimRoute({ params }) {
  return (
    <Suspense fallback={null}>
      <InviteClaimPage code={params.code} />
    </Suspense>
  )
}
