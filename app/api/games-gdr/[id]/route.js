import { NextResponse } from 'next/server'
import { requireAdminOrResponsabileApi } from '../../../../src/lib/admin-guard'
import { deleteGameGDR, getGameGDRDetail, updateGameGDR } from '../../../../src/lib/games-gdr-management'

export async function GET(_request, { params }) {
  const { error, status } = await requireAdminOrResponsabileApi()
  if (error) return NextResponse.json({ error }, { status })

  try {
    const game = await getGameGDRDetail({ id: params.id })
    return NextResponse.json(game)
  } catch (caughtError) {
    return NextResponse.json({ error: caughtError.message || 'Gioco non trovato' }, { status: caughtError.status || 500 })
  }
}

export async function PATCH(request, { params }) {
  const { error, status } = await requireAdminOrResponsabileApi()
  if (error) return NextResponse.json({ error }, { status })

  try {
    const body = await request.json()
    const game = await updateGameGDR({ id: params.id, body })
    return NextResponse.json(game)
  } catch (caughtError) {
    return NextResponse.json({ error: caughtError.message || 'Aggiornamento non riuscito' }, { status: caughtError.status || 500 })
  }
}

export async function DELETE(_request, { params }) {
  const { error, status } = await requireAdminOrResponsabileApi()
  if (error) return NextResponse.json({ error }, { status })

  try {
    await deleteGameGDR({ id: params.id })
    return new NextResponse(null, { status: 204 })
  } catch (caughtError) {
    return NextResponse.json({ error: caughtError.message || 'Gioco non trovato' }, { status: caughtError.status || 500 })
  }
}
