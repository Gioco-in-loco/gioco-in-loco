'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import AuthShell from './AuthShell'
import AuthMessage from './AuthMessage'

export default function InviteCodeEntryPage() {
  const router = useRouter()
  const [code, setCode] = useState('')
  const [error, setError] = useState('')

  const handleSubmit = (e) => {
    e.preventDefault()
    const trimmed = code.trim()

    if (!trimmed) {
      setError('Inserisci il codice che hai ricevuto via email.')
      return
    }

    router.push(`/invito/${encodeURIComponent(trimmed)}`)
  }

  return (
    <AuthShell
      eyebrow="Riscatta invito"
      title="Hai un codice invito?"
      description="Se un amico ti ha invitato a una sessione, inserisci qui sotto il codice che hai ricevuto via email per riscattare il tuo posto."
    >
      <AuthMessage type="error">{error}</AuthMessage>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="invite-code" className="block font-body text-sm font-semibold text-editorial-text mb-2">
            Codice invito
          </label>
          <input
            id="invite-code"
            type="text"
            value={code}
            onChange={(e) => setCode(e.target.value)}
            placeholder="Es. a1b2c3d4e5f6..."
            className="w-full rounded-lg border-2 border-editorial-border px-4 py-3 font-body text-sm text-editorial-text outline-none focus:border-editorial-terra"
            autoComplete="off"
            autoCapitalize="off"
            spellCheck={false}
          />
        </div>

        <button type="submit" className="btn-primary w-full">
          Continua
        </button>
      </form>
    </AuthShell>
  )
}
