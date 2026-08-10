import { NextResponse } from 'next/server'
import { requireAdminOrResponsabileApi } from '../../../src/lib/admin-guard'
import { createGameGDR, DEFAULT_GAME_GDR_PAGE_SIZE, listGamesGDR } from '../../../src/lib/games-gdr-management'

export async function GET(request) {
  const { error, status } = await requireAdminOrResponsabileApi()
  if (error) return NextResponse.json({ error }, { status })

  const searchParams = request.nextUrl.searchParams
  const pageParam = Number(searchParams.get('page') || '1')
  const pageSizeParam = Number(searchParams.get('pageSize') || String(DEFAULT_GAME_GDR_PAGE_SIZE))

  const result = await listGamesGDR({
    search: searchParams.get('search')?.trim(),
    page: pageParam,
    pageSize: pageSizeParam,
  })

  return NextResponse.json(result)
}

export async function POST(request) {
  const { error, status } = await requireAdminOrResponsabileApi()
  if (error) return NextResponse.json({ error }, { status })

  try {
    const body = await request.json()
    const game = await createGameGDR({ body })
    return NextResponse.json(game, { status: 201 })
  } catch (caughtError) {
    return NextResponse.json({ error: caughtError.message || 'Creazione non riuscita' }, { status: caughtError.status || 500 })
  }
}
