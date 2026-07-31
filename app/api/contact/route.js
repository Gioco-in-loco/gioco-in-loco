import { NextResponse } from 'next/server'
import { isMailerConfigured, sendMail } from '../../../src/lib/mailer'

const CATEGORIES = new Set(['feedback', 'info', 'collaborazione', 'segnalazione', 'altro'])
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/

function sanitize(value, maxLength) {
  return String(value || '').trim().slice(0, maxLength)
}

function categoryLabel(category) {
  switch (category) {
    case 'feedback': return 'Feedback'
    case 'info': return 'Informazioni'
    case 'collaborazione': return 'Collaborazione'
    case 'segnalazione': return 'Segnalazione'
    default: return 'Altro'
  }
}

export async function POST(request) {
  let payload
  try {
    payload = await request.json()
  } catch {
    return NextResponse.json({ error: 'Richiesta non valida.' }, { status: 400 })
  }

  // Honeypot — bots compileranno questo campo che è nascosto agli umani
  if (payload?.website) {
    return NextResponse.json({ ok: true })
  }

  const name = sanitize(payload?.name, 120)
  const email = sanitize(payload?.email, 200)
  const category = sanitize(payload?.category, 40).toLowerCase()
  const message = sanitize(payload?.message, 4000)
  const consent = Boolean(payload?.consent)

  const errors = {}
  if (!name) errors.name = 'Inserisci il tuo nome.'
  if (!email || !EMAIL_REGEX.test(email)) errors.email = 'Inserisci un indirizzo email valido.'
  if (!message || message.length < 10) errors.message = 'Scrivici almeno qualche riga (10 caratteri minimo).'
  if (!CATEGORIES.has(category)) errors.category = 'Seleziona un argomento.'
  if (!consent) errors.consent = 'Devi acconsentire al trattamento dei dati.'

  if (Object.keys(errors).length > 0) {
    return NextResponse.json({ error: 'Verifica i campi del modulo.', fieldErrors: errors }, { status: 400 })
  }

  const recipient = process.env.CONTACT_EMAIL || process.env.SMTP_FROM_EMAIL
  if (!recipient || !isMailerConfigured()) {
    console.warn('Contact form submission received but mailer is not configured.', { from: email, category })
    return NextResponse.json({
      error: 'Il modulo di contatto non è ancora attivo. Scrivici direttamente al nostro indirizzo email.',
    }, { status: 503 })
  }

  const subject = `[Contattaci] ${categoryLabel(category)} — ${name}`
  const text = [
    `Tipologia: ${categoryLabel(category)}`,
    `Nome: ${name}`,
    `Email: ${email}`,
    '',
    'Messaggio:',
    message,
  ].join('\n')

  const html = `
    <div style="font-family: Arial, sans-serif; color: #2D2A26; max-width: 560px;">
      <p style="font-size: 12px; letter-spacing: 0.18em; text-transform: uppercase; color: #C45D3A; margin: 0;">Contattaci</p>
      <h2 style="font-family: Georgia, serif; margin: 6px 0 14px;">${categoryLabel(category)} — ${escapeHtml(name)}</h2>
      <table style="font-size: 14px; border-collapse: collapse;">
        <tr><td style="padding: 4px 12px 4px 0; color: #6B6560;">Email</td><td><a href="mailto:${escapeHtml(email)}">${escapeHtml(email)}</a></td></tr>
        <tr><td style="padding: 4px 12px 4px 0; color: #6B6560;">Tipologia</td><td>${categoryLabel(category)}</td></tr>
      </table>
      <p style="font-size: 12px; color: #6B6560; margin: 18px 0 4px;">Messaggio</p>
      <div style="border-left: 3px solid #C9A227; padding: 8px 12px; background: #FAF5F0; font-size: 14px; line-height: 1.6; white-space: pre-wrap;">${escapeHtml(message)}</div>
    </div>
  `

  try {
    await sendMail({
      to: recipient,
      subject,
      text,
      html,
      // Note: reply-to would be a nice addition but sendMail signature doesn't accept it — keep simple.
    })
    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error('Failed to send contact email:', error)
    return NextResponse.json({ error: 'Invio non riuscito. Riprova più tardi.' }, { status: 500 })
  }
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}
