import { sendMail } from './mailer'
import { buildAbsoluteUrl, getConfiguredSiteUrl } from './site-url'

function formatPrice(value) {
  if (value == null) return 'Gratis'
  return new Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR' }).format(value)
}

function formatAdmissionLabel(summary) {
  const days = summary.admissionDays || []
  if (days.length === 0) {
    return 'Pass evento'
  }
  if (days.length === 1) {
    return `Pass evento · ${days[0]}`
  }
  return `Pass evento (${days.length} giorni: ${days.join(', ')})`
}

function escapeHtml(value) {
  return String(value || '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;')
}

function buildSlotsText(summary) {
  if (summary.slots.length === 0) {
    return 'Nessuna sessione aggiunta in questo ordine.'
  }

  return summary.slots.map((slot, index) => (
    `${index + 1}. ${slot.title}\n   ${slot.day} · ${slot.slot} · ${slot.table || 'Tavolo da definire'}\n   ${slot.game}${slot.master ? ` · Master: ${slot.master}` : ''}${slot.associationName ? ` · Associazione: ${slot.associationName}` : ''}\n   ${formatPrice(slot.price)}`
  )).join('\n\n')
}

function buildSlotsHtml(summary) {
  if (summary.slots.length === 0) {
    return '<li style="margin-bottom:16px;color:#4B5563;">Nessuna sessione aggiunta in questo ordine.</li>'
  }

  return summary.slots.map((slot) => `
    <li style="margin-bottom:16px;">
      <div style="font-weight:700;color:#1A1A2E;">${escapeHtml(slot.title)}</div>
      <div style="color:#4B5563;">${escapeHtml(slot.day)} · ${escapeHtml(slot.slot)} · ${escapeHtml(slot.table || 'Tavolo da definire')}</div>
      <div style="color:#4B5563;">${escapeHtml(slot.game)}${slot.master ? ` · Master: ${escapeHtml(slot.master)}` : ''}${slot.associationName ? ` · Associazione: ${escapeHtml(slot.associationName)}` : ''}</div>
      <div style="color:#1A1A2E;font-weight:600;">${escapeHtml(formatPrice(slot.price))}</div>
    </li>
  `).join('')
}

function buildUserText(summary, recipientName) {
  return [
    `Ciao ${recipientName || 'giocatore'},`,
    '',
    `la tua prenotazione per ${summary.event.name} è stata confermata con successo.`,
    '',
    'Riepilogo evento',
    `${summary.event.name}`,
    `${summary.event.location || 'Luogo da definire'}`,
    `${summary.event.startDateLabel}`,
    '',
    `${formatAdmissionLabel(summary)}: ${formatPrice(summary.admissionPrice)}`,
    '',
    'Prenotazioni confermate',
    buildSlotsText(summary),
    '',
    `Totale prenotazione: ${formatPrice(summary.totalPrice)}`,
    '',
    'Conserva questa email come riepilogo della prenotazione.',
    '',
    'Gioco In Loco',
  ].join('\n')
}

function buildUserHtml(summary, recipientName) {
  return `
    <div style="font-family:Arial,sans-serif;line-height:1.5;color:#1F2937;max-width:680px;margin:0 auto;">
      <h1 style="color:#1A1A2E;">Prenotazione confermata</h1>
      <p>Ciao ${escapeHtml(recipientName || 'giocatore')},</p>
      <p>la tua prenotazione per <strong>${escapeHtml(summary.event.name)}</strong> è stata confermata con successo.</p>
      <div style="border:1px solid #D1D5DB;border-radius:12px;padding:16px;margin:24px 0;background:#F9FAFB;">
        <div style="font-weight:700;color:#1A1A2E;">${escapeHtml(summary.event.name)}</div>
        <div>${escapeHtml(summary.event.location || 'Luogo da definire')}</div>
        <div>${escapeHtml(summary.event.startDateLabel)}</div>
      </div>
      <p><strong>${escapeHtml(formatAdmissionLabel(summary))}:</strong> ${escapeHtml(formatPrice(summary.admissionPrice))}</p>
      <h2 style="color:#1A1A2E;">Prenotazioni confermate</h2>
      <ul style="padding-left:20px;">${buildSlotsHtml(summary)}</ul>
      <p style="font-size:18px;font-weight:700;color:#1A1A2E;">Totale prenotazione: ${escapeHtml(formatPrice(summary.totalPrice))}</p>
      <p>Conserva questa email come riepilogo della prenotazione.</p>
      <p>Gioco In Loco</p>
    </div>
  `
}

