'use client'

import OneShotsManager from '../../../src/components/management/OneShotsManager'

export default function AdminOneShotsPage() {
  return (
    <OneShotsManager
      listEndpoint="/api/admin/oneshots"
      routeBasePath="/admin/oneshots"
    />
  )
}
