'use client'

import { useState, useEffect, useRef } from 'react'
import youngGames from '../../data/giochi-young.json'
import youngSessions from '../../data/oneshot-young.json'

function InfoCard({ title, accentClass, cardClassName = '', contentClassName = '', children }) {
  return (
    <div className={`border-4 border-comic-navy rounded-2xl p-6 shadow-[6px_6px 0px 0px #1A1A2E] ${accentClass} ${cardClassName} flex flex-col h-full min-h-0 transition-all duration-300 hover:scale-[1.02] hover:shadow-[8px 8px 0px 0px #1A1A2E]`}>
      <h3 className="font-bangers text-3xl text-comic-navy mb-4">{title}</h3>
      <div className={`flex-1 min-h-0 ${contentClassName}`}>{children}</div>
    </div>
  )
}

function EmptyState({ label }) {
  return (
    <div className="bg-white border-3 border-comic-navy rounded-xl p-5 text-center shadow-[3px 3px 0px 0px #1A1A2E] stagger-fade-in">
      <p className="font-bangers text-comic-navy text-xl mb-2">Programmazione in aggiornamento</p>
      <p className="font-comic text-comic-navy/70">
        {label} verranno confermati nei file dedicati appena la programmazione sarà definitiva.
      </p>
    </div>
  )
}

function LogisticsItem({ children }) {
  return (
    <div className="bg-white border-3 border-comic-navy rounded-xl px-4 py-3 shadow-[3px 3px 0px 0px #1A1A2E] font-comic text-comic-navy text-lg leading-relaxed transition-all hover:translate-x-1 hover:shadow-[4px 4px 0px 0px #1A1A2E]">
      {children}
    </div>
  )
}

function YoungGameCard({ game, index }) {
  return (
    <div
      className="bg-white border-3 border-comic-navy rounded-xl p-4 shadow-[3px 3px 0px 0px #1A1A2E] transition-all duration-300 hover:scale-[1.02] hover:shadow-[5px 5px 0px 0px #1A1A2E] hover:border-comic-magenta stagger-fade-in"
      style={{ animationDelay: `${index * 100}ms` }}
    >
      <p className="font-bangers text-2xl text-comic-navy leading-tight mb-2">{game.title}</p>
      <p className="font-comic text-comic-navy/70 mb-3">{game.description}</p>
      <div className="flex flex-wrap gap-2">
        <span className="bg-comic-cyan border-2 border-comic-navy rounded-full px-3 py-1 font-bangers text-sm text-comic-navy">
          👥 {game.players}
        </span>
        <span className="bg-comic-yellow border-2 border-comic-navy rounded-full px-3 py-1 font-bangers text-sm text-comic-navy">
          ⏱️ {game.time}
        </span>
        <span className="bg-comic-magenta border-2 border-comic-navy rounded-full px-3 py-1 font-bangers text-sm text-comic-navy">
          🎲 {game.category}
        </span>
      </div>
    </div>
  )
}

