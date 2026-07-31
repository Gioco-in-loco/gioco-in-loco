'use client'

import MainEventCreate from '../../../../src/components/management/MainEventCreate'

export default function AdminNewMainEventPage() {
  return (
    <MainEventCreate
      listEndpoint="/api/admin/main-events"
      uploadEndpoint="/api/admin/main-events/upload-image"
      backHref="/admin/main-events"
    />
  )
}
