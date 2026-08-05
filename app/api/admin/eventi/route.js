import { NextResponse } from 'next/server'
import { prisma } from '../../../../src/lib/prisma'
import { requireAdminApi } from '../../../../src/lib/admin-guard'
import { normalizeEventDays, normalizeEventTimeSlots } from '../../../../src/lib/oneshots-management'

export async function GET() {
  const { error, status } = await requireAdminApi()
  if (error) return NextResponse.json({ error }, { status })

  const events = await prisma.event.findMany({
    orderBy: { startDate: 'desc' },
    select: {
      id: true,
      externalId: true,
      name: true,
      description: true,
      location: true,
      mapsUrl: true,
      price: true,
      dailyPrice: true,
      days: true,
      timeSlots: true,
      startDate: true,
      endDate: true,
      bookingOpensAt: true,
      showComingSoon: true,
      createdAt: true,
    },
  })

  return NextResponse.json(events)
}

export async function POST(request) {
  const { error, status } = await requireAdminApi()
  if (error) return NextResponse.json({ error }, { status })

  const body = await request.json()
  const { externalId, name, description, location, mapsUrl, price, dailyPrice, startDate, endDate, bookingOpensAt, showComingSoon } = body

  if (!externalId?.trim() || !name?.trim()) {
    return NextResponse.json({ error: 'externalId e name sono obbligatori' }, { status: 400 })
  }

  const existing = await prisma.event.findUnique({ where: { externalId } })
  if (existing) {
    return NextResponse.json({ error: 'externalId già esistente' }, { status: 409 })
  }

  try {
    const event = await prisma.event.create({
      data: {
        externalId: externalId.trim(),
        name: name.trim(),
        description: description?.trim() || null,
        location: location?.trim() || null,
        mapsUrl: mapsUrl?.trim() || null,
        price: price === '' || price === null || price === undefined ? null : Number(price),
        dailyPrice: dailyPrice === '' || dailyPrice === null || dailyPrice === undefined ? null : Number(dailyPrice),
        days: normalizeEventDays(body.days) || [],
        timeSlots: normalizeEventTimeSlots(body.timeSlots) || [],
        startDate: startDate ? new Date(startDate) : null,
        endDate: endDate ? new Date(endDate) : null,
        bookingOpensAt: bookingOpensAt ? new Date(bookingOpensAt) : null,
        showComingSoon: Boolean(showComingSoon),
      },
    })

    return NextResponse.json(event, { status: 201 })
  } catch (caughtError) {
    return NextResponse.json({ error: caughtError.message || 'Creazione evento non riuscita' }, { status: caughtError.status || 500 })
  }
}
