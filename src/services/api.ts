/// <reference types="node" />

const API_BASE = process.env.NEXT_PUBLIC_API_URL || ''

interface RequestOptions extends RequestInit {
  token?: string
}

async function fetchApi<T>(endpoint: string, options?: RequestOptions): Promise<T> {
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
  }

  if (options?.token) {
    headers['Authorization'] = `Bearer ${options.token}`
  }

  const response = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers: { ...headers, ...options?.headers },
  })

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Request failed' }))
    throw new Error(error.error || 'API request failed')
  }

  return response.json()
}

// Auth API
export const authApi = {
  loginWithGoogle: () => {
    window.location.href = `${API_BASE}/api/auth/google`
  },
  getProfile: (token: string) =>
    fetchApi<User>('/api/auth/me', { token }),
  logout: (token: string) =>
    fetchApi('/api/auth/logout', { method: 'POST', token }),
}

// Associations API
export const associationsApi = {
  getAll: () => fetchApi<Association[]>('/api/associations'),
  getById: (id: string) => fetchApi<Association>(`/api/associations/${id}`),
}

// Games API
export const gamesApi = {
  getAll: (params?: { category?: string; complexity?: string; owner?: string; event?: string }) => {
    const searchParams = new URLSearchParams()
    if (params?.category) searchParams.set('category', params.category)
    if (params?.complexity) searchParams.set('complexity', params.complexity)
    if (params?.owner) searchParams.set('owner', params.owner)
    if (params?.event) searchParams.set('event', params.event)
    const query = searchParams.toString()
    return fetchApi<Game[]>(`/api/games${query ? `?${query}` : ''}`)
  },
  getById: (id: string) => fetchApi<Game>(`/api/games/${id}`),
}

// One-shots API
export const oneshotsApi = {
  getAll: (params?: { day?: string; association?: string; game?: string; event?: string }) => {
    const searchParams = new URLSearchParams()
    if (params?.day) searchParams.set('day', params.day)
    if (params?.association) searchParams.set('association', params.association)
    if (params?.game) searchParams.set('game', params.game)
    if (params?.event) searchParams.set('event', params.event)
    const query = searchParams.toString()
    return fetchApi<OneShot[]>(`/api/oneshots${query ? `?${query}` : ''}`)
  },
  getById: (id: string) => fetchApi<OneShot>(`/api/oneshots/${id}`),
}

// Reservations API
export const reservationsApi = {
  getAll: (token: string) =>
    fetchApi<Reservation[]>(`/api/reservations`, { token }),
  create: (token: string, data: CreateReservationDTO) =>
    fetchApi<Reservation>('/api/reservations', {
      method: 'POST',
      token,
      body: JSON.stringify(data),
    }),
  cancel: (token: string, id: string) =>
    fetchApi<Reservation>(`/api/reservations/${id}`, {
      method: 'DELETE',
      token,
    }),
  getSlotAvailability: (slotId: string) =>
    fetchApi<SlotAvailability>(`/api/reservations/slot/${slotId}`),
}

// GDPR API
export const gdprApi = {
  giveConsent: (token: string, consent: boolean) =>
    fetchApi('/api/gdpr/consent', {
      method: 'POST',
      token,
      body: JSON.stringify({ consentGiven: consent }),
    }),
  exportData: (token: string) =>
    fetchApi<GdprExport>(`/api/gdpr/export`, { token }),
  requestDeletion: (token: string) =>
    fetchApi('/api/gdpr/delete', {
      method: 'POST',
      token,
    }),
}

// Events API
export const eventsApi = {
  getAll: () => fetchApi<Event[]>(`/api/events`),
  getById: (id: string) => fetchApi<Event>(`/api/events/${id}`),
}

// Main Events API (giochi principali con prenotazioni)
export const mainEventsApi = {
  getAll: (eventId?: string) => {
    const query = eventId ? `?event=${eventId}` : ''
    return fetchApi<MainEvent[]>(`/api/main-events${query}`)
  },
  getById: (id: string) => fetchApi<MainEventWithSlots>(`/api/main-events/${id}`),
}

