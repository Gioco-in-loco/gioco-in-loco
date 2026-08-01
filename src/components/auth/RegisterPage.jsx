'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useState, useEffect } from 'react'
import AuthShell from './AuthShell'
import AuthMessage from './AuthMessage'
import PasswordInput from './PasswordInput'
import { useAuth } from '../../context/AuthContext'
import PrivacyModal from '../ui/PrivacyModal'

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const PHONE_RE = /^[+\d][\d\s]{6,}$/

export default function RegisterPage() {
  const router = useRouter()
  const { register, isConfigured } = useAuth()
  const [showPrivacy, setShowPrivacy] = useState(false)
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [emailTouched, setEmailTouched] = useState(false)
  const [phone, setPhone] = useState('')
  const [phoneTouched, setPhoneTouched] = useState(false)
  const [password, setPassword] = useState('')
  const [passwordTouched, setPasswordTouched] = useState(false)
  const [confirmPassword, setConfirmPassword] = useState('')
  const [confirmTouched, setConfirmTouched] = useState(false)
  const [consentGiven, setConsentGiven] = useState(false)
  const [newsletterOptIn, setNewsletterOptIn] = useState(false)
  const [error, setError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const emailError = emailTouched && email && !EMAIL_RE.test(email) ? 'Inserisci un indirizzo email valido.' : ''
  const phoneError = phoneTouched && phone && !PHONE_RE.test(phone.trim()) ? 'Inserisci un numero di telefono valido.' : ''
  const passwordHint = passwordTouched && password.length > 0 && password.length < 8 ? `Ancora ${8 - password.length} caratteri` : ''
  const confirmError = confirmTouched && confirmPassword.length > 0 && password !== confirmPassword ? 'Le password non coincidono.' : ''

  const isFormValid =
    fullName.trim().length > 0 &&
    EMAIL_RE.test(email) &&
    PHONE_RE.test(phone.trim()) &&
    password.length >= 8 &&
    password === confirmPassword &&
    consentGiven

  const handleSubmit = async (event) => {
    event.preventDefault()
    setError('')
    setEmailTouched(true)
    setPhoneTouched(true)
    setPasswordTouched(true)
    setConfirmTouched(true)

    if (!EMAIL_RE.test(email)) return
    if (!PHONE_RE.test(phone.trim())) return
    if (password.length < 8) return
    if (password !== confirmPassword) return
    if (!consentGiven) {
      setError('Devi accettare il trattamento dei dati per creare l\'account.')
      return
    }

    setIsSubmitting(true)
    const result = await register({ email, password, fullName, phone: phone.trim(), consentGiven, newsletterOptIn })
    setIsSubmitting(false)

    if (result.error) {
      setError(result.error)
      return
    }

    if (result.requiresEmailConfirmation) {
      router.replace(`/auth/check-email?email=${encodeURIComponent(email)}`)
      return
    }

    router.replace('/account')
    router.refresh()
  }

  return (
    <>
    {showPrivacy && <PrivacyModal onClose={() => setShowPrivacy(false)} />}
    <AuthShell
      eyebrow="Registrazione"
      title="Crea il tuo account"
      description="Registrati per prenotare sessioni GDR, salvare i tuoi giochi preferiti e seguire gli eventi."
      footer={<span>Hai già un account? <Link href="/auth/login" className="text-editorial-terra hover:underline font-semibold">Accedi</Link></span>}
    >
      {!isConfigured && (
        <AuthMessage type="info">
          Il sistema di registrazione non è ancora attivo. Riprova più tardi.
        </AuthMessage>
      )}

      <AuthMessage type="error">{error}</AuthMessage>

      <form className="space-y-4" onSubmit={handleSubmit}>
        <div>
          <label className="block mb-2 font-body text-sm text-editorial-text font-semibold">Nome e cognome</label>
          <input
            type="text"
            value={fullName}
            onChange={(event) => setFullName(event.target.value)}
            required
            autoComplete="name"
            placeholder="Mario Rossi"
            className="input-field"
          />
        </div>
        <div>
          <label className="block mb-2 font-body text-sm text-editorial-text font-semibold">Email</label>
          <input
            type="text"
            inputMode="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            onBlur={() => setEmailTouched(true)}
            required
            autoComplete="email"
            placeholder="la-tua@email.it"
            className={`input-field ${emailError ? 'input-field--error' : ''}`}
          />
          {emailError && <p className="mt-1.5 font-body text-xs text-red-500">{emailError}</p>}
        </div>
        <div>
          <label className="block mb-2 font-body text-sm text-editorial-text font-semibold">Telefono</label>
          <input
            type="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            onBlur={() => setPhoneTouched(true)}
            required
            autoComplete="tel"
            placeholder="+39 333 000 0000"
            className={`input-field ${phoneError ? 'input-field--error' : ''}`}
          />
          {phoneError && <p className="mt-1.5 font-body text-xs text-red-500">{phoneError}</p>}
        </div>
        <div>
          <label className="block mb-2 font-body text-sm text-editorial-text font-semibold">Password</label>
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
            {' '}e autorizzo l&apos;uso dei miei dati per creare e gestire il mio account.
          </span>
        </label>

        <label className="flex items-start gap-3 rounded-lg border-2 border-editorial-border px-4 py-3 hover:border-editorial-terra transition-colors cursor-pointer">
          <input
            type="checkbox"
            checked={newsletterOptIn}
            onChange={(event) => setNewsletterOptIn(event.target.checked)}
            className="mt-1 accent-editorial-terra"
          />
          <span className="font-body text-sm text-editorial-text-secondary leading-relaxed">
            Iscrivimi alla newsletter per ricevere aggiornamenti sugli eventi e le novità.
          </span>
        </label>

        <button
          type="submit"
          disabled={!isConfigured || isSubmitting || !isFormValid}
          className="w-full btn-primary"
        >
          {isSubmitting ? 'Registrazione in corso...' : 'Registrati'}
        </button>
      </form>
    </AuthShell>
    </>
  )
}