'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import AuthMessage from './AuthMessage'
import PasswordInput from './PasswordInput'
import SuccessOverlay from './SuccessOverlay'
import { useAuth } from '../../context/AuthContext'
import { useToast } from '../../context/ToastContext'
import { useNotice } from '../../hooks/useNotice'
import PrivacyModal from '../ui/PrivacyModal'
import TutorialPopup from '../tutorial/TutorialPopup'
import { NICKNAME_RE } from '../../lib/nicknames'

const PROFILE_TUTORIAL_SLIDES = [
  {
    title: 'Tre sezioni per il tuo account',
    description: 'La pagina profilo è divisa in tre schede: Profilo, Sicurezza e Account.',
    illustration: { type: 'cards', items: [{ label: 'Profilo' }, { label: 'Sicurezza' }, { label: 'Account' }], highlightIndex: -1 },
  },
  {
    title: 'Profilo',
    description: 'Qui aggiorni nome e telefono, e puoi richiedere il cambio email.',
    illustration: { type: 'cards', items: [{ label: 'Profilo' }, { label: 'Sicurezza' }, { label: 'Account' }], highlightIndex: 0 },
  },
  {
    title: 'Sicurezza',
    description: 'Qui puoi impostare una nuova password per il tuo account.',
    illustration: { type: 'cards', items: [{ label: 'Profilo' }, { label: 'Sicurezza' }, { label: 'Account' }], highlightIndex: 1 },
  },
  {
    title: 'Account',
    description: 'Qui trovi le informazioni del tuo account e, se necessario, puoi eliminarlo definitivamente.',
    illustration: { type: 'cards', items: [{ label: 'Profilo' }, { label: 'Sicurezza' }, { label: 'Account' }], highlightIndex: 2 },
  },
]

const PHONE_RE = /^[+\d][\d\s]{6,}$/

const ROLE_LABELS = {
  RESPONSABILE: { label: 'Responsabile', color: 'bg-editorial-forest text-white' },
  USER: { label: 'Utente', color: 'bg-editorial-border text-editorial-text-muted' },
}

function RoleBadge({ role, isAdmin }) {
  const config = ROLE_LABELS[(role || 'USER').toUpperCase()] || ROLE_LABELS.USER
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className={`inline-block px-2.5 py-0.5 rounded-full font-body text-xs font-semibold ${config.color}`}>
        {config.label}
      </span>
      {isAdmin && (
        <span className="inline-block px-2.5 py-0.5 rounded-full font-body text-xs font-semibold bg-editorial-terra text-white">
          Amministratore
        </span>
      )}
    </span>
  )
}

function Avatar({ name, email }) {
  const initial = (name || email || '?')[0].toUpperCase()
  return (
    <div className="w-16 h-16 rounded-2xl bg-editorial-terra border-2 border-editorial-border shadow-[3px_3px_0px_0px_#1A1A2E] flex items-center justify-center flex-shrink-0">
      <span className="font-elegant text-2xl text-white leading-none">{initial}</span>
    </div>
  )
}

