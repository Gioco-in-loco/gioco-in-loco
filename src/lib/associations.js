import { cache } from 'react'
import { prisma } from './prisma'
import { toAssociationSlug } from './association-slug'

const globalForAssociations = globalThis

function isBuildPhase() {
  return process.env.NEXT_PHASE === 'phase-production-build'
}

function normalizeAssociation(association) {
  const slug = toAssociationSlug(association.name)

  return {
    id: association.id,
    slug,
    key: slug,
    name: association.name,
    logo: association.logo,
    bio: association.bio || '',
    location: association.address || association.city || association.openingHours
      ? {
          address: association.address || '',
          city: association.city || '',
          openingHours: association.openingHours || '',
        }
      : null,
    social: {
      instagram: association.instagram || undefined,
      facebook: association.facebook || undefined,
      website: association.website || undefined,
      whatsapp: association.whatsapp || undefined,
      email: association.email || undefined,
      tiktok: association.tiktok || undefined,
      linktree: association.linktree || undefined,
      telegram: association.telegram || undefined,
    },
  }
}

export const getAssociations = cache(async function getAssociations() {
  if (isBuildPhase()) {
    return []
  }

  try {
    const associations = await prisma.association.findMany({
      orderBy: [{ name: 'asc' }, { id: 'asc' }],
      select: {
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
      },
    })

    return associations.map(normalizeAssociation)
  } catch (error) {
    if (!globalForAssociations.__associationsErrorLogged) {
      console.warn('Failed to load associations:', error?.message || error)
      globalForAssociations.__associationsErrorLogged = true
    }

    return []
  }
})

export const getAssociationBySlugOrId = cache(async function getAssociationBySlugOrId(slugOrId) {
  const associations = await getAssociations()
  return associations.find((association) => association.slug === slugOrId || association.id === slugOrId) || null
})