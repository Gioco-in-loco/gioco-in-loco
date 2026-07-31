'use client'

import OneShotCreate from '../../../../src/components/management/OneShotCreate'

export default function AdminNewOneShotPage() {
  return (
    <OneShotCreate
      listEndpoint="/api/admin/oneshots"
      uploadEndpoint="/api/admin/oneshots/upload-image"
      associationsEndpoint="/api/admin/associazioni"
      backHref="/admin/oneshots"
    />
  )
}
