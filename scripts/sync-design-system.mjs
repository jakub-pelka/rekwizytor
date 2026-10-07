#!/usr/bin/env node
// Synchronizuje design system „Rekwizytor” z docs/redesign/design-system do styles/rk/.
// Uruchom po każdej zmianie w systemie: node scripts/sync-design-system.mjs
// Pliki w styles/rk/ są generowane. Nie edytuj ich ręcznie.

import { readFileSync, writeFileSync, mkdirSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const dsDir = join(root, 'docs/redesign/design-system')
const outDir = join(root, 'styles/rk')

const HEADER = '/* Wygenerowane przez scripts/sync-design-system.mjs z docs/redesign/design-system. Nie edytuj ręcznie. */\n'

// Fonty ładuje next/font (app/[locale]/layout.tsx), więc rodziny wskazują na jego zmienne.
const FONT_FAMILIES = {
    display: 'var(--font-boldonse), Boldonse, Impact, sans-serif',
    sans: 'var(--font-geist-sans), Geist, system-ui, -apple-system, sans-serif',
    typewriter: 'var(--font-courier-prime), "Courier Prime", "Courier New", monospace',
}

const tokens = JSON.parse(readFileSync(join(dsDir, 'tokens.json'), 'utf8'))

const resolveRef = (value) => value.replace(/\{([a-z0-9-]+)\}/g, 'var(--$1)')

const themed = { dark: [], light: [] }
const shared = []

for (const t of [...tokens.color.tokens, ...tokens.shadow.tokens]) {
    if (typeof t.value === 'string') {
        shared.push(`  --${t.name}: ${resolveRef(t.value)};`)
        continue
    }
    themed.dark.push(`  --${t.name}: ${resolveRef(t.value.dark)};`)
    if (t.value.light !== t.value.dark) themed.light.push(`  --${t.name}: ${resolveRef(t.value.light)};`)
}
for (const t of [...tokens.spacing.tokens, ...tokens.radius.tokens]) shared.push(`  --${t.name}: ${t.value};`)
for (const [name, value] of Object.entries(FONT_FAMILIES)) shared.push(`  --font-${name}: ${value};`)

const tokensCss = `${HEADER}
/* Kulisy (ciemny, domyślny); [data-theme="dark"] przywraca go w zagnieżdżonym kontenerze. */
:root, :host, [data-theme="dark"] {
${[...shared, ...themed.dark].join('\n')}
  color-scheme: dark;
}

/* Biuro (jasny) */
[data-theme="light"] {
${themed.light.join('\n')}
  color-scheme: light;
}
`

// Bundle importuje fonty z Google Fonts; w aplikacji robi to next/font.
const bundle = readFileSync(join(dsDir, 'components/bundle.css'), 'utf8')
    .replace(/^@import url\("https:\/\/fonts\.googleapis\.com[^\n]*\n/m, '')

mkdirSync(outDir, { recursive: true })
writeFileSync(join(outDir, 'tokens.css'), tokensCss)
writeFileSync(join(outDir, 'components.css'), HEADER + bundle)

console.log(`styles/rk/tokens.css: ${themed.dark.length + shared.length} tokenów (${themed.light.length} nadpisań dla motywu jasnego)`)
console.log('styles/rk/components.css: skopiowano bundle.css')
