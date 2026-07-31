import AnalyticsDashboard from '../../../src/components/analytics/AnalyticsDashboard'
import { prisma } from '../../../src/lib/prisma'
import {
  aggregateBy,
  buildDailySeries,
  buildHourlySeries,
  formatAnalyticsNumber,
  formatAnalyticsPercent,
  formatDateForInput,
  parseAnalyticsRange,
  percentageOf,
} from '../../../src/lib/analytics/dashboard'

export default async function AdminAnalyticsPage({ searchParams }) {
  const selectedRange = parseAnalyticsRange(searchParams || {})
  const previousWindowMs = selectedRange.to.getTime() - selectedRange.from.getTime()
  const previousFrom = new Date(selectedRange.from.getTime() - previousWindowMs - 1)
  const previousTo = new Date(selectedRange.to.getTime() - previousWindowMs - 1)

  const sessionWhere = {
    startedAt: {
      gte: selectedRange.from,
      lte: selectedRange.to,
    },
  }

  const eventWhere = {
    type: 'PAGE_VIEW',
    occurredAt: {
      gte: selectedRange.from,
      lte: selectedRange.to,
    },
  }

  const previousSessionWhere = {
    startedAt: {
      gte: previousFrom,
      lte: previousTo,
    },
  }

  const previousEventWhere = {
    type: 'PAGE_VIEW',
    occurredAt: {
      gte: previousFrom,
      lte: previousTo,
    },
  }

  const [
    visitsCount,
    uniqueVisitorsRows,
    pageViewsCount,
    sessions,
    pageViews,
    latestPageViews,
    previousVisitsCount,
    previousUniqueVisitorsRows,
    previousPageViewsCount,
  ] = await Promise.all([
    prisma.analyticsSession.count({ where: sessionWhere }),
    prisma.analyticsSession.findMany({ where: sessionWhere, select: { visitorKey: true }, distinct: ['visitorKey'] }),
    prisma.analyticsEvent.count({ where: eventWhere }),
    prisma.analyticsSession.findMany({
      where: sessionWhere,
      select: {
        visitorKey: true,
        deviceType: true,
        referrer: true,
        startedAt: true,
      },
      orderBy: { startedAt: 'desc' },
    }),
    prisma.analyticsEvent.findMany({
      where: eventWhere,
      orderBy: { occurredAt: 'desc' },
      select: {
        path: true,
        pageTitle: true,
        occurredAt: true,
      },
    }),
    prisma.analyticsEvent.findMany({
      where: eventWhere,
      orderBy: { occurredAt: 'desc' },
      take: 12,
      select: {
        path: true,
        pageTitle: true,
        occurredAt: true,
      },
    }),
    prisma.analyticsSession.count({ where: previousSessionWhere }),
    prisma.analyticsSession.findMany({ where: previousSessionWhere, select: { visitorKey: true }, distinct: ['visitorKey'] }),
    prisma.analyticsEvent.count({ where: previousEventWhere }),
  ])

  const uniqueVisitorsCount = uniqueVisitorsRows.length
  const previousUniqueVisitorsCount = previousUniqueVisitorsRows.length
  const pagesPerVisit = visitsCount ? pageViewsCount / visitsCount : 0
  const topPages = aggregateBy(pageViews, (event) => event.path).slice(0, 8)
  const deviceSplit = aggregateBy(sessions, (session) => session.deviceType).slice(0, 5)
  const referrerSplit = aggregateBy(sessions, (session) => session.referrer || 'Diretto').slice(0, 6)
  const distinctPages = new Set(pageViews.map((event) => event.path)).size
  const series = selectedRange.key === 'day'
    ? buildHourlySeries(pageViews)
    : buildDailySeries(pageViews, selectedRange.from, selectedRange.to)
  const maxSeriesValue = Math.max(...series.map((point) => point.value), 1)

  const stats = [
    {
      label: 'Visite totali',
      value: formatAnalyticsNumber(visitsCount),
      hint: `Periodo selezionato · prima ${formatAnalyticsNumber(previousVisitsCount)}`,
    },
    {
      label: 'Visitatori unici',
      value: formatAnalyticsNumber(uniqueVisitorsCount),
      hint: `Browser anonimi distinti · prima ${formatAnalyticsNumber(previousUniqueVisitorsCount)}`,
    },
    {
      label: 'Pageview',
      value: formatAnalyticsNumber(pageViewsCount),
      hint: `Nel periodo · prima ${formatAnalyticsNumber(previousPageViewsCount)}`,
    },
    {
      label: 'Pagine distinte',
      value: formatAnalyticsNumber(distinctPages),
      hint: 'Path diversi consultati nel periodo',
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
    />
  )
}
