import AdminAnalyticsControls from '../admin/AdminAnalyticsControls'
import { formatAnalyticsDateTime, formatAnalyticsNumber, formatAnalyticsPercent, percentageOf } from '../../lib/analytics/dashboard'

export default function AnalyticsDashboard({
  currentRange,
  currentFrom,
  currentTo,
  selectedRangeLabel,
  stats,
  series,
  maxSeriesValue,
  referrerSplit,
  visitsCount,
  topPages,
  deviceSplit,
  latestPageViews,
  eyebrow,
  title,
  description,
  scopeCard = null,
  latestDescription = 'Solo dati tecnici anonimi del periodo selezionato',
  tutorialSlides = null,
}) {
  return (
    <div className="space-y-8">
      <AdminAnalyticsControls
        currentRange={currentRange}
        currentFrom={currentFrom}
        currentTo={currentTo}
        eyebrow={eyebrow}
        title={title}
        description={description}
        tutorialSlides={tutorialSlides}
      />

      {scopeCard}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-6">
        {stats.map((stat) => (
          <div key={stat.label} className="rounded-xl border border-editorial-border bg-white p-5 shadow-soft">
            <p className="mb-3 font-body text-xs uppercase tracking-widest text-editorial-text-muted">{stat.label}</p>
            <p className="mb-2 font-elegant text-4xl font-bold text-editorial-text">{stat.value}</p>
            <p className="font-body text-sm text-editorial-text-secondary">{stat.hint}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1.5fr_1fr]">
        <section className="rounded-xl border border-editorial-border bg-white p-6 shadow-soft">
          <div className="mb-5 flex items-center justify-between gap-4">
            <div>
              <h2 className="font-elegant text-2xl font-bold text-editorial-text">Trend pageview</h2>
              <p className="font-body text-sm text-editorial-text-secondary">{selectedRangeLabel}</p>
            </div>
            <span className="font-body text-xs uppercase tracking-widest text-editorial-text-muted">
              Max {formatAnalyticsNumber(maxSeriesValue)}
            </span>
          </div>

          <div className={`grid min-h-64 items-end gap-3 ${currentRange === 'day' ? 'grid-cols-4 md:grid-cols-8 xl:grid-cols-12' : 'grid-cols-2 md:grid-cols-7 xl:grid-cols-10'}`}>
            {series.map((point) => (
              <div key={point.key} className="flex flex-col items-center gap-2">
                <span className="font-body text-xs text-editorial-text-muted">{point.value}</span>
                <div className="flex h-[180px] w-full max-w-14 items-end overflow-hidden rounded-t-lg bg-editorial-terra/15">
                  <div
                    className="w-full rounded-t-lg bg-editorial-terra transition-all"
                    style={{ height: `${Math.max((point.value / maxSeriesValue) * 100, point.value > 0 ? 8 : 0)}%` }}
                  />
                </div>
                <span className="text-center font-body text-[10px] uppercase tracking-widest text-editorial-text-muted">{point.label}</span>
              </div>
            ))}
          </div>
        </section>

        <section className="space-y-5 rounded-xl border border-editorial-border bg-white p-6 shadow-soft">
          <div>
            <h2 className="font-elegant text-2xl font-bold text-editorial-text">Origine traffico</h2>
            <p className="font-body text-sm text-editorial-text-secondary">{selectedRangeLabel}</p>
          </div>

          <div className="space-y-3">
            {referrerSplit.length > 0 ? referrerSplit.map((item) => (
              <div key={item.label}>
                <div className="mb-1 flex items-center justify-between gap-3">
                  <span className="font-body text-sm text-editorial-text">{item.label}</span>
                  <span className="font-body text-sm font-semibold text-editorial-text">{formatAnalyticsPercent(percentageOf(item.value, visitsCount))}</span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-editorial-bg">
                  <div className="h-full rounded-full bg-editorial-gold" style={{ width: `${percentageOf(item.value, visitsCount)}%` }} />
                </div>
              </div>
            )) : (
              <p className="font-body text-sm text-editorial-text-secondary">Nessun dato disponibile.</p>
            )}
          </div>
        </section>
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        <section className="rounded-xl border border-editorial-border bg-white p-6 shadow-soft">
          <div className="mb-5">
            <h2 className="font-elegant text-2xl font-bold text-editorial-text">Pagine più viste</h2>
            <p className="font-body text-sm text-editorial-text-secondary">Classifica del periodo selezionato</p>
          </div>

          <div className="space-y-3">
            {topPages.length > 0 ? topPages.map((item, index) => (
              <div key={item.label} className="flex items-center justify-between gap-4 rounded-lg border border-editorial-border px-4 py-3">
                <div className="min-w-0">
                  <p className="mb-1 font-body text-xs uppercase tracking-widest text-editorial-text-muted">#{index + 1}</p>
                  <p className="truncate font-body text-sm font-semibold text-editorial-text">{item.label}</p>
                </div>
                <p className="font-elegant text-2xl font-bold text-editorial-terra">{formatAnalyticsNumber(item.value)}</p>
              </div>
            )) : (
              <p className="font-body text-sm text-editorial-text-secondary">Nessuna pagina vista registrata nel periodo selezionato.</p>
            )}
          </div>
        </section>

        <section className="rounded-xl border border-editorial-border bg-white p-6 shadow-soft">
          <div className="mb-5">
            <h2 className="font-elegant text-2xl font-bold text-editorial-text">Distribuzione dispositivi</h2>
            <p className="font-body text-sm text-editorial-text-secondary">Sessioni anonime del periodo selezionato</p>
          </div>

          <div className="space-y-3">
            {deviceSplit.length > 0 ? deviceSplit.map((item) => (
              <div key={item.label}>
                <div className="mb-1 flex items-center justify-between gap-3">
                  <span className="font-body text-sm text-editorial-text">{item.label}</span>
                  <span className="font-body text-sm font-semibold text-editorial-text">{formatAnalyticsPercent(percentageOf(item.value, visitsCount))}</span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-editorial-bg">
                  <div className="h-full rounded-full bg-editorial-forest" style={{ width: `${percentageOf(item.value, visitsCount)}%` }} />
                </div>
              </div>
            )) : (
              <p className="font-body text-sm text-editorial-text-secondary">Nessun dato disponibile.</p>
            )}
          </div>
        </section>
      </div>

      <section className="rounded-xl border border-editorial-border bg-white p-6 shadow-soft">
        <div className="mb-5">
          <h2 className="font-elegant text-2xl font-bold text-editorial-text">Ultime pageview registrate</h2>
          <p className="font-body text-sm text-editorial-text-secondary">{latestDescription}</p>
        </div>

        {latestPageViews.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="min-w-full border-separate border-spacing-y-2">
              <thead>
                <tr>
                  <th className="px-3 text-left font-body text-xs uppercase tracking-widest text-editorial-text-muted">Pagina</th>
                  <th className="px-3 text-left font-body text-xs uppercase tracking-widest text-editorial-text-muted">Titolo</th>
                  <th className="px-3 text-left font-body text-xs uppercase tracking-widest text-editorial-text-muted">Data</th>
                </tr>
              </thead>
              <tbody>
                {latestPageViews.map((event) => (
                  <tr key={`${event.path}-${event.occurredAt.toISOString()}`} className="bg-editorial-bg/60">
                    <td className="rounded-l-lg px-3 py-3 font-body text-sm font-semibold text-editorial-text">{event.path}</td>
                    <td className="px-3 py-3 font-body text-sm text-editorial-text-secondary">{event.pageTitle || '—'}</td>
                    <td className="rounded-r-lg px-3 py-3 font-body text-sm text-editorial-text-secondary">{formatAnalyticsDateTime(event.occurredAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="font-body text-sm text-editorial-text-secondary">Ancora nessuna visita registrata nel periodo selezionato.</p>
        )}
      </section>
    </div>
  )
}