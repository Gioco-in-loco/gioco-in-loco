import { updateSession } from './src/lib/supabase/middleware'

export async function middleware(request) {
  return updateSession(request)
}

export const config = {
  matcher: ['/account/:path*', '/auth/:path*'],
}