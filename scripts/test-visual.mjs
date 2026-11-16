import { chromium } from 'playwright-core'
import { spawn } from 'node:child_process'
import { existsSync } from 'node:fs'
import { mkdir } from 'node:fs/promises'
import path from 'node:path'

const root = path.resolve(import.meta.dirname, '..')
const output = path.join(root, 'artifacts', 'visual')
await mkdir(output, { recursive: true })

const candidates = process.platform === 'win32'
  ? [
      process.env.PLAYWRIGHT_CHROME_PATH,
      'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
      'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
      'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
      'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe',
    ]
  : ['/usr/bin/google-chrome', '/usr/bin/chromium', '/usr/bin/chromium-browser']
const executablePath = candidates.find((candidate) => candidate && existsSync(candidate))
if (!executablePath) throw new Error('Kein lokaler Chromium-Browser für den visuellen Test gefunden')

const astroCli = path.join(root, 'node_modules', 'astro', 'bin', 'astro.mjs')
const server = spawn(process.execPath, [astroCli, 'preview', '--host', '127.0.0.1', '--port', '4321'], {
  cwd: root,
  stdio: ['ignore', 'pipe', 'pipe'],
  windowsHide: true,
})

let serverLog = ''
server.stdout.on('data', (data) => { serverLog += data })
server.stderr.on('data', (data) => { serverLog += data })

async function waitForServer() {
  for (let attempt = 0; attempt < 50; attempt += 1) {
    try {
      const response = await fetch('http://127.0.0.1:4321/')
      if (response.ok) return
    } catch {}
    await new Promise((resolve) => setTimeout(resolve, 100))
  }
  throw new Error(`Preview-Server nicht erreichbar:\n${serverLog}`)
}

const browser = await chromium.launch({ headless: true, executablePath })
const errors = []

try {
  await waitForServer()
  const profiles = [
    { name: 'desktop', viewport: { width: 1440, height: 1000 } },
    { name: 'mobile', viewport: { width: 390, height: 844 } },
  ]

  for (const profile of profiles) {
    const context = await browser.newContext({ viewport: profile.viewport, colorScheme: 'light' })
    const page = await context.newPage()
    page.on('console', (message) => { if (message.type() === 'error') errors.push(`${profile.name}: console: ${message.text()}`) })
    page.on('pageerror', (error) => errors.push(`${profile.name}: page: ${error.message}`))

    for (const route of ['/', '/impressum/', '/datenschutz/']) {
      const response = await page.goto(`http://127.0.0.1:4321${route}`, { waitUntil: 'networkidle' })
      if (!response?.ok()) errors.push(`${profile.name}: ${route} HTTP ${response?.status()}`)
      const metrics = await page.evaluate(() => ({ width: window.innerWidth, scrollWidth: document.documentElement.scrollWidth }))
      if (metrics.scrollWidth > metrics.width + 1) {
        const offenders = await page.locator('body *').evaluateAll((items) => items
          .map((item) => ({ tag: item.tagName.toLowerCase(), className: item.className?.toString?.() || '', rect: item.getBoundingClientRect() }))
          .filter((item) => item.rect.right > window.innerWidth + 1 || item.rect.left < -1)
          .slice(0, 8)
          .map((item) => `${item.tag}.${item.className} [${Math.round(item.rect.left)},${Math.round(item.rect.right)}]`))
        errors.push(`${profile.name}: ${route} horizontaler Overflow ${metrics.scrollWidth}/${metrics.width}: ${offenders.join(', ')}`)
      }
    }

    await page.goto('http://127.0.0.1:4321/', { waitUntil: 'networkidle' })
    await page.getByRole('heading', { name: /Aus Ideen werden/ }).waitFor()
    await page.getByRole('heading', { name: 'CAD & Konstruktion' }).waitFor()
    await page.getByRole('heading', { name: /Welches technische Problem/ }).waitFor()

    if (profile.name === 'mobile') {
      const toggle = page.locator('#nav-toggle')
      await toggle.click()
      if (await toggle.getAttribute('aria-expanded') !== 'true') errors.push('mobile: Navigation öffnet nicht')
      await page.keyboard.press('Escape')
      if (await toggle.getAttribute('aria-expanded') !== 'false') errors.push('mobile: Navigation schließt nicht per Escape')
    }

    const pageHeight = await page.evaluate(() => document.documentElement.scrollHeight)
    for (let y = 0; y < pageHeight; y += Math.max(300, Math.floor(profile.viewport.height * .75))) {
      await page.evaluate((scrollY) => window.scrollTo(0, scrollY), y)
      await page.waitForTimeout(35)
    }
    const unrevealed = await page.locator('.reveal:not(.is-visible)').count()
    if (unrevealed) errors.push(`${profile.name}: ${unrevealed} Scroll-Reveals wurden nicht aktiviert`)
    await page.evaluate(() => window.scrollTo(0, 0))
    await page.screenshot({ path: path.join(output, `${profile.name}-homepage.png`), fullPage: true })
    await context.close()
  }

  const reduced = await browser.newContext({ viewport: { width: 1280, height: 800 }, reducedMotion: 'reduce' })
  const reducedPage = await reduced.newPage()
  await reducedPage.goto('http://127.0.0.1:4321/', { waitUntil: 'networkidle' })
  const hiddenReveal = await reducedPage.locator('[data-reveal]').evaluateAll((items) => items.filter((item) => getComputedStyle(item).opacity === '0').length)
  if (hiddenReveal) errors.push(`reduced-motion: ${hiddenReveal} Inhalte bleiben verborgen`)
  await reduced.close()

  if (errors.length) throw new Error(errors.join('\n'))
  console.log(`VISUAL_OK ${output}`)
} finally {
  await browser.close()
  server.kill()
}