// Main Event Reservations API
export const mainEventReservationsApi = {
  getAll: (token: string) =>
    fetchApi<MainEventReservation[]>(`/api/main-events-reservations`, { token }),
  cancel: (token: string, id: string) =>
    fetchApi<MainEventReservation>(`/api/main-events-reservations/${id}`, {
      method: 'DELETE',
      token,
    }),
}

// Types
export interface User {
  id: string
  email: string
  name?: string
  avatarUrl?: string
  role: string
  consentGiven: boolean
  consentDate?: string
  createdAt: string
}

export interface Association {
  id: string
  slug?: string
  key?: string
  name: string
  logo?: string
  bio?: string
  address?: string
  city?: string
  openingHours?: string
  instagram?: string
  facebook?: string
  website?: string
  whatsapp?: string
  email?: string
  tiktok?: string
  linktree?: string
  telegram?: string
}

export interface Game {
  id: string
  externalId: string
  title: string
  description?: string
  image?: string
  players?: string
  time?: string
  category?: string
  complexity?: string
  owner?: Association
  eventLinks?: Array<{
    copies: number
    event: Pick<Event, 'id' | 'externalId' | 'name'>
    association?: Pick<Association, 'id' | 'name' | 'logo'>
  }>
}

export interface OneShot {
  id: string
  title: string
  game: string
  master: string
  description?: string
  price?: number
  minPlayers: number
  maxPlayers: number
  association?: Association
  eventLinks?: Array<{ event: Pick<Event, 'id' | 'externalId' | 'name'> }>
  slots: OneShotSlot[]
}

export interface OneShotSlot {
  id: string
  day: string
  slot: string
  table: string
  maxPlayers: number
  currentReservations?: number
  available?: boolean
}

export interface Reservation {
  id: string
  userId: string
  slotId: string
  status: 'PENDING' | 'CONFIRMED' | 'CANCELLED' | 'ATTENDED'
  playerName?: string
  playerEmail?: string
  notes?: string
  createdAt: string
  slot?: OneShotSlot & { oneshot?: { id: string; title: string; game: string } }
}

export interface CreateReservationDTO {
  slotId: string
  playerName?: string
  playerEmail?: string
  notes?: string
  consentGiven: boolean
}

export interface SlotAvailability {
  slotId: string
  maxPlayers: number
  currentReservations: number
  available: boolean
}

export interface GdprExport {
  exportDate: string
  user: { id: string; email: string; name?: string; createdAt: string }
  consent: { given: boolean; date?: string; dataProcessors: string[] }
  reservations: Array<{
    id: string
    status: string
    playerName?: string
    playerEmail?: string
    createdAt: string
    slot: { day: string; slot: string; table: string; oneshot: string }
  }>
}

// Event
export interface Event {
  id: string
  externalId: string
  name: string
  description?: string
  location?: string
  price?: number
  startDate?: string
  endDate?: string
  createdAt: string
  updatedAt: string
}

// Main Event
export interface MainEvent {
  id: string
  title: string
  description?: string
  game?: string
  price?: number
  associationId?: string
  eventId?: string
  eventName?: string
  eventLocation?: string
}

export interface MainEventSlot {
  id: string
  day: string
  slot: string
  tableName?: string
  maxPlayers: number
  currentReservations?: number
}

export interface MainEventWithSlots extends MainEvent {
  slots: MainEventSlot[]
}

export interface MainEventReservation {
  id: string
  userId: string
  slotId: string
  status: 'PENDING' | 'CONFIRMED' | 'CANCELLED' | 'ATTENDED'
  playerName?: string
  playerEmail?: string
  notes?: string
  createdAt: string
  day?: string
  slot?: string
  tableName?: string
  maxPlayers?: number
  mainEventTitle?: string
  game?: string
}

// Auth context helper
export function getStoredToken(): string | null {
  return localStorage.getItem('auth_token')
}

export function setStoredToken(token: string) {
  localStorage.setItem('auth_token', token)
}

export function removeStoredToken() {
  localStorage.removeItem('auth_token')
}

// Feature flags from environment
export const isGoogleAuthEnabled = () => process.env.NEXT_PUBLIC_GOOGLE_AUTH_ENABLED === 'true'