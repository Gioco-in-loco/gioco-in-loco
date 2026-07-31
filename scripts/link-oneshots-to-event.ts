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
    throw new Error('Usage: tsx scripts/link-oneshots-to-event.ts <eventId>')
  }

  console.log(`Linking all one-shots to event ${eventId}...`)

  const event = await prisma.event.findUnique({
    where: { id: eventId },
    select: { id: true, externalId: true, name: true },
  })

  if (!event) {
    throw new Error(`Event not found: ${eventId}`)
  }

  const oneShots = await prisma.oneShot.findMany({
    select: { id: true },
  })

  if (oneShots.length === 0) {
    console.log('No one-shots found in the database.')
    return
  }

  const oneShotLinks = oneShots.map((oneShot) => ({
    eventId: event.id,
    oneShotId: oneShot.id,
  }))

  const linkedOneShots = await prisma.eventOneShot.createMany({
    data: oneShotLinks,
    skipDuplicates: true,
  })

  console.log(`Linked ${linkedOneShots.count} one-shots to ${event.name} (${event.externalId})`)
  console.log(`Processed ${oneShots.length} one-shots in total`)
}

main()
  .catch((error) => {
    console.error('Failed to link one-shots to event:', error)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })