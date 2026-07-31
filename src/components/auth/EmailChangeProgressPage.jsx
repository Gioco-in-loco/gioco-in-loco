'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import AuthShell from './AuthShell'
import { useAuth } from '../../context/AuthContext'
import { createSupabaseBrowserClient } from '../../lib/supabase/browser'

export default function EmailChangeProgressPage() {
  const searchParams = useSearchParams()
  const { refreshUser } = useAuth()
  const status = searchParams.get('status') || 'pending'
  const to = searchParams.get('to') || ''
  const [refreshed, setRefreshed] = useState(false)

  useEffect(() => {
    if (status !== 'done') return
    let cancelled = false
    const supabase = createSupabaseBrowserClient()
    supabase.auth.refreshSession().finally(() => {
      if (cancelled) return
      refreshUser().finally(() => {
        if (!cancelled) setRefreshed(true)
      })
    })
    return () => { cancelled = true }
  }, [status, refreshUser])

  if (status === 'done') {
    return (
      <AuthShell
        eyebrow="Cambio email"
        title="Email aggiornata!"
        description="Il tuo nuovo indirizzo email è ora attivo. Da adesso lo userai per accedere al tuo account."
      >
        <div className="text-center mb-6">
          <div className="w-20 h-20 mx-auto rounded-full bg-emerald-50 border-2 border-emerald-200 flex items-center justify-center mb-5 text-emerald-500">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="w-10 h-10">
              <polyline points="20 6 9 17 4 12" />
            </svg>
          </div>
          {!refreshed && (
            <p className="font-body text-xs text-editorial-text-muted">Sincronizzazione sessione...</p>
          )}
        </div>

        <Link
          href="/account/profilo"
          className="block w-full text-center rounded-lg bg-editorial-terra px-5 py-3 font-body font-semibold text-white hover:bg-editorial-terra/90 hover:scale-[1.02] transition-all"
        >
          Vai al tuo account
        </Link>
      </AuthShell>
    )
  }

  if (status === 'sent') {
    return (
      <AuthShell
        eyebrow="Cambio email"
        title="Richiesta inviata"
        description="Abbiamo avviato il cambio email. Ora devi completare due conferme distinte prima che il nuovo indirizzo diventi attivo."
      >
        <div className="rounded-xl border-2 border-editorial-terra/30 bg-editorial-terra/5 px-4 py-4 mb-6 space-y-3">
          <p className="font-body text-sm text-editorial-text-secondary leading-relaxed">
            Nuovo indirizzo richiesto: <strong className="text-editorial-text break-all">{to || 'non disponibile'}</strong>
          </p>
          <p className="font-body text-sm text-editorial-text-secondary leading-relaxed">
            Passo 1: apri l&apos;email inviata al tuo indirizzo attuale e autorizza il cambio.
          </p>
          <p className="font-body text-sm text-editorial-text-secondary leading-relaxed">
            Passo 2: apri l&apos;email inviata al nuovo indirizzo e conferma che ne hai accesso.
          </p>
          <p className="font-body text-xs text-editorial-text-muted leading-relaxed">
            Dopo il primo click verrai riportato qui con stato intermedio. Dopo il secondo click il cambio sarà completato e potrai accedere con la nuova email.
          </p>
        </div>

        <div className="flex flex-col gap-3">
          <Link
            href="/account/profilo"
            className="block w-full text-center rounded-lg bg-editorial-terra px-5 py-3 font-body font-semibold text-white hover:bg-editorial-terra/90 hover:scale-[1.02] transition-all"
          >
            Torna al tuo account
          </Link>
          <p className="text-center font-body text-xs text-editorial-text-muted">
            Se hai cambiato idea, puoi annullare il processo dalla sezione account finché il cambio è in corso.
          </p>
        </div>
      </AuthShell>
    )
  }

  return (
    <AuthShell
      eyebrow="Cambio email"
      title="Primo passaggio completato"
      description="Una delle due conferme è stata registrata. Per completare il cambio email manca ancora l&apos;altro link."
    >
      <div className="text-center mb-6">
        <div className="w-20 h-20 mx-auto rounded-full bg-editorial-terra/10 border-2 border-editorial-terra/30 flex items-center justify-center mb-5 text-editorial-terra">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="w-10 h-10">
            <circle cx="12" cy="12" r="10" />
            <polyline points="12 6 12 12 16 14" />
          </svg>
        </div>
        {to && (
          <p className="font-body text-sm text-editorial-text-secondary leading-relaxed">
            Cambio in corso verso <strong className="text-editorial-text break-all">{to}</strong>.
          </p>
        )}
        <p className="mt-3 font-body text-sm text-editorial-text-secondary leading-relaxed">
          Apri l&apos;altra email che hai ricevuto e clicca il link al suo interno. Il cambio sarà effettivo solo dopo entrambe le conferme.
        </p>
      </div>

      <div className="rounded-xl border-2 border-editorial-border bg-editorial-bg/40 px-4 py-3 mb-6">
        <p className="font-body text-xs text-editorial-text-muted leading-relaxed">
          Ricevi due email: una al vecchio indirizzo per autorizzare il cambio e una al nuovo per verificarne il possesso. Entrambe sono necessarie per sicurezza.
        </p>
      </div>

      <Link
        href="/account/profilo"
        className="block w-full text-center rounded-lg border-2 border-editorial-border px-5 py-3 font-body font-semibold text-editorial-text hover:border-editorial-terra hover:text-editorial-terra transition-colors"
      >
        Torna al tuo account
      </Link>
    </AuthShell>
  )
}
