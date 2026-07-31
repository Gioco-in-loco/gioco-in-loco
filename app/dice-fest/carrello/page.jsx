import { redirect } from 'next/navigation'
import Link from 'next/link'
import DiceFestCartPage from '../../../src/components/pages/DiceFestCartPage'
import { getDiceFestEventData } from '../../../src/lib/dice-fest'
import { requireAdmin } from '../../../src/lib/admin-guard'

export const dynamic = 'force-dynamic'

export const metadata = {
  title: 'Prenotazioni — DICE FEST',
  description: 'Gestisci e conferma le tue prenotazioni.',
}

export default async function DiceFestCartRoute() {
  const admin = await requireAdmin()
  if (!admin) redirect('/dice-fest/coming-soon')

  const event = await getDiceFestEventData()

  if (!event) {
    return (
      <div className="parchment-bg">
        <section className="mx-auto max-w-3xl px-5 py-16 md:px-8">
          <div className="parchment-surface px-7 py-10 sm:px-10 sm:py-12">
            <p className="fantasy-eyebrow">Prenotazioni</p>
            <h1 className="mt-3 font-elegant text-4xl font-bold text-editorial-text">DICE FEST</h1>
            <p className="mt-4 font-body text-sm leading-relaxed text-editorial-text-secondary">
              Le prenotazioni non sono ancora attive: l&apos;evento sarà presto pubblicato.
            </p>
            <Link href="/dice-fest" className="btn-ghost-fantasy mt-6">Torna all&apos;evento</Link>
          </div>
        </section>
      </div>
    )
  }

  return <DiceFestCartPage event={event} />
}
