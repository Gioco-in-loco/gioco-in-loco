import { NextResponse } from 'next/server'
import { requireAdminApi } from '../../../../../src/lib/admin-guard'
import { deleteOneShot, getOneShotDetail, updateOneShot } from '../../../../../src/lib/oneshots-management'

export async function GET(_request, { params }) {
  const { error, status } = await requireAdminApi()
  if (error) return NextResponse.json({ error }, { status })

  try {
    const oneshot = await getOneShotDetail({ id: params.id })
    return NextResponse.json(oneshot)
  } catch (caughtError) {
    return NextResponse.json({ error: caughtError.message || 'One shot non trovata' }, { status: caughtError.status || 500 })
  }
}

export async function PATCH(request, { params }) {
  const { error, status } = await requireAdminApi()
  if (error) return NextResponse.json({ error }, { status })

  try {
    const body = await request.json()
    const oneshot = await updateOneShot({ id: params.id, body })
    return NextResponse.json(oneshot)
  } catch (caughtError) {
    return NextResponse.json({ error: caughtError.message || 'Aggiornamento non riuscito' }, { status: caughtError.status || 500 })
  }
}

export async function DELETE(request, { params }) {
  const { error, status } = await requireAdminApi()
  if (error) return NextResponse.json({ error }, { status })

  try {
    await deleteOneShot({ id: params.id })
    return new NextResponse(null, { status: 204 })
  } catch (caughtError) {
    return NextResponse.json({ error: caughtError.message || 'One shot non trovata' }, { status: caughtError.status || 500 })
  }
}