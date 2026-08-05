import { NextResponse } from 'next/server'
import { getInviteByCode } from '../../../../src/lib/companion-invites'

export async function GET(request, { params }) {
  const code = typeof params?.code === 'string' ? params.code.trim() : ''

  try {
    const invite = await getInviteByCode(code)
    return NextResponse.json(invite)
  } catch (error) {
    return NextResponse.json({ error: error.message || 'Impossibile caricare l\'invito.' }, { status: error.status || 500 })
  }
}
