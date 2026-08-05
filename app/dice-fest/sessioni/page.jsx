import { Suspense } from 'react'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import DiceFestBookingPage from '../../../src/components/pages/DiceFestBookingPage'
import { getDiceFestBookableData } from '../../../src/lib/dice-fest'
import { requireAdminOrResponsabile } from '../../../src/lib/admin-guard'

export const dynamic = 'force-dynamic'

export const metadata = {
  title: 'Sessioni — DICE FEST',
  description: 'Scegli il tuo tavolo: Main Event multi-tavolo e one-shot del giorno.',
}

export default async function DiceFestBookingRoute() {
  const event = await getDiceFestBookableData()

  if (event?.visibility === 'COMING_SOON') {
    const staff = await requireAdminOrResponsabile()
    if (!staff) redirect('/dice-fest/coming-soon')
  }

  if (!event) {
    return (
      <div className="dicefest-bg">
        <section className="mx-auto max-w-3xl px-5 py-16 md:px-8">
          <div className="dicefest-surface px-7 py-10 sm:px-10 sm:py-12">
            <p className="dicefest-eyebrow">Sessioni</p>
            <h1 className="mt-3 font-df-display text-4xl uppercase text-dicefest-paper">DICE FEST</h1>
            <p className="mt-4 font-df-body text-sm leading-relaxed text-dicefest-paper/75">
              Le sessioni non sono ancora state annunciate, il programma sarà annunciato a breve.
            </p>
            <Link href="/dice-fest" className="dicefest-btn-secondary mt-6">Torna all&apos;evento</Link>
          </div>
        </section>
      </div>
    )
  }

  // Preview: the landing page is visible, but the program stays hidden until
  // the event moves to "Rivelato" — staff can still see it to prepare it.
  if (event.visibility === 'PREVIEW') {
    const staff = await requireAdminOrResponsabile()
    if (!staff) {
      return (
        <div className="dicefest-bg">
          <section className="mx-auto max-w-3xl px-5 py-16 md:px-8">
            <div className="dicefest-surface px-7 py-10 sm:px-10 sm:py-12">
              <p className="dicefest-eyebrow">Sessioni</p>
              <h1 className="mt-3 font-df-display text-4xl uppercase text-dicefest-paper">DICE FEST</h1>
              <p className="mt-4 font-df-body text-sm leading-relaxed text-dicefest-paper/75">
                Il programma è ancora in preparazione. Tornate presto per scoprire tavoli e sessioni.
              </p>
              <Link href="/dice-fest" className="dicefest-btn-secondary mt-6">Torna all&apos;evento</Link>
            </div>
          </section>
        </div>
      )
    }
  }

  return (
    <Suspense fallback={<BookingFallback />}>
      <DiceFestBookingPage event={event} />
    </Suspense>
  )
}

function BookingFallback() {
  return (
    <div className="dicefest-bg">
      <div className="mx-auto max-w-screen-2xl px-5 py-10 md:px-8 lg:px-10">
        <div className="dicefest-surface px-7 py-10">
          <p className="font-df-body text-sm text-dicefest-paper/75">Apertura delle sessioni in corso…</p>
        </div>
      </div>
    </div>
  )
}
