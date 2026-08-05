import { prisma } from './prisma'

export const associationSelect = {
  id: true,
  name: true,
  logo: true,
  bio: true,
  address: true,
  city: true,
  openingHours: true,
  instagram: true,
  facebook: true,
  website: true,
  whatsapp: true,
  email: true,
  tiktok: true,
  linktree: true,
  telegram: true,
  createdAt: true,
  updatedAt: true,
}

function createHttpError(status, message) {
  const error = new Error(message)
  error.status = status
  return error
}

export function normalizeOptionalString(value) {
  if (typeof value !== 'string') return null
  const trimmed = value.trim()
  return trimmed || null
}

function buildAssociationPayload(body) {
  const name = typeof body?.name === 'string' ? body.name.trim() : ''

  if (!name) {
    throw createHttpError(400, 'Nome associazione obbligatorio')
  }

  return {
    name,
    logo: normalizeOptionalString(body?.logo),
    bio: normalizeOptionalString(body?.bio),
    address: normalizeOptionalString(body?.address),
    city: normalizeOptionalString(body?.city),
    openingHours: normalizeOptionalString(body?.openingHours),
    instagram: normalizeOptionalString(body?.instagram),
    facebook: normalizeOptionalString(body?.facebook),
    website: normalizeOptionalString(body?.website),
    whatsapp: normalizeOptionalString(body?.whatsapp),
    email: normalizeOptionalString(body?.email),
    tiktok: normalizeOptionalString(body?.tiktok),
    linktree: normalizeOptionalString(body?.linktree),
    telegram: normalizeOptionalString(body?.telegram),
  }
}

function mapAssociationError(error, notFoundMessage) {
  if (error?.status) return error
  if (error?.code === 'P2025') return createHttpError(404, notFoundMessage)
  if (error?.code === 'P2003') return createHttpError(409, 'Impossibile eliminare un\'associazione collegata a contenuti o utenti')
  return createHttpError(500, 'Operazione non riuscita')
}

export async function listAssociations() {
  return prisma.association.findMany({
    orderBy: { name: 'asc' },
    select: associationSelect,
  })
}

export async function getAssociation(id) {
  const association = await prisma.association.findUnique({
    where: { id },
    select: associationSelect,
  })

  if (!association) {
    throw createHttpError(404, 'Associazione non trovata')
  }

  return association
}

export async function createAssociation(body) {
  try {
    return await prisma.association.create({
      data: buildAssociationPayload(body),
      select: associationSelect,
    })
  } catch (error) {
    throw mapAssociationError(error, 'Associazione non trovata')
  }
}

export async function updateAssociation(id, body, options = {}) {
  try {
    return await prisma.association.update({
      where: { id },
      data: buildAssociationPayload(body),
      select: associationSelect,
    })
  } catch (error) {
    throw mapAssociationError(error, 'Associazione non trovata')
  }
}

export async function deleteAssociation(id) {
  try {
    await prisma.association.delete({ where: { id } })
  } catch (error) {
    throw mapAssociationError(error, 'Associazione non trovata')
  }
}