function buildAdminText(summary, user) {
  return [
    'Nuova prenotazione confermata.',
    '',
    'Utente',
    `${user.name || 'Nome non disponibile'}`,
    `${user.email || 'Email non disponibile'}`,
    '',
    'Evento',
    `${summary.event.name}`,
    `${summary.event.location || 'Luogo da definire'}`,
    `${summary.event.startDateLabel}`,
    '',
    `${formatAdmissionLabel(summary)}: ${formatPrice(summary.admissionPrice)}`,
    '',
    'Prenotazioni confermate',
    buildSlotsText(summary),
    '',
    `Totale prenotazione: ${formatPrice(summary.totalPrice)}`,
  ].join('\n')
}

function buildAdminHtml(summary, user) {
  return `
    <div style="font-family:Arial,sans-serif;line-height:1.5;color:#1F2937;max-width:680px;margin:0 auto;">
      <h1 style="color:#1A1A2E;">Nuova prenotazione confermata</h1>
      <div style="border:1px solid #D1D5DB;border-radius:12px;padding:16px;margin:24px 0;background:#F9FAFB;">
        <div><strong>Utente:</strong> ${escapeHtml(user.name || 'Nome non disponibile')}</div>
        <div><strong>Email:</strong> ${escapeHtml(user.email || 'Email non disponibile')}</div>
      </div>
      <div style="border:1px solid #D1D5DB;border-radius:12px;padding:16px;margin:24px 0;background:#F9FAFB;">
        <div style="font-weight:700;color:#1A1A2E;">${escapeHtml(summary.event.name)}</div>
        <div>${escapeHtml(summary.event.location || 'Luogo da definire')}</div>
        <div>${escapeHtml(summary.event.startDateLabel)}</div>
      </div>
      <p><strong>${escapeHtml(formatAdmissionLabel(summary))}:</strong> ${escapeHtml(formatPrice(summary.admissionPrice))}</p>
      <h2 style="color:#1A1A2E;">Prenotazioni confermate</h2>
      <ul style="padding-left:20px;">${buildSlotsHtml(summary)}</ul>
      <p style="font-size:18px;font-weight:700;color:#1A1A2E;">Totale prenotazione: ${escapeHtml(formatPrice(summary.totalPrice))}</p>
    </div>
  `
}

export async function sendEventBookingConfirmationEmails({ summary, user }) {
  if (!summary || !user?.email) {
    return
  }

  const adminEmail = process.env.BOOKING_NOTIFICATION_ADMIN_EMAIL
  const recipients = [
    {
      to: user.email,
      subject: `Prenotazione confermata · ${summary.event.name}`,
      text: buildUserText(summary, user.name),
      html: buildUserHtml(summary, user.name),
    },
    ...(adminEmail
      ? [{
          to: adminEmail,
          subject: `Nuova prenotazione confermata · ${summary.event.name}`,
          text: buildAdminText(summary, user),
          html: buildAdminHtml(summary, user),
        }]
      : []),
  ]

  const results = await Promise.allSettled(recipients.map((recipient) => sendMail(recipient)))

  results.forEach((result, index) => {
    if (result.status === 'rejected') {
      console.error(`Failed to send booking email to ${recipients[index].to}:`, result.reason)
    }
  })
}

function buildBookingLink(routeBasePath) {
  const siteUrl = getConfiguredSiteUrl()
  if (!siteUrl || !routeBasePath) return null
  return buildAbsoluteUrl(`${routeBasePath}/prenotazioni`, siteUrl)
}

export async function sendWaitlistSpotAvailableEmail({ user, event, day, routeBasePath }) {
  if (!user?.email) return

  const bookingLink = buildBookingLink(routeBasePath)
  const subject = `Si è liberato un posto · ${event.name} · ${day}`

  const text = [
    `Ciao ${user.name || 'giocatore'},`,
    '',
    `si è appena liberato un posto tra le one-shot di ${day} per ${event.name}.`,
    'I posti vengono assegnati a chi prenota per primo: corri a bloccare il tuo tavolo!',
    '',
    bookingLink ? `Prenota qui: ${bookingLink}` : null,
    '',
    'Gioco In Loco',
  ].filter((line) => line !== null).join('\n')

  const html = `
    <div style="font-family:Arial,sans-serif;line-height:1.5;color:#1F2937;max-width:680px;margin:0 auto;">
      <h1 style="color:#1A1A2E;">Si è liberato un posto!</h1>
      <p>Ciao ${escapeHtml(user.name || 'giocatore')},</p>
      <p>si è appena liberato un posto tra le one-shot di <strong>${escapeHtml(day)}</strong> per <strong>${escapeHtml(event.name)}</strong>.</p>
      <p>I posti vengono assegnati a chi prenota per primo: corri a bloccare il tuo tavolo!</p>
      ${bookingLink ? `<p><a href="${escapeHtml(bookingLink)}" style="color:#B45309;font-weight:700;">Prenota ora</a></p>` : ''}
      <p>Gioco In Loco</p>
    </div>
  `

  try {
    await sendMail({ to: user.email, subject, text, html })
  } catch (error) {
    console.error(`Failed to send waitlist notification to ${user.email}:`, error)
  }
}