function DeleteModal({ onConfirm, onClose, isDeleting, error }) {
  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape' && !isDeleting) onClose() }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [isDeleting, onClose])

  return (
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center bg-black/60 px-4"
      onClick={() => { if (!isDeleting) onClose() }}
    >
      <div
        className="bg-white rounded-xl border-2 border-red-200 shadow-soft-lg w-full max-w-sm p-7"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="w-10 h-10 rounded-xl bg-red-50 border-2 border-red-200 flex items-center justify-center mb-4 text-red-500 font-bold">!</div>
        <h2 className="font-elegant text-xl text-editorial-text font-bold mb-2">Elimina il tuo account</h2>
        <p className="font-body text-sm text-editorial-text-secondary leading-relaxed mb-3">
          Operazione <strong>irreversibile</strong>. Verranno eliminati:
        </p>
        <ul className="space-y-1.5 mb-5 font-body text-sm text-editorial-text-secondary">
          {['Profilo e dati personali', 'Tutte le prenotazioni', "Accesso all'account"].map((item) => (
            <li key={item} className="flex items-center gap-2">
              <span className="text-red-400 font-bold text-base leading-none">×</span> {item}
            </li>
          ))}
        </ul>
        {error && <AuthMessage type="error">{error}</AuthMessage>}
        <div className="flex gap-2.5">
          <button
            onClick={onClose}
            disabled={isDeleting}
            className="flex-1 py-2.5 rounded-lg border-2 border-editorial-border font-body text-sm font-semibold text-editorial-text hover:border-editorial-terra hover:text-editorial-terra transition-colors disabled:opacity-60"
          >
            Annulla
          </button>
          <button
            onClick={onConfirm}
            disabled={isDeleting}
            className="flex-1 py-2.5 rounded-lg bg-red-500 border-2 border-red-600 font-body text-sm font-semibold text-white hover:bg-red-600 transition-colors disabled:opacity-60"
          >
            {isDeleting ? 'Eliminazione...' : 'Elimina'}
          </button>
        </div>
      </div>
    </div>
  )
}

const TABS = [
  { id: 'profile', label: 'Profilo' },
  { id: 'security', label: 'Sicurezza' },
  { id: 'account', label: 'Account' },
]

