import { NextResponse } from 'next/server'
import { requireAuthenticatedApi } from '../../../../../src/lib/admin-guard'
import { claimInvite } from '../../../../../src/lib/companion-invites'

export async function POST(request, { params }) {
  const { user, error, status } = await requireAuthenticatedApi()
  if (error) return NextResponse.json({ error }, { status })

  const code = typeof params?.code === 'string' ? params.code.trim() : ''
  if (!code) {
    return NextResponse.json({ error: 'Codice invito non valido.' }, { status: 400 })
  }

  const body = await request.json().catch(() => ({}))
  const acceptedIds = Array.isArray(body?.acceptedIds) ? body.acceptedIds : []

  try {
    const summary = await claimInvite({ code, user, acceptedIds })
    return NextResponse.json({ ok: true, ...summary })
  } catch (claimError) {
    return NextResponse.json({ error: claimError.message || 'Impossibile confermare l\'invito.' }, { status: claimError.status || 400 })
  }
}
