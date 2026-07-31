import { NextResponse } from 'next/server'
import { requireAdminApi } from '../../../../../src/lib/admin-guard'
import { deleteAssociation, getAssociation, updateAssociation } from '../../../../../src/lib/associations-management'

export async function GET(request, { params }) {
  const { error, status } = await requireAdminApi()
  if (error) return NextResponse.json({ error }, { status })

  try {
    const association = await getAssociation(params.id)
    return NextResponse.json(association)
  } catch (caughtError) {
    return NextResponse.json({ error: caughtError.message || 'Associazione non trovata' }, { status: caughtError.status || 500 })
  }
}

export async function PATCH(request, { params }) {
  const { error, status } = await requireAdminApi()
  if (error) return NextResponse.json({ error }, { status })

  try {
    const body = await request.json()
    const association = await updateAssociation(params.id, body)
    return NextResponse.json(association)
  } catch (caughtError) {
    return NextResponse.json({ error: caughtError.message || 'Aggiornamento non riuscito' }, { status: caughtError.status || 500 })
  }
}

export async function DELETE(request, { params }) {
  const { error, status } = await requireAdminApi()
  if (error) return NextResponse.json({ error }, { status })

  try {
    await deleteAssociation(params.id)
    return new NextResponse(null, { status: 204 })
  } catch (caughtError) {
    return NextResponse.json({ error: caughtError.message || 'Eliminazione non riuscita' }, { status: caughtError.status || 500 })
  }
}