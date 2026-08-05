import Link from 'next/link'
import DiceFestCartPage from '../../../src/components/pages/DiceFestCartPage'
import { getDiceFestEventData } from '../../../src/lib/dice-fest'
import { requireAdminOrResponsabile } from '../../../src/lib/admin-guard'

export const dynamic = 'force-dynamic'

export const metadata = {
  title: 'Prenotazioni — DICE FEST',
  description: 'Gestisci e conferma le tue prenotazioni.',
}

export default async function DiceFestCartRoute() {
  const event = await getDiceFestEventData()

  if (!event) {
    return (
      <div className="dicefest-bg">
        <section className="mx-auto max-w-3xl px-5 py-16 md:px-8">
          <div className="dicefest-surface px-7 py-10 sm:px-10 sm:py-12">
            <p className="dicefest-eyebrow">Prenotazioni</p>
            <h1 className="mt-3 font-df-display text-4xl uppercase text-dicefest-paper">DICE FEST</h1>
            <p className="mt-4 font-df-body text-sm leading-relaxed text-dicefest-paper/75">
              Le prenotazioni non sono ancora attive: l&apos;evento sarà presto pubblicato.
            </p>
            <Link href="/dice-fest" className="dicefest-btn-secondary mt-6">Torna all&apos;evento</Link>
          </div>
        </section>
      </div>
    )
  }

  // Preview: no program is shown yet, so there's nothing bookable to manage
  // here either — staff can still get in to check things.
  if (event.visibility === 'PREVIEW') {
    const staff = await requireAdminOrResponsabile()
    if (!staff) {
      return (
        <div className="dicefest-bg">
          <section className="mx-auto max-w-3xl px-5 py-16 md:px-8">
            <div className="dicefest-surface px-7 py-10 sm:px-10 sm:py-12">
              <p className="dicefest-eyebrow">Prenotazioni</p>
              <h1 className="mt-3 font-df-display text-4xl uppercase text-dicefest-paper">DICE FEST</h1>
              <p className="mt-4 font-df-body text-sm leading-relaxed text-dicefest-paper/75">
                Il programma è ancora in preparazione: non ci sono ancora prenotazioni da gestire.
              </p>
              <Link href="/dice-fest" className="dicefest-btn-secondary mt-6">Torna all&apos;evento</Link>
            </div>
          </section>
        </div>
      )
    }
  }

  return <DiceFestCartPage event={event} />
}
