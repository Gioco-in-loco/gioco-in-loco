import Link from 'next/link'
import { ParchmentCard, SigilDivider, EventMeta } from '../dice-fest/decorations'
import RsvpButton from '../dice-fest/RsvpButton'
import Countdown from '../dice-fest/Countdown'

const EYEBROW_DATE_FORMATTER = new Intl.DateTimeFormat('it-IT', { day: 'numeric', month: 'long' })

function formatEyebrowDate(startDate, endDate) {
  if (!startDate) return null
  const start = EYEBROW_DATE_FORMATTER.format(new Date(startDate))
  if (!endDate) return start
  const end = EYEBROW_DATE_FORMATTER.format(new Date(endDate))
  return start === end ? start : `${start} – ${end}`
}

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

function countDistinctDays(mainEvents, oneshots) {
  const days = new Set()
  for (const oneshot of oneshots || []) {
    for (const slot of oneshot.slots || []) {
      if (slot.day) days.add(slot.day)
    }
  }
  for (const mainEvent of mainEvents || []) {
    for (const session of mainEvent.sessions || []) {
      if (session.day) days.add(session.day)
    }
  }
  return days.size
}

function collectDistinctGames(oneshots, mainEvents) {
  const games = new Set()
  for (const oneshot of oneshots || []) {
    if (oneshot.game) games.add(oneshot.game.trim())
  }
  for (const mainEvent of mainEvents || []) {
    if (mainEvent.game) games.add(mainEvent.game.trim())
  }
  return Array.from(games).sort((left, right) => left.localeCompare(right, 'it'))
}

function collectPartners(oneshots) {
  const partners = new Map()
  for (const oneshot of oneshots || []) {
    if (oneshot.association?.id && !partners.has(oneshot.association.id)) {
      partners.set(oneshot.association.id, oneshot.association)
    }
  }
  return Array.from(partners.values()).sort((left, right) => left.name.localeCompare(right.name, 'it'))
}

