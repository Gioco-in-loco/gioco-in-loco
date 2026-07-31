import { associationSelect } from './associations-management'
import { prisma } from './prisma'

export async function getResponsabileAssociation(associationId) {
  if (!associationId) return null

  return prisma.association.findUnique({
    where: { id: associationId },
    select: associationSelect,
  })
}