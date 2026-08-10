import { prisma } from './prisma'

export const DEFAULT_GAME_GDR_PAGE_SIZE = 20

function createHttpError(status, message) {
  const error = new Error(message)
  error.status = status
  return error
}

function normalizeOptionalString(value) {
  if (typeof value !== 'string') return null
  const trimmed = value.trim()
  return trimmed || null
}

export function serializeGameGDR(game) {
  return {
    id: game.id,
    nome: game.nome,
    descrizione: game.descrizione,
    autore: game.autore,
    editore: game.editore,
    createdAt: game.createdAt,
    updatedAt: game.updatedAt,
  }
}

function buildWhere({ search }) {
  return search ? { nome: { contains: search, mode: 'insensitive' } } : {}
}

export async function listGamesGDR({ search, page = 1, pageSize = DEFAULT_GAME_GDR_PAGE_SIZE } = {}) {
  const safePage = Number.isInteger(page) && page > 0 ? page : 1
  const safePageSize = Number.isInteger(pageSize) && pageSize > 0 ? Math.min(pageSize, 100) : DEFAULT_GAME_GDR_PAGE_SIZE
  const skip = (safePage - 1) * safePageSize

  const where = buildWhere({ search })

  const [totalItems, games] = await prisma.$transaction([
    prisma.gameGDR.count({ where }),
    prisma.gameGDR.findMany({
      where,
      orderBy: { nome: 'asc' },
      skip,
      take: safePageSize,
    }),
  ])

  return {
    items: games.map(serializeGameGDR),
    pagination: {
      page: safePage,
      pageSize: safePageSize,
      totalItems,
      totalPages: totalItems > 0 ? Math.ceil(totalItems / safePageSize) : 0,
    },
  }
}

export async function getGameGDRDetail({ id }) {
  const game = await prisma.gameGDR.findUnique({ where: { id } })
  if (!game) {
    throw createHttpError(404, 'Gioco non trovato')
  }

  return serializeGameGDR(game)
}

export async function createGameGDR({ body }) {
  const nome = body?.nome?.trim()
  if (!nome) {
    throw createHttpError(400, 'Nome obbligatorio')
  }

  const game = await prisma.gameGDR.create({
    data: {
      nome,
      descrizione: normalizeOptionalString(body?.descrizione),
      autore: normalizeOptionalString(body?.autore),
      editore: normalizeOptionalString(body?.editore),
    },
  })

  return serializeGameGDR(game)
}

export async function updateGameGDR({ id, body }) {
  const data = {}

  if (body?.nome !== undefined) {
    const nome = body.nome?.trim()
    if (!nome) throw createHttpError(400, 'Nome obbligatorio')
    data.nome = nome
  }

  if (body?.descrizione !== undefined) data.descrizione = normalizeOptionalString(body.descrizione)
  if (body?.autore !== undefined) data.autore = normalizeOptionalString(body.autore)
  if (body?.editore !== undefined) data.editore = normalizeOptionalString(body.editore)

  try {
    const game = await prisma.gameGDR.update({ where: { id }, data })
    return serializeGameGDR(game)
  } catch (error) {
    if (error?.code === 'P2025') throw createHttpError(404, 'Gioco non trovato')
    throw createHttpError(500, 'Aggiornamento gioco non riuscito')
  }
}

export async function deleteGameGDR({ id }) {
  try {
    await prisma.gameGDR.delete({ where: { id } })
  } catch (error) {
    if (error?.code === 'P2025') throw createHttpError(404, 'Gioco non trovato')
    throw createHttpError(500, 'Eliminazione gioco non riuscita')
  }
}
