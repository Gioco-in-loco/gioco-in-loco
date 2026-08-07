import { sendMail } from './mailer'

function escapeHtml(value) {
  return String(value || '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;')
}

function formatBookingDateLabel(booking) {
  if (!booking.scheduleStart) return 'Data da definire'

  const date = new Date(booking.scheduleStart)
  const dateLabel = new Intl.DateTimeFormat('it-IT', { weekday: 'long', day: 'numeric', month: 'long', timeZone: 'Europe/Rome' }).format(date)

  if (booking.scheduleAllDay) return dateLabel

  const timeLabel = new Intl.DateTimeFormat('it-IT', { hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Rome' }).format(date)
  return `${dateLabel} · ${timeLabel}`
}

function sortedBookings(bookings) {
  return [...bookings].sort((a, b) => {
    if (!a.scheduleStart) return 1
    if (!b.scheduleStart) return -1
    return new Date(a.scheduleStart).getTime() - new Date(b.scheduleStart).getTime()
  })
}

function buildBookingsSummaryText(bookings) {
  if (bookings.length === 0) {
    return 'Nessuna prenotazione attiva al momento.'
  }

  return sortedBookings(bookings).map((booking, index) => (
    `${index + 1}. ${booking.activity?.title || booking.bookingTypeLabel}\n   ${formatBookingDateLabel(booking)}\n   ${booking.event?.name || ''}${booking.event?.location ? ` · ${booking.event.location}` : ''}`
  )).join('\n\n')
}

function buildBookingsSummaryHtml(bookings) {
  if (bookings.length === 0) {
    return '<li style="margin-bottom:16px;color:#4B5563;">Nessuna prenotazione attiva al momento.</li>'
  }

  return sortedBookings(bookings).map((booking) => `
    <li style="margin-bottom:16px;">
      <div style="font-weight:700;color:#1A1A2E;">${escapeHtml(booking.activity?.title || booking.bookingTypeLabel)}</div>
      <div style="color:#4B5563;">${escapeHtml(formatBookingDateLabel(booking))}</div>
      <div style="color:#4B5563;">${escapeHtml(booking.event?.name || '')}${booking.event?.location ? ` · ${escapeHtml(booking.event.location)}` : ''}</div>
    </li>
  `).join('')
}

export async function sendAccountBookingsIcsEmail({ user, bookings, icsContent }) {
  const subject = 'Le tue prenotazioni · Gioco In Loco'

  const text = [
    `Ciao ${user.name || 'giocatore'},`,
    '',
    'in allegato trovi il file per importare tutte le tue prenotazioni attive nel calendario.',
    '',
    'Riepilogo',
    buildBookingsSummaryText(bookings),
    '',
    'Gioco In Loco',
  ].join('\n')

  const html = `
    <div style="font-family:Arial,sans-serif;line-height:1.5;color:#1F2937;max-width:680px;margin:0 auto;">
      <h1 style="color:#1A1A2E;">Le tue prenotazioni</h1>
      <p>Ciao ${escapeHtml(user.name || 'giocatore')},</p>
      <p>in allegato trovi il file <strong>.ics</strong> per importare tutte le tue prenotazioni attive nel calendario.</p>
      <h2 style="color:#1A1A2E;">Riepilogo</h2>
      <ul style="padding-left:20px;">${buildBookingsSummaryHtml(bookings)}</ul>
      <p>Gioco In Loco</p>
    </div>
  `

  return sendMail({
    to: user.email,
    subject,
    text,
    html,
    attachments: [
      {
        filename: 'prenotazioni-gioco-in-loco.ics',
        content: icsContent,
        contentType: 'text/calendar; charset=utf-8',
      },
    ],
  })
}
