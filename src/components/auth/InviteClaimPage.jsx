'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import AuthShell from './AuthShell'
import AuthMessage from './AuthMessage'
import { useAuth } from '../../context/AuthContext'
import { getBookableEventConfigByEventId } from '../../lib/bookable-events'

function formatPrice(value) {
  if (value == null) return 'Gratis'
  return new Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR' }).format(value)
}

// The cart with the live 10-minute countdown lives on the event's own
// booking route (e.g. /dice-fest/carrello), not on the generic account
// bookings page — resolve it from whichever event the claimed sessions
// belong to, falling back to the account page if it isn't a known one.
function resolveCartHref(sessions) {
  const eventId = sessions?.find((session) => session.event?.id)?.event?.id
  const routeBasePath = eventId ? getBookableEventConfigByEventId(eventId)?.routeBasePath : null
  return routeBasePath ? `${routeBasePath}/carrello` : '/account/prenotazioni'
}

function SessionSummary({ session }) {
  return (
    <div>
      <div className="font-semibold text-editorial-text">{session.activityTitle}</div>
      <div>{session.day} · {session.slot}{session.table ? ` · ${session.table}` : ''}{session.event?.name ? ` · ${session.event.name}` : ''}</div>
      <div>{formatPrice(session.price)}</div>
    </div>
  )
}

