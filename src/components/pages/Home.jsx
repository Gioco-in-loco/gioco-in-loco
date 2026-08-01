'use client'

import Link from 'next/link'
import { useState, useEffect, useRef } from 'react'
import { DiceIcon, ShieldIcon, TicketIcon, MapPinIcon, ArrowRightIcon } from '../ui/Icons'

const ACTIVITIES = [
  {
    icon: DiceIcon,
    tone: 'terra',
    title: 'Ludoteca',
    copy: 'Centinaia di giochi da tavolo pronti al tavolo: dalla strategia al party game, dal cooperativo al competitivo.',
    featured: true,
  },
  {
    icon: ShieldIcon,
    tone: 'forest',
    title: 'Area GDR',
    copy: 'One-shot e campagne guidate da narratori esperti. Nessuna esperienza richiesta.',
  },
  {
    icon: TicketIcon,
    tone: 'gold',
    title: 'Eventi',
    copy: 'Presidiamo i più importanti appuntamenti ludici in Campania, dal Comicon al Dice Fest.',
    href: '/dice-fest',
  },
]

const TONE_CLASSES = {
  terra: { bg: 'bg-editorial-terra/10', text: 'text-editorial-terra', bar: 'bg-editorial-terra' },
  forest: { bg: 'bg-editorial-forest/10', text: 'text-editorial-forest', bar: 'bg-editorial-forest' },
  gold: { bg: 'bg-editorial-gold/15', text: 'text-editorial-gold', bar: 'bg-editorial-gold' },
}

function StatRow({ icon: Icon, tone, value, label }) {
  const t = TONE_CLASSES[tone]
  return (
    <div className="flex items-center gap-4">
      <span className={`inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${t.bg} ${t.text}`}>
        <Icon className="h-5 w-5" />
      </span>
      <div className="min-w-0">
        <p className="font-elegant text-2xl font-bold leading-none text-editorial-text">{value}</p>
        <p className="mt-1 font-body text-[11px] uppercase tracking-wide text-editorial-text-muted">{label}</p>
      </div>
    </div>
  )
}

