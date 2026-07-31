import nodemailer from 'nodemailer'

const globalForMailer = globalThis

function getMailerConfig() {
  const host = process.env.SMTP_HOST
  const port = Number(process.env.SMTP_PORT || 587)
  const user = process.env.SMTP_USER
  const pass = process.env.SMTP_PASS
  const fromEmail = process.env.SMTP_FROM_EMAIL
  const fromName = process.env.SMTP_FROM_NAME || 'Gioco In Loco'

  if (!host || !port || !user || !pass || !fromEmail) {
    return null
  }

  return {
    host,
    port,
    secure: process.env.SMTP_SECURE === 'true' || port === 465,
    auth: { user, pass },
    from: fromName ? `${fromName} <${fromEmail}>` : fromEmail,
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

  const transporter = getTransporter(config)

  return transporter.sendMail({
    from: config.from,
    to,
    subject,
    text,
    html,
  })
}