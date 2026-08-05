import { redirect } from 'next/navigation'
import Link from 'next/link'
import DiceFestPage from '../../src/components/pages/DiceFestPage'
import { getDiceFestBookableData } from '../../src/lib/dice-fest'
import { requireAdminOrResponsabile } from '../../src/lib/admin-guard'

export const dynamic = 'force-dynamic'

export const metadata = {
  title: 'DICE FEST | Gioco In Loco',
  description: 'Una giornata in cui dadi e leggende si incontrano. Main Event multi-tavolo e one-shot dei master ospiti.',
}

export default async function DiceFestRoute() {
  const event = await getDiceFestBookableData()

  // Coming soon blocks the whole event; preview still shows this landing
  // page normally (only the program on /sessioni stays hidden).
  if (event?.visibility === 'COMING_SOON') {
    const staff = await requireAdminOrResponsabile()
    if (!staff) redirect('/dice-fest/coming-soon')
  }

  if (!event) {
    return (
      <div className="dicefest-bg">
        <section className="mx-auto max-w-3xl px-5 py-16 md:px-8">
          <div className="dicefest-surface px-7 py-10 sm:px-10 sm:py-12">
            <p className="dicefest-eyebrow">Evento speciale</p>
            <h1 className="mt-3 font-df-display text-4xl uppercase text-dicefest-paper">DICE FEST</h1>
            <p className="mt-4 font-df-body text-sm leading-relaxed text-dicefest-paper/75">
              L&apos;evento non è ancora stato annunciato. Tornate presto per scoprire il programma.
            </p>
            <Link href="/" className="dicefest-btn-secondary mt-6">Torna alla home</Link>
          </div>
        </section>
      </div>
    )
  }

  return <DiceFestPage event={event} />
}