export default function Home({ associations = [] }) {
  const [isVisible, setIsVisible] = useState(false)
  const sectionRef = useRef(null)

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true)
        }
      },
      { threshold: 0.1 }
    )

    if (sectionRef.current) {
      observer.observe(sectionRef.current)
    }

    return () => observer.disconnect()
  }, [])

  const associationCount = associations.length
  const cityCount = new Set(associations.map((a) => a.location?.city).filter(Boolean)).size

  return (
    <section ref={sectionRef} className="relative overflow-hidden">
      <div className="absolute inset-0 dice-pattern opacity-20 pointer-events-none" />

      <div className="relative max-w-6xl mx-auto px-4 sm:px-6 pt-16 sm:pt-24 pb-16 sm:pb-24">

        {/* HERO — asymmetric two-column */}
        <div className="grid items-center gap-12 lg:grid-cols-[1.15fr_0.85fr] lg:gap-16 mb-20 lg:mb-28">
          <div
            className={`text-center lg:text-left transition-all duration-700 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'}`}
          >
            <p className="font-body text-xs uppercase tracking-widest text-editorial-terra mb-5">
              Rete di associazioni ludiche
            </p>

            <h1 className="font-elegant text-5xl sm:text-6xl lg:text-7xl tracking-tight text-editorial-text mb-4">
              Gioco In Loco
            </h1>

            <p className="font-elegant text-lg sm:text-xl md:text-2xl text-editorial-text-secondary mb-5">
              La comunità del gioco in Campania
            </p>

            <p className="mx-auto lg:mx-0 max-w-md font-body text-[15px] leading-relaxed text-editorial-text-secondary">
              {associationCount > 0 ? `${associationCount} associazioni` : 'Un collettivo di associazioni'} unite da un&apos;unica missione: portare il gioco da tavolo e di ruolo tra le persone, ovunque ci sia voglia di giocare.
            </p>

            <div className="mt-8 flex flex-wrap items-center justify-center lg:justify-start gap-3">
              <Link href="/dice-fest" className="btn-primary">
                Scopri il Dice Fest
              </Link>
              <Link href="/chi-siamo" className="btn-ghost">
                Le associazioni
                <ArrowRightIcon className="h-4 w-4" />
              </Link>
            </div>
          </div>

          {/* Stat panel — tilted card with soft glow behind it */}
          <div
            className={`relative mx-auto w-full max-w-sm transition-all duration-700 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'}`}
            style={{ transitionDelay: '0.15s' }}
          >
            <div
              className="absolute -inset-6 rounded-[2rem] bg-gradient-to-br from-editorial-terra/15 via-editorial-gold/10 to-editorial-forest/15 blur-2xl"
              aria-hidden="true"
            />
            <div className="relative card-surface -rotate-2 hover:rotate-0 transition-transform duration-500 p-6 sm:p-7">
              <div className="space-y-5">
                <StatRow icon={DiceIcon} tone="terra" value={associationCount || '—'} label="Associazioni attive" />
                <div className="border-t border-dashed border-editorial-border" />
                <StatRow icon={MapPinIcon} tone="forest" value={cityCount || '—'} label="Città in Campania" />
                <div className="border-t border-dashed border-editorial-border" />
                <StatRow icon={TicketIcon} tone="gold" value="Libero" label="Gioco libero e gratuito" />
              </div>
            </div>
          </div>
        </div>

        {/* Associations strip */}
        {associations.length > 0 && (
          <div className="mb-20 lg:mb-24">
            <p className="text-center font-body text-[11px] uppercase tracking-widest text-editorial-text-muted mb-6">
              Le realtà del collettivo
            </p>
            <div className="flex flex-wrap items-center justify-center gap-5">
              {associations.map((assoc) => (
                <div
                  key={assoc.id}
                  className="w-14 h-14 bg-white border border-editorial-border rounded-editorial shadow-editorial p-1.5 hover:shadow-editorial-md hover:scale-110 transition-all duration-300 cursor-pointer group"
                  title={assoc.name}
                >
                  {assoc.logo ? (
                    <img
                      src={assoc.logo}
                      alt={assoc.name}
                      className="w-full h-full object-contain group-hover:scale-110 transition-transform duration-300"
                    />
                  ) : (
                    <div className="w-full h-full rounded-editorial bg-editorial-terra/10 flex items-center justify-center font-elegant text-editorial-terra text-lg group-hover:bg-editorial-terra/20 transition-colors">
                      {assoc.name.charAt(0)}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Activities — bento grid: one featured tile + two stacked */}
        <div className="mb-16">
          <div className="text-center mb-10">
            <p className="font-body text-xs uppercase tracking-widest text-editorial-terra mb-3">
              Cosa facciamo
            </p>
            <h2 className="font-elegant text-3xl md:text-4xl text-editorial-text">
              Le nostre attività
            </h2>
          </div>

          <div className="grid grid-cols-1 gap-5 md:grid-cols-3 md:grid-rows-2">
            {ACTIVITIES.map((activity) => {
              const tone = TONE_CLASSES[activity.tone]
              const Icon = activity.icon
              const content = (
                <div
                  className={`card-surface card-surface--interactive h-full p-7 flex flex-col gap-4 ${activity.featured ? 'md:p-9' : ''}`}
                >
                  <div className={`inline-flex items-center justify-center rounded-2xl ${tone.bg} ${tone.text} ${activity.featured ? 'h-16 w-16' : 'h-12 w-12'}`}>
                    <Icon className={activity.featured ? 'h-8 w-8' : 'h-6 w-6'} />
                  </div>
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <span className={`w-1 h-5 rounded-full ${tone.bar}`} />
                      <h3 className={`font-elegant text-editorial-text ${activity.featured ? 'text-2xl' : 'text-xl'}`}>{activity.title}</h3>
                    </div>
                    <p className="font-body text-sm text-editorial-text-secondary leading-relaxed">
                      {activity.copy}
                    </p>
                  </div>
                  {activity.href && (
                    <span className="mt-auto inline-flex items-center gap-1.5 font-body text-sm font-semibold text-editorial-terra">
                      Scopri di più <ArrowRightIcon className="h-4 w-4" />
                    </span>
                  )}
                </div>
              )

              return (
                <div key={activity.title} className={activity.featured ? 'md:col-span-2 md:row-span-2' : ''}>
                  {activity.href ? (
                    <Link href={activity.href} className="block h-full">{content}</Link>
                  ) : content}
                </div>
              )
            })}
          </div>
        </div>

        {/* Tagline */}
        <div className="text-center border-t border-editorial-border/60 pt-10">
          <p className="font-elegant text-xl md:text-2xl text-editorial-text-secondary italic">
            "Giocare insieme è il cuore di tutto"
          </p>
        </div>

      </div>
    </section>
  )
}
