const DAY_MS = 24 * 60 * 60 * 1000

export function formatAnalyticsNumber(value) {
  return new Intl.NumberFormat('it-IT').format(value)
}

export function formatAnalyticsPercent(value) {
  return `${value.toFixed(1)}%`
}

export function percentageOf(value, total) {
  if (!total) return 0
  return (value / total) * 100
}

function startOfDay(date) {
  const next = new Date(date)
  next.setHours(0, 0, 0, 0)
  return next
}

function endOfDay(date) {
  const next = new Date(date)
  next.setHours(23, 59, 59, 999)
  return next
}

function parseDateInput(value) {
  if (typeof value !== 'string' || !value.trim()) {
    return null
  }

  const date = new Date(`${value}T00:00:00`)
  if (Number.isNaN(date.getTime())) {
    return null
  }

  return date
}

export function parseAnalyticsRange(searchParams) {
  const range = searchParams?.range || 'month'

  if (range === 'day') {
    return {
      key: 'day',
      label: 'Ultimo giorno',
      from: new Date(Date.now() - DAY_MS),
      to: new Date(),
    }
  }

  if (range === 'week') {
    return {
      key: 'week',
      label: 'Ultima settimana',
      from: new Date(Date.now() - 7 * DAY_MS),
      to: new Date(),
    }
  }

  if (range === 'custom') {
    const from = parseDateInput(searchParams?.from)
    const to = parseDateInput(searchParams?.to)

    if (from && to && from <= to) {
      return {
        key: 'custom',
        label: 'Range personalizzato',
        from: startOfDay(from),
        to: endOfDay(to),
      }
    }
  }

  return {
    key: 'month',
    label: 'Ultimo mese',
    from: new Date(Date.now() - 30 * DAY_MS),
    to: new Date(),
  }
}

export function buildDailySeries(events, from, to) {
  const labels = []
  const counts = new Map()
  const cursor = startOfDay(from)
  const limit = endOfDay(to)

  while (cursor <= limit) {
    const key = cursor.toISOString().slice(0, 10)
    labels.push(key)
    counts.set(key, 0)
    cursor.setDate(cursor.getDate() + 1)
  }

  events.forEach((event) => {
    const key = event.occurredAt.toISOString().slice(0, 10)
    if (counts.has(key)) {
      counts.set(key, counts.get(key) + 1)
    }
  })

  return labels.map((key) => ({
    key,
    label: new Intl.DateTimeFormat('it-IT', { day: '2-digit', month: 'short' }).format(new Date(`${key}T00:00:00`)),
    value: counts.get(key) || 0,
  }))
}

export function buildHourlySeries(events) {
  const counts = new Map(Array.from({ length: 24 }, (_, hour) => [hour, 0]))

  events.forEach((event) => {
    counts.set(event.occurredAt.getHours(), (counts.get(event.occurredAt.getHours()) || 0) + 1)
  })

  return [...counts.entries()].map(([hour, value]) => ({
    key: String(hour),
    label: `${String(hour).padStart(2, '0')}:00`,
    value,
  }))
}

export function aggregateBy(items, keyFn) {
  const counts = new Map()

  items.forEach((item) => {
    const key = keyFn(item)
    if (!key) return
    counts.set(key, (counts.get(key) || 0) + 1)
  })

  return [...counts.entries()]
    .map(([label, value]) => ({ label, value }))
    .sort((left, right) => right.value - left.value)
}

export function formatAnalyticsDateTime(value) {
  return new Intl.DateTimeFormat('it-IT', { dateStyle: 'short', timeStyle: 'short' }).format(value)
}

export function formatDateForInput(value) {
  return value.toISOString().slice(0, 10)
}

export function uniqueBy(items, keyFn) {
  const uniqueItems = new Map()

  items.forEach((item) => {
    const key = keyFn(item)
    if (!key || uniqueItems.has(key)) return
    uniqueItems.set(key, item)
  })

  return [...uniqueItems.values()]
}