import ExcelJS from 'exceljs'
import { NextResponse } from 'next/server'
import { requireAdminApi } from '../../../../../../../src/lib/admin-guard'
import { listSessionsForExport, listEventMasters } from '../../../../../../../src/lib/event-slots-management'
import { getEventAllReservations } from '../../../../../../../src/lib/event-reservations-overview'

const PLAYER_COLUMNS = 5
const ACTIVE_STATUSES = new Set(['PENDING', 'CONFIRMED', 'ATTENDED'])

export async function GET(_request, { params }) {
  const { error, status } = await requireAdminApi()
  if (error) return NextResponse.json({ error }, { status })

  const rows = await listSessionsForExport({ eventId: params.id })

  const workbook = new ExcelJS.Workbook()
  const sheet = workbook.addWorksheet('Sessioni')

  const playerColumns = Array.from({ length: PLAYER_COLUMNS }, (_, i) => ({
    header: `GIOCATORE ${i + 1}`,
    key: `player${i + 1}`,
    width: 22,
  }))

  sheet.columns = [
    { header: 'GIORNO', key: 'day', width: 14 },
    { header: 'SLOT', key: 'slot', width: 14 },
    { header: 'TAVOLO', key: 'table', width: 14 },
    { header: 'NOME', key: 'title', width: 30 },
    { header: 'MASTER', key: 'master', width: 20 },
    ...playerColumns,
  ]
  sheet.getRow(1).font = { bold: true }

  for (const row of rows) {
    const record = { day: row.day, slot: row.slot, table: row.table, title: row.title, master: row.master }
    for (let i = 0; i < PLAYER_COLUMNS; i += 1) {
      record[`player${i + 1}`] = row.players[i]?.name || ''
    }
    sheet.addRow(record)
  }

  // Rubrica contatti: un giocatore che gioca più sessioni compare una sola
  // volta (dedup per email se presente, altrimenti per nome) — è una lista
  // per contattarli, non un log delle prenotazioni.
  const contactsByKey = new Map()
  for (const row of rows) {
    for (const player of row.players) {
      if (!player.name) continue
      const key = (player.email || player.name).trim().toLowerCase()
      if (!contactsByKey.has(key)) {
        contactsByKey.set(key, player)
      }
    }
  }

  const contacts = Array.from(contactsByKey.values())
    .sort((left, right) => left.name.localeCompare(right.name, 'it'))

  const contactsSheet = workbook.addWorksheet('Contatti')
  contactsSheet.columns = [
    { header: 'NOME', key: 'name', width: 30 },
    { header: 'TELEFONO', key: 'phone', width: 18 },
    { header: 'EMAIL', key: 'email', width: 30 },
  ]
  contactsSheet.getRow(1).font = { bold: true }
  for (const contact of contacts) {
    contactsSheet.addRow(contact)
  }

  // PASS CARD FEST: elenco per la stampa dei pass, non un log prenotazioni.
  // Un partecipante che ha più prenotazioni (es. una one-shot + il pass
  // ingresso) compare una sola volta, deduplicato per email se presente
  // altrimenti per nome — stesso criterio della rubrica "Contatti".
  const [allReservations, masters] = await Promise.all([
    getEventAllReservations({ eventId: params.id }),
    listEventMasters({ eventId: params.id }),
  ])

  const participantsByKey = new Map()
  for (const reservation of allReservations) {
    if (!ACTIVE_STATUSES.has(reservation.status)) continue
    const name = reservation.playerName || reservation.accountName || reservation.accountEmail
    if (!name) continue
    const key = (reservation.playerEmail || reservation.accountEmail || name).trim().toLowerCase()
    if (!participantsByKey.has(key)) {
      participantsByKey.set(key, name)
    }
  }

  const participants = Array.from(participantsByKey.values()).sort((left, right) => left.localeCompare(right, 'it'))

  const passCardSheet = workbook.addWorksheet('PASS CARD FEST')
  passCardSheet.columns = [
    { header: 'PARTECIPANTI', key: 'participant', width: 32 },
    { header: '', key: 'gap', width: 4 },
    { header: 'MASTER', key: 'master', width: 32 },
  ]
  passCardSheet.getRow(1).font = { bold: true }

  const passCardRowCount = Math.max(participants.length, masters.length)
  for (let i = 0; i < passCardRowCount; i += 1) {
    passCardSheet.addRow({ participant: participants[i] || '', master: masters[i] || '' })
  }

  const buffer = await workbook.xlsx.writeBuffer()

  return new NextResponse(buffer, {
    status: 200,
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': 'attachment; filename="sessioni-dice-fest.xlsx"',
    },
  })
}
