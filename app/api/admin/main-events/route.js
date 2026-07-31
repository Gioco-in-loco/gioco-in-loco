import { NextResponse } from 'next/server'
import { requireAdminApi } from '../../../../src/lib/admin-guard'
import { createMainEvent, DEFAULT_MAIN_EVENT_PAGE_SIZE, listMainEvents } from '../../../../src/lib/main-events-management'

export async function GET(request) {
  const { error, status } = await requireAdminApi()
  if (error) return NextResponse.json({ error }, { status })

  const searchParams = request.nextUrl.searchParams
  const pageParam = Number(searchParams.get('page') || '1')
  const pageSizeParam = Number(searchParams.get('pageSize') || String(DEFAULT_MAIN_EVENT_PAGE_SIZE))

  const result = await listMainEvents({
    eventId: searchParams.get('eventId')?.trim(),
    search: searchParams.get('search')?.trim(),
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
    const mainEvent = await createMainEvent({ body })
    return NextResponse.json(mainEvent, { status: 201 })
  } catch (caughtError) {
    return NextResponse.json({ error: caughtError.message || 'Creazione non riuscita' }, { status: caughtError.status || 500 })
  }
}
