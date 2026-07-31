import { createClient } from '@supabase/supabase-js'
import { getSupabaseConfig } from './config'
import { buildAbsoluteUrl } from '../site-url'

export async function sendAccountInviteEmail(adminClient, email, fullName, siteUrl) {
  return adminClient.auth.admin.inviteUserByEmail(email, {
    data: { full_name: fullName },
    redirectTo: buildAbsoluteUrl(`/auth/complete-account?email=${encodeURIComponent(email)}`, siteUrl),
  })
}

export async function sendPasswordResetEmail(email, siteUrl) {
  const { supabaseUrl, supabaseAnonKey } = getSupabaseConfig()

  const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  })

  return supabase.auth.resetPasswordForEmail(email, {
    redirectTo: buildAbsoluteUrl('/auth/update-password', siteUrl),
  })
}