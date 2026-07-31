import { redirect } from 'next/navigation'
import RegisterPage from '../../../src/components/auth/RegisterPage'
import { createSupabaseServerClient } from '../../../src/lib/supabase/server'
import { isSupabaseConfigured } from '../../../src/lib/supabase/config'

export default async function RegisterRoute() {
  if (isSupabaseConfigured()) {
    const supabase = createSupabaseServerClient()
    const { data } = await supabase.auth.getUser()

    if (data.user) {
      redirect('/account')
    }
  }

  return <RegisterPage />
}