'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useToast } from '../../context/ToastContext'

const TYPE_LABELS = {
  oneshot: 'One-shot',
  mainEvent: 'Main Event',
  admission: 'Pass ingresso',
}

const STATUS_LABELS = {
  HOLD: 'In blocco',
  INVITED: 'Invito amico in attesa',
  PENDING: 'In attesa',
  CONFIRMED: 'Confermato',
  CANCELLED: 'Annullato',
  EXPIRED: 'Non confermato',
  ATTENDED: 'Presente',
}

// CANCELLED resta un'azione a parte (pulsante "Annulla prenotazione", con
// motivo obbligatorio e audit trail); HOLD/EXPIRED/INVITED sono stati gestiti
// dal ciclo di vita automatico del carrello, non impostabili a mano.
const EDITABLE_STATUSES = ['PENDING', 'CONFIRMED', 'ATTENDED']

function formatDate(value) {
  if (!value) return '—'
  return new Intl.DateTimeFormat('it-IT', {
    day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit',
  }).format(new Date(value))
}

export default function EventReservationEditPanel({ eventId, eventExternalId, reservationId, type }) {
  const router = useRouter()
  const toast = useToast()

  const [reservation, setReservation] = useState(null)
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState('')

  const [form, setForm] = useState({ playerName: '', playerEmail: '', notes: '', status: '' })
  const [saving, setSaving] = useState(false)

  const [cancelReason, setCancelReason] = useState('')
  const [cancelling, setCancelling] = useState(false)
  const [deleting, setDeleting] = useState(false)

  useEffect(() => {
    let cancelled = false
    if (!eventId || !reservationId || !type) return undefined

    setLoading(true)
    setLoadError('')

    fetch(`/api/admin/eventi/${eventId}/reservations/${reservationId}?type=${type}`)
      .then(async (res) => {
        const data = await res.json().catch(() => ({}))
        if (!res.ok) throw new Error(data.error || 'Prenotazione non trovata.')
        if (cancelled) return
        setReservation(data)
        setForm({
          playerName: data.playerName || '',
          playerEmail: data.playerEmail || '',
          notes: data.notes || '',
          status: EDITABLE_STATUSES.includes(data.status) ? data.status : '',
        })
      })
      .catch((err) => {
        if (!cancelled) setLoadError(err.message || 'Prenotazione non trovata.')
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => { cancelled = true }
  }, [eventId, reservationId, type])

  const handleSave = async (e) => {
    e.preventDefault()
    setSaving(true)
    try {
      const body = { playerName: form.playerName, playerEmail: form.playerEmail }
      if (type !== 'admission') body.notes = form.notes
      if (form.status) body.status = form.status

      const res = await fetch(`/api/admin/eventi/${eventId}/reservations/${reservationId}?type=${type}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.error || 'Modifica non riuscita.')
      setReservation(data)
      toast.success('Modifiche salvate.')
    } catch (err) {
      toast.error(err.message || 'Modifica non riuscita.')
    } finally {
      setSaving(false)
    }
  }

  const handleCancelReservation = async () => {
    if (!cancelReason.trim()) return
    setCancelling(true)
    try {
      const res = await fetch(`/api/admin/eventi/${eventId}/reservations/${reservationId}?type=${type}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cancellationReason: cancelReason.trim() }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.error || 'Annullamento non riuscito.')
      toast.success('Prenotazione annullata.')
      setCancelReason('')
      setReservation((current) => ({ ...current, status: 'CANCELLED' }))
      setForm((current) => ({ ...current, status: '' }))
    } catch (err) {
      toast.error(err.message || 'Annullamento non riuscito.')
    } finally {
      setCancelling(false)
    }
  }

  const handleDelete = async () => {
    const shouldDelete = window.confirm('Eliminare definitivamente questa prenotazione? L\'operazione non è reversibile.')
    if (!shouldDelete) return

    setDeleting(true)
    try {
      const res = await fetch(`/api/admin/eventi/${eventId}/reservations/${reservationId}?type=${type}`, { method: 'DELETE' })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error || 'Eliminazione non riuscita.')
      }
      toast.success('Prenotazione eliminata.')
      router.push(`/admin/eventi/${eventExternalId}?tab=prenotazioni`)
    } catch (err) {
      toast.error(err.message || 'Eliminazione non riuscita.')
      setDeleting(false)
    }
  }

  if (loading) {
    return <p className="font-body text-sm text-editorial-text-muted">Caricamento...</p>
  }

  if (loadError || !reservation) {
    return <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 font-body text-sm text-red-600">{loadError || 'Prenotazione non trovata.'}</p>
  }

  const inputClass = 'w-full rounded-lg border border-editorial-border px-3 py-2 font-body text-sm text-editorial-text outline-none focus:border-editorial-terra focus:ring-2 focus:ring-editorial-terra/10 transition-all'
  const labelClass = 'block font-body text-[11px] font-semibold text-editorial-text-muted uppercase tracking-wider mb-1'
  const slotLabel = [reservation.day, reservation.slotTime].filter(Boolean).join(' · ')

  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-editorial-border bg-white p-6 shadow-soft">
        <p className="font-body text-xs font-semibold uppercase tracking-wider text-editorial-terra">{TYPE_LABELS[reservation.type] || reservation.type}</p>
        <h2 className="mt-1 font-elegant text-2xl font-bold text-editorial-text">{reservation.title}</h2>
        {reservation.subtitle ? <p className="mt-1 font-body text-sm text-editorial-text-secondary">{reservation.subtitle}</p> : null}

        <dl className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-3">
          <div>
            <dt className={labelClass}>Giorno · Fascia</dt>
            <dd className="font-body text-sm text-editorial-text">{slotLabel || '—'}{reservation.table ? ` · ${reservation.table}` : ''}</dd>
          </div>
          <div>
            <dt className={labelClass}>Stato attuale</dt>
            <dd className="font-body text-sm text-editorial-text">{STATUS_LABELS[reservation.status] || reservation.status}</dd>
          </div>
          <div>
            <dt className={labelClass}>Account</dt>
            <dd className="font-body text-sm text-editorial-text">{reservation.accountName || reservation.accountEmail || 'Non ancora registrato'}</dd>
          </div>
          {reservation.invitedByName ? (
            <div>
              <dt className={labelClass}>Invitato da</dt>
              <dd className="font-body text-sm text-editorial-text">{reservation.invitedByName}</dd>
            </div>
          ) : null}
          <div>
            <dt className={labelClass}>Prenotato il</dt>
            <dd className="font-body text-sm text-editorial-text">{formatDate(reservation.createdAt)}</dd>
          </div>
          <div>
            <dt className={labelClass}>Ultima modifica</dt>
            <dd className="font-body text-sm text-editorial-text">{formatDate(reservation.updatedAt)}</dd>
          </div>
        </dl>
      </div>

      <form onSubmit={handleSave} className="space-y-4 rounded-xl border border-editorial-border bg-white p-6 shadow-soft">
        <p className="font-body text-xs font-semibold uppercase tracking-wider text-editorial-terra">Modifica</p>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className={labelClass}>Nome giocatore</label>
            <input className={inputClass} value={form.playerName} onChange={(e) => setForm((c) => ({ ...c, playerName: e.target.value }))} />
          </div>
          <div>
            <label className={labelClass}>Email giocatore</label>
            <input className={inputClass} type="email" value={form.playerEmail} onChange={(e) => setForm((c) => ({ ...c, playerEmail: e.target.value }))} />
          </div>
        </div>

        {type !== 'admission' ? (
          <div>
            <label className={labelClass}>Note</label>
            <textarea className={inputClass} rows={3} value={form.notes} onChange={(e) => setForm((c) => ({ ...c, notes: e.target.value }))} />
          </div>
        ) : null}

        <div className="max-w-xs">
          <label className={labelClass}>Stato</label>
          <select className={inputClass} value={form.status} onChange={(e) => setForm((c) => ({ ...c, status: e.target.value }))}>
            <option value="">Non modificare ({STATUS_LABELS[reservation.status] || reservation.status})</option>
            {EDITABLE_STATUSES.map((status) => (
              <option key={status} value={status}>{STATUS_LABELS[status]}</option>
            ))}
          </select>
        </div>

        <button type="submit" disabled={saving} className="rounded-lg bg-editorial-terra px-4 py-2 font-body text-sm font-semibold text-white transition-colors hover:bg-editorial-terra/90 disabled:cursor-not-allowed disabled:opacity-50">
          {saving ? 'Salvataggio...' : 'Salva modifiche'}
        </button>
      </form>

      <div className="space-y-3 rounded-xl border border-editorial-border bg-white p-6 shadow-soft">
        <p className="font-body text-xs font-semibold uppercase tracking-wider text-editorial-terra">Annulla prenotazione</p>
        <p className="font-body text-xs text-editorial-text-muted">Il motivo sarà visibile all&apos;utente nelle sue prenotazioni.</p>
        <textarea
          value={cancelReason}
          onChange={(e) => setCancelReason(e.target.value)}
          placeholder="Motivo dell'annullamento..."
          rows={2}
          disabled={reservation.status === 'CANCELLED'}
          className={`${inputClass} disabled:cursor-not-allowed disabled:opacity-50`}
        />
        <button
          type="button"
          disabled={cancelling || !cancelReason.trim() || reservation.status === 'CANCELLED'}
          onClick={handleCancelReservation}
          className="rounded-lg border border-editorial-border px-4 py-2 font-body text-sm font-semibold text-editorial-text transition-colors hover:border-editorial-terra disabled:cursor-not-allowed disabled:opacity-40"
        >
          {reservation.status === 'CANCELLED' ? 'Già annullata' : cancelling ? 'Annullo...' : 'Annulla prenotazione'}
        </button>
      </div>

      <div className="space-y-3 rounded-xl border border-red-200 bg-red-50/40 p-6">
        <p className="font-body text-xs font-semibold uppercase tracking-wider text-red-600">Elimina definitivamente</p>
        <p className="font-body text-xs text-editorial-text-muted">Rimuove il record dal database. Diverso da &quot;Annulla&quot;: non lascia traccia nello storico dell&apos;utente.</p>
        <button
          type="button"
          disabled={deleting}
          onClick={handleDelete}
          className="rounded-lg bg-red-600 px-4 py-2 font-body text-sm font-semibold text-white transition-colors hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {deleting ? 'Elimino...' : 'Elimina definitivamente'}
        </button>
      </div>
    </div>
  )
}
