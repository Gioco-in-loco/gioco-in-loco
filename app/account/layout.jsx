import { redirect } from 'next/navigation'
import { createSupabaseServerClient } from '../../src/lib/supabase/server'
import { isSupabaseConfigured } from '../../src/lib/supabase/config'
import AccountNavbar from '../../src/components/auth/AccountNavbar'

export default async function AccountLayout({ children }) {
  let userEmail = null

  if (isSupabaseConfigured()) {
    const supabase = createSupabaseServerClient()
    const { data } = await supabase.auth.getUser()

    if (!data.user) {
      redirect('/auth/login')
    }

    userEmail = data.user.email || null
  }

  return (
    <div className="min-h-screen energized-bg">
      <div className="sticky top-0 z-20 border-b border-editorial-border bg-white">
        <div className="mx-auto flex h-12 max-w-7xl items-center justify-between gap-6 px-6">
          <div className="flex items-center gap-6">
            <span className="shrink-0 font-body text-xs font-semibold uppercase tracking-widest text-editorial-terra">
              Area utente
            </span>
            <AccountNavbar />
          </div>
          <span className="max-w-[240px] truncate font-body text-xs text-editorial-text-muted">{userEmail}</span>
        </div>
      </div>

      <main className="mx-auto max-w-7xl px-6 py-8">
        {children}
      </main>
    </div>
  )
}