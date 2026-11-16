import { readFile } from 'node:fs/promises'

const index = await readFile(new URL('../src/pages/index.astro', import.meta.url), 'utf8')
const layout = await readFile(new URL('../src/layouts/Layout.astro', import.meta.url), 'utf8')

const required = [
  'CAD & Konstruktion',
  'Automatisierung',
  '3D-Druck & Prototyping',
  'Technische KI-Lösungen',
  'kollmeier.robin@gmail.com',
  'https://api.web3forms.com/submit',
  'Impressum',
  'Datenschutz',
]

const missing = required.filter((text) => !index.includes(text))
if (missing.length) throw new Error(`Inhalte fehlen: ${missing.join(', ')}`)
if (!layout.includes('lang="de"')) throw new Error('Deutsche Dokumentsprache fehlt')
if (!layout.includes('canonical')) throw new Error('Canonical-Metadaten fehlen')

console.log('CONTENT_OK')
