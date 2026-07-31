import { createSupabaseServerClient } from './supabase/server'
import { prisma } from './prisma'
import { isSupabaseConfigured } from './supabase/config'

async function getAuthenticatedDbUser() {
  const supabase = createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user?.id) {
    return { authUser: null, dbUser: null }
  }

  const dbUser = await prisma.user.findUnique({
    where: { supabaseUserId: user.id },
    select: {
      id: true,
      supabaseUserId: true,
      role: true,
      isAdmin: true,
      associationId: true,
      managedAssociation: { select: { id: true, name: true } },
    },
  })

  return { authUser: user, dbUser }
}

function hasRequiredRole(dbUser, allowedRoles) {
  if (!dbUser) return false
  return allowedRoles.includes(dbUser.role)
}

function toSessionUser(authUser, dbUser) {
  return {
    ...dbUser,
    email: authUser?.email || null,
    name: authUser?.user_metadata?.full_name || null,
  }
}

export async function requireRoles(allowedRoles) {
  if (!isSupabaseConfigured()) return null

  const { authUser, dbUser } = await getAuthenticatedDbUser()
  if (!authUser?.id) return null
  if (!hasRequiredRole(dbUser, allowedRoles)) return null

  return toSessionUser(authUser, dbUser)
}

export async function requireRolesApi(allowedRoles) {
  if (!isSupabaseConfigured()) {
    return { user: null, error: 'Auth non configurata', status: 503 }
  }

  const { authUser, dbUser } = await getAuthenticatedDbUser()

  if (!authUser?.id) {
    return { user: null, error: 'Non autenticato', status: 401 }
  }

  if (!hasRequiredRole(dbUser, allowedRoles)) {
    return { user: null, error: 'Accesso non autorizzato', status: 403 }
  }

  return {
    user: toSessionUser(authUser, dbUser),
    error: null,
    status: 200,
  }
}

export async function requireAuthenticated() {
  if (!isSupabaseConfigured()) return null

  const { authUser, dbUser } = await getAuthenticatedDbUser()
  if (!authUser?.id || !dbUser) return null

  return toSessionUser(authUser, dbUser)
}

export async function requireAuthenticatedApi() {
  if (!isSupabaseConfigured()) {
    return { user: null, error: 'Auth non configurata', status: 503 }
  }

  const { authUser, dbUser } = await getAuthenticatedDbUser()

  if (!authUser?.id) {
    return { user: null, error: 'Non autenticato', status: 401 }
  }

  if (!dbUser) {
    return { user: null, error: 'Profilo utente non trovato', status: 404 }
  }

  return {
    user: toSessionUser(authUser, dbUser),
    error: null,
    status: 200,
  }
}

export async function requireAdmin() {
  if (!isSupabaseConfigured()) return null

  const { authUser, dbUser } = await getAuthenticatedDbUser()
  if (!authUser?.id || !dbUser?.isAdmin) return null

  return toSessionUser(authUser, dbUser)
}

export async function requireAdminApi() {
  if (!isSupabaseConfigured()) {
    return { user: null, error: 'Auth non configurata', status: 503 }
  }

  const { authUser, dbUser } = await getAuthenticatedDbUser()

  if (!authUser?.id) {
    return { user: null, error: 'Non autenticato', status: 401 }
  }

  if (!dbUser?.isAdmin) {
    return { user: null, error: 'Accesso non autorizzato', status: 403 }
  }

  return {
    user: toSessionUser(authUser, dbUser),
    error: null,
    status: 200,
  }
}

export async function requireResponsabile() {
  return requireRoles(['RESPONSABILE'])
}

export async function requireResponsabileApi() {
  return requireRolesApi(['RESPONSABILE'])
}
