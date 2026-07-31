import Link from 'next/link'
import DiceFestPage from '../../src/components/pages/DiceFestPage'
import { getDiceFestBookableData } from '../../src/lib/dice-fest'

export const dynamic = 'force-dynamic'

export const metadata = {
  title: 'DICE FEST | Gioco In Loco',
  description: 'Una giornata in cui dadi e leggende si incontrano. Main Event multi-tavolo e one-shot dei master ospiti.',
}

export default async function DiceFestRoute() {
  const event = await getDiceFestBookableData()

  if (!event) {
    return (
      <div className="parchment-bg">
        <section className="mx-auto max-w-3xl px-5 py-16 md:px-8">
          <div className="parchment-surface px-7 py-10 sm:px-10 sm:py-12">
            <p className="fantasy-eyebrow">Evento speciale</p>
            <h1 className="mt-3 font-elegant text-4xl font-bold text-editorial-text">DICE FEST</h1>
            <p className="mt-4 font-body text-sm leading-relaxed text-editorial-text-secondary">
              L&apos;evento non è ancora stato annunciato. Tornate presto per scoprire il programma.
            </p>
            <Link href="/" className="btn-ghost-fantasy mt-6">Torna alla home</Link>
          </div>
        </section>
      </div>
    )
  }

  return <DiceFestPage event={event} />
}
