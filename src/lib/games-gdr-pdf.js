import PDFDocument from 'pdfkit'
import { prisma } from './prisma'

export async function generateGamesGDRPdf() {
  const games = await prisma.gameGDR.findMany({
    orderBy: { nome: 'asc' },
    select: { nome: true, descrizione: true },
  })

  const doc = new PDFDocument({ size: 'A4', margin: 50 })
  const chunks = []
  doc.on('data', (chunk) => chunks.push(chunk))
  const done = new Promise((resolve) => doc.on('end', resolve))

  doc.font('Helvetica-Bold').fontSize(20).text('I Nostri Giochi', { align: 'left' })
  doc.moveDown(1.5)

  if (games.length === 0) {
    doc.font('Helvetica').fontSize(11).text('Nessun gioco presente.')
  }

  for (const game of games) {
    doc.font('Helvetica-Bold').fontSize(13).text(game.nome)
    if (game.descrizione) {
      doc.moveDown(0.2)
      doc.font('Helvetica').fontSize(11).text(game.descrizione, { align: 'justify' })
    }
    doc.moveDown(1)
  }

  doc.end()
  await done

  return Buffer.concat(chunks)
}
