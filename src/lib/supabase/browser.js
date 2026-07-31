'use client'

import { createBrowserClient } from '@supabase/ssr'
import { getSupabaseConfig } from './config'

let browserClient

function readAuthParamsFromLocation() {
  if (typeof window === 'undefined') return null

  const hashParams = new URLSearchParams(window.location.hash.replace(/^#/, ''))
  const searchParams = new URLSearchParams(window.location.search)
  const accessToken = hashParams.get('access_token') || searchParams.get('access_token')
  const refreshToken = hashParams.get('refresh_token') || searchParams.get('refresh_token')

  if (!accessToken || !refreshToken) {
    return null
  }

  return {
    access_token: accessToken,
    refresh_token: refreshToken,
  }
}

export async function hydrateSupabaseSessionFromUrl(client = createSupabaseBrowserClient()) {
  const sessionParams = readAuthParamsFromLocation()
  if (!sessionParams) {
    return { session: null, error: null }
  }

  const { data, error } = await client.auth.setSession(sessionParams)

  if (!error && typeof window !== 'undefined' && window.location.hash) {
    const cleanUrl = `${window.location.pathname}${window.location.search}`
    window.history.replaceState(window.history.state, '', cleanUrl)
  }

  return {
    session: data.session,
    error,
  }
}

export function createSupabaseBrowserClient() {
  if (browserClient) {
    return browserClient
  }

  const { supabaseUrl, supabaseAnonKey } = getSupabaseConfig()

  browserClient = createBrowserClient(supabaseUrl, supabaseAnonKey)
  return browserClient
}