export default function DiceFestPage({ event }) {
  const oneshotCount = event.oneshots?.length || 0
  const mainEventCount = event.mainEvents?.length || 0
  const mastersCount = countMasters(event.oneshots)
  const tablesCount = countTables(event.mainEvents, event.oneshots)
  const hasProgram = oneshotCount + mainEventCount > 0
  const hasMainEvent = mainEventCount > 0
  const dayCount = countDistinctDays(event.mainEvents, event.oneshots)
  const isMultiDay = dayCount > 1
  const distinctGames = collectDistinctGames(event.oneshots, event.mainEvents)
  const partners = collectPartners(event.oneshots)
  const eyebrowDate = formatEyebrowDate(event.startDate, event.endDate)

  const stats = [
    hasMainEvent ? { number: mainEventCount, label: 'Main Event', sublabel: 'Evento Principale', tone: 'pink' } : null,
    { number: oneshotCount, label: 'One-Shot', sublabel: 'Avventure autoconclusive', tone: 'green' },
    { number: tablesCount, label: 'Sessioni totali', sublabel: mastersCount > 0 ? `${mastersCount} master in sala` : 'Tutte le sessioni in programma', tone: 'pink' },
    distinctGames.length > 0 ? { number: distinctGames.length, label: 'Sistemi di gioco', sublabel: 'Da provare', tone: 'green' } : null,
  ].filter(Boolean)

  return (
    <div className="dicefest-bg">
      <div className="mx-auto max-w-6xl px-5 py-12 sm:py-16 md:px-8 lg:px-10">
        {/* HERO — text + poster, side by side like the event's official page */}
        <ParchmentCard className="overflow-visible">
          <div className="px-6 py-10 sm:px-10 sm:py-14 lg:px-12 lg:py-16">
            <div className="grid items-center gap-10 lg:grid-cols-[1.15fr_0.85fr] lg:gap-14">
              <div>
                <p className="dicefest-eyebrow fade-stagger">
                  {eyebrowDate || (isMultiDay ? `${dayCount} giornate dedicate al gioco di ruolo` : 'Una giornata dedicata al gioco di ruolo')}
                </p>

                <h1 className="fade-stagger mt-5 font-df-display text-5xl uppercase leading-[0.95] text-dicefest-paper sm:text-6xl md:text-7xl" style={{ animationDelay: '0.05s' }}>
                  Dice<span className="text-dicefest-pink">Fest</span>
                </h1>

                <p className="fade-stagger mt-5 max-w-xl font-df-body text-lg text-dicefest-paper/80 sm:text-xl" style={{ animationDelay: '0.15s' }}>
                  Il festival di gioco di ruolo in Campania.
                </p>

                <p className="fade-stagger mt-4 max-w-xl font-df-body text-[15px] leading-relaxed text-dicefest-paper/75" style={{ animationDelay: '0.22s' }}>
                  Master, tavoli e sessioni{hasMainEvent ? ', con un Main Event che raduna tutti i giocatori' : ''} in un&apos;unica sala{isMultiDay ? ', lungo più giornate' : ''}. Scegli il tuo posto e lascia che la storia inizi.
                </p>

                <div className="fade-stagger mt-8 flex flex-wrap items-center gap-3" style={{ animationDelay: '0.28s' }}>
                  {event.visibility === 'REVEALED' ? (
                    <Link href="/dice-fest/sessioni" className="dicefest-btn-primary">
                      Prenota il tuo tavolo
                    </Link>
                  ) : null}
                  {event.visibility === 'REVEALED' && distinctGames.length > 0 ? (
                    <Link href="#giochi" className="dicefest-btn-secondary">
                      Scopri i giochi
                    </Link>
                  ) : null}
                </div>

                <div className="fade-stagger mt-9" style={{ animationDelay: '0.34s' }}>
                  <EventMeta
                    startDate={event.startDate}
                    endDate={event.endDate}
                    location={event.location}
                    mapsUrl={event.mapsUrl}
                    price={event.price}
                  />
                </div>
              </div>

              {/* Poster */}
              <div className="flex flex-col items-center gap-6">
                <div className="relative mx-auto w-full max-w-[220px] sm:max-w-[260px] lg:max-w-none">
                  <img
                    src="/images/events/dice-fest/locandina.jpg"
                    alt="Locandina ufficiale del Dice Fest"
                    className="relative w-full border-2 border-dicefest-paper shadow-df-hard-pink"
                  />
                </div>
                <Countdown startDate={event.startDate} className="w-full max-w-[260px] lg:max-w-none" />
              </div>
            </div>

            {event.visibility === 'REVEALED' ? (
              <div className="fade-stagger mt-10 flex flex-col gap-3 border-t border-dashed border-dicefest-border pt-6 sm:flex-row sm:items-center sm:justify-between" style={{ animationDelay: '0.4s' }}>
                <div className="max-w-sm">
                  <p className="font-df-display text-sm uppercase text-dicefest-paper">Non sai ancora a quale tavolo sederti?</p>
                  <p className="mt-1 font-df-body text-[13px] leading-relaxed text-dicefest-paper/70">
                    Segnaci la tua presenza: confermiamo subito il tuo pass per la giornata. Le sessioni le scegli quando vuoi.
                  </p>
                </div>
                <RsvpButton days={event.days} />
              </div>
            ) : null}
          </div>
        </ParchmentCard>

        {event.location ? (
          <>
            <SigilDivider className="my-12 sm:my-16" />

            {/* DOVE — embedded map, shown only when a location is configured */}
            <section>
              <p className="dicefest-eyebrow">Dove trovarci</p>
              <h2 className="mt-3 font-df-display text-2xl uppercase text-dicefest-paper sm:text-3xl">
                {event.location}
              </h2>
              <div className="mt-6 overflow-hidden border-2 border-dicefest-border bg-dicefest-surface">
                <iframe
                  title={`Mappa: ${event.location}`}
                  src={`https://maps.google.com/maps?q=${encodeURIComponent(event.location)}&z=15&output=embed`}
                  className="h-80 w-full grayscale invert-[0.92] contrast-[1.05] sm:h-96"
                  loading="lazy"
                  referrerPolicy="no-referrer-when-downgrade"
                />
              </div>
              {event.mapsUrl ? (
                <a href={event.mapsUrl} target="_blank" rel="noopener noreferrer" className="dicefest-btn-secondary mt-5 inline-flex">
                  Apri in Google Maps
                </a>
              ) : null}
            </section>
          </>
        ) : null}

        {event.visibility === 'REVEALED' ? (
          <>
            <SigilDivider className="my-12 sm:my-16" />

            {/* STATS — credibility numbers right after the hero */}
            <section>
              <div className="text-center">
                <p className="dicefest-eyebrow justify-center">I tavoli che ti aspettano</p>
                <h2 className="mt-3 font-df-display text-3xl uppercase text-dicefest-paper sm:text-4xl">
                  {hasProgram ? 'La sala è pronta' : 'Il programma è ancora un mistero'}
                </h2>
                <p className="mx-auto mt-3 max-w-xl font-df-body text-[15px] leading-relaxed text-dicefest-paper/75">
                  {hasProgram
                    ? 'Ecco quanti tavoli sono già pronti per questa edizione.'
                    : 'I master stanno ancora preparando le loro avventure. Tornate presto.'}
                </p>
              </div>

              {hasProgram ? (
                <div className="mt-10 grid grid-cols-2 gap-5 sm:grid-cols-4">
                  {stats.map((stat) => (
                    <CountStat key={stat.label} {...stat} />
                  ))}
                </div>
              ) : null}
            </section>
          </>
        ) : null}

        {event.visibility === 'REVEALED' && distinctGames.length > 0 ? (
          <>
            <SigilDivider className="my-12 sm:my-16" />

            {/* SISTEMI DI GIOCO */}
            <section id="giochi" className="scroll-mt-24">
              <ParchmentCard>
                <div className="px-7 py-9 sm:px-10 sm:py-12">
                  <p className="dicefest-eyebrow">Scopri i giochi</p>
                  <h2 className="mt-3 font-df-display text-2xl uppercase text-dicefest-paper sm:text-3xl">
                    I sistemi in tavola
                  </h2>
                  <p className="mt-3 max-w-2xl font-df-body text-sm leading-relaxed text-dicefest-paper/75">
                    Dai grandi classici alle scoperte più di nicchia: ecco tutti i sistemi di gioco che troverai al Dice Fest.
                  </p>
                  <div className="mt-6 flex flex-wrap gap-2.5">
                    {distinctGames.map((game) => (
                      <span key={game} className="dicefest-badge dicefest-badge--pink normal-case tracking-normal">
                        {game}
                      </span>
                    ))}
                  </div>
                </div>
              </ParchmentCard>
            </section>
          </>
        ) : null}

        {event.visibility === 'REVEALED' ? (
          <>
            <SigilDivider className="my-12 sm:my-16" />

            {/* L'ESPERIENZA — narrative + how it works */}
            <section className="grid gap-8 lg:grid-cols-[1.35fr_1fr]">
              <ParchmentCard className="overflow-hidden">
                <div className="px-7 py-9 sm:px-10 sm:py-12">
                  <p className="dicefest-eyebrow">L&apos;esperienza</p>
                  <h2 className="mt-3 font-df-display text-3xl uppercase text-dicefest-paper sm:text-4xl">
                    {isMultiDay ? 'Una sala, molti tavoli, giornate che non dimenticherai' : 'Una sala, molti tavoli, una sera che non dimenticherai'}
                  </h2>
                  <p className="mt-6 font-df-body text-[15px] leading-[1.85] text-dicefest-paper/75">
                    Apriamo le porte all&apos;alba degli avventurieri. Da quel momento, la sala diventa un piccolo regno: ai tavoli più
                    intimi, le <span className="font-semibold text-dicefest-paper">one-shot</span> dei nostri master raccontano storie autoconclusive — un&apos;avventura intera in un solo
                    pomeriggio, perfetta per chi vuole assaggiare un sistema nuovo o tornare a tirare i dadi senza impegno.
                  </p>
                  {hasMainEvent ? (
                    <p className="mt-4 font-df-body text-[15px] leading-[1.85] text-dicefest-paper/75">
                      Al centro {isMultiDay ? 'di ogni giornata' : 'della giornata'} si svolge il <span className="font-semibold text-dicefest-paper">Main Event</span>: lo stesso gioco condiviso
                      in più tavoli paralleli, in cui ogni gruppo scrive il proprio capitolo di una narrazione corale. È il momento in cui
                      la sala respira insieme.
                    </p>
                  ) : null}
                  {event.description ? (
                    <p className="mt-4 font-df-body text-[15px] leading-[1.85] text-dicefest-paper/75">{event.description}</p>
                  ) : null}
                </div>
              </ParchmentCard>

              <ParchmentCard className="lg:sticky lg:top-24">
                <div className="px-7 py-9 sm:px-9 sm:py-10">
                  <p className="dicefest-eyebrow">Come si compie</p>
                  <h3 className="mt-3 font-df-display text-2xl uppercase text-dicefest-paper">In quattro passi</h3>
                  <ol className="mt-6 space-y-5">
                    {[
                      { n: 'I', t: 'Leggi il programma', d: 'Scorri le One-shot e l\'evento principale. Ogni tavolo ha un titolo, un master e un sistema.' },
                      { n: 'II', t: 'Segnaci che ci sarai', d: 'Il pass giornaliero viene confermato subito. Poi scegli i tavoli quando vuoi.' },
                      { n: 'III', t: 'Conferma Prenotazioni', d: 'Confermi in un click.' },
                      { n: 'IV', t: 'Presentati in orario', d: 'Vieni al check-in puntuale: al resto pensiamo noi.' },
                    ].map((step, idx) => (
                      <li key={step.n} className="fade-stagger flex gap-4" style={{ animationDelay: `${0.1 + idx * 0.08}s` }}>
                        <span className="flex h-9 w-9 shrink-0 items-center justify-center border-2 border-dicefest-pink bg-dicefest-pink/10 font-df-display text-sm text-dicefest-pink">
                          {step.n}
                        </span>
                        <div>
                          <p className="font-df-display text-base uppercase text-dicefest-paper">{step.t}</p>
                          <p className="mt-1 font-df-body text-sm leading-relaxed text-dicefest-paper/75">{step.d}</p>
                        </div>
                      </li>
                    ))}
                  </ol>
                  <Link href="/dice-fest/sessioni" className="dicefest-btn-primary mt-8 w-full">
                    Vai alle sessioni
                  </Link>
                </div>
              </ParchmentCard>
            </section>
          </>
        ) : null}

        {partners.length > 0 ? (
          <>
            <SigilDivider className="my-12 sm:my-16" />

            {/* PARTNER */}
            <section className="text-center">
              <p className="dicefest-eyebrow justify-center">Con il supporto di</p>
              <h2 className="mt-3 font-df-display text-2xl uppercase text-dicefest-paper sm:text-3xl">
                Le associazioni partner
              </h2>
              <div className="mt-8 flex flex-wrap items-center justify-center gap-5">
                {partners.map((partner) => (
                  <div
                    key={partner.id}
                    className="flex h-16 w-16 items-center justify-center overflow-hidden rounded-full border-2 border-dicefest-border bg-white p-2 transition-all duration-300 hover:border-dicefest-pink"
                    title={partner.name}
                  >
                    {partner.logo ? (
                      <img src={partner.logo} alt={partner.name} className="w-full h-full object-contain" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center font-df-display text-dicefest-ink text-lg">
                        {partner.name.charAt(0)}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </section>
          </>
        ) : null}

        {event.visibility === 'REVEALED' ? (
          <>
            <SigilDivider className="my-12 sm:my-16" />

            {/* FINAL CTA */}
            <ParchmentCard className="dicefest-surface--accent">
              <div className="px-7 py-10 text-center sm:px-12 sm:py-14">
                <h2 className="font-df-display text-3xl uppercase text-dicefest-paper sm:text-4xl">
                  Scegli il tuo tavolo, scegli la tua storia
                </h2>
                <p className="mx-auto mt-4 max-w-xl font-df-body text-[15px] leading-relaxed text-dicefest-paper/75">
                  Le sessioni sono aperte. I posti si assegnano in ordine di arrivo: chi prenota prima, si assicura il tavolo.
                </p>
                <div className="mt-7 flex flex-wrap justify-center gap-3">
                  <Link href="/dice-fest/sessioni" className="dicefest-btn-primary">
                    Entra nella sala
                  </Link>
                  {hasMainEvent ? (
                    <Link href="/dice-fest/sessioni" className="dicefest-btn-secondary">
                      Vedi il Main Event
                    </Link>
                  ) : null}
                </div>
              </div>
            </ParchmentCard>
          </>
        ) : null}
      </div>
    </div>
  )
}

function CountStat({ number, label, sublabel, tone = 'pink' }) {
  const toneClass = tone === 'green' ? 'text-dicefest-green' : 'text-dicefest-pink'

  return (
    <ParchmentCard>
      <div className="flex flex-col items-center px-4 py-6 text-center sm:px-6 sm:py-7">
        <span className={`font-df-display text-4xl sm:text-5xl ${toneClass}`}>{number}</span>
        <p className="mt-2 font-df-display text-sm uppercase text-dicefest-paper sm:text-base">{label}</p>
        <p className="mt-1 font-df-mono text-[10px] uppercase tracking-[0.14em] text-dicefest-paper/50 sm:text-xs sm:tracking-[0.18em]">{sublabel}</p>
      </div>
    </ParchmentCard>
  )
}
