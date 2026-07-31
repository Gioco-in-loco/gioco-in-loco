import { NextResponse } from 'next/server'
import { requireResponsabileApi } from '../../../../../src/lib/admin-guard'
import { deleteOneShot, getOneShotDetail, updateOneShot } from '../../../../../src/lib/oneshots-management'

export async function GET(_request, { params }) {
  const { user, error, status } = await requireResponsabileApi()
  if (error) return NextResponse.json({ error }, { status })

  if (!user?.associationId) {
    return NextResponse.json({ error: 'Nessuna associazione assegnata' }, { status: 404 })
  }

  try {
    const oneshot = await getOneShotDetail({ id: params.id, managedAssociationId: user.associationId })
    return NextResponse.json(oneshot)
  } catch (caughtError) {
    return NextResponse.json({ error: caughtError.message || 'One shot non trovata' }, { status: caughtError.status || 500 })
  }
}

export async function PATCH(request, { params }) {
  const { user, error, status } = await requireResponsabileApi()
  if (error) return NextResponse.json({ error }, { status })

  if (!user?.associationId) {
    return NextResponse.json({ error: 'Nessuna associazione assegnata' }, { status: 404 })
  }

  try {
    const body = await request.json()
    const oneshot = await updateOneShot({ id: params.id, body, managedAssociationId: user.associationId })
    return NextResponse.json(oneshot)
  } catch (caughtError) {
    return NextResponse.json({ error: caughtError.message || 'Aggiornamento non riuscito' }, { status: caughtError.status || 500 })
  }
}

export async function DELETE(request, { params }) {
  const { user, error, status } = await requireResponsabileApi()
  if (error) return NextResponse.json({ error }, { status })

  if (!user?.associationId) {
    return NextResponse.json({ error: 'Nessuna associazione assegnata' }, { status: 404 })
  }

  try {
    await deleteOneShot({ id: params.id, managedAssociationId: user.associationId })
    return new NextResponse(null, { status: 204 })
  } catch (caughtError) {
    return NextResponse.json({ error: caughtError.message || 'One shot non trovata' }, { status: caughtError.status || 500 })
  }
}