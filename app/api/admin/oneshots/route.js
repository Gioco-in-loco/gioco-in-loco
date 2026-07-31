import { NextResponse } from 'next/server'
import { requireAdminApi } from '../../../../src/lib/admin-guard'
import { createOneShot, DEFAULT_ONESHOT_PAGE_SIZE, listOneShots } from '../../../../src/lib/oneshots-management'

export async function GET(request) {
  const { error, status } = await requireAdminApi()
  if (error) return NextResponse.json({ error }, { status })

  const searchParams = request.nextUrl.searchParams
  const pageParam = Number(searchParams.get('page') || '1')
  const pageSizeParam = Number(searchParams.get('pageSize') || String(DEFAULT_ONESHOT_PAGE_SIZE))

  const result = await listOneShots({
    eventId: searchParams.get('eventId')?.trim(),
    association: searchParams.get('association')?.trim(),
    search: searchParams.get('search')?.trim(),
    master: searchParams.get('master')?.trim(),
    page: pageParam,
    pageSize: pageSizeParam,
  })

  return NextResponse.json(result)
}

export async function POST(request) {
  const { error, status } = await requireAdminApi()
  if (error) return NextResponse.json({ error }, { status })

  try {
    const body = await request.json()
    const oneshot = await createOneShot({ body })
    return NextResponse.json(oneshot, { status: 201 })
  } catch (caughtError) {
    return NextResponse.json({ error: caughtError.message || 'Creazione non riuscita' }, { status: caughtError.status || 500 })
  }
}