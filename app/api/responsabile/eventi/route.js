import { NextResponse } from 'next/server'
import { prisma } from '../../../../src/lib/prisma'
import { requireResponsabileApi } from '../../../../src/lib/admin-guard'

export async function GET() {
  const { error, status } = await requireResponsabileApi()
  if (error) return NextResponse.json({ error }, { status })

  const now = new Date()

  const events = await prisma.event.findMany({
    where: {
      OR: [
        { endDate: { gte: now } },
        { endDate: null, OR: [{ startDate: { gte: now } }, { startDate: null }] },
      ],
    },
    orderBy: { startDate: 'asc' },
    select: {
      id: true,
      externalId: true,
      name: true,
      location: true,
      startDate: true,
      endDate: true,
    },
  })

  return NextResponse.json(events)
}