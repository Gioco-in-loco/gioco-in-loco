import { NextResponse } from 'next/server'
import { requireAuthenticatedApi } from '../../../../src/lib/admin-guard'
import { getUserAccountBookings } from '../../../../src/lib/account-bookings'

export async function GET() {
  const { user, error, status } = await requireAuthenticatedApi()
  if (error) return NextResponse.json({ error }, { status })

  const bookings = await getUserAccountBookings({ userId: user.id })
  return NextResponse.json({ bookings })
}