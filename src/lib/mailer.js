import nodemailer from 'nodemailer'

const globalForMailer = globalThis

function getMailerConfig() {
  // .trim() guards against a common Vercel dashboard mistake: pasting an env
  // var with a trailing space or newline, which silently breaks SMTP auth
  // (the value looks correct at a glance but never matches).
  const host = process.env.SMTP_HOST?.trim()
  const port = Number(process.env.SMTP_PORT || 587)
  const user = process.env.SMTP_USER?.trim()
  const pass = process.env.SMTP_PASS?.trim()
  const fromEmail = process.env.SMTP_FROM_EMAIL?.trim()
  const fromName = process.env.SMTP_FROM_NAME || 'Gioco In Loco'

  if (!host || !port || !user || !pass || !fromEmail) {
    console.warn('[mailer] Config incompleta:', {
      host: Boolean(host),
      port: Boolean(port),
      user: Boolean(user),
      pass: Boolean(pass),
      fromEmail: Boolean(fromEmail),
    })
    return null
  }

  return {
    host,
    port,
    secure: process.env.SMTP_SECURE === 'true' || port === 465,
    auth: { user, pass },
    from: fromName ? `${fromName} <${fromEmail}>` : fromEmail,
    // Solo per diagnostica nei log: mai loggare `pass` per intero.
    debugMeta: { host, port, user, passLength: pass.length },
  }
}

function getTransporter(config) {
  if (globalForMailer.__appMailerTransporter) {
    return globalForMailer.__appMailerTransporter
  }

  const transporter = nodemailer.createTransport({
    host: config.host,
    port: config.port,
    secure: config.secure,
    auth: config.auth,
  })

  if (process.env.NODE_ENV !== 'production') {
    globalForMailer.__appMailerTransporter = transporter
  }

  return transporter
}

export function isMailerConfigured() {
  return Boolean(getMailerConfig())
}

export async function sendMail({ to, subject, text, html }) {
  const config = getMailerConfig()

  if (!config) {
    if (!globalForMailer.__appMailerConfigWarningLogged) {
      console.warn('SMTP mailer is not configured. Booking emails will be skipped.')
      globalForMailer.__appMailerConfigWarningLogged = true
    }
    return { skipped: true }
  }

  console.log('[mailer] Invio email in corso', { ...config.debugMeta, to, subject })

  const transporter = getTransporter(config)

  try {
    const info = await transporter.sendMail({
      from: config.from,
      to,
      subject,
      text,
      html,
    })
    console.log('[mailer] Email inviata', { to, messageId: info?.messageId, response: info?.response })
    return info
  } catch (error) {
    console.error('[mailer] Invio fallito', {
      ...config.debugMeta,
      to,
      code: error?.code,
      responseCode: error?.responseCode,
      response: error?.response,
      message: error?.message,
    })
    throw error
  }
}