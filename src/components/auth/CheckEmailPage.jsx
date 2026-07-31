'use client'

import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import AuthShell from './AuthShell'

export default function CheckEmailPage() {
  const searchParams = useSearchParams()
  const email = searchParams.get('email') || ''

  return (
    <AuthShell
      eyebrow="Conferma email"
      title="Controlla la tua casella"
      description="Ti abbiamo inviato un link per attivare il tuo account."
      footer={<span>Hai sbagliato indirizzo? <Link href="/auth/register" className="text-editorial-terra hover:underline font-semibold">Registrati di nuovo</Link></span>}
    >
      <div className="text-center mb-6">
        <div className="w-20 h-20 mx-auto rounded-2xl bg-editorial-terra/10 border-2 border-editorial-terra/30 flex items-center justify-center mb-5 text-editorial-terra">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="w-10 h-10">
            <rect x="3" y="5" width="18" height="14" rx="2" />
            <path d="m3 7 9 6 9-6" />
          </svg>
        </div>
        {email ? (
          <p className="font-body text-sm text-editorial-text-secondary leading-relaxed">
            Abbiamo inviato un link di attivazione a{' '}
            <strong className="text-editorial-text break-all">{email}</strong>.
          </p>
        ) : (
          <p className="font-body text-sm text-editorial-text-secondary leading-relaxed">
            Abbiamo inviato un link di attivazione al tuo indirizzo email.
          </p>
        )}
        <p className="mt-3 font-body text-sm text-editorial-text-secondary leading-relaxed">
          Clicca il link per confermare la registrazione e accedere al tuo account.
        </p>
      </div>

      <div className="rounded-xl border-2 border-editorial-border bg-editorial-bg/40 px-4 py-3 mb-6">
        <p className="font-body text-xs text-editorial-text-muted leading-relaxed">
          Non vedi l&apos;email? Controlla la cartella <strong>Spam</strong> o <strong>Promozioni</strong>. Il link è valido per le prossime ore.
        </p>
      </div>

      <Link
        href="/auth/login"
        className="block w-full text-center rounded-lg border-2 border-editorial-border px-5 py-3 font-body font-semibold text-editorial-text hover:border-editorial-terra hover:text-editorial-terra transition-colors"
      >
        Vai al login
      </Link>
    </AuthShell>
  )
}