export default function InviteClaimPage({ code }) {
  const { user, isLoading: isAuthLoading } = useAuth()
  const [invite, setInvite] = useState(null)
  const [isLoadingInvite, setIsLoadingInvite] = useState(true)
  const [selectedIds, setSelectedIds] = useState(new Set())
  const [claimResult, setClaimResult] = useState(null)
  const [claimError, setClaimError] = useState('')
  const [isClaiming, setIsClaiming] = useState(false)

  useEffect(() => {
    let cancelled = false

    fetch(`/api/invites/${encodeURIComponent(code)}`, { cache: 'no-store' })
      .then((res) => res.json())
      .then((data) => {
        if (cancelled) return
        setInvite(data)
        // Every session invited starts selected — the friend deselects what
        // they don't want, instead of having to opt into everything.
        if (data?.state === 'valid') {
          setSelectedIds(new Set((data.sessions || []).map((session) => session.id)))
        }
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

  const toggleSession = (sessionId) => {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(sessionId)) next.delete(sessionId)
      else next.add(sessionId)
      return next
    })
  }

  const handleClaim = async () => {
    setIsClaiming(true)
    setClaimError('')

    try {
      const res = await fetch(`/api/invites/${encodeURIComponent(code)}/claim`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ acceptedIds: Array.from(selectedIds) }),
      })
      const data = await res.json().catch(() => ({}))

      if (!res.ok) {
        setClaimError(data.error || 'Impossibile confermare la tua scelta.')
        return
      }

      setClaimResult(data)
    } catch {
      setClaimError('Impossibile confermare la tua scelta. Riprova.')
    } finally {
      setIsClaiming(false)
    }
  }

  const sessionCount = invite?.sessions?.length || 0

  if (isLoadingInvite) {
    return (
      <AuthShell eyebrow="Invito" title="Caricamento invito..." description="Un attimo, stiamo verificando il tuo invito.">
        <div />
      </AuthShell>
    )
  }

  if (claimResult) {
    const accepted = claimResult.accepted || []
    const declined = claimResult.declined || []
    return (
      <AuthShell
        eyebrow="Invito riscattato"
        title={accepted.length > 0 ? 'Sessioni aggiunte al carrello!' : 'Invito riscattato'}
        description={accepted.length > 0
          ? `Hai 10 minuti per completare il checkout, altrimenti i posti verranno rilasciati.`
          : 'Non hai accettato nessuna sessione.'}
      >
        {accepted.length > 0 && (
          <div className="rounded-lg border-2 border-editorial-border px-4 py-3 mb-4 font-body text-sm text-editorial-text-secondary space-y-3">
            {accepted.map((session) => <SessionSummary key={session.id} session={session} />)}
          </div>
        )}
        {declined.length > 0 && (
          <div className="rounded-lg border border-editorial-border px-4 py-3 mb-6 font-body text-sm text-editorial-text-secondary opacity-70 space-y-3">
            <div className="font-semibold">Rifiutate:</div>
            {declined.map((session) => <SessionSummary key={session.id} session={session} />)}
          </div>
        )}
        <Link href={accepted.length > 0 ? resolveCartHref(accepted) : '/account/prenotazioni'} className="btn-primary w-full mt-2 inline-block text-center">
          {accepted.length > 0 ? 'Vai al carrello e completa il checkout' : 'Vai alle tue prenotazioni'}
        </Link>
      </AuthShell>
    )
  }

  if (!invite || invite.state === 'not_found') {
    return (
      <AuthShell eyebrow="Invito" title="Invito non trovato" description="Il link o il codice che hai usato non è valido. Controlla di averlo copiato per intero, oppure chiedi a chi ti ha invitato di controllarlo.">
        <Link href="/invito" className="btn-ghost w-full inline-block text-center">
          Riprova con un altro codice
        </Link>
      </AuthShell>
    )
  }

  if (invite.state === 'expired') {
    return (
      <AuthShell
        eyebrow="Invito"
        title="Invito scaduto"
        description="L'invito non è stato confermato in tempo e i posti sono stati rilasciati. Chiedi a chi ti ha invitato di invitarti di nuovo."
      />
    )
  }

  if (invite.state === 'claimed') {
    const acceptedSessions = (invite.sessions || []).filter((session) => session.accepted)
    const declinedSessions = (invite.sessions || []).filter((session) => !session.accepted)
    return (
      <AuthShell
        eyebrow="Invito"
        title="Invito già utilizzato"
        description="Questo codice è già stato riscattato e non può essere usato di nuovo."
      >
        {acceptedSessions.length > 0 && (
          <div className="rounded-lg border-2 border-editorial-border px-4 py-3 mb-4 font-body text-sm text-editorial-text-secondary space-y-3">
            <div className="font-semibold">Accettate:</div>
            {acceptedSessions.map((session) => <SessionSummary key={session.id} session={session} />)}
          </div>
        )}
        {declinedSessions.length > 0 && (
          <div className="rounded-lg border border-editorial-border px-4 py-3 mb-6 font-body text-sm text-editorial-text-secondary opacity-70 space-y-3">
            <div className="font-semibold">Rifiutate:</div>
            {declinedSessions.map((session) => <SessionSummary key={session.id} session={session} />)}
          </div>
        )}
        <Link href={acceptedSessions.length > 0 ? resolveCartHref(acceptedSessions) : '/account/prenotazioni'} className="btn-primary w-full inline-block text-center">
          Vai alle tue prenotazioni
        </Link>
      </AuthShell>
    )
  }

  const redirectParam = `/invito/${code}`

  return (
    <AuthShell
      eyebrow="Sei stato invitato!"
      title={sessionCount === 1 ? invite.sessions[0].activityTitle : `${sessionCount} sessioni`}
      description={`Scegli a quali sessioni vuoi partecipare.`}
    >
      <AuthMessage type="error">{claimError}</AuthMessage>

      <div className="rounded-lg border-2 border-editorial-border px-4 py-3 mb-4 font-body text-sm text-editorial-text-secondary">
        Il tuo posto è riservato all&apos;email <strong className="text-editorial-text">{invite.email}</strong>. Registrati o accedi con questa email entro la scadenza per scegliere.
      </div>

      <div className="space-y-3 mb-6">
        {(invite.sessions || []).map((session) => (
          <label
            key={session.id}
            className="flex items-start gap-3 rounded-lg border-2 border-editorial-border px-4 py-3 font-body text-sm text-editorial-text-secondary cursor-pointer"
          >
            <input
              type="checkbox"
              className="mt-1"
              checked={selectedIds.has(session.id)}
              onChange={() => toggleSession(session.id)}
            />
            <SessionSummary session={session} />
          </label>
        ))}
      </div>

      {!user ? (
        <div className="space-y-3">
          <Link
            href={`/auth/register?redirect=${encodeURIComponent(redirectParam)}&email=${encodeURIComponent(invite.email)}`}
            className="btn-primary w-full inline-block text-center"
          >
            Registrati per scegliere
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
          {isClaiming ? 'Conferma in corso...' : `Conferma selezione (${selectedIds.size}/${sessionCount})`}
        </button>
      ) : (
        <AuthMessage type="info">
          Sei collegato come {user.email}, ma questo invito è per {invite.email}. Esci e accedi con l&apos;email corretta per scegliere.
        </AuthMessage>
      )}
    </AuthShell>
  )
}
