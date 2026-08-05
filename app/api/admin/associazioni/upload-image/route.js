import { NextResponse } from 'next/server'
import { requireAdminApi } from '../../../../../src/lib/admin-guard'
import { uploadAssociationLogo } from '../../../../../src/lib/association-logo-upload'

export async function POST(request) {
  const { error, status } = await requireAdminApi()
  if (error) return NextResponse.json({ error }, { status })

  try {
    const formData = await request.formData()
    const url = await uploadAssociationLogo(formData.get('file'))
    return NextResponse.json({ url })
  } catch (caughtError) {
    return NextResponse.json({ error: caughtError.message || 'Caricamento immagine non riuscito.' }, { status: caughtError.status || 500 })
  }
}
