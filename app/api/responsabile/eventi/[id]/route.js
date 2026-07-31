import { NextResponse } from 'next/server'
import { prisma } from '../../../../../src/lib/prisma'
import { requireResponsabileApi } from '../../../../../src/lib/admin-guard'

// params.id qui è l'externalId (slug) dell'evento, non il cuid interno — vedi
// la stessa convenzione in app/api/admin/eventi/[id]/route.js. Il chiamante
// deve usare l'`id` (cuid) restituito nella risposta per le chiamate annidate
// (slots, ecc.), non il param dell'URL.
export async function GET(_request, { params }) {
  const { error, status } = await requireResponsabileApi()
  if (error) return NextResponse.json({ error }, { status })

  const event = await prisma.event.findUnique({
    where: { externalId: params.id },
    select: {
      id: true,
      name: true,
      location: true,
      startDate: true,
      endDate: true,
    },
  })

  if (!event) return NextResponse.json({ error: 'Evento non trovato' }, { status: 404 })

  return NextResponse.json(event)
}
