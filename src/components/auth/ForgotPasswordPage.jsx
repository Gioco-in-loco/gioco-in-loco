'use client'

import Link from 'next/link'
import { useState } from 'react'
import AuthShell from './AuthShell'
import AuthMessage from './AuthMessage'
import { useAuth } from '../../context/AuthContext'

export default function ForgotPasswordPage() {
  const { forgotPassword, isConfigured } = useAuth()
  const [email, setEmail] = useState('')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleSubmit = async (event) => {
    event.preventDefault()
    setError('')
    setSuccess('')
    setIsSubmitting(true)

    const result = await forgotPassword(email)
    setIsSubmitting(false)

    if (result.error) {
      setError(result.error)
      return
    }

    setSuccess('Se l’email esiste, riceverai un link per reimpostare la password.')
  }

  return (
    <AuthShell
      eyebrow="Recupero password"
      title="Reimposta la password"
      description="Il link di recupero viene gestito da Supabase Auth e ti porterà su una pagina dedicata per impostare una nuova password."
      footer={<span>Ricordi la password? <Link href="/auth/login" className="text-editorial-terra hover:underline">Accedi</Link></span>}
    >
      {!isConfigured && (
        <AuthMessage type="info">
          Configura <strong>NEXT_PUBLIC_SUPABASE_URL</strong> e <strong>NEXT_PUBLIC_SUPABASE_ANON_KEY</strong> per attivare il recupero password.
        </AuthMessage>
      )}

      <AuthMessage type="error">{error}</AuthMessage>
      <AuthMessage type="success">{success}</AuthMessage>

      <form className="space-y-4" onSubmit={handleSubmit}>
        <div>
          <label className="block mb-2 font-body text-sm text-editorial-text">Email</label>
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
        <button
          type="submit"
          disabled={!isConfigured || isSubmitting}
          className="w-full btn-primary"
        >
          {isSubmitting ? 'Invio in corso...' : 'Invia link di reset'}
        </button>
      </form>
    </AuthShell>
  )
}