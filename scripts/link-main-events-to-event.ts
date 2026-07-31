import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

function normalizeEventId(rawValue) {
  if (typeof rawValue !== 'string') return ''
  return rawValue.trim().replace(/[^0-9a-fA-F-].*$/, '')
}

async function main() {
  const rawEventId = process.argv[2] || ''
  const eventId = normalizeEventId(rawEventId)

  if (!eventId) {
    throw new Error('Usage: tsx scripts/link-main-events-to-event.ts <eventId>')
  }

  console.log(`Linking all main events to event ${eventId}...`)

  const event = await prisma.event.findUnique({
    where: { id: eventId },
    select: { id: true, externalId: true, name: true },
  })

  if (!event) {
    throw new Error(`Event not found: ${eventId}`)
  }

  const mainEvents = await prisma.mainEvent.findMany({
    select: { id: true },
  })

  if (mainEvents.length === 0) {
    console.log('No main events found in the database.')
    return
  }

  const updateResult = await prisma.mainEvent.updateMany({
    where: {
      id: {
        in: mainEvents.map((mainEvent) => mainEvent.id),
      },
    },
    data: {
      eventId: event.id,
    },
  })

  console.log(`Linked ${updateResult.count} main events to ${event.name} (${event.externalId})`)
  console.log(`Processed ${mainEvents.length} main events in total`)
}

main()
  .catch((error) => {
    console.error('Failed to link main events to event:', error)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })