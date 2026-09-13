import { NextResponse } from 'next/server'
import { prisma } from '../../../../src/lib/prisma'
import { requireResponsabileApi } from '../../../../src/lib/admin-guard'
import { getStartOfTodayUtc } from '../../../../src/lib/rome-datetime'

export async function GET() {
  const { error, status } = await requireResponsabileApi()
  if (error) return NextResponse.json({ error }, { status })

  const today = getStartOfTodayUtc()

  const events = await prisma.event.findMany({
    where: {
      OR: [
        { endDate: { gte: today } },
        { endDate: null, OR: [{ startDate: { gte: today } }, { startDate: null }] },
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