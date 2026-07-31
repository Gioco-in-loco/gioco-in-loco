import { NextResponse } from 'next/server'
import { requireResponsabileApi } from '../../../../src/lib/admin-guard'
import { prisma } from '../../../../src/lib/prisma'
import { associationSelect, updateAssociation } from '../../../../src/lib/associations-management'

export async function GET() {
  const { user, error, status } = await requireResponsabileApi()
  if (error) return NextResponse.json({ error }, { status })

  if (!user?.associationId) {
    return NextResponse.json({ error: 'Nessuna associazione assegnata' }, { status: 404 })
  }

  const association = await prisma.association.findUnique({
    where: { id: user.associationId },
    select: associationSelect,
  })

  if (!association) {
    return NextResponse.json({ error: 'Associazione non trovata' }, { status: 404 })
  }

  return NextResponse.json(association)
}

export async function PATCH(request) {
  const { user, error, status } = await requireResponsabileApi()
  if (error) return NextResponse.json({ error }, { status })

  if (!user?.associationId) {
    return NextResponse.json({ error: 'Nessuna associazione assegnata' }, { status: 404 })
  }

  try {
    const body = await request.json()
    const association = await updateAssociation(user.associationId, body)
    return NextResponse.json(association)
  } catch (caughtError) {
    return NextResponse.json({ error: caughtError.message || 'Aggiornamento non riuscito' }, { status: caughtError.status || 500 })
  }
}