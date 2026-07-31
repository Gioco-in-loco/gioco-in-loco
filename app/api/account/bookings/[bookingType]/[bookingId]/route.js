import { NextResponse } from 'next/server'
import { requireAuthenticatedApi } from '../../../../../../src/lib/admin-guard'
import { cancelUserAccountBooking } from '../../../../../../src/lib/account-bookings'

export async function DELETE(_request, { params }) {
  const { user, error, status } = await requireAuthenticatedApi()
  if (error) return NextResponse.json({ error }, { status })

  try {
    const booking = await cancelUserAccountBooking({
      bookingType: params.bookingType,
      bookingId: params.bookingId,
      userId: user.id,
    })

    return NextResponse.json({ ok: true, booking })
  } catch (cancelError) {
    return NextResponse.json(
      { error: cancelError.message || 'Impossibile cancellare la prenotazione.' },
      { status: cancelError.status || 400 },
    )
  }
}