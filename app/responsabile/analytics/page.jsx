import { redirect } from 'next/navigation'
import AnalyticsDashboard from '../../../src/components/analytics/AnalyticsDashboard'
import { requireResponsabile } from '../../../src/lib/admin-guard'
import {
  aggregateBy,
  buildDailySeries,
  buildHourlySeries,
  formatAnalyticsNumber,
  formatAnalyticsPercent,
  formatDateForInput,
  parseAnalyticsRange,
  percentageOf,
  uniqueBy,
} from '../../../src/lib/analytics/dashboard'
import { toAssociationSlug } from '../../../src/lib/association-slug'
import { prisma } from '../../../src/lib/prisma'
import { getResponsabileAssociation } from '../../../src/lib/responsabile'

const ANALYTICS_TUTORIAL_SLIDES = [
  {
    title: 'Le visite della tua pagina',
    description: 'Qui vedi le visite anonime alla pagina pubblica della tua associazione: nessun dato è collegato a persone o account.',
    illustration: { type: 'chart', statLabel: 'Visite totali' },
  },
  {
    title: 'Scegli il periodo',
    description: 'Usa un preset rapido (giorno, settimana, mese) oppure imposta un intervallo di date personalizzato.',
    illustration: { type: 'cards', items: [{ label: 'Ultimo giorno' }, { label: 'Ultima settimana' }, { label: 'Ultimo mese' }], highlightIndex: 1 },
  },
  {
    title: 'Leggi il grafico',
    description: 'Il grafico mostra l\'andamento delle visite nel periodo scelto, così puoi capire quando la tua pagina viene vista di più.',
    illustration: { type: 'chart', statLabel: 'Andamento visite' },
  },
]

function getAssociationTrackedPaths(association) {
  const slug = toAssociationSlug(association?.name)
  const paths = new Set()

  if (association?.id) {
    paths.add(`/associazione/${association.id}`)
  }

  if (slug) {
    paths.add(`/associazione/${slug}`)
  }

  return [...paths]
}

