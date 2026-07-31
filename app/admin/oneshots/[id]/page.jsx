'use client'

import OneShotDetail from '../../../../src/components/management/OneShotDetail'

export default function AdminOneShotDetailPage({ params }) {
  return (
    <OneShotDetail
      oneshotId={params.id}
      itemEndpointBase="/api/admin/oneshots"
      uploadEndpoint="/api/admin/oneshots/upload-image"
      associationsEndpoint="/api/admin/associazioni"
      backHref="/admin/oneshots"
    />
  )
}
