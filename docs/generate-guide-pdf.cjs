const path = require('path')
const { chromium } = require('playwright')

async function main() {
  const htmlPath = path.join(__dirname, 'guida-responsabili.html')
  const pdfPath = path.join(__dirname, 'guida-responsabili.pdf')

  const browser = await chromium.launch()
  const page = await browser.newPage()
  await page.goto(`file://${htmlPath}`, { waitUntil: 'networkidle' })
  await page.evaluate(() => document.fonts.ready)

  await page.pdf({
    path: pdfPath,
    format: 'A4',
    printBackground: true,
    margin: { top: '14mm', bottom: '14mm', left: '10mm', right: '10mm' },
  })

  await browser.close()
  console.log(`PDF generato: ${pdfPath}`)
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
