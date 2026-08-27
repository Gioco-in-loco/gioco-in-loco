import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { createSupabaseServerClient } from '../../../../src/lib/supabase/server'
import { prisma } from '../../../../src/lib/prisma'
import { isSupabaseConfigured } from '../../../../src/lib/supabase/config'

async function resolveSupabaseUserId(request) {
  const auth = request.headers.get('authorization')
  if (auth?.startsWith('Bearer ')) {
    const token = auth.slice(7)
    const client = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
    )
    const { data: { user } } = await client.auth.getUser(token)
    if (user?.id) return user.id
  }

  const supabase = createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  return user?.id || null
}

export async function GET(request) {
  if (!isSupabaseConfigured()) {
    return NextResponse.json({ error: 'Auth non configurata' }, { status: 503 })
  }

  const supabase = createSupabaseServerClient()
  const { data: { user: authUser } } = await supabase.auth.getUser()

  const supabaseUserId = await resolveSupabaseUserId(request)
  if (!supabaseUserId) {
    return NextResponse.json({ error: 'Non autenticato' }, { status: 401 })
  }

  const dbUser = await prisma.user.findUnique({
    where: { supabaseUserId },
    select: { role: true, isAdmin: true, consentGiven: true, consentDate: true, associationId: true, nickname: true },
  })

  return NextResponse.json({
    id: authUser?.id || supabaseUserId,
    email: authUser?.email || null,
    name: authUser?.user_metadata?.full_name || authUser?.user_metadata?.name || null,
    nickname: dbUser?.nickname || null,
    phone: authUser?.user_metadata?.phone || null,
    avatarUrl: authUser?.user_metadata?.avatar_url || null,
    createdAt: authUser?.created_at || null,
    pendingEmailChange: authUser?.new_email && authUser.new_email !== authUser.email
      ? authUser.new_email
      : null,
    role: dbUser?.role || 'USER',
    isAdmin: dbUser?.isAdmin ?? false,
    consentGiven: dbUser?.consentGiven ?? false,
    consentDate: dbUser?.consentDate || null,
    associationId: dbUser?.associationId || null,
  })
}