export default function AccountPage() {
  const router = useRouter()
  const { user, logout, updatePassword, updateProfile, updateEmail, cancelEmailChange, deleteAccount } = useAuth()
  const toast = useToast()
  useNotice()
  const [activeTab, setActiveTab] = useState('profile')
  const [passwordSuccess, setPasswordSuccess] = useState(false)

  // Profile
  const [fullName, setFullName] = useState('')
  const [nickname, setNickname] = useState('')
  const [nicknameTouched, setNicknameTouched] = useState(false)
  const [nicknameAvailability, setNicknameAvailability] = useState({ checking: false, available: null, error: '' })
  const [phone, setPhone] = useState('')
  const [phoneTouched, setPhoneTouched] = useState(false)
  const [profileState, setProfileState] = useState({ saving: false, error: '', success: '' })

  // Email (collapsed by default)
  const [emailOpen, setEmailOpen] = useState(false)
  const [newEmail, setNewEmail] = useState('')
  const [emailState, setEmailState] = useState({ saving: false, error: '', success: '' })
  const [cancelingEmail, setCancelingEmail] = useState(false)

  // Password
  const [password, setPassword] = useState('')
  const [passwordTouched, setPasswordTouched] = useState(false)
  const [confirmPassword, setConfirmPassword] = useState('')
  const [confirmTouched, setConfirmTouched] = useState(false)
  const [passwordState, setPasswordState] = useState({ saving: false, error: '', success: '' })

  // Delete
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [deleteError, setDeleteError] = useState('')
  const [showPrivacy, setShowPrivacy] = useState(false)

  useEffect(() => {
    if (user) {
      setFullName(user.name || '')
      setNickname(user.nickname || '')
      setPhone(user.phone || '')
    }
  }, [user])

  useEffect(() => {
    const trimmed = nickname.trim()

    // Non ricontrollare la disponibilità se non è cambiato rispetto al
    // proprio nickname attuale: risulterebbe sempre "in uso" (da se stessi).
    if (!trimmed || trimmed.toLowerCase() === (user?.nickname || '').toLowerCase() || !NICKNAME_RE.test(trimmed)) {
      setNicknameAvailability({ checking: false, available: null, error: '' })
      return undefined
    }

    let cancelled = false
    setNicknameAvailability({ checking: true, available: null, error: '' })

    const timeout = setTimeout(() => {
      fetch(`/api/auth/nickname-available?nickname=${encodeURIComponent(trimmed)}`)
        .then((res) => res.json())
        .then((data) => {
          if (cancelled) return
          setNicknameAvailability({ checking: false, available: Boolean(data.available), error: data.available === false && data.error ? data.error : '' })
        })
        .catch(() => { if (!cancelled) setNicknameAvailability({ checking: false, available: null, error: '' }) })
    }, 400)

    return () => { cancelled = true; clearTimeout(timeout) }
  }, [nickname, user?.nickname])

  const passwordHint = passwordTouched && password.length > 0 && password.length < 8
    ? `Ancora ${8 - password.length} caratteri` : ''
  const confirmError = confirmTouched && confirmPassword.length > 0 && password !== confirmPassword
    ? 'Le password non coincidono.' : ''
  const isPasswordFormValid = password.length >= 8 && password === confirmPassword
  const nicknameChanged = nickname.trim().toLowerCase() !== (user?.nickname || '').toLowerCase()
  const profileChanged = fullName !== (user?.name || '') || phone !== (user?.phone || '') || nicknameChanged
  const phoneError = phoneTouched && phone && !PHONE_RE.test(phone.trim()) ? 'Inserisci un numero di telefono valido.' : ''
  const nicknameFormatError = nicknameTouched && nickname && !NICKNAME_RE.test(nickname.trim())
    ? 'Il nickname deve avere tra 3 e 20 caratteri (lettere, numeri, spazi, - o _).'
    : ''
  const isNicknameFormValid = NICKNAME_RE.test(nickname.trim()) && (!nicknameChanged || nicknameAvailability.available === true)
  const isProfileFormValid = PHONE_RE.test(phone.trim()) && isNicknameFormValid

  const handleProfileSave = async (e) => {
    e.preventDefault()
    setPhoneTouched(true)
    setNicknameTouched(true)
    if (!isProfileFormValid) return
    setProfileState({ saving: true, error: '', success: '' })
    const result = await updateProfile({ fullName, nickname: nicknameChanged ? nickname.trim() : undefined, phone: phone.trim() })
    setProfileState(result.error
      ? { saving: false, error: result.error, success: '' }
      : { saving: false, error: '', success: 'Salvato.' }
    )
  }

  const handleEmailSave = async (e) => {
    e.preventDefault()
    setEmailState({ saving: true, error: '', success: '' })
    const requestedEmail = newEmail
    const result = await updateEmail(newEmail)
    if (result.error) {
      setEmailState({ saving: false, error: result.error, success: '' })
    } else {
      setNewEmail('')
      setEmailOpen(false)
      setEmailState({ saving: false, error: '', success: '' })
      router.push(`/auth/email-change-progress?status=sent&to=${encodeURIComponent(requestedEmail)}`)
    }
  }

  const handlePasswordSave = async (e) => {
    e.preventDefault()
    setPasswordTouched(true)
    setConfirmTouched(true)
    if (!isPasswordFormValid) return
    setPasswordState({ saving: true, error: '', success: '' })
    const result = await updatePassword(password)
    if (result.error) {
      setPasswordState({ saving: false, error: result.error, success: '' })
    } else {
      setPassword('')
      setConfirmPassword('')
      setPasswordTouched(false)
      setConfirmTouched(false)
      setPasswordState({ saving: false, error: '', success: '' })
      setPasswordSuccess(true)
    }
  }

  const handleDeleteConfirm = async () => {
    setIsDeleting(true)
    setDeleteError('')
    const result = await deleteAccount()
    if (result.error) {
      setIsDeleting(false)
      setDeleteError(result.error)
      return
    }
    router.replace('/')
    router.refresh()
  }

  const handleLogout = async () => {
    await logout()
  }

  return (
    <>
      {showDeleteModal && (
        <DeleteModal
          onConfirm={handleDeleteConfirm}
          onClose={() => { setShowDeleteModal(false); setDeleteError('') }}
          isDeleting={isDeleting}
          error={deleteError}
        />
      )}

      {showPrivacy && <PrivacyModal onClose={() => setShowPrivacy(false)} />}

      {passwordSuccess && (
        <SuccessOverlay
          title="Password aggiornata"
          description="La tua password è stata cambiata con successo."
          ctaLabel="Chiudi"
          onCta={() => setPasswordSuccess(false)}
        />
      )}

      <section className="min-h-[calc(100vh-4rem)] px-4 py-12 energized-bg">
        <div className="absolute inset-0 dice-pattern-energized opacity-30 pointer-events-none pattern-drift" />

        <div className="relative w-full max-w-md mx-auto space-y-4">

          {/* Identity card */}
          <div className="card-surface p-6">
            <div className="flex items-center gap-4">
              <Avatar name={user?.name} email={user?.email} />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="font-elegant text-xl text-editorial-text font-bold leading-tight truncate">
                    {user?.name || 'Il tuo account'}
                  </p>
                  <TutorialPopup label="Profilo" slides={PROFILE_TUTORIAL_SLIDES} />
                  <RoleBadge role={user?.role} isAdmin={user?.isAdmin} />
                </div>
                <p className="font-body text-sm text-editorial-text-muted mt-0.5 truncate">{user?.email}</p>
              </div>
              <button
                onClick={handleLogout}
                className="flex-shrink-0 font-body text-xs font-semibold text-editorial-text-muted hover:text-editorial-terra transition-colors px-1"
              >
                Esci
              </button>
            </div>
          </div>

          {/* Tabs */}
          <div className="flex gap-1 rounded-xl border-2 border-editorial-border bg-white p-1 shadow-soft-md">
            {TABS.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex-1 py-2 rounded-lg font-body text-sm font-semibold transition-all ${
                  activeTab === tab.id
                    ? 'bg-editorial-terra text-white shadow-[2px_2px_0px_0px_#1A1A2E]'
                    : 'text-editorial-text-muted hover:text-editorial-text'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Tab: Profilo */}
          {activeTab === 'profile' && (
            <div className="card-surface p-6 space-y-6">

              {/* Name + phone */}
              <div>
                <h2 className="font-body text-xs uppercase tracking-widest text-editorial-terra font-semibold mb-4">Dati personali</h2>
                <AuthMessage type="error">{profileState.error}</AuthMessage>
                <AuthMessage type="success">{profileState.success}</AuthMessage>
                <form className="space-y-3" onSubmit={handleProfileSave}>
                  <div>
                    <label className="block mb-1.5 font-body text-sm text-editorial-text font-semibold">Nome e cognome</label>
                    <input
                      type="text"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      autoComplete="name"
                      placeholder="Mario Rossi"
                      className="input-field"
                    />
                  </div>
                  <div>
                    <label className="block mb-1.5 font-body text-sm text-editorial-text font-semibold">Nickname</label>
                    <input
                      type="text"
                      value={nickname}
                      onChange={(e) => setNickname(e.target.value)}
                      onBlur={() => setNicknameTouched(true)}
                      autoComplete="off"
                      placeholder="Il nome che vedranno gli altri giocatori"
                      className={`input-field ${nicknameFormatError || nicknameAvailability.available === false ? 'input-field--error' : ''}`}
                    />
                    {nicknameFormatError && <p className="mt-1.5 font-body text-xs text-red-500">{nicknameFormatError}</p>}
                    {!nicknameFormatError && nicknameAvailability.checking && (
                      <p className="mt-1.5 font-body text-xs text-editorial-text-muted">Controllo disponibilità...</p>
                    )}
                    {!nicknameFormatError && !nicknameAvailability.checking && nicknameAvailability.available === false && (
                      <p className="mt-1.5 font-body text-xs text-red-500">{nicknameAvailability.error || 'Nickname già in uso.'}</p>
                    )}
                    {!nicknameFormatError && !nicknameAvailability.checking && nicknameChanged && nicknameAvailability.available === true && (
                      <p className="mt-1.5 font-body text-xs text-editorial-forest">Nickname disponibile.</p>
                    )}
                  </div>
                  <div>
                    <label className="block mb-1.5 font-body text-sm text-editorial-text font-semibold">Telefono</label>
                    <input
                      type="tel"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      onBlur={() => setPhoneTouched(true)}
                      required
                      autoComplete="tel"
                      placeholder="+39 333 000 0000"
                      className={`input-field ${phoneError ? 'input-field--error' : ''}`}
                    />
                    {phoneError && <p className="mt-1.5 font-body text-xs text-red-500">{phoneError}</p>}
                  </div>
                  <button
                    type="submit"
                    disabled={profileState.saving || !profileChanged || !isProfileFormValid}
                    className="btn-primary"
                  >
                    {profileState.saving ? 'Salvataggio...' : 'Salva modifiche'}
                  </button>
                </form>
              </div>

              <hr className="border-editorial-border" />

              {/* Email */}
              <div>
                <h2 className="font-body text-xs uppercase tracking-widest text-editorial-terra font-semibold mb-4">Email</h2>
                <AuthMessage type="error">{emailState.error}</AuthMessage>
                <AuthMessage type="success">{emailState.success}</AuthMessage>
                <div className="flex items-center justify-between gap-3">
                  <p className="font-body text-sm text-editorial-text truncate">{user?.email}</p>
                  {!emailOpen && !user?.pendingEmailChange && (
                    <button
                      onClick={() => setEmailOpen(true)}
                      className="flex-shrink-0 font-body text-xs font-semibold text-editorial-terra hover:underline"
                    >
                      Cambia
                    </button>
                  )}
                </div>

                {user?.pendingEmailChange && (
                  <div className="mt-3 rounded-xl border-2 border-editorial-terra/30 bg-editorial-terra/5 px-4 py-3">
                    <div className="flex items-start gap-2 mb-2">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="w-4 h-4 mt-0.5 text-editorial-terra flex-shrink-0">
                        <circle cx="12" cy="12" r="10" />
                        <polyline points="12 6 12 12 16 14" />
                      </svg>
                      <p className="font-body text-sm text-editorial-text leading-snug">
                        Cambio email in corso verso <strong className="break-all">{user.pendingEmailChange}</strong>.
                      </p>
                    </div>
                    <p className="font-body text-xs text-editorial-text-secondary leading-relaxed mb-3">
                      Controlla entrambe le caselle (vecchia e nuova): il cambio si completa solo dopo entrambe le conferme. Il link scade dopo 1 ora.
                    </p>
                    <button
                      type="button"
                      onClick={async () => {
                        setCancelingEmail(true)
                        const result = await cancelEmailChange()
                        setCancelingEmail(false)
                        if (result.error) {
                          toast.error(result.error)
                        } else {
                          toast.success('Cambio email annullato.')
                        }
                      }}
                      disabled={cancelingEmail}
                      className="font-body text-xs font-semibold text-editorial-terra hover:underline disabled:opacity-60"
                    >
                      {cancelingEmail ? 'Annullamento...' : 'Annulla cambio'}
                    </button>
                  </div>
                )}

                {emailOpen && !user?.pendingEmailChange && (
                  <form className="mt-3 space-y-3" onSubmit={handleEmailSave}>
                    <input
                      type="email"
                      value={newEmail}
                      onChange={(e) => setNewEmail(e.target.value)}
                      required
                      autoComplete="email"
                      placeholder="nuova@email.it"
                      autoFocus
                      className="input-field"
                    />
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => { setEmailOpen(false); setNewEmail(''); setEmailState({ saving: false, error: '', success: '' }) }}
                        className="px-4 py-2 rounded-lg border-2 border-editorial-border font-body text-sm font-semibold text-editorial-text-muted hover:border-editorial-terra hover:text-editorial-terra transition-colors"
                      >
                        Annulla
                      </button>
                      <button
                        type="submit"
                        disabled={emailState.saving || !newEmail || newEmail === user?.email}
                        className="btn-primary"
                      >
                        {emailState.saving ? 'Invio...' : 'Conferma'}
                      </button>
                    </div>
                  </form>
                )}
              </div>
            </div>
          )}

          {/* Tab: Sicurezza */}
          {activeTab === 'security' && (
            <div className="card-surface p-6">
              <h2 className="font-body text-xs uppercase tracking-widest text-editorial-terra font-semibold mb-4">Cambia password</h2>
              <AuthMessage type="error">{passwordState.error}</AuthMessage>
              <AuthMessage type="success">{passwordState.success}</AuthMessage>
              <form className="space-y-3" onSubmit={handlePasswordSave}>
                <div>
                  <label className="block mb-1.5 font-body text-sm text-editorial-text font-semibold">Nuova password</label>
                  <PasswordInput
                    value={password}
                    onChange={(e) => { setPassword(e.target.value); setPasswordTouched(true) }}
                    autoComplete="new-password"
                    required
                    minLength={8}
                    hint={passwordHint}
                  />
                </div>
                <div>
                  <label className="block mb-1.5 font-body text-sm text-editorial-text font-semibold">Conferma password</label>
                  <PasswordInput
                    value={confirmPassword}
                    onChange={(e) => { setConfirmPassword(e.target.value); setConfirmTouched(true) }}
                    autoComplete="new-password"
                    required
                    minLength={8}
                    error={confirmError}
                  />
                </div>
                <button
                  type="submit"
                  disabled={passwordState.saving || !isPasswordFormValid}
                  className="w-full btn-primary"
                >
                  {passwordState.saving ? 'Aggiornamento...' : 'Aggiorna password'}
                </button>
              </form>
            </div>
          )}

          {/* Tab: Account */}
          {activeTab === 'account' && (
            <div className="space-y-4">

              {/* Info */}
              <div className="card-surface p-6">
                <h2 className="font-body text-xs uppercase tracking-widest text-editorial-terra font-semibold mb-4">Informazioni</h2>
                <dl className="space-y-3">
                  <div className="flex items-center justify-between">
                    <dt className="font-body text-sm text-editorial-text-muted">Ruolo</dt>
                    <dd><RoleBadge role={user?.role} isAdmin={user?.isAdmin} /></dd>
                  </div>
                  <div className="flex items-center justify-between">
                    <dt className="font-body text-sm text-editorial-text-muted">Membro dal</dt>
                    <dd className="font-body text-sm text-editorial-text">
                      {user?.createdAt
                        ? new Date(user.createdAt).toLocaleDateString('it-IT', { day: 'numeric', month: 'short', year: 'numeric' })
                        : '—'}
                    </dd>
                  </div>
                  <div className="flex items-center justify-between">
                    <dt className="font-body text-sm text-editorial-text-muted">Consenso privacy</dt>
                    <dd className="font-body text-sm text-editorial-text">
                      {user?.consentGiven
                        ? new Date(user.consentDate || '').toLocaleDateString('it-IT', { day: 'numeric', month: 'short', year: 'numeric' })
                        : 'Non ancora registrato'}
                    </dd>
                  </div>
                </dl>
                <button
                  type="button"
                  onClick={() => setShowPrivacy(true)}
                  className="mt-4 inline-flex items-center gap-1 font-body text-xs text-editorial-terra hover:underline font-semibold"
                >
                  Leggi l&apos;informativa privacy →
                </button>
              </div>

              {/* Zona pericolo */}
              <div className="rounded-xl border-2 border-red-200 bg-white p-6">
                <h2 className="font-body text-xs uppercase tracking-widest text-red-400 font-semibold mb-3">Zona pericolo</h2>
                <p className="font-body text-sm text-editorial-text-secondary leading-relaxed mb-4">
                  L&apos;eliminazione è permanente. Tutti i dati e le prenotazioni verranno rimossi senza possibilità di recupero.
                </p>
                <button
                  type="button"
                  onClick={() => setShowDeleteModal(true)}
                  className="w-full rounded-lg border-2 border-red-200 bg-red-50 px-5 py-2.5 font-body text-sm font-semibold text-red-500 hover:bg-red-500 hover:text-white hover:border-red-500 transition-all"
                >
                  Elimina account
                </button>
              </div>

            </div>
          )}

        </div>
      </section>
    </>
  )
}
