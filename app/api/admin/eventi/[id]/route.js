import { NextResponse } from 'next/server'
import { prisma } from '../../../../../src/lib/prisma'
import { requireAdminApi } from '../../../../../src/lib/admin-guard'
import { normalizeEventDays, normalizeEventTimeSlots } from '../../../../../src/lib/oneshots-management'

// params.id qui è l'externalId (slug) dell'evento, non il cuid interno — la
// pagina/rotta admin naviga e cerca gli eventi per externalId in modo che
// l'URL resti leggibile e stabile anche se l'id interno non lo è. Le rotte
// annidate (slots, waitlist, ecc.) ricevono invece l'id interno reale dal
// componente React (event.id), non da questo param.
export async function GET(request, { params }) {
  const { error, status } = await requireAdminApi()
  if (error) return NextResponse.json({ error }, { status })

  const event = await prisma.event.findUnique({ where: { externalId: params.id } })
  if (!event) return NextResponse.json({ error: 'Evento non trovato' }, { status: 404 })

  return NextResponse.json(event)
}

export async function PATCH(request, { params }) {
  const { error, status } = await requireAdminApi()
  if (error) return NextResponse.json({ error }, { status })

  const body = await request.json()
  const { externalId, name, description, location, mapsUrl, price, dailyPrice, startDate, endDate } = body

  try {
    const days = normalizeEventDays(body.days)
    const timeSlots = normalizeEventTimeSlots(body.timeSlots)

    if (externalId !== undefined && !externalId.trim()) {
      throw Object.assign(new Error('externalId non può essere vuoto'), { status: 400 })
    }

    const event = await prisma.event.update({
      where: { externalId: params.id },
      data: {
        ...(externalId !== undefined && { externalId: externalId.trim() }),
        ...(name !== undefined && { name: name.trim() }),
        ...(description !== undefined && { description: description?.trim() || null }),
        ...(location !== undefined && { location: location?.trim() || null }),
        ...(mapsUrl !== undefined && { mapsUrl: mapsUrl?.trim() || null }),
        ...(price !== undefined && { price: price === '' || price === null ? null : Number(price) }),
        ...(dailyPrice !== undefined && { dailyPrice: dailyPrice === '' || dailyPrice === null ? null : Number(dailyPrice) }),
        ...(days !== undefined && { days }),
        ...(timeSlots !== undefined && { timeSlots }),
        ...(startDate !== undefined && { startDate: startDate ? new Date(startDate) : null }),
        ...(endDate !== undefined && { endDate: endDate ? new Date(endDate) : null }),
      },
    })
    return NextResponse.json(event)
  } catch (caughtError) {
    if (caughtError?.status) {
      return NextResponse.json({ error: caughtError.message }, { status: caughtError.status })
    }
    if (caughtError?.code === 'P2002') {
      return NextResponse.json({ error: 'externalId già esistente' }, { status: 409 })
    }
    return NextResponse.json({ error: 'Evento non trovato' }, { status: 404 })
  }
}

export async function DELETE(request, { params }) {
  const { error, status } = await requireAdminApi()
  if (error) return NextResponse.json({ error }, { status })

  try {
    await prisma.event.delete({ where: { externalId: params.id } })
    return new NextResponse(null, { status: 204 })
  } catch {
    return NextResponse.json({ error: 'Evento non trovato' }, { status: 404 })
  }
}
