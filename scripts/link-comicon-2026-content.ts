import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  const targetEventExternalId = process.argv[2] || 'comicon-2026'

  console.log(`Linking board games and one-shots to event ${targetEventExternalId}...`)

  const event = await prisma.event.findUnique({
    where: { externalId: targetEventExternalId },
    select: { id: true, externalId: true, name: true },
  })

  if (!event) {
    throw new Error(`Event not found: ${targetEventExternalId}`)
  }

  const [boardGames, oneShots] = await Promise.all([
    prisma.boardGame.findMany({ select: { id: true, ownerId: true } }),
    prisma.oneShot.findMany({ select: { id: true } }),
  ])

  const boardGameLinks = boardGames.map((boardGame) => ({
    eventId: event.id,
    boardGameId: boardGame.id,
    associationId: boardGame.ownerId,
    copies: 1,
  }))

  const oneShotLinks = oneShots.map((oneShot) => ({
    eventId: event.id,
    oneShotId: oneShot.id,
  }))

  const [linkedBoardGames, linkedOneShots] = await prisma.$transaction([
    prisma.eventBoardGame.createMany({
      data: boardGameLinks,
      skipDuplicates: true,
    }),
    prisma.eventOneShot.createMany({
      data: oneShotLinks,
      skipDuplicates: true,
    }),
  ])

  console.log(`Linked ${linkedBoardGames.count} board games to ${event.name}`)
  console.log(`Linked ${linkedOneShots.count} one-shots to ${event.name}`)
}

main()
  .catch((error) => {
    console.error('Failed to link content to event:', error)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })