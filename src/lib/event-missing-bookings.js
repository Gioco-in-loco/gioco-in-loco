import { prisma } from './prisma'
import { sendMail } from './mailer'

function createHttpError(status, message) {
  const error = new Error(message)
  error.status = status
  return error
}

// Pass "confermato" secondo lo stesso criterio usato in EventAnalyticsPanel
// (KpiCard "Pass evento iscritti"): solo CONFIRMED/ATTENDED, non PENDING/HOLD.
const CONFIRMED_ADMISSION_STATUSES = ['CONFIRMED', 'ATTENDED']

// Una prenotazione "in corso o confermata" basta a togliere la persona da
// questa lista: se ha già iniziato il checkout di una sessione (PENDING) non
// ha senso sollecitarla di nuovo, anche se non ha ancora completato l'ordine.
const ACTIVE_RESERVATION_STATUSES = ['PENDING', 'CONFIRMED', 'ATTENDED']

// Una persona può risultare sia con userId che, per prenotazioni fatte prima
// del claim di un invito amico, solo con playerEmail: generiamo entrambe le
// chiavi possibili così un match su una qualsiasi delle due basta a
// considerarla "ha già una prenotazione" (meglio non notificare qualcuno che
// ha già prenotato, piuttosto che notificarlo per errore).
function identityKeys({ userId, email }) {
  const keys = []
  if (userId) keys.push(`u:${userId}`)
  const normalized = (email || '').trim().toLowerCase()
  if (normalized) keys.push(`e:${normalized}`)
  return keys
}

function primaryKey({ userId, email }) {
  if (userId) return `u:${userId}`
  const normalized = (email || '').trim().toLowerCase()
  return normalized || null
}

// Admin-facing: chi ha un pass evento confermato ma nessuna prenotazione
// one-shot o main event (in corso o confermata) — il target del promemoria
// "hai il pass ma non hai ancora prenotato le sessioni".
export async function getEventAttendeesWithoutReservations({ eventId }) {
  const [admissions, oneshotReservations, mainEventReservations] = await Promise.all([
    prisma.eventAdmission.findMany({
      where: { eventId, status: { in: CONFIRMED_ADMISSION_STATUSES } },
      orderBy: { createdAt: 'asc' },
      select: {
        userId: true,
        day: true,
        playerName: true,
        playerEmail: true,
        user: { select: { nickname: true } },
      },
    }),
    prisma.reservation.findMany({
      where: { slot: { eventId }, status: { in: ACTIVE_RESERVATION_STATUSES } },
      select: { userId: true, playerEmail: true },
    }),
    prisma.mainEventReservation.findMany({
      where: { eventId, status: { in: ACTIVE_RESERVATION_STATUSES } },
      select: { userId: true, playerEmail: true },
    }),
  ])

  const reservedKeys = new Set()
  for (const reservation of [...oneshotReservations, ...mainEventReservations]) {
    for (const key of identityKeys({ userId: reservation.userId, email: reservation.playerEmail })) {
      reservedKeys.add(key)
    }
  }

  const attendeesByKey = new Map()
  for (const admission of admissions) {
    const hasReservation = identityKeys({ userId: admission.userId, email: admission.playerEmail })
      .some((key) => reservedKeys.has(key))
    if (hasReservation) continue

    const key = primaryKey({ userId: admission.userId, email: admission.playerEmail })
    if (!key) continue

    const existing = attendeesByKey.get(key)
    if (existing) {
      if (admission.day) existing.days.add(admission.day)
      continue
    }
    attendeesByKey.set(key, {
      userId: admission.userId,
      name: admission.playerName || null,
      email: admission.playerEmail || null,
      nickname: admission.user?.nickname || null,
      days: new Set(admission.day ? [admission.day] : []),
    })
  }

  return Array.from(attendeesByKey.entries())
    .map(([key, attendee]) => ({ key, ...attendee, days: Array.from(attendee.days) }))
    .sort((left, right) => (left.name || left.email || '').localeCompare(right.name || right.email || '', 'it-IT'))
}

