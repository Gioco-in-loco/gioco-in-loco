import { Suspense } from 'react'
import Link from 'next/link'
import DiceFestBookingPage from '../../../src/components/pages/DiceFestBookingPage'
import { getDiceFestBookableData } from '../../../src/lib/dice-fest'

export const dynamic = 'force-dynamic'

export const metadata = {
  title: 'Registro prenotazioni — DICE FEST',
  description: 'Scegli il tuo tavolo: Main Event multi-tavolo e one-shot del giorno.',
}

export default async function DiceFestBookingRoute() {
  const event = await getDiceFestBookableData()

  if (!event) {
    return (
      <div className="parchment-bg">
        <section className="mx-auto max-w-3xl px-5 py-16 md:px-8">
          <div className="parchment-surface px-7 py-10 sm:px-10 sm:py-12">
            <p className="fantasy-eyebrow">Registro</p>
            <h1 className="mt-3 font-elegant text-4xl font-bold text-editorial-text">DICE FEST</h1>
            <p className="mt-4 font-body text-sm leading-relaxed text-editorial-text-secondary">
              Il registro non è ancora aperto: il programma sarà annunciato a breve.
            </p>
            <Link href="/dice-fest" className="btn-ghost-fantasy mt-6">Torna all&apos;evento</Link>
          </div>
        </section>
      </div>
    )
  }

  return (
    <Suspense fallback={<BookingFallback />}>
      <DiceFestBookingPage event={event} />
    </Suspense>
  )
}

function BookingFallback() {
  return (
    <div className="parchment-bg">
      <div className="mx-auto max-w-7xl px-5 py-10 md:px-8 lg:px-10">
        <div className="parchment-surface px-7 py-10">
          <p className="font-body text-sm text-editorial-text-secondary">Apertura della prenotazione in corso…</p>
        </div>
      </div>
    </div>
  )
}
