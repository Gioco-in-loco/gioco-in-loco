'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import AuthShell from './AuthShell'
import AuthMessage from './AuthMessage'
import PasswordInput from './PasswordInput'
import SuccessOverlay from './SuccessOverlay'
import { useAuth } from '../../context/AuthContext'
import { createSupabaseBrowserClient, hydrateSupabaseSessionFromUrl } from '../../lib/supabase/browser'

export default function UpdatePasswordPage() {
  const router = useRouter()
  const { updatePassword, isConfigured } = useAuth()
  const [password, setPassword] = useState('')
  const [passwordTouched, setPasswordTouched] = useState(false)
  const [confirmPassword, setConfirmPassword] = useState('')
  const [confirmTouched, setConfirmTouched] = useState(false)
  const [error, setError] = useState('')
  const [showSuccess, setShowSuccess] = useState(false)
  const [hasCheckedAuthState, setHasCheckedAuthState] = useState(false)
  const [isReady, setIsReady] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const passwordHint = passwordTouched && password.length > 0 && password.length < 8 ? `Ancora ${8 - password.length} caratteri` : ''
  const confirmError = confirmTouched && confirmPassword.length > 0 && password !== confirmPassword ? 'Le password non coincidono.' : ''
  const isFormValid = password.length >= 8 && password === confirmPassword

  useEffect(() => {
    if (!isConfigured) return

    const supabase = createSupabaseBrowserClient()
    let isMounted = true

    ;(async () => {
      const hydrated = await hydrateSupabaseSessionFromUrl(supabase)
      const { data } = await supabase.auth.getSession()

      if (isMounted) {
        setIsReady(Boolean(hydrated.session || data.session))
        setHasCheckedAuthState(true)
      }
    })()

    const { data: listener } = supabase.auth.onAuthStateChange((event, session) => {
      if (!isMounted) return
      setHasCheckedAuthState(true)
      if (event === 'PASSWORD_RECOVERY' || session) setIsReady(true)
    })

    return () => {
      isMounted = false
      listener.subscription.unsubscribe()
    }
  }, [isConfigured])

  const handleSubmit = async (event) => {
    event.preventDefault()
    setError('')
    setPasswordTouched(true)
    setConfirmTouched(true)

    if (!isFormValid) return

    setIsSubmitting(true)
    const result = await updatePassword(password)
    setIsSubmitting(false)

    if (result.error) {
      setError(result.error)
      return
    }

    setShowSuccess(true)
  }

  return (
    <>
    {showSuccess && (
      <SuccessOverlay
        title="Password reimpostata"
        description="Per sicurezza abbiamo terminato la sessione: accedi con la tua nuova password."
        ctaLabel="Accedi"
        onCta={() => {
          router.replace('/auth/login')
          router.refresh()
        }}
      />
    )}
    <AuthShell
      eyebrow="Sicurezza account"
      title="Scegli una nuova password"
      description="Inserisci la nuova password che vuoi usare per accedere al tuo account."
      footer={<span>Ricordi la password? <Link href="/auth/login" className="text-editorial-terra hover:underline font-semibold">Accedi</Link></span>}
    >
      {isConfigured && hasCheckedAuthState && !isReady && (
        <AuthMessage type="info">
          Il link non è più valido o è già stato utilizzato. Puoi richiederne uno nuovo dalla pagina di recupero password.
        </AuthMessage>
      )}

      <AuthMessage type="error">{error}</AuthMessage>

      <form className="space-y-4" onSubmit={handleSubmit}>
        <div>
          <label className="block mb-2 font-body text-sm text-editorial-text font-semibold">Nuova password</label>
          <PasswordInput
            value={password}
            onChange={(e) => { setPassword(e.target.value); setPasswordTouched(true) }}
            autoComplete="new-password"
            required
            minLength={8}
            hint={passwordHint}
          />
        </div>
        <div>
          <label className="block mb-2 font-body text-sm text-editorial-text font-semibold">Conferma password</label>
          <PasswordInput
            value={confirmPassword}
            onChange={(e) => { setConfirmPassword(e.target.value); setConfirmTouched(true) }}
            autoComplete="new-password"
            required
            minLength={8}
            error={confirmError}
          />
        </div>
        <button
          type="submit"
          disabled={!isConfigured || !isReady || isSubmitting || !isFormValid}
          className="w-full rounded-lg bg-editorial-terra px-5 py-3 font-body font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60 hover:bg-editorial-terra/90 hover:scale-[1.02] hover:shadow-soft-md transition-all energized-btn"
        >
          {isSubmitting ? 'Salvataggio in corso...' : 'Salva nuova password'}
        </button>
      </form>
    </AuthShell>
    </>
  )
}
