'use client'

import MainEventsManager from '../../../src/components/management/MainEventsManager'

export default function AdminMainEventsPage() {
  return (
    <MainEventsManager
      listEndpoint="/api/admin/main-events"
      routeBasePath="/admin/main-events"
    />
  )
}