export default async function ResponsabileAnalyticsPage({ searchParams }) {
  const responsabile = await requireResponsabile()
  if (!responsabile) redirect('/')
  if (!responsabile.associationId) redirect('/responsabile')

  const association = await getResponsabileAssociation(responsabile.associationId)
  if (!association) redirect('/responsabile')

  const trackedPaths = getAssociationTrackedPaths(association)
  const selectedRange = parseAnalyticsRange(searchParams || {})
  const previousWindowMs = selectedRange.to.getTime() - selectedRange.from.getTime()
  const previousFrom = new Date(selectedRange.from.getTime() - previousWindowMs - 1)
  const previousTo = new Date(selectedRange.to.getTime() - previousWindowMs - 1)

  const eventSelect = {
    sessionId: true,
    path: true,
    pageTitle: true,
    occurredAt: true,
    session: {
      select: {
        visitorKey: true,
        deviceType: true,
        referrer: true,
      },
    },
  }

  const [pageViews, previousPageViews] = await Promise.all([
    prisma.analyticsEvent.findMany({
      where: {
        type: 'PAGE_VIEW',
        path: { in: trackedPaths },
        occurredAt: {
          gte: selectedRange.from,
          lte: selectedRange.to,
        },
      },
      orderBy: { occurredAt: 'desc' },
      select: eventSelect,
    }),
    prisma.analyticsEvent.findMany({
      where: {
        type: 'PAGE_VIEW',
        path: { in: trackedPaths },
        occurredAt: {
          gte: previousFrom,
          lte: previousTo,
        },
      },
      select: eventSelect,
    }),
  ])

  const sessions = uniqueBy(pageViews, (event) => event.sessionId)
  const previousSessions = uniqueBy(previousPageViews, (event) => event.sessionId)
  const visitsCount = sessions.length
  const previousVisitsCount = previousSessions.length
  const uniqueVisitorsCount = new Set(sessions.map((event) => event.session?.visitorKey).filter(Boolean)).size
  const previousUniqueVisitorsCount = new Set(previousSessions.map((event) => event.session?.visitorKey).filter(Boolean)).size
  const pageViewsCount = pageViews.length
  const previousPageViewsCount = previousPageViews.length
  const pagesPerVisit = visitsCount ? pageViewsCount / visitsCount : 0
  const distinctPages = new Set(pageViews.map((event) => event.path)).size
  const topPages = aggregateBy(pageViews, (event) => event.path).slice(0, 8)
  const deviceSplit = aggregateBy(sessions, (event) => event.session?.deviceType).slice(0, 5)
  const referrerSplit = aggregateBy(sessions, (event) => event.session?.referrer || 'Diretto').slice(0, 6)
  const series = selectedRange.key === 'day'
    ? buildHourlySeries(pageViews)
    : buildDailySeries(pageViews, selectedRange.from, selectedRange.to)
  const maxSeriesValue = Math.max(...series.map((point) => point.value), 1)
  const latestPageViews = pageViews.slice(0, 12)

  const stats = [
    {
      label: 'Visite totali',
      value: formatAnalyticsNumber(visitsCount),
      hint: `Sessioni con almeno una visita · prima ${formatAnalyticsNumber(previousVisitsCount)}`,
    },
    {
      label: 'Visitatori unici',
      value: formatAnalyticsNumber(uniqueVisitorsCount),
      hint: `Browser anonimi distinti · prima ${formatAnalyticsNumber(previousUniqueVisitorsCount)}`,
    },
    {
      label: 'Pageview',
      value: formatAnalyticsNumber(pageViewsCount),
      hint: `Visualizzazioni pagina · prima ${formatAnalyticsNumber(previousPageViewsCount)}`,
    },
    {
      label: 'URL tracciati',
      value: formatAnalyticsNumber(distinctPages),
      hint: 'Slug pubblico e varianti storiche rilevate',
    },
    {
      label: 'Pagine per visita',
      value: pagesPerVisit.toFixed(1),
      hint: 'Media pageview per sessione anonima',
    },
    {
      label: 'Quota unici',
      value: formatAnalyticsPercent(percentageOf(uniqueVisitorsCount, visitsCount)),
      hint: 'Rapporto tra visitatori unici e visite',
    },
  ]

  const publicAssociationHref = trackedPaths[0] || '/chi-siamo'

  return (
    <AnalyticsDashboard
      currentRange={selectedRange.key}
      currentFrom={formatDateForInput(selectedRange.from)}
      currentTo={formatDateForInput(selectedRange.to)}
      selectedRangeLabel={selectedRange.label}
      stats={stats}
      series={series}
      maxSeriesValue={maxSeriesValue}
      referrerSplit={referrerSplit}
      visitsCount={visitsCount}
      topPages={topPages}
      deviceSplit={deviceSplit}
      latestPageViews={latestPageViews}
      eyebrow="Analytics associazione"
      title={association.name}
      description="Statistiche anonime first-party della pagina pubblica della tua associazione. I dati sono filtrati solo sui path collegati alla scheda pubblica."
      latestDescription="Solo dati tecnici anonimi della pagina pubblica dell'associazione"
      tutorialSlides={ANALYTICS_TUTORIAL_SLIDES}
      scopeCard={(
        <section className="flex flex-col gap-4 rounded-xl border border-editorial-border bg-white p-5 shadow-soft lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="mb-1 font-body text-xs font-semibold uppercase tracking-widest text-editorial-terra">Pagina monitorata</p>
            <p className="font-body text-sm text-editorial-text">{publicAssociationHref}</p>
            {trackedPaths.length > 1 ? (
              <p className="mt-1 font-body text-sm text-editorial-text-secondary">Sono incluse anche eventuali varianti storiche del link pubblico.</p>
            ) : null}
          </div>
          <a href={publicAssociationHref} className="inline-flex items-center justify-center rounded-lg bg-editorial-forest px-4 py-2 font-body text-sm font-semibold text-white transition-colors hover:bg-editorial-forest/90">
            Apri pagina pubblica
          </a>
        </section>
      )}
    />
  )
}