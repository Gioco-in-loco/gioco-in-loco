import { NextResponse } from 'next/server'
import { requireAdminOrResponsabileApi } from '../../../../src/lib/admin-guard'
import { generateGamesGDRPdf } from '../../../../src/lib/games-gdr-pdf'

export async function GET() {
  const { error, status } = await requireAdminOrResponsabileApi()
  if (error) return NextResponse.json({ error }, { status })

  const pdfBuffer = await generateGamesGDRPdf()

  return new NextResponse(pdfBuffer, {
    status: 200,
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': 'attachment; filename="i-nostri-giochi.pdf"',
    },
  })
}
