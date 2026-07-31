import Link from 'next/link'
import { ParchmentCard, SigilDivider, WaxSeal, EventMeta } from '../dice-fest/decorations'
import RsvpButton from '../dice-fest/RsvpButton'

function countMasters(oneshots) {
  if (!oneshots?.length) return 0
  const masters = new Set()
  for (const oneshot of oneshots) {
    if (oneshot.master) masters.add(oneshot.master.trim().toLowerCase())
  }
  return masters.size
}

function countTables(mainEvents, oneshots) {
  const oneshotTables = (oneshots || []).reduce((sum, item) => sum + (item.slots?.length || 0), 0)
  const mainEventSessions = (mainEvents || []).reduce((sum, item) => sum + (item.sessions?.length || 0), 0)
  return oneshotTables + mainEventSessions
}

export default function DiceFestPage({ event }) {
  const oneshotCount = event.oneshots?.length || 0
  const mainEventCount = event.mainEvents?.length || 0
  const mastersCount = countMasters(event.oneshots)
  const tablesCount = countTables(event.mainEvents, event.oneshots)
  const hasProgram = oneshotCount + mainEventCount > 0

  return (
    <div className="parchment-bg">
      <div className="mx-auto max-w-6xl px-5 py-12 sm:py-16 md:px-8 lg:px-10">
        {/* HERO */}
        <ParchmentCard className="overflow-visible">
          <div className="relative px-6 py-12 sm:px-12 sm:py-16">
            <div className="absolute right-6 top-6 hidden sm:block">
              <div className="wax-stamp">
                <WaxSeal size={108} label="DF" />
              </div>
            </div>

            <p className="fantasy-eyebrow parchment-reveal">Una sola giornata · Un solo rito</p>

            <h1 className="parchment-reveal mt-5 font-elegant text-5xl font-bold leading-[1.05] text-editorial-text sm:text-6xl md:text-7xl" style={{ animationDelay: '0.1s' }}>
              DICE FEST
            </h1>

            <p className="fade-stagger mt-6 max-w-2xl font-elegant text-xl italic text-editorial-text-secondary sm:text-2xl" style={{ animationDelay: '0.25s' }}>
              Una giornata in cui dadi e leggende si incontrano.
            </p>

            <p className="fade-stagger mt-4 max-w-2xl font-body text-[15px] leading-relaxed text-editorial-text-secondary" style={{ animationDelay: '0.35s' }}>
              Master, tavoli, sessioni e un evento principale che raduna tutti i giocatori attorno allo stesso gioco.
              Tutto si svolge in un&apos;unica sala, in un solo giorno. Vieni, scegli il tuo posto al tavolo e lascia che la storia inizi.
            </p>

            <div className="fade-stagger mt-10" style={{ animationDelay: '0.5s' }}>
              <EventMeta
                startDate={event.startDate}
                endDate={event.endDate}
                location={event.location}
                price={event.price}
              />
            </div>
            
            <div className="fade-stagger mt-8 flex flex-col gap-3 border-t border-dashed border-editorial-border pt-6 sm:flex-row sm:items-center sm:justify-between" style={{ animationDelay: '0.8s' }}>
              <div className="max-w-sm">
                <p className="font-elegant text-sm font-bold text-editorial-text">Non sai ancora a quale tavolo sederti?</p>
                <p className="mt-1 font-body text-[13px] leading-relaxed text-editorial-text-secondary">
                  Segnaci la tua presenza: aggiungiamo il pass giornaliero alle Prenotazioni per 10 minuti. Le sessioni le scegli quando vuoi.
                </p>
              </div>
              <RsvpButton oneshots={event.oneshots} />
            </div>
          </div>
        </ParchmentCard>

        <SigilDivider className="my-12 sm:my-16" />

        {/* IL RITO — narrative + how it works */}
        <section className="grid gap-8 lg:grid-cols-[1.35fr_1fr]">
          <ParchmentCard className="overflow-hidden">
            <div className="px-7 py-9 sm:px-10 sm:py-12">
              <p className="fantasy-eyebrow">Il rito</p>
              <h2 className="mt-3 font-elegant text-3xl font-bold text-editorial-text sm:text-4xl">
                Una sala, molti tavoli, una sola sera che non dimenticherai
              </h2>
              <p className="drop-cap mt-6 font-body text-[15px] leading-[1.85] text-editorial-text-secondary">
                Apriamo le porte all&apos;alba degli avventurieri. Da quel momento, la sala diventa un piccolo regno: ai tavoli più
                intimi, le <span className="font-semibold text-editorial-text">one-shot</span> dei nostri master raccontano storie autoconclusive — un&apos;avventura intera in un solo
                pomeriggio, perfetta per chi vuole assaggiare un sistema nuovo o tornare a tirare i dadi senza impegno.
              </p>
              <p className="mt-4 font-body text-[15px] leading-[1.85] text-editorial-text-secondary">
                Al centro della giornata si compie il <span className="font-semibold text-editorial-text">rito principale</span>: il nostro evento princiaple, lo stesso gioco condiviso
                in più tavoli paralleli, in cui ogni gruppo scrive il proprio capitolo di una narrazione corale. È il momento in cui
                la sala respira insieme.
              </p>
              {event.description ? (
                <p className="mt-4 font-body text-[15px] leading-[1.85] text-editorial-text-secondary">{event.description}</p>
              ) : null}
            </div>
          </ParchmentCard>

          <ParchmentCard className="lg:sticky lg:top-24">
            <div className="px-7 py-9 sm:px-9 sm:py-10">
              <p className="fantasy-eyebrow">Come si compie</p>
              <h3 className="mt-3 font-elegant text-2xl font-bold text-editorial-text">In quattro passi</h3>
              <ol className="mt-6 space-y-5">
                {[
                  { n: 'I', t: 'Leggi il programma', d: 'Scorri le One-shot e l\'evento principale. Ogni tavolo ha un titolo, un master e un sistema.' },
                  { n: 'II', t: 'Segnaci che ci sarai', d: 'Il pass giornaliero entra nelle Prenotazioni per 10 minuti. Da lì puoi confermarlo subito o aggiungere i tavoli.' },
                  { n: 'III', t: 'Sigilla il tuo ordine', d: 'Confermi in un click.' },
                  { n: 'IV', t: 'Presentati in orario', d: 'Vieni al check-in puntuale: al resto pensiamo noi.' },
                ].map((step, idx) => (
                  <li key={step.n} className="fade-stagger flex gap-4" style={{ animationDelay: `${0.1 + idx * 0.08}s` }}>
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-editorial-gold/60 bg-editorial-gold/10 font-elegant text-sm font-bold text-editorial-terra">
                      {step.n}
                    </span>
                    <div>
                      <p className="font-elegant text-base font-bold text-editorial-text">{step.t}</p>
                      <p className="mt-1 font-body text-sm leading-relaxed text-editorial-text-secondary">{step.d}</p>
                    </div>
                  </li>
                ))}
              </ol>
              <Link href="/dice-fest/prenotazioni" className="btn-wax mt-8 w-full">
                Vai al registro
              </Link>
            </div>
          </ParchmentCard>
        </section>

        <SigilDivider className="my-12 sm:my-16" />

        {/* I TAVOLI — counters */}
        <section>
          <div className="text-center">
            <p className="fantasy-eyebrow justify-center">I tavoli che ti aspettano</p>
            <h2 className="mt-3 font-elegant text-3xl font-bold text-editorial-text sm:text-4xl">
              {hasProgram ? 'La sala è pronta' : 'Il programma è ancora un mistero'}
            </h2>
            <p className="mx-auto mt-3 max-w-xl font-body text-[15px] leading-relaxed text-editorial-text-secondary">
              {hasProgram
                ? 'Ecco quanto inchiostro è già stato versato sulla pergamena di questa edizione.'
                : 'I master stanno ancora forgiando le loro avventure. Tornate presto, viandanti.'}
            </p>
          </div>

          {hasProgram ? (
            <div className="mt-10 grid gap-5 sm:grid-cols-3">
              <CountStat number={mainEventCount} label="Main Event" sublabel="Evento Principale" />
              <CountStat number={oneshotCount} label="One-Shot" sublabel="Avventure autoconclusive" tone="gold" />
              <CountStat number={tablesCount} label="Tavoli totali" sublabel={mastersCount > 0 ? `${mastersCount} master in sala` : 'Tutti gli slot del giorno'} tone="forest" />
            </div>
          ) : null}
        </section>

        <SigilDivider className="my-12 sm:my-16" />

        {/* FINAL CTA */}
        <ParchmentCard className="parchment-edge">
          <div className="px-7 py-10 text-center sm:px-12 sm:py-14">
            <h2 className="font-elegant text-3xl font-bold text-editorial-text sm:text-4xl">
              Scegli il tuo tavolo, scegli la tua storia
            </h2>
            <p className="mx-auto mt-4 max-w-xl font-body text-[15px] leading-relaxed text-editorial-text-secondary">
              Il registro è aperto. I posti vengono assegnati per ordine di sigillo: chi prima arriva, prima si siede.
            </p>
            <div className="mt-7 flex flex-wrap justify-center gap-3">
              <Link href="/dice-fest/prenotazioni" className="btn-wax">
                Entra nella sala
              </Link>
              <Link href="/dice-fest/prenotazioni?tab=main-event" className="btn-ghost-fantasy">
                Vedi il Main Event
              </Link>
            </div>
          </div>
        </ParchmentCard>
      </div>
    </div>
  )
}

function CountStat({ number, label, sublabel, tone = 'terra' }) {
  const toneClass =
    tone === 'gold' ? 'text-editorial-gold'
    : tone === 'forest' ? 'text-editorial-forest'
    : 'text-editorial-terra'

  return (
    <ParchmentCard>
      <div className="flex flex-col items-center px-6 py-7 text-center">
        <span className={`font-elegant text-5xl font-bold ${toneClass}`}>{number}</span>
        <p className="mt-2 font-elegant text-base font-bold text-editorial-text">{label}</p>
        <p className="mt-1 font-body text-xs uppercase tracking-[0.18em] text-editorial-text-muted">{sublabel}</p>
      </div>
    </ParchmentCard>
  )
}
