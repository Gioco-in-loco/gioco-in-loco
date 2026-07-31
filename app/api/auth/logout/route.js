import { NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { getSupabaseConfig, isSupabaseConfigured } from '../../../../src/lib/supabase/config'

export async function POST(request) {
  if (!isSupabaseConfigured()) {
    return NextResponse.json({ error: 'Auth non configurata' }, { status: 503 })
  }

  const response = NextResponse.json({ ok: true })
  const { supabaseUrl, supabaseAnonKey } = getSupabaseConfig()

  const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll()
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value, options }) => {
          response.cookies.set(name, value, options)
        })
      },
    },
  })

  const { error } = await supabase.auth.signOut()
  if (error) {
    return NextResponse.json({ error: error.message || 'Logout fallito' }, { status: 500 })
  }

  return response
}