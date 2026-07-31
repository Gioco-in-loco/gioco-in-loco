import { NextResponse } from 'next/server'
import { requireResponsabileApi } from '../../../../src/lib/admin-guard'
import { createOneShot, DEFAULT_ONESHOT_PAGE_SIZE, listOneShots } from '../../../../src/lib/oneshots-management'

export async function GET(request) {
  const { user, error, status } = await requireResponsabileApi()
  if (error) return NextResponse.json({ error }, { status })

  if (!user?.associationId) {
    return NextResponse.json({ error: 'Nessuna associazione assegnata' }, { status: 404 })
  }

  const searchParams = request.nextUrl.searchParams
  const pageParam = Number(searchParams.get('page') || '1')
  const pageSizeParam = Number(searchParams.get('pageSize') || String(DEFAULT_ONESHOT_PAGE_SIZE))

  const result = await listOneShots({
    eventId: searchParams.get('eventId')?.trim(),
    search: searchParams.get('search')?.trim(),
    master: searchParams.get('master')?.trim(),
    page: pageParam,
    pageSize: pageSizeParam,
    managedAssociationId: user.associationId,
  })

  return NextResponse.json(result)
}

export async function POST(request) {
  const { user, error, status } = await requireResponsabileApi()
  if (error) return NextResponse.json({ error }, { status })

  if (!user?.associationId) {
    return NextResponse.json({ error: 'Nessuna associazione assegnata' }, { status: 404 })
  }

  try {
    const body = await request.json()
    const oneshot = await createOneShot({ body, managedAssociationId: user.associationId })
    return NextResponse.json(oneshot, { status: 201 })
  } catch (caughtError) {
    return NextResponse.json({ error: caughtError.message || 'Creazione non riuscita' }, { status: caughtError.status || 500 })
  }
}