function buildReminderText({ name }) {
  return [
    `Ciao${name ? ` ${name}` : ''}!`,
    '',
    'Grazie per aver scelto di partecipare a Dicefest!',
    '',
    'Volevamo ricordarti che, per prendere parte alle nostre sessioni di gioco, è necessario prenotarle specificamente sul sito. Al momento il tuo pass d\'ingresso risulta confermato, ma non sono associate sessioni prenotate.',
    '',
    'Ti invitiamo quindi a rientrare sul sito, inserire le giocate desiderate nel carrello e confermare l\'ordine per garantirti la partecipazione. I posti sono limitati e si stanno esaurendo rapidamente, quindi ti suggeriamo di completare il passaggio al più presto.',
    '',
    'A presto e buon divertimento!',
    '',
    'Un cordiale saluto,',
    '',
    'Lo staff di Dicefest',
  ].join('\n')
}

function buildReminderHtml({ name }) {
  return `
    <div style="font-family:Arial,sans-serif;line-height:1.5;color:#1F2937;max-width:680px;margin:0 auto;">
      <p>Ciao${name ? ` ${name}` : ''}!</p>
      <p>Grazie per aver scelto di partecipare a Dicefest!</p>
      <p>Volevamo ricordarti che, per prendere parte alle nostre sessioni di gioco, è necessario prenotarle specificamente sul sito. Al momento il tuo pass d'ingresso risulta confermato, ma non sono associate sessioni prenotate.</p>
      <p>Ti invitiamo quindi a rientrare sul sito, inserire le giocate desiderate nel carrello e confermare l'ordine per garantirti la partecipazione. I posti sono limitati e si stanno esaurendo rapidamente, quindi ti suggeriamo di completare il passaggio al più presto.</p>
      <p>A presto e buon divertimento!</p>
      <p>Un cordiale saluto,<br>Lo staff di Dicefest</p>
    </div>
  `
}

const REMINDER_KIND = 'MISSING_RESERVATION'

// keys: sottoinsieme di attendee.key da getEventAttendeesWithoutReservations
// da notificare (permette invio singolo o "invia a tutti" dalla stessa vista
// senza doversi fidare di una lista mandata dal client con nome/email liberi).
// sentBy: nome/email dell'admin che ha avviato l'invio, solo per il log
// condiviso — non incide su cosa viene inviato.
export async function sendMissingReservationReminderEmails({ eventId, keys, sentBy = null }) {
  if (!Array.isArray(keys) || keys.length === 0) {
    throw createHttpError(400, 'Nessun destinatario selezionato.')
  }

  const attendees = await getEventAttendeesWithoutReservations({ eventId })
  const requested = new Set(keys)
  const targets = attendees.filter((attendee) => requested.has(attendee.key) && attendee.email)

  if (targets.length === 0) {
    throw createHttpError(404, 'Nessun destinatario valido trovato (email mancante o già prenotato nel frattempo).')
  }

  const results = await Promise.allSettled(targets.map((attendee) => sendMail({
    to: attendee.email,
    subject: 'Dicefest ti aspetta: assicurati i tuoi posti per le sessioni di gioco!',
    text: buildReminderText({ name: attendee.name }),
    html: buildReminderHtml({ name: attendee.name }),
  })))

  let sentCount = 0
  results.forEach((result, index) => {
    if (result.status === 'fulfilled') {
      sentCount += 1
    } else {
      console.error(`Failed to send missing-reservation reminder to ${targets[index].email}:`, result.reason)
    }
  })

  if (sentCount > 0) {
    await prisma.eventReminderLog.create({
      data: { eventId, kind: REMINDER_KIND, sentCount, sentBy },
    })
  }

  return { sentCount, totalRequested: targets.length }
}

// Ultimo invio registrato per questo tipo di promemoria, visibile a tutti gli
// admin nel pannello — evita che due admin si mandino a vicenda "l'hai già
// inviata?" a voce.
export async function getLastMissingReservationReminderLog({ eventId }) {
  return prisma.eventReminderLog.findFirst({
    where: { eventId, kind: REMINDER_KIND },
    orderBy: { createdAt: 'desc' },
    select: { sentCount: true, sentBy: true, createdAt: true },
  })
}
