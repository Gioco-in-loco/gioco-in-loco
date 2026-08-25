'use client'

import { formatInviteDuration } from '../../lib/cart-ui'

function createEmptyCompanion() {
  return { firstName: '', lastName: '', email: '' }
}

export default function CompanionInviteFields({ companions, onChange, maxCount, minutes, className = '' }) {
  const canAddMore = companions.length < maxCount

  const updateCompanion = (index, field, value) => {
    onChange(companions.map((companion, i) => (i === index ? { ...companion, [field]: value } : companion)))
  }

  const removeCompanion = (index) => {
    onChange(companions.filter((_, i) => i !== index))
  }

  const addCompanion = () => {
    if (!canAddMore) return
    onChange([...companions, createEmptyCompanion()])
  }

  if (maxCount <= 0) {
    return null
  }

  return (
    <div className={className}>
      <p className="font-body text-xs font-bold uppercase tracking-wider text-editorial-text-muted">
        Invita amici (opzionale)
      </p>
      <p className="mt-1 font-body text-xs text-editorial-text-secondary">
        Riceveranno una email con un codice per registrarsi e confermare il proprio posto entro {formatInviteDuration(minutes)}. Il loro posto non è incluso nel tuo pagamento.
      </p>

      <div className="mt-3 space-y-3">
        {companions.map((companion, index) => (
          <div key={index} className="flex flex-wrap items-center gap-2 rounded-lg border border-editorial-border p-2">
            <input
              type="text"
              value={companion.firstName}
              onChange={(event) => updateCompanion(index, 'firstName', event.target.value)}
              placeholder="Nome"
              className="input-field flex-1 min-w-[100px]"
            />
            <input
              type="text"
              value={companion.lastName}
              onChange={(event) => updateCompanion(index, 'lastName', event.target.value)}
              placeholder="Cognome"
              className="input-field flex-1 min-w-[100px]"
            />
            <input
              type="email"
              value={companion.email}
              onChange={(event) => updateCompanion(index, 'email', event.target.value)}
              placeholder="Email"
              className="input-field flex-1 min-w-[160px]"
            />
            <button
              type="button"
              onClick={() => removeCompanion(index)}
              className="font-body text-xs font-semibold text-red-600 hover:underline"
            >
              Rimuovi
            </button>
          </div>
        ))}
      </div>

      {canAddMore ? (
        <button
          type="button"
          onClick={addCompanion}
          className="mt-3 font-body text-xs font-semibold text-editorial-terra hover:underline"
        >
          + Aggiungi amico ({companions.length}/{maxCount})
        </button>
      ) : null}
    </div>
  )
}
