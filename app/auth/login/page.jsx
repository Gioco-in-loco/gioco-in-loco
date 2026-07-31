import { redirect } from 'next/navigation'
import LoginPage from '../../../src/components/auth/LoginPage'
import { createSupabaseServerClient } from '../../../src/lib/supabase/server'
import { isSupabaseConfigured } from '../../../src/lib/supabase/config'

export default async function LoginRoute() {
  if (isSupabaseConfigured()) {
    const supabase = createSupabaseServerClient()
    const { data } = await supabase.auth.getUser()

    if (data.user) {
      redirect('/account')
    }
  }

  return <LoginPage />
}