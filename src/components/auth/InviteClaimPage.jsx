'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import AuthShell from './AuthShell'
import AuthMessage from './AuthMessage'
import { useAuth } from '../../context/AuthContext'

function formatPrice(value) {
  if (value == null) return 'Gratis'
  return new Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR' }).format(value)
}

export default function InviteClaimPage({ code }) {
  const { user, isLoading: isAuthLoading } = useAuth()
  const [invite, setInvite] = useState(null)
  const [isLoadingInvite, setIsLoadingInvite] = useState(true)
  const [claimResult, setClaimResult] = useState(null)
  const [claimError, setClaimError] = useState('')
  const [isClaiming, setIsClaiming] = useState(false)
  const autoClaimAttempted = useRef(false)

  useEffect(() => {
    let cancelled = false

    fetch(`/api/invites/${encodeURIComponent(code)}`, { cache: 'no-store' })
      .then((res) => res.json())
      .then((data) => {
        if (!cancelled) setInvite(data)
      })
      .catch(() => {
        if (!cancelled) setInvite({ state: 'not_found' })
      })
      .finally(() => {
        if (!cancelled) setIsLoadingInvite(false)
      })

    return () => { cancelled = true }
  }, [code])

  const emailMatches = Boolean(user?.email && invite?.email && user.email.trim().toLowerCase() === invite.email.trim().toLowerCase())

  const handleClaim = async () => {
    setIsClaiming(true)
    setClaimError('')

    try {
      const res = await fetch(`/api/invites/${encodeURIComponent(code)}/claim`, { method: 'POST' })
      const data = await res.json().catch(() => ({}))

      if (!res.ok) {
        setClaimError(data.error || 'Impossibile confermare il tuo posto.')
        return
      }

      setClaimResult(data)
    } catch {
      setClaimError('Impossibile confermare il tuo posto. Riprova.')
    } finally {
      setIsClaiming(false)
    }
  }

  useEffect(() => {
    if (autoClaimAttempted.current) return
    if (isAuthLoading || isLoadingInvite) return
    if (invite?.state !== 'valid') return
    if (!emailMatches) return

    autoClaimAttempted.current = true
    handleClaim()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthLoading, isLoadingInvite, invite, emailMatches])

  if (isLoadingInvite) {
    return (
      <AuthShell eyebrow="Invito" title="Caricamento invito..." description="Un attimo, stiamo verificando il tuo invito.">
        <div />
      </AuthShell>
    )
  }

  if (claimResult) {
    return (
      <AuthShell
        eyebrow="Invito confermato"
        title="Posto confermato!"
        description={`Hai confermato il tuo posto per ${claimResult.activityTitle}.`}
      >
        <div className="rounded-lg border-2 border-editorial-border px-4 py-3 space-y-1 font-body text-sm text-editorial-text-secondary">
          <div><strong className="text-editorial-text">{claimResult.activityTitle}</strong></div>
          <div>{claimResult.day} · {claimResult.slot}{claimResult.table ? ` · ${claimResult.table}` : ''}</div>
          {claimResult.event?.name && <div>{claimResult.event.name}</div>}
          <div className="pt-2 font-semibold text-editorial-text">Importo dovuto per il tuo posto: {formatPrice(claimResult.price)}</div>
        </div>
        <Link href="/account/prenotazioni" className="btn-primary w-full mt-6 inline-block text-center">
          Vai alle tue prenotazioni
        </Link>
      </AuthShell>
    )
  }

  if (!invite || invite.state === 'not_found') {
    return (
      <AuthShell eyebrow="Invito" title="Invito non trovato" description="Il link che hai usato non è valido. Chiedi a chi ti ha invitato di controllare il link." />
    )
  }

  if (invite.state === 'expired') {
    return (
      <AuthShell
        eyebrow="Invito"
        title="Invito scaduto"
        description={`L'invito per ${invite.activityTitle} non è stato confermato in tempo e il posto è stato rilasciato. Chiedi a chi ti ha invitato di invitarti di nuovo.`}
      />
    )
  }

  if (invite.state === 'claimed') {
    return (
      <AuthShell
        eyebrow="Invito"
        title="Invito già confermato"
        description={`Il posto per ${invite.activityTitle} è già stato confermato.`}
      >
        <Link href="/account/prenotazioni" className="btn-primary w-full inline-block text-center">
          Vai alle tue prenotazioni
        </Link>
      </AuthShell>
    )
  }

  const redirectParam = `/invito/${code}`

  return (
    <AuthShell
      eyebrow="Sei stato invitato!"
      title={invite.activityTitle}
      description={`${invite.day} · ${invite.slot}${invite.table ? ` · ${invite.table}` : ''}${invite.event?.name ? ` · ${invite.event.name}` : ''}`}
    >
      <AuthMessage type="error">{claimError}</AuthMessage>

      <div className="rounded-lg border-2 border-editorial-border px-4 py-3 mb-6 font-body text-sm text-editorial-text-secondary">
        Il tuo posto è riservato all&apos;email <strong className="text-editorial-text">{invite.email}</strong>. Registrati o accedi con questa email entro la scadenza per confermarlo.
      </div>

      {!user ? (
        <div className="space-y-3">
          <Link
            href={`/auth/register?redirect=${encodeURIComponent(redirectParam)}&email=${encodeURIComponent(invite.email)}`}
            className="btn-primary w-full inline-block text-center"
          >
            Registrati per confermare
          </Link>
          <Link
            href={`/auth/login?redirect=${encodeURIComponent(redirectParam)}`}
            className="btn-ghost w-full inline-block text-center"
          >
            Ho già un account, accedi
          </Link>
        </div>
      ) : emailMatches ? (
        <button
          type="button"
          onClick={handleClaim}
          disabled={isClaiming}
          className="btn-primary w-full"
        >
          {isClaiming ? 'Conferma in corso...' : 'Conferma il tuo posto'}
        </button>
      ) : (
        <AuthMessage type="info">
          Sei collegato come {user.email}, ma questo invito è per {invite.email}. Esci e accedi con l&apos;email corretta per confermare il posto.
        </AuthMessage>
      )}
    </AuthShell>
  )
}
