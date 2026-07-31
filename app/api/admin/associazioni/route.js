import { NextResponse } from 'next/server'
import { requireAdminApi } from '../../../../src/lib/admin-guard'
import { createAssociation, listAssociations } from '../../../../src/lib/associations-management'

export async function GET() {
  const { error, status } = await requireAdminApi()
  if (error) return NextResponse.json({ error }, { status })

  const associations = await listAssociations()
  return NextResponse.json(associations)
}

export async function POST(request) {
  const { error, status } = await requireAdminApi()
  if (error) return NextResponse.json({ error }, { status })

  try {
    const body = await request.json()
    const association = await createAssociation(body)
    return NextResponse.json(association, { status: 201 })
  } catch (caughtError) {
    return NextResponse.json({ error: caughtError.message || 'Creazione non riuscita' }, { status: caughtError.status || 500 })
  }
}
