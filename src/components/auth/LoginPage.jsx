'use client'

import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { useState, useEffect } from 'react'
import AuthShell from './AuthShell'
import AuthMessage from './AuthMessage'
import PasswordInput from './PasswordInput'
import { useAuth } from '../../context/AuthContext'

const AUTH_ERROR_MESSAGES = {
  expired: 'Il link di conferma è scaduto. Richiedine uno nuovo dalla pagina di login.',
  generic: 'Qualcosa è andato storto durante la verifica. Riprova o contattaci se il problema persiste.',
}

export default function LoginPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { login, loginWithGoogle, isGoogleAuthEnabled, isConfigured } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  useEffect(() => {
    const authError = searchParams.get('auth_error')
    if (authError) {
      setError(AUTH_ERROR_MESSAGES[authError] || AUTH_ERROR_MESSAGES.generic)
    }
  }, [searchParams])

  const handleSubmit = async (event) => {
    event.preventDefault()
    setError('')
    setIsSubmitting(true)

    const result = await login(email, password)
    setIsSubmitting(false)

    if (result.error) {
      setError(result.error)
      return
    }

    window.location.replace('/account')
  }

  const handleGoogleLogin = async () => {
    setError('')
    setIsSubmitting(true)
    const result = await loginWithGoogle()

    if (result.error) {
      setError(result.error)
      setIsSubmitting(false)
    }
  }

  return (
    <AuthShell
      eyebrow="Accesso"
      title="Bentornato!"
      description="Accedi al tuo account per gestire le prenotazioni e seguire gli eventi."
      footer={<span>Non hai un account? <Link href="/auth/register" className="text-editorial-terra hover:underline font-semibold">Registrati</Link></span>}
    >
      {!isConfigured && (
        <AuthMessage type="info">
          Il sistema di autenticazione non è ancora attivo. Riprova più tardi.
        </AuthMessage>
      )}

      <AuthMessage type="error">{error}</AuthMessage>

      <form className="space-y-4" onSubmit={handleSubmit}>
        <div>
          <label className="block mb-2 font-body text-sm text-editorial-text font-semibold">Email</label>
          <input
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            required
            autoComplete="email"
            placeholder="la-tua@email.it"
            className="input-field"
          />
        </div>
        <div>
          <div className="mb-2 flex items-center justify-between">
            <label className="font-body text-sm text-editorial-text font-semibold">Password</label>
            <Link href="/auth/forgot-password" className="font-body text-sm text-editorial-terra hover:underline font-semibold">
              Password dimenticata?
            </Link>
          </div>
          <PasswordInput
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            required
            autoComplete="current-password"
          />
        </div>
        <button
          type="submit"
          disabled={!isConfigured || isSubmitting}
          className="w-full btn-primary"
        >
          {isSubmitting ? 'Accesso in corso...' : 'Accedi'}
        </button>
      </form>

      {isGoogleAuthEnabled && (
        <button
          type="button"
          onClick={handleGoogleLogin}
          disabled={!isConfigured || isSubmitting}
          className="mt-4 w-full btn-ghost"
        >
          Continua con Google
        </button>
      )}
    </AuthShell>
  )
}