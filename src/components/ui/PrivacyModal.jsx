'use client'

import { useEffect } from 'react'

export default function PrivacyModal({ onClose }) {
  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onClose])

  return (
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center bg-black/50 px-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-xl border-2 border-editorial-border shadow-soft-lg w-full max-w-lg max-h-[80vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-editorial-border">
          <div>
            <p className="font-body text-[11px] uppercase tracking-widest text-editorial-terra font-semibold mb-1">Privacy</p>
            <h2 className="font-elegant text-xl text-editorial-text font-bold">Informativa privacy</h2>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-lg text-editorial-text-muted hover:bg-editorial-bg transition-colors"
            aria-label="Chiudi"
          >
            ✕
          </button>
        </div>
        <div className="overflow-y-auto px-6 py-5 space-y-4 font-body text-sm text-editorial-text-secondary leading-relaxed">
          <p>
            Usiamo i dati del tuo account solo per farti accedere al sito in sicurezza, aiutarti a recuperare l&apos;accesso se necessario, gestire il tuo profilo e permetterti di usare le funzioni collegate a eventi e prenotazioni.
          </p>
          <p>
            Le informazioni piu sensibili, come password, accesso, cambio email e recupero account, vengono trattate con procedure di sicurezza dedicate. La tua password non viene mai salvata in modo leggibile.
          </p>
          <p>
            I dati che inserisci o aggiorni nel profilo, come nome, telefono ed email, servono solo per identificare correttamente il tuo account e permetterti di gestirlo in autonomia.
          </p>
          <p>
            Quando accetti l&apos;informativa privacy durante la registrazione, conserviamo la data dell&apos;accettazione e la versione del testo mostrato in quel momento.
          </p>
          <p>
            Per capire se il sito viene usato e quali pagine sono piu utili, raccogliamo alcune statistiche anonime come visite, pagine aperte e tipo di dispositivo. Questi dati servono solo a contare l&apos;utilizzo del sito e non a riconoscerti come persona.
          </p>
          <p>
            Non vendiamo i tuoi dati, non li usiamo per pubblicita e non li cediamo a terzi per finalita di marketing. Li usiamo solo per far funzionare correttamente il servizio.
          </p>
          <p>
            Se vuoi aggiornare o cancellare i tuoi dati, puoi farlo dalle funzioni disponibili nel tuo account oppure contattandoci tramite i riferimenti presenti sul sito, nei limiti previsti dalla legge e dalle esigenze di sicurezza del servizio.
          </p>
        </div>
        <div className="px-6 py-4 border-t border-editorial-border">
          <button
            onClick={onClose}
            className="w-full py-2.5 bg-editorial-terra text-white rounded-lg font-body text-sm font-semibold hover:bg-editorial-terra/90 transition-colors"
          >
            Ho capito, chiudi
          </button>
        </div>
      </div>
    </div>
  )
}