function YoungSessionCard({ session, index }) {
  return (
    <div
      className="bg-white border-3 border-comic-navy rounded-xl p-4 shadow-[3px 3px 0px 0px #1A1A2E] transition-all duration-300 hover:scale-[1.02] hover:shadow-[5px 5px 0px 0px #1A1A2E] hover:border-comic-cyan stagger-fade-in"
      style={{ animationDelay: `${index * 100}ms` }}
    >
      <p className="font-bangers text-2xl text-comic-navy leading-tight mb-1">{session.title}</p>
      <p className="font-bangers text-comic-magenta text-lg mb-3">{session.game}</p>
      <div className="flex flex-wrap gap-2 mb-3">
        {session.master ? (
          <span className="bg-comic-cyan border-2 border-comic-navy rounded-full px-3 py-1 font-bangers text-sm text-comic-navy">
            🎙️ {session.master}
          </span>
        ) : null}
        {session.association ? (
          <span className="bg-comic-yellow border-2 border-comic-navy rounded-full px-3 py-1 font-bangers text-sm text-comic-navy">
            🏠 {session.association}
          </span>
        ) : null}
        {session.players ? (
          <span className="bg-comic-magenta border-2 border-comic-navy rounded-full px-3 py-1 font-bangers text-sm text-comic-navy">
            👥 {session.players}
          </span>
        ) : null}
      </div>
      <p className="font-comic text-comic-navy/70 mb-3">{session.description}</p>
      <div className="space-y-2">
        {session.schedule?.map((slot, idx) => (
          <div
            key={`${session.id}-${slot.day}-${slot.slot}-${idx}`}
            className="inline-flex flex-wrap items-center gap-2 bg-comic-orange/20 border-2 border-comic-navy rounded-full px-3 py-1 mr-2 heartbeat"
            style={{ animationDelay: `${idx * 0.2}s` }}
          >
            <span className="font-bangers text-sm text-comic-navy">📅 {slot.day}</span>
            <span className="font-bangers text-sm text-comic-navy">⏰ {slot.slot}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

export default function AreaYoung() {
  const [isVisible, setIsVisible] = useState(false)
  const sectionRef = useRef(null)

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true)
        }
      },
      { threshold: 0.2 }
    )

    if (sectionRef.current) {
      observer.observe(sectionRef.current)
    }

    return () => observer.disconnect()
  }, [])

  return (
    <section id="area-young" ref={sectionRef} className="relative py-24 px-6 comic-paper overflow-hidden">
      {/* Dynamic background with rainbow gradient */}
      <div className="absolute inset-0 pattern-drift">
        <div className="absolute inset-0" style={{
          backgroundImage: `
            radial-gradient(circle at 20% 30%, rgba(255, 20, 147, 0.1) 0%, transparent 30%),
            radial-gradient(circle at 80% 70%, rgba(0, 212, 255, 0.1) 0%, transparent 30%),
            radial-gradient(circle at 50% 50%, rgba(255, 217, 61, 0.08) 0%, transparent 40%)
          `
        }} />
      </div>

      {/* Decorative elements - stars and shapes */}
      <div className="absolute top-20 left-20 w-16 h-16 rounded-full bg-gradient-to-br from-comic-magenta/20 to-comic-cyan/20" />
      <div className="absolute bottom-40 right-20 w-24 h-24 bg-gradient-to-br from-comic-yellow/20 to-comic-orange/20 rounded-full" />
      <div className="absolute top-1/2 left-10 w-0 h-0 border-l-[25px] border-r-[25px] border-b-[40px] border-l-transparent border-r-transparent border-b-comic-cyan/30" />

      <div className="relative max-w-7xl mx-auto">
        <div className="text-center mb-12">
          {/* Animated unicorn and rainbow */}
          <div className="flex items-center justify-center gap-4 mb-4">
            <div className="text-5xl float-bounce" style={{ filter: 'drop-shadow(0 4px 8px rgba(255,20,147,0.3))' }}>
              🦄
            </div>
            <h2
              className={`font-bangers text-5xl md:text-6xl text-comic-navy tracking-wider transition-all duration-700 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}
            >
              AREA YOUNG
            </h2>
            <div className="text-5xl float-bounce" style={{ filter: 'drop-shadow(0 4px 8px rgba(0,212,255,0.3))', animationDelay: '0.5s' }}>
              🌈
            </div>
          </div>

          <div
            className={`inline-block bg-comic-yellow border-4 border-comic-navy rounded-xl px-6 py-4 shadow-[4px 4px 0px 0px #1A1A2E] max-w-4xl transition-all duration-700 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}
            style={{ transitionDelay: '0.2s' }}
          >
            <p className="font-comic text-comic-navy text-lg leading-relaxed">
              Uno spazio curato da <b className="text-comic-magenta">HobbyVille</b> e <b className="text-comic-cyan">Fantasy Fiber</b> per il pubblico più giovane, con <b>giochi da tavolo</b>, <b>one shot</b> e un <b className="text-comic-orange">laboratorio di pittura di miniature</b>.
              <br />
              Fantasy Fiber allestirà anche un tavolo laboratorio dedicato ai ragazzi dagli <b>8 ai 13 anni</b>.
            </p>
          </div>
        </div>

        {/* Animated info pills */}
        <div className="flex flex-wrap items-center justify-center gap-3 mb-10">
          {[
            { icon: '🤝', text: 'CURATA DA HOBBYVILLE E FANTASY FIBER', color: 'comic-cyan', delay: '0.3s' },
            { icon: '🪑', text: '6 TAVOLI ATTIVI', color: 'comic-magenta', delay: '0.4s' },
            { icon: '🎨', text: 'LABORATORIO MINIATURE 8-13 ANNI', color: 'comic-yellow', delay: '0.5s' }
          ].map((pill) => (
            <div
              key={pill.text}
              className={`stagger-fade-in bg-${pill.color}/90 backdrop-blur-sm border-3 border-comic-navy rounded-full px-5 py-2 shadow-[3px 3px 0px 0px #1A1A2E] hover:scale-110 transition-transform cursor-pointer`}
              style={{ animationDelay: pill.delay }}
            >
              <span className="font-bangers text-comic-navy">{pill.icon} {pill.text}</span>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-2 gap-8 mb-8">
          <InfoCard title="Come Funziona" accentClass="bg-comic-yellow/20">
            <div className="space-y-4">
              <LogisticsItem>
                L'Area Young dispone di <b>6 tavoli</b> attivi per tutta la manifestazione.
              </LogisticsItem>
              <LogisticsItem>
                <b>1 tavolo</b> è dedicato sempre a una <b>one shot</b>, con slot fissi <b>11-13</b>, <b>13-15</b>, <b>15-17</b> e <b>17-19</b>.
              </LogisticsItem>
              <LogisticsItem>
                <b>2 tavoli</b> ospitano il <b>gioco da tavolo Young</b>, con proposte pensate per i più giovani.
              </LogisticsItem>
              <LogisticsItem>
                <b>2 tavoli</b> sono riservati ai <b>giochi tradizionali</b> come dama, scacchi e calcio da tavolo.
              </LogisticsItem>
              <LogisticsItem>
                <b>1 tavolo</b> è dedicato alla <b>pittura di miniature</b>, gestita da Fantasy Fiber.
              </LogisticsItem>
            </div>
          </InfoCard>

          <InfoCard title="Laboratorio Pittura" accentClass="bg-comic-orange/20">
            <div className="space-y-4">
              <div className="flex justify-center">
                <div className="bg-white border-3 border-comic-navy rounded-2xl px-5 py-4 shadow-[3px 3px 0px 0px #1A1A2E] hover:scale-105 transition-transform">
                  <img
                    src="/loghi-ass/fantasy-fibey.png"
                    alt="Fantasy Fiber"
                    className="h-20 w-auto object-contain"
                  />
                </div>
              </div>
              <LogisticsItem>
                Fantasy Fiber allestirà un tavolo laboratorio per introdurre i ragazzi alla <b>pittura di miniature</b> in modo semplice e guidato.
              </LogisticsItem>
              <LogisticsItem>
                L'attività è pensata per partecipanti dagli <b>8 ai 13 anni</b>.
              </LogisticsItem>
              <LogisticsItem>
                L'obiettivo è offrire un'esperienza pratica e creativa accanto ai tavoli di gioco e alle one shot.
              </LogisticsItem>
            </div>
          </InfoCard>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-2 gap-8 items-stretch">
          <InfoCard title="Giochi da Tavolo Young" accentClass="bg-comic-cyan/15" cardClassName="xl:h-[56rem] overflow-hidden" contentClassName="flex flex-col min-h-0">
            <p className="font-comic text-comic-navy text-lg leading-relaxed mb-5">
              Due tavoli saranno dedicati ai giochi da tavolo young, con proposte accessibili e immediate per il pubblico più giovane.
            </p>
            <div className="space-y-4 xl:flex-1 xl:min-h-0 xl:overflow-y-auto xl:pr-2">
              {youngGames.length > 0
                ? youngGames.map((game, i) => <YoungGameCard key={game.id} game={game} index={i} />)
                : <EmptyState label="i giochi da tavolo Young e i tavoli tradizionali" />}
            </div>
          </InfoCard>

          <InfoCard title="Sessioni GDR Young" accentClass="bg-comic-magenta/15" cardClassName="xl:h-[56rem] overflow-hidden" contentClassName="flex flex-col min-h-0">
            <p className="font-comic text-comic-navy text-lg leading-relaxed mb-5">
              Un tavolo resterà sempre dedicato alle one shot young, con slot continuativi durante la giornata: 11-13, 13-15, 15-17 e 17-19.
            </p>
            <div className="space-y-4 xl:flex-1 xl:min-h-0 xl:overflow-y-auto xl:pr-2">
              {youngSessions.length > 0
                ? youngSessions.map((session, i) => <YoungSessionCard key={session.id} session={session} index={i} />)
                : <EmptyState label="le sessioni GDR Young" />}
            </div>
          </InfoCard>
        </div>
      </div>
    </section>
  )
}