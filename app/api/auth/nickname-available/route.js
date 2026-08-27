import { NextResponse } from 'next/server'
import { prisma } from '../../../../src/lib/prisma'
import { isSupabaseConfigured } from '../../../../src/lib/supabase/config'
import { NICKNAME_RE } from '../../../../src/lib/nicknames'

export async function GET(request) {
  if (!isSupabaseConfigured()) {
    return NextResponse.json({ error: 'Auth non configurata' }, { status: 503 })
  }

  const nickname = (request.nextUrl.searchParams.get('nickname') || '').trim()

  if (!NICKNAME_RE.test(nickname)) {
    return NextResponse.json({ available: false, error: 'Il nickname deve avere tra 3 e 20 caratteri (lettere, numeri, spazi, - o _).' })
  }

  const existing = await prisma.user.findFirst({
    where: { nickname: { equals: nickname, mode: 'insensitive' } },
    select: { id: true },
  })

  return NextResponse.json({ available: !existing })
}
