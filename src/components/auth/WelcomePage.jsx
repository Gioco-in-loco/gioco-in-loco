'use client'

import Link from 'next/link'
import AuthShell from './AuthShell'
import { useAuth } from '../../context/AuthContext'
import { useNotice } from '../../hooks/useNotice'

export default function WelcomePage() {
  const { user } = useAuth()
  useNotice()

  const firstName = user?.name?.split(' ')[0] || null

  return (
    <AuthShell
      eyebrow="Account attivato"
      title={firstName ? `Benvenuto, ${firstName}!` : 'Benvenuto!'}
      description="La tua registrazione è completata. Ora puoi prenotare sessioni, salvare i tuoi giochi preferiti e seguire gli eventi."
    >
      <div className="text-center mb-6">
        <div className="w-20 h-20 mx-auto rounded-full bg-emerald-50 border-2 border-emerald-200 flex items-center justify-center mb-5 text-emerald-500">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="w-10 h-10">
            <polyline points="20 6 9 17 4 12" />
          </svg>
        </div>
      </div>

      <Link
        href="/account"
        className="block w-full text-center rounded-lg bg-editorial-terra px-5 py-3 font-body font-semibold text-white hover:bg-editorial-terra/90 hover:scale-[1.02] transition-all"
      >
        Vai al tuo account
      </Link>
    </AuthShell>
  )
}
