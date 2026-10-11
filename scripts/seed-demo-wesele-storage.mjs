#!/usr/bin/env node
// Uzupełnienie spektaklu „Wesele” o nowy magazyn (po migracji storage_model): rodzaje pojemników, półki,
// przedmioty z numerami REK- i stanami, „kto bierze” w trybie na żywo.
// Uruchom po seed-demo-wesele.mjs: node --env-file=.env.local scripts/seed-demo-wesele-storage.mjs
// Powtarzalny: gdy półki „Szafa B › Półka 1” już istnieją, nic nie robi. Dane wymyślone.

const URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const KEY = process.env.SUPABASE_SERVICE_ROLE_KEY
if (!URL || !KEY) throw new Error('Brak NEXT_PUBLIC_SUPABASE_URL albo SUPABASE_SERVICE_ROLE_KEY')

const headers = { apikey: KEY, Authorization: `Bearer ${KEY}`, 'Content-Type': 'application/json', Prefer: 'return=representation' }

async function api(path, { method = 'GET', body } = {}) {
    const res = await fetch(`${URL}/rest/v1/${path}`, { method, headers, body: body && JSON.stringify(body) })
    if (!res.ok) throw new Error(`${method} ${path}: ${res.status} ${await res.text()}`)
    return res.status === 204 ? null : res.json()
}

const [perf] = await api('performances?title=eq.Wesele&deleted_at=is.null&select=id')
if (!perf) throw new Error('Najpierw uruchom scripts/seed-demo-wesele.mjs')

const [room] = await api('locations?name=eq.Pracownia rekwizytorska&belongs_to=is.null&select=id')
const children = await api(`locations?belongs_to=eq.${room.id}&select=id,name,kind`)
const byName = Object.fromEntries(children.map(c => [c.name, c]))

if ((await api(`group_items?name=eq.Kask strażacki&select=id`)).length) {
    console.log('Magazyn „Wesela” już uzupełniony. Nic nie zmieniam.')
    process.exit(0)
}

// Rodzaje istniejących pojemników.
const kinds = { 'Szafa A': 'wardrobe', 'Szafa B': 'wardrobe', 'Szafa C': 'wardrobe', 'Kufer 3': 'trunk', 'Szuflada 4': 'box' }
for (const [name, kind] of Object.entries(kinds)) {
    if (byName[name]) await api(`locations?id=eq.${byName[name].id}`, { method: 'PATCH', body: { kind } })
}

// Półki w szafach (półka to osobny pojemnik ze skanowalną etykietą).
// Wznawialne: półki, które już istnieją (po przerwanym uruchomieniu), zostają, brakujące dopisujemy.
const wanted = [
    ...[1, 2, 3].map(n => ({ name: `Półka ${n}`, kind: 'shelf', type: 'other', belongs_to: byName['Szafa B'].id })),
    ...[1, 2].map(n => ({ name: `Półka ${n}`, kind: 'shelf', type: 'other', belongs_to: byName['Szafa A'].id })),
]
const existing = await api(`locations?kind=eq.shelf&belongs_to=in.(${byName['Szafa A'].id},${byName['Szafa B'].id})&select=id,name,belongs_to`)
const missing = wanted.filter(w => !existing.some(e => e.name === w.name && e.belongs_to === w.belongs_to))
const created = missing.length ? await api('locations', { method: 'POST', body: missing }) : []
const shelves = [...existing, ...created]
const shelf = (parent, n) => shelves.find(s => s.name === `Półka ${n}` && s.belongs_to === byName[parent].id).id

// Grupy na półkach.
const groups = Object.fromEntries((await api('groups?deleted_at=is.null&select=id,name')).map(g => [g.name, g.id]))
const place = { 'Szkło i butelki': shelf('Szafa B', 2), 'Srebra stołowe': shelf('Szafa B', 2), 'Świece i lichtarze': shelf('Szafa B', 1), 'Gazety i druki': shelf('Szafa A', 1), 'Instrumenty': shelf('Szafa A', 2) }
for (const [name, loc] of Object.entries(place)) {
    if (groups[name]) await api(`groups?id=eq.${groups[name]}`, { method: 'PATCH', body: { location_id: loc } })
}
const approx = { 'Szkło i butelki': 30, 'Gazety i druki': 40, 'Świece i lichtarze': 15, 'Tkaniny weselne': 24 }
for (const [name, n] of Object.entries(approx)) {
    if (groups[name]) await api(`groups?id=eq.${groups[name]}`, { method: 'PATCH', body: { approx_count: n } })
}

// Przedmioty rozpisane z grup (z numerami REK- nadawanymi przez bazę) i stanami.
// Po jednym wpisie: PostgREST odrzuca paczkę, w której obiekty mają różne klucze.
const itemRows = [
        { group_id: groups['Srebra stołowe'], name: 'Kielich srebrny', status: 'in_repair', status_note: 'odbiór 16:00' },
        { group_id: groups['Srebra stołowe'], name: 'Lichtarz mosiężny × 6' },
        { group_id: groups['Szkło i butelki'], name: 'Butelka wina × 2' },
        { group_id: groups['Szkło i butelki'], name: 'Kieliszki × 8' },
        { group_id: groups['Świece i lichtarze'], name: 'Latarnia' },
        { group_id: groups['Instrumenty'], name: 'Skrzypce' },
        // Kask leży luzem na półce, bo nie mieści się do pudła (przykład z POMYSLY 13).
        { location_id: shelf('Szafa B', 3), name: 'Kask strażacki' },
]
const items = []
for (const row of itemRows) items.push(...await api('group_items', { method: 'POST', body: row }))
const item = Object.fromEntries(items.map(i => [i.name, i.id]))

// Rekwizyty w rozpisce wskazują konkretne przedmioty; „kto bierze” w trybie na żywo.
const props = await api(`performance_props?performance_id=eq.${perf.id}&select=id,item_name`)
const link = { 'Kielich srebrny': 'Kielich srebrny', 'Butelka wina × 2': 'Butelka wina × 2', 'Kieliszki × 8': 'Kieliszki × 8', 'Latarnia': 'Latarnia', 'Skrzypce': 'Skrzypce' }
const handler = {
    'Gazeta „Czas”': 'Dziennikarz', 'Fajka gliniana': 'Czepiec', 'Okulary w drucianej oprawie': 'Pan Młody',
    'Kielich srebrny': 'Gospodarz', 'Wstążki weselne': 'Panna Młoda', 'Pierścionek zaręczynowy': 'Pan Młody',
    'Tomik wierszy': 'Poeta', 'Szal Racheli': 'Rachela', 'Skrzypce': 'Muzykant', 'Szabla kawaleryjska': 'Jasiek',
}
for (const p of props) {
    const patch = {}
    if (link[p.item_name] && item[link[p.item_name]]) patch.item_id = item[link[p.item_name]]
    if (handler[p.item_name]) patch.handler = handler[p.item_name]
    if (Object.keys(patch).length) await api(`performance_props?id=eq.${p.id}`, { method: 'PATCH', body: patch })
}

console.log(`Gotowe: ${shelves.length} półek, ${items.length} przedmiotów, rekwizyty powiązane i z polem „kto bierze”.`)
