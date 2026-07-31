'use client'

import Link from 'next/link'
import { useState } from 'react'
import { useToast } from '../../context/ToastContext'

const CATEGORIES = [
  { value: 'feedback', label: 'Feedback sul sito o sugli eventi' },
  { value: 'info', label: 'Informazioni generali' },
  { value: 'collaborazione', label: 'Proposta di collaborazione' },
  { value: 'segnalazione', label: 'Segnalazione di un problema' },
  { value: 'altro', label: 'Altro' },
]

const INITIAL_STATE = {
  name: '',
  email: '',
  category: 'feedback',
  message: '',
  consent: false,
  website: '', // honeypot
}

export default function ContattaciPage() {
  const toast = useToast()
  const [form, setForm] = useState(INITIAL_STATE)
  const [errors, setErrors] = useState({})
  const [submitting, setSubmitting] = useState(false)
  const [sent, setSent] = useState(false)

  const update = (key) => (e) => {
    const value = e.target.type === 'checkbox' ? e.target.checked : e.target.value
    setForm((current) => ({ ...current, [key]: value }))
    if (errors[key]) {
      setErrors((current) => ({ ...current, [key]: undefined }))
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (submitting) return
    setSubmitting(true)
    setErrors({})

    try {
      const response = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      const payload = await response.json().catch(() => ({}))

      if (!response.ok) {
        if (payload?.fieldErrors) {
          setErrors(payload.fieldErrors)
        }
        throw new Error(payload?.error || 'Invio non riuscito.')
      }

      setSent(true)
      setForm(INITIAL_STATE)
      toast.success('Messaggio inviato. Ti risponderemo al più presto.')
    } catch (err) {
      toast.error(err.message || 'Invio non riuscito.')
    } finally {
      setSubmitting(false)
    }
  }

  const messageLength = form.message.length

  return (
    <section className="px-5 py-12 sm:py-16 md:px-8 lg:px-10">
      <div className="mx-auto max-w-5xl">
        {/* Header */}
        <header className="max-w-2xl">
          <p className="font-body text-xs font-semibold uppercase tracking-[0.22em] text-editorial-terra">Contatti</p>
          <h1 className="mt-2 font-elegant text-4xl font-bold leading-tight text-editorial-text sm:text-5xl">
            Scrivici due righe
          </h1>
          <p className="mt-3 font-body text-[15px] leading-relaxed text-editorial-text-secondary">
            Domande, feedback, proposte di collaborazione: questo è il canale diretto con il collettivo <strong className="font-semibold text-editorial-text">Gioco In Loco</strong>. Ti rispondiamo via email in pochi giorni.
          </p>
        </header>

        <div className="mt-10 grid gap-6 lg:grid-cols-[1fr_1.4fr]">
          {/* INFO SIDEBAR */}
          <aside className="space-y-4">
            <div className="rounded-2xl border border-editorial-border bg-white p-5 shadow-soft">
              <p className="font-body text-[10px] font-bold uppercase tracking-[0.22em] text-editorial-text-muted">Tempi di risposta</p>
              <p className="mt-1.5 font-elegant text-lg font-bold text-editorial-text">2-5 giorni lavorativi</p>
              <p className="mt-1 font-body text-xs leading-relaxed text-editorial-text-secondary">
                Siamo un collettivo di volontari: risponderemo appena possibile.
              </p>
            </div>

            <div className="rounded-2xl border border-editorial-border bg-white p-5 shadow-soft">
              <p className="font-body text-[10px] font-bold uppercase tracking-[0.22em] text-editorial-text-muted">Vuoi conoscerci?</p>
              <p className="mt-1.5 font-body text-sm leading-relaxed text-editorial-text-secondary">
                Scopri le associazioni che fanno parte del collettivo e i nostri prossimi eventi.
              </p>
              <div className="mt-3 flex flex-col gap-2">
                <Link href="/chi-siamo" className="font-body text-sm font-semibold text-editorial-terra hover:underline">
                  → Chi siamo
                </Link>
                <Link href="/dice-fest" className="font-body text-sm font-semibold text-editorial-terra hover:underline">
                  → DICE FEST
                </Link>
              </div>
            </div>

            <div className="rounded-2xl border border-editorial-gold/40 bg-editorial-gold/10 p-5">
              <p className="font-body text-[10px] font-bold uppercase tracking-[0.22em] text-editorial-text-muted">Cosa non scrivere qui</p>
              <p className="mt-1.5 font-body text-xs leading-relaxed text-editorial-text-secondary">
                Per cancellare una prenotazione usa l&apos;area <Link href="/account/bookings" className="font-semibold text-editorial-terra hover:underline">Le mie prenotazioni</Link>. Questo modulo è solo per comunicazioni al collettivo.
              </p>
            </div>
          </aside>

          {/* FORM */}
          <form
            onSubmit={handleSubmit}
            className="rounded-2xl border border-editorial-border bg-white p-6 shadow-soft sm:p-8"
            noValidate
          >
            {sent ? (
              <div className="text-center">
                <div className="mx-auto inline-flex h-16 w-16 items-center justify-center rounded-full bg-editorial-forest/15 text-editorial-forest">
                  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M4 12.5l5 5L20 6.5" />
                  </svg>
                </div>
                <h2 className="mt-4 font-elegant text-2xl font-bold text-editorial-text">Messaggio inviato</h2>
                <p className="mt-2 font-body text-sm leading-relaxed text-editorial-text-secondary">
                  Grazie per averci scritto. Riceverai una risposta all&apos;indirizzo email che hai indicato.
                </p>
                <button
                  type="button"
                  onClick={() => setSent(false)}
                  className="btn-ghost-fantasy mt-6"
                >
                  Scrivi un altro messaggio
                </button>
              </div>
            ) : (
              <>
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field label="Argomento" error={errors.category} required>
                    <select
                      value={form.category}
                      onChange={update('category')}
                      className="form-input"
                      required
                    >
                      {CATEGORIES.map((cat) => (
                        <option key={cat.value} value={cat.value}>{cat.label}</option>
                      ))}
                    </select>
                  </Field>

                  <Field label="Nome" error={errors.name} required>
                    <input
                      type="text"
                      value={form.name}
                      onChange={update('name')}
                      className="form-input"
                      placeholder="Il tuo nome"
                      maxLength={120}
                      required
                    />
                  </Field>

                  <Field label="Email" error={errors.email} className="sm:col-span-2" required>
                    <input
                      type="email"
                      value={form.email}
                      onChange={update('email')}
                      className="form-input"
                      placeholder="nome@esempio.it"
                      maxLength={200}
                      autoComplete="email"
                      required
                    />
                  </Field>

                  <Field
                    label="Messaggio"
                    error={errors.message}
                    className="sm:col-span-2"
                    required
                    hint={`${messageLength}/4000`}
                  >
                    <textarea
                      value={form.message}
                      onChange={update('message')}
                      className="form-input min-h-[160px] resize-y"
                      placeholder="Raccontaci con calma..."
                      maxLength={4000}
                      required
                    />
                  </Field>
                </div>

                {/* Honeypot — hidden from users via CSS */}
                <div className="absolute -left-[9999px] h-0 overflow-hidden" aria-hidden="true">
                  <label>
                    Non compilare questo campo
                    <input
                      type="text"
                      tabIndex={-1}
                      autoComplete="off"
                      value={form.website}
                      onChange={update('website')}
                    />
                  </label>
                </div>

                <label className="mt-5 flex items-start gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={form.consent}
                    onChange={update('consent')}
                    className="mt-0.5 h-4 w-4 cursor-pointer accent-editorial-terra"
                    required
                  />
                  <span className="font-body text-xs leading-relaxed text-editorial-text-secondary">
                    Acconsento al trattamento dei dati per ricevere una risposta. Leggi la nostra <Link href="/privacy" className="font-semibold text-editorial-terra hover:underline">informativa privacy</Link>.
                  </span>
                </label>
                {errors.consent ? (
                  <p className="mt-1 font-body text-xs font-semibold text-red-600">{errors.consent}</p>
                ) : null}

                <button
                  type="submit"
                  disabled={submitting}
                  className="btn-wax mt-6 w-full sm:w-auto"
                >
                  {submitting ? 'Invio in corso…' : 'Invia messaggio'}
                </button>
              </>
            )}
          </form>
        </div>
      </div>
    </section>
  )
}

function Field({ label, error, required, hint, className = '', children }) {
  return (
    <label className={`block ${className}`}>
      <div className="flex items-baseline justify-between gap-2">
        <span className="font-body text-xs font-bold uppercase tracking-[0.16em] text-editorial-text-muted">
          {label}{required ? <span className="text-editorial-terra"> *</span> : null}
        </span>
        {hint ? <span className="font-body text-[10px] text-editorial-text-muted">{hint}</span> : null}
      </div>
      <div className="mt-1.5">{children}</div>
      {error ? (
        <p className="mt-1 font-body text-xs font-semibold text-red-600">{error}</p>
      ) : null}
    </label>
  )
}
