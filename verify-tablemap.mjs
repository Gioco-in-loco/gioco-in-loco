import { chromium } from 'playwright'

const browser = await chromium.launch()
const page = await browser.newPage()
await page.setViewportSize({ width: 1440, height: 950 })
const errors = []
page.on('console', (msg) => { if (msg.type() === 'error') errors.push(msg.text()) })
page.on('pageerror', (err) => errors.push(String(err)))

await page.goto('http://localhost:3000/dice-fest/prenotazioni', { waitUntil: 'networkidle' })
await page.waitForSelector('text=La mappa dei tavoli')

const dayTabs = await page.locator('[role="tab"]').allTextContents()
console.log('Day tabs:', dayTabs)

for (const day of dayTabs) {
  await page.locator('[role="tab"]', { hasText: day }).click()
  await page.waitForTimeout(200)
  const rowHeaders = await page.locator('.table-map__row-header').allTextContents()
  const colHeaders = await page.locator('.table-map__col-header').allTextContents()
  console.log(`${day} -> rows:`, rowHeaders, '| cols:', colHeaders)
  await page.screenshot({ path: `verify-tablemap-${day.toLowerCase()}.png`, fullPage: true })
}

console.log('Console/page errors:', errors)
await browser.close()
