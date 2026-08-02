import Link from 'next/link'
import { ParchmentCard, SigilDivider, WaxSeal } from '../../../src/components/dice-fest/decorations'

export const metadata = {
  title: 'DICE FEST — Prenotazioni in arrivo | Gioco In Loco',
  description: 'Le prenotazioni del DICE FEST sono in preparazione. Saranno presto disponibili.',
}

export default function DiceFestComingSoonPage() {
  return (
    <div className="dicefest-bg">
      <section className="mx-auto max-w-3xl px-5 py-16 md:px-8">
        <ParchmentCard className="flex flex-col items-center px-7 py-12 text-center sm:px-10 sm:py-16">
          <WaxSeal size={72} imageSrc="/dice-fest/dado.png" />

          <p className="dicefest-eyebrow mt-6">Evento speciale</p>
          <h1 className="mt-3 font-df-display text-4xl uppercase text-dicefest-paper sm:text-5xl">
            DICE FEST
          </h1>

          <SigilDivider className="mt-6" />

          <p className="mt-6 max-w-xl font-df-body text-base leading-relaxed text-dicefest-paper/75">
            Le prenotazioni sono ancora in preparazione: stiamo organizzando tavoli, master e avventure.
            Saranno presto disponibili — tornate a trovarci a breve per scegliere il vostro tavolo.
          </p>

          <Link href="/" className="dicefest-btn-secondary mt-8">Torna alla home</Link>
        </ParchmentCard>
      </section>
    </div>
  )
}
