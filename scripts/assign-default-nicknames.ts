import { PrismaClient } from '@prisma/client'
import { generateAvailableNickname } from '../src/lib/nicknames.js'

const prisma = new PrismaClient()

async function main() {
  const users = await prisma.user.findMany({
    where: { nickname: null },
    select: { id: true, supabaseUserId: true },
  })

  if (users.length === 0) {
    console.log('Tutti gli utenti hanno già un nickname.')
    return
  }

  console.log(`Assegno un nickname a ${users.length} utenti senza nickname...`)

  for (const user of users) {
    const nickname = await generateAvailableNickname(prisma)
    await prisma.user.update({ where: { id: user.id }, data: { nickname } })
    console.log(`${user.supabaseUserId} -> ${nickname}`)
  }

  console.log('Fatto.')
}

main()
  .catch((error) => {
    console.error('Assegnazione nickname fallita:', error)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
