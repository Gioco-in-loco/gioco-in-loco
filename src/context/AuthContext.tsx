import { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import { createSupabaseBrowserClient } from '../lib/supabase/browser'
import { buildAbsoluteUrl, getBrowserSiteUrl } from '../lib/site-url'
import { isSupabaseConfigured } from '../lib/supabase/config'

export interface User {
  id: string
  email: string
  name?: string
  phone?: string
  avatarUrl?: string
  role: string
  isAdmin: boolean
  consentGiven: boolean
  consentDate?: string
  createdAt: string
  pendingEmailChange?: string | null
}

interface AuthContextType {
  user: User | null
  token: string | null
  isLoading: boolean
  isGoogleAuthEnabled: boolean
  isConfigured: boolean
  isPasswordRecovery: boolean
  login: (email: string, password: string) => Promise<{ error: string | null }>
  loginWithGoogle: () => Promise<{ error: string | null }>
  register: (input: { email: string; password: string; fullName: string; consentGiven: boolean }, options?: { next?: string }) => Promise<{ error: string | null; requiresEmailConfirmation: boolean }>
  forgotPassword: (email: string) => Promise<{ error: string | null }>
  updatePassword: (password: string) => Promise<{ error: string | null }>
  updateProfile: (input: { fullName: string; phone?: string; consentGiven?: boolean }) => Promise<{ error: string | null }>
  updateEmail: (email: string) => Promise<{ error: string | null }>
  cancelEmailChange: () => Promise<{ error: string | null }>
  deleteAccount: () => Promise<{ error: string | null }>
  logout: () => Promise<void>
  refreshUser: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

function isGoogleAuthEnabled() {
  return process.env.NEXT_PUBLIC_GOOGLE_AUTH_ENABLED === 'true'
}

function mapSupabaseUser(user: any): User | null {
  if (!user?.email) {
    return null
  }

  const pendingEmailChange = user.new_email && user.new_email !== user.email ? user.new_email : null

  return {
    id: user.id,
    email: user.email,
    name: user.user_metadata?.full_name || user.user_metadata?.name || undefined,
    phone: user.user_metadata?.phone || undefined,
    avatarUrl: user.user_metadata?.avatar_url || undefined,
    role: user.role || 'authenticated',
    isAdmin: false,
    consentGiven: Boolean(user.user_metadata?.gdpr_consent_given),
    consentDate: user.user_metadata?.gdpr_consent_at || undefined,
    createdAt: user.created_at || new Date().toISOString(),
    pendingEmailChange,
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [token, setToken] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [googleAuthEnabled] = useState(isGoogleAuthEnabled())
  const [isConfigured] = useState(isSupabaseConfigured())
  const [isPasswordRecovery, setIsPasswordRecovery] = useState(false)

  const refreshUser = async () => {
    if (!isConfigured) {
      setUser(null)
      setToken(null)
      setIsLoading(false)
      return
    }

    const supabase = createSupabaseBrowserClient()
    const { data: sessionData } = await supabase.auth.getSession()

    setToken(sessionData.session?.access_token || null)

    try {
      const res = await fetch('/api/auth/me', {
        credentials: 'same-origin',
        cache: 'no-store',
      })
      const db = res.ok ? await res.json() : null

      if (db?.email) {
        setUser({
          id: db.id,
          email: db.email,
          name: db.name || undefined,
          phone: db.phone || undefined,
          avatarUrl: db.avatarUrl || undefined,
          role: db.role || 'authenticated',
          isAdmin: db.isAdmin ?? false,
          consentGiven: db.consentGiven ?? false,
          consentDate: db.consentDate || undefined,
          createdAt: db.createdAt || new Date().toISOString(),
          pendingEmailChange: db.pendingEmailChange,
        })
        setIsLoading(false)
        return
      }
    } catch {
      // Fall back to the client session when the server snapshot is unavailable.
    }

    const { data: userData } = await supabase.auth.getUser()
    const base = mapSupabaseUser(userData.user)
    setUser(base)

    setIsLoading(false)
  }

  useEffect(() => {
    refreshUser()
  }, [])

  useEffect(() => {
    if (!isConfigured) {
      setIsLoading(false)
      return
    }

    const supabase = createSupabaseBrowserClient()
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      setToken(session?.access_token || null)

      if (event === 'PASSWORD_RECOVERY') {
        setIsPasswordRecovery(true)
      }

      if (event === 'SIGNED_OUT') {
        setUser(null)
        setIsLoading(false)
        setIsPasswordRecovery(false)
        return
      }

      refreshUser().catch(() => {
        const base = mapSupabaseUser(session?.user || null)
        setUser(base)
        setIsLoading(false)
      })
    })

    return () => {
      subscription.unsubscribe()
    }
  }, [isConfigured])

  const login = async (email: string, password: string) => {
    if (!isConfigured) {
      return { error: 'Supabase non configurato.' }
    }

    const supabase = createSupabaseBrowserClient()
    const { error } = await supabase.auth.signInWithPassword({ email, password })

    if (!error) {
      await fetch('/api/auth/sync', { method: 'POST' }).catch(() => {})
    }

    return { error: error?.message || null }
  }

  const loginWithGoogle = async () => {
    if (!isConfigured) {
      return { error: 'Supabase non configurato.' }
    }

    const supabase = createSupabaseBrowserClient()
    const siteUrl = getBrowserSiteUrl() || window.location.origin
    const redirectTo = buildAbsoluteUrl('/auth/callback', siteUrl)
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo },
    })

    return { error: error?.message || null }
  }

  const register = async (input: { email: string; password: string; fullName: string; phone?: string; consentGiven: boolean; newsletterOptIn?: boolean }, options?: { next?: string }) => {
    if (!isConfigured) {
      return { error: 'Supabase non configurato.', requiresEmailConfirmation: false }
    }

    const supabase = createSupabaseBrowserClient()
    const siteUrl = getBrowserSiteUrl() || window.location.origin
    const callbackPath = options?.next
      ? `/auth/callback?type=signup&next=${encodeURIComponent(options.next)}`
      : '/auth/callback?type=signup'
    const { error, data } = await supabase.auth.signUp({
      email: input.email,
      password: input.password,
      options: {
        emailRedirectTo: buildAbsoluteUrl(callbackPath, siteUrl),
        data: {
          full_name: input.fullName,
          phone: input.phone || null,
          gdpr_consent_given: input.consentGiven,
          gdpr_consent_at: input.consentGiven ? new Date().toISOString() : null,
          gdpr_consent_version: '2026-05-11',
          newsletter_opt_in: Boolean(input.newsletterOptIn),
        },
      },
    })

    if (error) {
      const msg = error.message === 'User already registered'
        ? 'Esiste già un account con questa email.'
        : error.message
      return { error: msg, requiresEmailConfirmation: false }
    }

    // When email confirmation is on, Supabase returns no error for duplicate emails
    // but identities will be empty — treat it as a duplicate.
    if (data.user && data.user.identities?.length === 0) {
      return { error: 'Esiste già un account con questa email.', requiresEmailConfirmation: false }
    }

    const requiresEmailConfirmation = Boolean(data.user && !data.session)

    // Session already active (no email confirmation required) → sync immediately
    if (!requiresEmailConfirmation) {
      await fetch('/api/auth/sync', { method: 'POST' })
    }

    return { error: null, requiresEmailConfirmation }
  }

  const updateProfile = async (input: { fullName: string; phone?: string; consentGiven?: boolean }) => {
    if (!isConfigured) return { error: 'Supabase non configurato.' }

    const supabase = createSupabaseBrowserClient()
    const consentAt = input.consentGiven ? new Date().toISOString() : null
    const { error } = await supabase.auth.updateUser({
      data: {
        full_name: input.fullName,
        phone: input.phone || null,
        gdpr_consent_given: Boolean(input.consentGiven),
        gdpr_consent_at: consentAt,
        gdpr_consent_version: input.consentGiven ? '2026-05-11' : null,
      },
    })

    if (error) return { error: error.message }

    if (input.consentGiven) {
      await fetch('/api/auth/sync', { method: 'POST' }).catch(() => {})
    }

    await refreshUser()
    return { error: null }
  }

  const updateEmail = async (email: string) => {
    if (!isConfigured) return { error: 'Supabase non configurato.' }

    const supabase = createSupabaseBrowserClient()
    const next = `/auth/email-change-progress?to=${encodeURIComponent(email)}`
    const siteUrl = getBrowserSiteUrl() || window.location.origin
    const emailRedirectTo = buildAbsoluteUrl(`/auth/callback?next=${encodeURIComponent(next)}`, siteUrl)
    const { error } = await supabase.auth.updateUser(
      { email },
      { emailRedirectTo },
    )
    if (error) return { error: error.message }

    await refreshUser()
    return { error: null }
  }

  const cancelEmailChange = async () => {
    if (!isConfigured) return { error: 'Supabase non configurato.' }

    const res = await fetch('/api/auth/cancel-email-change', { method: 'POST' })
    if (!res.ok) {
      const data = await res.json().catch(() => ({}))
      return { error: data.error || 'Errore durante l\'annullamento.' }
    }

    const supabase = createSupabaseBrowserClient()
    await supabase.auth.refreshSession().catch(() => {})
    await refreshUser()
    return { error: null }
  }

  const deleteAccount = async () => {
    if (!isConfigured) return { error: 'Supabase non configurato.' }

    const res = await fetch('/api/auth/delete', { method: 'POST' })
    if (!res.ok) {
      const data = await res.json().catch(() => ({}))
      return { error: data.error || "Errore durante l'eliminazione dell'account." }
    }

    const supabase = createSupabaseBrowserClient()
    await supabase.auth.signOut()
    setUser(null)
    setToken(null)
    return { error: null }
  }

  const forgotPassword = async (email: string) => {
    if (!isConfigured) {
      return { error: 'Supabase non configurato.' }
    }

    const supabase = createSupabaseBrowserClient()
    const siteUrl = getBrowserSiteUrl() || window.location.origin
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: buildAbsoluteUrl('/auth/update-password', siteUrl),
    })

    return { error: error?.message || null }
  }

  const updatePassword = async (password: string) => {
    if (!isConfigured) {
      return { error: 'Supabase non configurato.' }
    }

    const supabase = createSupabaseBrowserClient()
    const { error } = await supabase.auth.updateUser({ password })

    if (error) {
      return { error: error.message }
    }

    // The session used to get here was granted by the recovery link, not by
    // entering a password. Sign out immediately so the user must log back in
    // with the new password before reaching any authenticated area.
    await fetch('/api/auth/logout', { method: 'POST', credentials: 'same-origin' }).catch(() => null)
    await supabase.auth.signOut().catch(() => null)
    setUser(null)
    setToken(null)
    setIsPasswordRecovery(false)

    return { error: null }
  }

  const logout = async () => {
    setUser(null)
    setToken(null)
    if (!isConfigured) {
      window.location.replace('/')
      return
    }

    const supabase = createSupabaseBrowserClient()

    await fetch('/api/auth/logout', {
      method: 'POST',
      credentials: 'same-origin',
    }).catch(() => null)

    await supabase.auth.signOut().catch(() => null)
    window.location.replace('/')
  }

  return (
    <AuthContext.Provider value={{ user, token, isLoading, isGoogleAuthEnabled: googleAuthEnabled, isConfigured, isPasswordRecovery, login, loginWithGoogle, register, forgotPassword, updatePassword, updateProfile, updateEmail, cancelEmailChange, deleteAccount, logout, refreshUser }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}