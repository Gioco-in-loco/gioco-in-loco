import { NextResponse } from 'next/server'
import { requireAdminApi } from '../../../../../src/lib/admin-guard'
import { deleteMainEvent, getMainEventDetail, updateMainEvent } from '../../../../../src/lib/main-events-management'

export async function GET(_request, { params }) {
  const { error, status } = await requireAdminApi()
  if (error) return NextResponse.json({ error }, { status })

  try {
    const mainEvent = await getMainEventDetail({ id: params.id })
    return NextResponse.json(mainEvent)
  } catch (caughtError) {
    return NextResponse.json({ error: caughtError.message || 'Main event non trovato' }, { status: caughtError.status || 500 })
  }
}

export async function PATCH(request, { params }) {
  const { error, status } = await requireAdminApi()
  if (error) return NextResponse.json({ error }, { status })

  try {
    const body = await request.json()
    const mainEvent = await updateMainEvent({ id: params.id, body })
    return NextResponse.json(mainEvent)
  } catch (caughtError) {
    return NextResponse.json({ error: caughtError.message || 'Aggiornamento non riuscito' }, { status: caughtError.status || 500 })
  }
}

export async function DELETE(_request, { params }) {
  const { error, status } = await requireAdminApi()
  if (error) return NextResponse.json({ error }, { status })

  try {
    await deleteMainEvent({ id: params.id })
    return new NextResponse(null, { status: 204 })
  } catch (caughtError) {
    return NextResponse.json({ error: caughtError.message || 'Main event non trovato' }, { status: caughtError.status || 500 })
  }
}
