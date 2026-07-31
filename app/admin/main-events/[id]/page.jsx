'use client'

import MainEventDetail from '../../../../src/components/management/MainEventDetail'

export default function AdminMainEventDetailPage({ params }) {
  return (
    <MainEventDetail
      mainEventId={params.id}
      itemEndpointBase="/api/admin/main-events"
      uploadEndpoint="/api/admin/main-events/upload-image"
      backHref="/admin/main-events"
    />
  )
}
