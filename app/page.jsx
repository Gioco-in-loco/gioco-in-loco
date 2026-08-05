import { redirect } from 'next/navigation'
import Home from '../src/components/pages/Home'
import { getAssociations } from '../src/lib/associations'

// Supabase Auth email links (confirm signup, magic link, email change, ...)
// should always land on /auth/callback, which exchanges the code for a
// session AND creates the matching users/GDPR-log rows. If Supabase's
// dashboard Site URL/Redirect URLs are misconfigured and the link points
// here instead, forward it so the code still gets exchanged correctly
// instead of silently being dropped by the browser client.
function toQueryString(searchParams) {
  const params = new URLSearchParams()
  for (const [key, value] of Object.entries(searchParams || {})) {
    if (Array.isArray(value)) {
      value.forEach((entry) => params.append(key, entry))
    } else if (value !== undefined) {
      params.append(key, value)
    }
  }
  return params.toString()
}

export default async function HomePage({ searchParams }) {
  if (searchParams?.code) {
    redirect(`/auth/callback?${toQueryString(searchParams)}`)
  }

  const associations = await getAssociations()

  return <Home associations={associations} />
}