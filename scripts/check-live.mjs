import { readFile } from 'node:fs/promises'

const baseUrl = 'https://kollmeier-systems.de'
const headers = { 'cache-control': 'no-cache', pragma: 'no-cache' }

const page = await fetch(`${baseUrl}/?verify=${Date.now()}`, { headers, redirect: 'follow' })
if (!page.ok) throw new Error(`Startseite antwortet mit HTTP ${page.status}`)

const html = await page.text()
const localHtml = await readFile(new URL('../dist/index.html', import.meta.url), 'utf8')
const localCss = localHtml.match(/href="([^"?]+\.css)"/)?.[1]
if (!localCss) throw new Error('Lokaler CSS-Build konnte nicht bestimmt werden')
if (!html.includes(localCss)) {
  throw new Error(`Die Live-Seite verwendet noch nicht den aktuellen CSS-Build (${localCss})`)
}
if (!html.includes('/images/industrial-robotics.jpg')) {
  throw new Error('Das neue Hero-Bild ist auf der Live-Seite noch nicht eingebunden')
}
if (!html.includes('Technik ohne')) {
  throw new Error('Der neue Seiteninhalt ist auf der Live-Seite noch nicht vorhanden')
}

const image = await fetch(`${baseUrl}/images/industrial-robotics.jpg?verify=${Date.now()}`, { headers })
if (!image.ok) throw new Error(`Hero-Bild antwortet mit HTTP ${image.status}`)
if (!image.headers.get('content-type')?.startsWith('image/')) {
  throw new Error(`Unerwarteter Content-Type des Hero-Bilds: ${image.headers.get('content-type')}`)
}

console.log('LIVE_OK')
