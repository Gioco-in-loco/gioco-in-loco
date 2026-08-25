import { prisma } from './prisma'
import { sendMail } from './mailer'
import { buildAbsoluteUrl, getConfiguredSiteUrl } from './site-url'
import { COMPANION_INVITE_MINUTES } from './invite-tokens'
import { EVENT_CART_HOLD_MINUTES } from './event-booking'

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

function buildUserText(summary, recipientName, { hasPendingCompanionInvites = false } = {}) {
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
    ...(hasPendingCompanionInvites
      ? ['', 'Hai invitato degli amici: abbiamo appena inviato loro una email con un codice per registrarsi e confermare il proprio posto entro 1 ora. Il loro posto e il relativo costo non sono inclusi nel totale sopra: saranno a loro carico una volta completata la registrazione.']
      : []),
    '',
    'Conserva questa email come riepilogo della prenotazione.',
    '',
    'Gioco In Loco',
  ].join('\n')
}

function buildUserHtml(summary, recipientName, { hasPendingCompanionInvites = false } = {}) {
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
      ${hasPendingCompanionInvites
        ? '<p style="background:#FFF7E0;border-radius:8px;padding:12px;">Hai invitato degli amici: abbiamo appena inviato loro una email con un codice per registrarsi e confermare il proprio posto entro 1 ora. Il loro posto e il relativo costo non sono inclusi nel totale sopra: saranno a loro carico una volta completata la registrazione.</p>'
        : ''}
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

export async function sendEventBookingConfirmationEmails({ summary, user, hasPendingCompanionInvites = false }) {
  if (!summary || !user?.email) {
    return
  }

  const adminEmail = process.env.BOOKING_NOTIFICATION_ADMIN_EMAIL
  const recipients = [
    {
      to: user.email,
      subject: `Prenotazione confermata · ${summary.event.name}`,
      text: buildUserText(summary, user.name, { hasPendingCompanionInvites }),
      html: buildUserHtml(summary, user.name, { hasPendingCompanionInvites }),
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

function buildInviteSessionsText(sessions) {
  return sessions.map((session, index) => (
    `${index + 1}. ${session.activityTitle}\n   ${session.day || ''} · ${session.slot || ''}${session.table ? ` · ${session.table}` : ''}${session.event?.name ? ` · ${session.event.name}` : ''}`
  )).join('\n\n')
}

function buildInviteSessionsHtml(sessions) {
  return sessions.map((session) => `
    <li style="margin-bottom:16px;">
      <div style="font-weight:700;color:#1A1A2E;">${escapeHtml(session.activityTitle)}</div>
      <div style="color:#4B5563;">${escapeHtml(session.day || '')} · ${escapeHtml(session.slot || '')}${session.table ? ` · ${escapeHtml(session.table)}` : ''}${session.event?.name ? ` · ${escapeHtml(session.event.name)}` : ''}</div>
    </li>
  `).join('')
}

function formatInviteDuration(minutes) {
  const safeMinutes = Number.isFinite(minutes) && minutes > 0 ? minutes : COMPANION_INVITE_MINUTES
  if (safeMinutes % 60 === 0) {
    const hours = safeMinutes / 60
    return `${safeMinutes} minuti (${hours} ${hours === 1 ? 'ora' : 'ore'})`
  }
  return `${safeMinutes} minuti`
}

function buildCompanionInviteText({ name, email, sessions, host, claimLink, claimPageLink, inviteCode, minutes }) {
  return [
    `Ciao ${name || ''},`,
    '',
    `${host?.name || host?.email || 'Un amico'} ti ha invitato a ${sessions.length} session${sessions.length === 1 ? 'e' : 'i'}:`,
    '',
    buildInviteSessionsText(sessions),
    '',
    `Apri il link e scegli a quali vuoi partecipare, entro ${formatInviteDuration(minutes)}. I posti sono riservati a questa email: dopo la scadenza verranno rilasciati.`,
    '',
    `Se non hai ancora un account, registrati usando proprio questa email${email ? ` (${email})` : ''}: è l'unico modo per confermare il tuo posto.`,
    '',
    claimLink ? `Scegli qui: ${claimLink}` : 'Contatta chi ti ha invitato per il link di conferma.',
    '',
    claimPageLink
      ? `In alternativa, vai su ${claimPageLink} e inserisci questo codice: ${inviteCode}`
      : `In alternativa puoi usare questo codice: ${inviteCode}`,
    '',
    'Gioco In Loco',
  ].join('\n')
}

function buildCompanionInviteHtml({ name, email, sessions, host, claimLink, claimPageLink, inviteCode, minutes }) {
  return `
    <div style="font-family:Arial,sans-serif;line-height:1.5;color:#1F2937;max-width:680px;margin:0 auto;">
      <h1 style="color:#1A1A2E;">${escapeHtml(host?.name || host?.email || 'Un amico')} ti ha invitato!</h1>
      <p>Ciao ${escapeHtml(name || '')},</p>
      <p>sei stato invitato a ${sessions.length} session${sessions.length === 1 ? 'e' : 'i'}:</p>
      <ul style="padding-left:20px;">${buildInviteSessionsHtml(sessions)}</ul>
      <p>Apri il link e scegli a quali vuoi partecipare, entro <strong>${formatInviteDuration(minutes)}</strong>. I posti sono riservati a questa email: dopo la scadenza verranno rilasciati.</p>
      <p>Se non hai ancora un account, registrati usando proprio questa email${email ? ` (<strong>${escapeHtml(email)}</strong>)` : ''}: è l'unico modo per confermare il tuo posto.</p>
      ${claimLink ? `<p><a href="${escapeHtml(claimLink)}" style="color:#B45309;font-weight:700;">Scegli le sessioni</a></p>` : ''}
      <p>In alternativa${claimPageLink ? ` vai su <a href="${escapeHtml(claimPageLink)}">${escapeHtml(claimPageLink)}</a> e` : ','} inserisci questo codice:</p>
      <p style="font-family:monospace;font-size:16px;background:#F3F4F6;border-radius:8px;padding:10px 14px;display:inline-block;">${escapeHtml(inviteCode)}</p>
      <p>Gioco In Loco</p>
    </div>
  `
}

export async function sendCompanionInviteEmails({ host, eventId, invites }) {
  if (!Array.isArray(invites) || invites.length === 0) {
    return
  }

  const eventIds = [...new Set(invites.map((invite) => invite.eventId || eventId).filter(Boolean))]
  const events = eventIds.length > 0
    ? await prisma.event.findMany({ where: { id: { in: eventIds } }, select: { id: true, name: true, location: true, companionInviteMinutes: true } })
    : []
  const eventById = new Map(events.map((event) => [event.id, event]))
  const siteUrl = getConfiguredSiteUrl()
  const claimPageLink = siteUrl ? buildAbsoluteUrl('/invito', siteUrl) : null

  // Every invite already shares one inviteCode per companion email (assigned
  // when the host's cart is confirmed) — group here so the friend gets a
  // single email listing every session, instead of one email per session.
  const groups = new Map()
  for (const invite of invites) {
    const key = invite.inviteCode
    if (!groups.has(key)) groups.set(key, [])
    groups.get(key).push(invite)
  }

  const results = await Promise.allSettled(Array.from(groups.entries()).map(([inviteCode, groupInvites]) => {
    const first = groupInvites[0]
    const sessions = groupInvites.map((invite) => ({
      activityTitle: invite.activityTitle,
      day: invite.day,
      slot: invite.slot,
      table: invite.table,
      event: eventById.get(invite.eventId || eventId) || null,
    }))
    const claimLink = siteUrl ? buildAbsoluteUrl(`/invito/${inviteCode}`, siteUrl) : null
    const minutes = eventById.get(first.eventId || eventId)?.companionInviteMinutes

    return sendMail({
      to: first.email,
      subject: `${host?.name || 'Un amico'} ti ha invitato · ${sessions.length} session${sessions.length === 1 ? 'e' : 'i'}`,
      text: buildCompanionInviteText({ name: first.name, email: first.email, sessions, host, claimLink, claimPageLink, inviteCode, minutes }),
      html: buildCompanionInviteHtml({ name: first.name, email: first.email, sessions, host, claimLink, claimPageLink, inviteCode, minutes }),
    })
  }))

  results.forEach((result, index) => {
    if (result.status === 'rejected') {
      const [, groupInvites] = Array.from(groups.entries())[index]
      console.error(`Failed to send companion invite email to ${groupInvites[0].email}:`, result.reason)
    }
  })
}

export async function sendCompanionInviteRedeemedEmail({ email, name, accepted = [], declined = [] }) {
  if (!email) return

  const subject = accepted.length > 0
    ? `Invito riscattato · ${accepted.length} sessione${accepted.length === 1 ? '' : 'i'} nel carrello`
    : 'Invito riscattato'

  const text = [
    `Ciao ${name || 'giocatore'},`,
    '',
    'hai riscattato il tuo invito.',
    '',
    accepted.length > 0
      ? `Sessioni accettate (ora nel tuo carrello, hai ${EVENT_CART_HOLD_MINUTES} minuti per completare il checkout):\n\n${buildInviteSessionsText(accepted)}`
      : 'Non hai accettato nessuna sessione.',
    ...(declined.length > 0 ? ['', `Sessioni rifiutate:\n\n${buildInviteSessionsText(declined)}`] : []),
    '',
    'Questo codice invito è stato utilizzato e non è più valido.',
    '',
    'Gioco In Loco',
  ].join('\n')

  const html = `
    <div style="font-family:Arial,sans-serif;line-height:1.5;color:#1F2937;max-width:680px;margin:0 auto;">
      <h1 style="color:#1A1A2E;">Invito riscattato</h1>
      <p>Ciao ${escapeHtml(name || 'giocatore')},</p>
      <p>hai riscattato il tuo invito.</p>
      ${accepted.length > 0
        ? `<p><strong>Sessioni accettate</strong> (ora nel tuo carrello, hai ${EVENT_CART_HOLD_MINUTES} minuti per completare il checkout):</p><ul style="padding-left:20px;">${buildInviteSessionsHtml(accepted)}</ul>`
        : '<p>Non hai accettato nessuna sessione.</p>'}
      ${declined.length > 0 ? `<p><strong>Sessioni rifiutate:</strong></p><ul style="padding-left:20px;">${buildInviteSessionsHtml(declined)}</ul>` : ''}
      <p style="color:#4B5563;">Questo codice invito è stato utilizzato e non è più valido.</p>
      <p>Gioco In Loco</p>
    </div>
  `

  try {
    await sendMail({ to: email, subject, text, html })
  } catch (error) {
    console.error(`Failed to send companion invite redeemed email to ${email}:`, error)
  }
}