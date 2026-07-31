'use client'

import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { useEffect, useState } from 'react'
import AuthShell from './AuthShell'
import AuthMessage from './AuthMessage'
import PasswordInput from './PasswordInput'
import SuccessOverlay from './SuccessOverlay'
import PrivacyModal from '../ui/PrivacyModal'
import { useAuth } from '../../context/AuthContext'
import { createSupabaseBrowserClient, hydrateSupabaseSessionFromUrl } from '../../lib/supabase/browser'

const PHONE_RE = /^[+\d][\d\s]{6,}$/

export default function CompleteAccountPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { user, updateProfile, updatePassword, isConfigured } = useAuth()
  const [fullName, setFullName] = useState('')
  const [phone, setPhone] = useState('')
  const [phoneTouched, setPhoneTouched] = useState(false)
  const [password, setPassword] = useState('')
  const [passwordTouched, setPasswordTouched] = useState(false)
  const [confirmPassword, setConfirmPassword] = useState('')
  const [confirmTouched, setConfirmTouched] = useState(false)
  const [consentGiven, setConsentGiven] = useState(false)
  const [error, setError] = useState('')
  const [showSuccess, setShowSuccess] = useState(false)
  const [showPrivacy, setShowPrivacy] = useState(false)
  const [hasAuthLinkHints, setHasAuthLinkHints] = useState(false)
  const [isReady, setIsReady] = useState(false)
  const [hasCheckedAuthState, setHasCheckedAuthState] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)

  useEffect(() => {
    setFullName(user?.name || '')
    setPhone(user?.phone || '')
    setConsentGiven(Boolean(user?.consentGiven))
  }, [user])

  useEffect(() => {
    if (!isConfigured) return

    const supabase = createSupabaseBrowserClient()
    let isMounted = true

    const hash = typeof window !== 'undefined' ? window.location.hash : ''
    const href = typeof window !== 'undefined' ? window.location.href : ''
    const hasLinkHints = [
      'access_token=',
      'refresh_token=',
      'type=recovery',
      'type=invite',
      'code=',
      'token_hash=',
    ].some((token) => hash.includes(token) || href.includes(token))

    if (isMounted) {
      setHasAuthLinkHints(hasLinkHints)
      if (hasLinkHints) setIsReady(true)
    }

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
      if (event === 'SIGNED_IN' || event === 'PASSWORD_RECOVERY' || session) {
        setIsReady(true)
      }
    })

    return () => {
      isMounted = false
      listener.subscription.unsubscribe()
    }
  }, [isConfigured])

  const passwordHint = passwordTouched && password.length > 0 && password.length < 8
    ? `Ancora ${8 - password.length} caratteri`
    : ''
  const invitedEmail = user?.email || searchParams.get('email') || ''
  const confirmError = confirmTouched && confirmPassword.length > 0 && password !== confirmPassword
    ? 'Le password non coincidono.'
    : ''
  const phoneError = phoneTouched && phone && !PHONE_RE.test(phone.trim()) ? 'Inserisci un numero di telefono valido.' : ''
  const isFormValid = fullName.trim().length > 0 && PHONE_RE.test(phone.trim()) && password.length >= 8 && password === confirmPassword && consentGiven

  const handleSubmit = async (event) => {
    event.preventDefault()
    setError('')
    setPhoneTouched(true)
    setPasswordTouched(true)
    setConfirmTouched(true)

    if (!isFormValid) return

    if (!consentGiven) {
      setError('Devi accettare il trattamento dei dati per completare l\'account.')
      return
    }

    setIsSubmitting(true)

    const profileResult = await updateProfile({
      fullName: fullName.trim(),
      phone: phone.trim(),
      consentGiven,
    })

    if (profileResult.error) {
      setIsSubmitting(false)
      setError(profileResult.error)
      return
    }

    const passwordResult = await updatePassword(password)
    setIsSubmitting(false)

    if (passwordResult.error) {
      setError(passwordResult.error)
      return
    }

    setShowSuccess(true)
  }

  return (
    <>
      {showPrivacy && <PrivacyModal onClose={() => setShowPrivacy(false)} />}
      {showSuccess && (
        <SuccessOverlay
          title="Account completato"
          description="Le tue informazioni sono state salvate. Ora puoi entrare nella tua area personale e usare il tuo account normalmente."
          ctaLabel="Vai al tuo account"
          onCta={() => {
            router.replace('/account')
            router.refresh()
          }}
        />
      )}
      <AuthShell
        eyebrow="Invito accettato"
        title="Completa il tuo account"
        description="Imposta la tua password e completa i dati principali del profilo prima di iniziare a usare l'account."
      >
        {isConfigured && hasCheckedAuthState && !isReady && !hasAuthLinkHints && (
          <AuthMessage type="info">
            Il link di invito non è più valido o è già stato usato. Se hai bisogno di un nuovo accesso, chiedi a un amministratore di inviarti un altro invito.
          </AuthMessage>
        )}

        <AuthMessage type="error">{error}</AuthMessage>

        <form className="space-y-4" onSubmit={handleSubmit}>
          <div>
            <label className="block mb-2 font-body text-sm text-editorial-text font-semibold">Email</label>
            <input
              type="email"
              value={invitedEmail}
              disabled
              className="w-full rounded-lg border-2 border-editorial-border bg-editorial-bg px-4 py-3 font-body text-editorial-text-muted outline-none"
            />
          </div>

          <div>
            <label className="block mb-2 font-body text-sm text-editorial-text font-semibold">Nome e cognome</label>
            <input
              type="text"
              value={fullName}
              onChange={(event) => setFullName(event.target.value)}
              required
              autoComplete="name"
              placeholder="Mario Rossi"
              className="w-full rounded-lg border-2 border-editorial-border px-4 py-3 font-body text-editorial-text outline-none focus:border-editorial-terra focus:ring-4 focus:ring-editorial-terra/10 transition-all auth-input"
            />
          </div>

          <div>
            <label className="block mb-2 font-body text-sm text-editorial-text font-semibold">Telefono</label>
            <input
              type="tel"
              value={phone}
              onChange={(event) => setPhone(event.target.value)}
              onBlur={() => setPhoneTouched(true)}
              required
              autoComplete="tel"
              placeholder="333 000 0000"
              className={`w-full rounded-lg border-2 px-4 py-3 font-body text-editorial-text outline-none transition-all auth-input ${phoneError ? 'border-red-400 focus:border-red-500 focus:ring-4 focus:ring-red-500/10' : 'border-editorial-border focus:border-editorial-terra focus:ring-4 focus:ring-editorial-terra/10'}`}
            />
            {phoneError && <p className="mt-1.5 font-body text-xs text-red-500">{phoneError}</p>}
          </div>

          <div>
            <label className="block mb-2 font-body text-sm text-editorial-text font-semibold">Password</label>
            <PasswordInput
              value={password}
              onChange={(event) => { setPassword(event.target.value); setPasswordTouched(true) }}
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
              onChange={(event) => { setConfirmPassword(event.target.value); setConfirmTouched(true) }}
              autoComplete="new-password"
              required
              minLength={8}
              error={confirmError}
            />
          </div>

          <label className="flex items-start gap-3 rounded-lg border-2 border-editorial-border px-4 py-3 hover:border-editorial-terra transition-colors cursor-pointer">
            <input
              type="checkbox"
              checked={consentGiven}
              onChange={(event) => setConsentGiven(event.target.checked)}
              className="mt-1 accent-editorial-terra"
            />
            <span className="font-body text-sm text-editorial-text-secondary leading-relaxed">
              Confermo di aver letto l&apos;
              <button
                type="button"
                onClick={() => setShowPrivacy(true)}
                className="text-editorial-terra hover:underline font-semibold"
              >
                informativa privacy
              </button>
              {' '}e autorizzo l&apos;uso dei miei dati per attivare e gestire il mio account.
            </span>
          </label>

          <button
            type="submit"
            disabled={!isConfigured || !isReady || isSubmitting || !isFormValid}
            className="w-full rounded-lg bg-editorial-terra px-5 py-3 font-body font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60 hover:bg-editorial-terra/90 hover:scale-[1.02] hover:shadow-soft-md transition-all energized-btn"
          >
            {isSubmitting ? 'Salvataggio in corso...' : 'Completa account'}
          </button>
        </form>
      </AuthShell>
    </>
  )
}