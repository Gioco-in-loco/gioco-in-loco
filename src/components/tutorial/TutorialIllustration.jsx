'use client'

// Mockup schematici disegnati con semplici div/CSS (nessuna immagine reale) per
// simulare visivamente il flusso descritto nel testo dello slide. Il target di
// un'azione (cella/campo/riga su cui "cliccare") è evidenziato con un anello
// pulsante, per suggerire l'interazione senza dover ricreare la UI vera.

function ClickTarget() {
  return (
    <span className="absolute -right-1.5 -top-1.5 flex h-4 w-4 items-center justify-center">
      <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-editorial-terra/60" />
      <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-editorial-terra" />
    </span>
  )
}

function CardsIllustration({ items = [], highlightIndex = -1 }) {
  return (
    <div className="grid w-full grid-cols-2 gap-2 sm:grid-cols-3">
      {items.map((item, index) => (
        <div
          key={item.label}
          className={`relative rounded-lg border p-3 text-center font-body text-[11px] font-semibold ${
            index === highlightIndex
              ? 'border-editorial-terra bg-editorial-terra/10 text-editorial-terra'
              : 'border-editorial-border bg-white text-editorial-text-secondary'
          }`}
        >
          {item.label}
          {index === highlightIndex ? <ClickTarget /> : null}
        </div>
      ))}
    </div>
  )
}

function TableMapIllustration({ rows = 3, cols = 3, assignedCells = [], highlightRow = -1, highlightCol = -1 }) {
  const isAssigned = (r, c) => assignedCells.some(([ar, ac]) => ar === r && ac === c)
  const isHighlighted = (r, c) => r === highlightRow && c === highlightCol

  return (
    <div className="inline-grid gap-1" style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }}>
      {Array.from({ length: rows }).map((_, r) => (
        Array.from({ length: cols }).map((__, c) => (
          <div
            key={`${r}-${c}`}
            className={`relative h-8 w-12 rounded-md border sm:h-9 sm:w-14 ${
              isHighlighted(r, c)
                ? 'border-editorial-terra bg-editorial-terra/10'
                : isAssigned(r, c)
                  ? 'border-editorial-forest/40 bg-editorial-forest/10'
                  : 'border-dashed border-editorial-border bg-editorial-bg/40'
            }`}
          >
            {isHighlighted(r, c) ? <ClickTarget /> : null}
          </div>
        ))
      ))}
    </div>
  )
}

function FormIllustration({ fields = [], highlightIndex = -1, submitLabel = 'Salva' }) {
  return (
    <div className="w-full max-w-[220px] space-y-1.5">
      {fields.map((field, index) => (
        <div key={field} className="space-y-0.5">
          <div className="font-body text-[9px] font-semibold uppercase tracking-wider text-editorial-text-muted">{field}</div>
          <div
            className={`relative h-5 rounded border ${
              index === highlightIndex ? 'border-editorial-terra bg-editorial-terra/10' : 'border-editorial-border bg-white'
            }`}
          >
            {index === highlightIndex ? <ClickTarget /> : null}
          </div>
        </div>
      ))}
      <div className="relative mt-2 inline-block rounded bg-editorial-terra px-3 py-1 font-body text-[9px] font-semibold text-white">
        {submitLabel}
        {highlightIndex === fields.length ? <ClickTarget /> : null}
      </div>
    </div>
  )
}

function ListIllustration({ columns = [], rows = 3, highlightRow = -1 }) {
  return (
    <div className="w-full max-w-[240px] overflow-hidden rounded-lg border border-editorial-border bg-white">
      <div className="grid gap-px bg-editorial-border" style={{ gridTemplateColumns: `repeat(${columns.length}, minmax(0, 1fr))` }}>
        {columns.map((col) => (
          <div key={col} className="bg-editorial-bg px-2 py-1 font-body text-[8px] font-semibold uppercase tracking-wider text-editorial-text-muted">
            {col}
          </div>
        ))}
      </div>
      {Array.from({ length: rows }).map((_, r) => (
        <div
          key={r}
          className={`relative grid gap-px border-t border-editorial-border ${r === highlightRow ? 'bg-editorial-terra/10' : 'bg-white'}`}
          style={{ gridTemplateColumns: `repeat(${columns.length}, minmax(0, 1fr))` }}
        >
          {columns.map((col) => (
            <div key={col} className="px-2 py-1.5">
              <div className="h-1.5 w-full rounded-full bg-editorial-border" />
            </div>
          ))}
          {r === highlightRow ? <ClickTarget /> : null}
        </div>
      ))}
    </div>
  )
}

function ChartIllustration({ bars = [40, 70, 55, 90, 60], statLabel = 'Visite' }) {
  const max = Math.max(...bars, 1)
  return (
    <div className="w-full max-w-[220px] space-y-3">
      <div className="rounded-lg border border-editorial-border bg-white px-3 py-2">
        <p className="font-body text-[8px] font-semibold uppercase tracking-wider text-editorial-text-muted">{statLabel}</p>
        <p className="font-elegant text-lg font-bold text-editorial-text">128</p>
      </div>
      <div className="flex h-16 items-end gap-1.5 rounded-lg border border-editorial-border bg-white p-2">
        {bars.map((height, index) => (
          <div key={index} className="flex-1 rounded-t bg-editorial-terra/70" style={{ height: `${(height / max) * 100}%` }} />
        ))}
      </div>
    </div>
  )
}

export default function TutorialIllustration({ illustration }) {
  if (!illustration) return null

  return (
    <div className="flex h-40 w-full items-center justify-center rounded-xl border border-editorial-border bg-editorial-bg/30 p-4 sm:h-48">
      {illustration.type === 'cards' ? <CardsIllustration {...illustration} /> : null}
      {illustration.type === 'tableMap' ? <TableMapIllustration {...illustration} /> : null}
      {illustration.type === 'form' ? <FormIllustration {...illustration} /> : null}
      {illustration.type === 'list' ? <ListIllustration {...illustration} /> : null}
      {illustration.type === 'chart' ? <ChartIllustration {...illustration} /> : null}
    </div>
  )
}
