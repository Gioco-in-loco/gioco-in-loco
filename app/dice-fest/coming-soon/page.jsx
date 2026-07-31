import Link from 'next/link'
import { ParchmentCard, SigilDivider, WaxSeal } from '../../../src/components/dice-fest/decorations'

export const metadata = {
  title: 'DICE FEST — Prenotazioni in arrivo | Gioco In Loco',
  description: 'Il registro missioni di DICE FEST è in preparazione. Le prenotazioni saranno presto disponibili.',
}

export default function DiceFestComingSoonPage() {
  return (
    <div className="parchment-bg">
      <section className="mx-auto max-w-3xl px-5 py-16 md:px-8">
        <ParchmentCard className="flex flex-col items-center px-7 py-12 text-center sm:px-10 sm:py-16">
          <WaxSeal size={72} label="DF" />

          <p className="fantasy-eyebrow mt-6">Evento speciale</p>
          <h1 className="mt-3 font-elegant text-4xl font-bold text-editorial-text sm:text-5xl">
            DICE FEST
          </h1>

          <SigilDivider className="mt-6" />

          <p className="mt-6 max-w-xl font-body text-base leading-relaxed text-editorial-text-secondary">
            Il registro missioni è ancora sotto sigillo: stiamo preparando tavoli, master e avventure.
            Le prenotazioni saranno presto disponibili — tornate a trovarci a breve per scegliere il vostro tavolo.
          </p>

          <Link href="/" className="btn-ghost-fantasy mt-8">Torna alla home</Link>
        </ParchmentCard>
      </section>
    </div>
  )
}
