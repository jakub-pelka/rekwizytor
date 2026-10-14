#!/usr/bin/env node
// Spektakl demonstracyjny „Wesele” (krok 4 redesignu): 2 akty, sceny, ok. 40 rekwizytów z opisami,
// magazyn z grupami w różnych stanach, wyjątki obsad i terminy od dziś.
// Uruchom: node --env-file=.env.local scripts/seed-demo-wesele.mjs
// Wymaga NEXT_PUBLIC_SUPABASE_URL i SUPABASE_SERVICE_ROLE_KEY. Nie nadpisuje istniejącego „Wesela”.
// Dane są wymyślone; nie używamy nazw ani danych prawdziwych teatrów.

const URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const KEY = process.env.SUPABASE_SERVICE_ROLE_KEY
if (!URL || !KEY) throw new Error('Brak NEXT_PUBLIC_SUPABASE_URL albo SUPABASE_SERVICE_ROLE_KEY')

const headers = { apikey: KEY, Authorization: `Bearer ${KEY}`, 'Content-Type': 'application/json', Prefer: 'return=representation' }

async function api(path, { method = 'GET', body } = {}) {
    const res = await fetch(`${URL}/rest/v1/${path}`, { method, headers, body: body && JSON.stringify(body) })
    if (!res.ok) throw new Error(`${method} ${path}: ${res.status} ${await res.text()}`)
    return res.status === 204 ? null : res.json()
}

// Dane demo należą do teatru demo (migracja 20261011_theatres). Klucz serwisowy omija RLS, więc wiersze bez
// rodzica (spektakl, pomieszczenie) dostają teatr wprost; resztę ustawia wyzwalacz z rodzica.
const [demo] = await api('theatres?is_demo=eq.true&select=id')
if (!demo) throw new Error('Brak teatru demo. Najpierw migracja supabase/migrations/20261011_theatres.sql')
const T = demo.id

const existing = await api(`performances?title=eq.Wesele&deleted_at=is.null&theatre_id=eq.${T}&select=id`)
if (existing.length) {
    console.log(`„Wesele” już istnieje (${existing[0].id}). Nic nie zmieniam.`)
    process.exit(0)
}

// Czas lokalny teatru bez strefy, tak jak scene_checklists.show_date.
const warsaw = (d) => new Intl.DateTimeFormat('sv-SE', {
    timeZone: 'Europe/Warsaw', year: 'numeric', month: '2-digit', day: '2-digit',
}).format(d)
const day = (offset) => warsaw(new Date(Date.now() + offset * 86_400_000))

// Magazyn ---------------------------------------------------------------------------

const [workshop] = await api('locations', { method: 'POST', body: { name: 'Pracownia rekwizytorska', type: 'main_storage', description: 'Demo: Wesele', theatre_id: T } })
const shelves = await api('locations', {
    method: 'POST',
    body: ['Szafa A', 'Szafa B', 'Szafa C', 'Kufer 3', 'Szuflada 4'].map(name => ({ name, type: 'main_storage', belongs_to: workshop.id })),
})
const loc = Object.fromEntries(shelves.map(l => [l.name, l.id]))

const groupDefs = [
    { key: 'szklo', name: 'Szkło i butelki', location: 'Szafa B' },
    { key: 'srebro', name: 'Srebra stołowe', location: 'Szafa B', status: 'in_repair', status_note: 'odbiór 16:00' },
    { key: 'papier', name: 'Gazety i druki', location: 'Szafa A' },
    { key: 'bron', name: 'Broń biała', location: 'Szafa C', status: 'loaned', status_note: 'wraca 17:00' },
    { key: 'wience', name: 'Wieńce i kwiaty', location: 'Szafa C', status: 'missing', status_note: 'ostatnio Szafa C' },
    { key: 'tkaniny', name: 'Tkaniny weselne', location: 'Kufer 3' },
    { key: 'drobne', name: 'Drobiazgi osobiste', location: 'Szuflada 4' },
    { key: 'swiatlo', name: 'Świece i lichtarze', location: 'Szafa B' },
    { key: 'muzyka', name: 'Instrumenty', location: 'Szafa A' },
]
const groups = await api('groups', {
    method: 'POST',
    body: groupDefs.map(g => ({ name: g.name, location_id: loc[g.location], status: g.status ?? 'available', status_note: g.status_note ?? null })),
})
const grp = Object.fromEntries(groupDefs.map((g, i) => [g.key, groups[i].id]))

// Spektakl i sceny -------------------------------------------------------------------

const [perf] = await api('performances', {
    method: 'POST',
    body: { theatre_id: T, title: 'Wesele', status: 'active', venue: 'Duża scena', structure: 'acts_scenes', premiere_date: '2026-03-14', color: '#A0232F' },
})

const sceneDefs = [
    [0, 0, 'Stół rekwizytów i scena', 'preparation'],
    [1, 1, 'Przed chatą'], [1, 2, 'Czepiec i Dziennikarz'], [1, 3, 'Izba weselna, toast'], [1, 4, 'Pan Młody i Panna Młoda'],
    [1, 5, 'Radczyni, Klimina'], [1, 6, 'Poeta i Rachel'], [1, 7, 'Zaproszenie Chochoła'], [1, 8, 'Taniec w izbie'],
    [1, 9, 'Przerwa', 'intermission'],
    [2, 10, 'Chochoł'], [2, 11, 'Wernyhora'], [2, 12, 'Złoty róg'], [2, 13, 'Jasiek'], [2, 14, 'Gospodarz'], [2, 15, 'Chocholi taniec'],
]
await api('scenes', {
    method: 'POST',
    body: sceneDefs.map(([act, n, name, type]) => ({ performance_id: perf.id, act_number: act, scene_number: n, name, type: type ?? 'scene' })),
})

// Rekwizyty: [nazwa, numer sceny, miejsce na liście, jak, gdzie, grupa, obsada]
const STOL_L = 'Stół · lewa kulisa'
const STOL_P = 'Stół · prawa kulisa'
const SCENA_1 = 'Scena · akt I'
const SCENA_2 = 'Scena · akt II'
const GARD = 'Garderoba'

const propDefs = [
    ['Obrus haftowany', 0, SCENA_1, 'Wyprasowany, haftem do widowni', 'Stół weselny, zwisa równo po obu stronach', 'tkaniny'],
    ['Ława z poduszkami', 0, SCENA_1, 'Trzy poduszki, czerwona w środku', 'Pod oknem, lewa strona, metr od kulisy'],
    ['Świece w lichtarzach × 6', 0, SCENA_1, 'Zapalić 10 minut przed, knoty przycięte', 'Stół weselny, po trzy z każdej strony', 'swiatlo'],
    ['Zapałki sztormowe', 0, STOL_L, 'Pełne pudełko, drugie w zapasie', 'Szuflada stołu rekwizytów', 'drobne'],
    ['Gaśnica proszkowa', 0, STOL_L, 'Sprawdzić plombę i ciśnienie', 'Przy wyjściu z lewej kulisy'],
    ['Wazon z polnymi kwiatami', 0, SCENA_1, 'Świeża woda do połowy', 'Parapet okna, środek', 'wience'],
    ['Lampa naftowa', 1, SCENA_1, 'Knot podkręcony na pół, bez nafty', 'Na beczce przy drzwiach chaty', 'swiatlo'],
    ['Beczka', 1, SCENA_1, null, 'Prawa strona, przy drzwiach chaty'],
    ['Gazeta „Czas”', 2, STOL_L, 'Dla Dziennikarza. Złożona na pół, tytułem na zewnątrz', 'Środek stołu, pod szarą chustą', 'papier'],
    ['Fajka gliniana', 3, STOL_L, 'Nabita suszem bez tytoniu', 'Czepiec wnosi w lewej kieszeni kamizelki', 'drobne', 'first'],
    ['Butelka wina × 2', 3, STOL_L, 'Napełnione sokiem porzeczkowym, korki wciśnięte do połowy', 'Górna półka stołu, lewa strona', 'szklo'],
    ['Kielich srebrny', 3, STOL_L, 'Pełny, woda do połowy', 'Na stole, prawa strona, przy lichtarzu', 'srebro'],
    ['Kieliszki × 8', 3, STOL_L, 'Wypolerowane, dwa w zapasie', 'Taca na dolnej półce stołu', 'szklo'],
    ['Wstążki weselne', 3, STOL_L, 'Pęk 12 sztuk, rozplątane i luźno związane', 'Dolna półka stołu', 'tkaniny'],
    ['Okulary w drucianej oprawie', 4, STOL_L, 'Dla Pana Młodego (obsada B), w zamkniętym etui', 'Prawy róg stołu', 'drobne', 'second'],
    ['Pierścionek zaręczynowy', 4, GARD, 'W aksamitnym woreczku', 'Kieszeń surduta Pana Młodego'],
    ['Chusta Radczyni', 5, GARD, 'Wyprasowana, zapięta agrafką', 'Wieszak przy lustrze, numer 3', 'tkaniny'],
    ['Wachlarz', 5, GARD, 'Rozłożyć i sprawdzić, czy nie skrzypi', 'Toaletka Radczyni, lewa strona'],
    ['Tomik wierszy', 6, STOL_P, 'Zakładka na stronie 40', 'Górna półka stołu, prawa strona', 'papier'],
    ['Pióro i kałamarz', 6, STOL_P, 'Kałamarz pusty, pióro bez stalówki', 'Obok tomiku', 'drobne'],
    ['Szal Racheli', 6, GARD, 'Lekki, nie składać w kostkę', 'Wieszak Racheli', 'tkaniny'],
    ['Chochoł ze słomy', 7, STOL_P, 'Rozczesać słomę, sprawdzić stelaż', 'Za prawą kulisą, oparty o ścianę'],
    ['Skrzypce', 8, STOL_P, 'Struny nastrojone, smyczek kalafoniowany', 'Futerał na krześle przy wejściu', 'muzyka'],
    ['Bęben weselny', 8, STOL_P, 'Naciąg sprawdzony', 'Pod stołem, prawa strona', 'muzyka'],
    ['Wieniec z kłosów', 10, SCENA_2, 'Kłosy związane czerwoną wstążką', 'Na środku izby, na haku', 'wience'],
    ['Latarnia', 10, SCENA_2, 'Świeca LED, sprawdzić baterie', 'Przy drzwiach izby', 'swiatlo'],
    ['Lira korbowa', 11, STOL_P, 'Korbka nasmarowana', 'Wernyhora wnosi, czeka na stole', 'muzyka'],
    ['Podkowa', 11, STOL_P, 'Owinięta w płótno', 'Kieszeń płaszcza Wernyhory'],
    ['Złoty róg', 12, STOL_P, 'Wypolerowany, sznur bez supłów', 'Środek stołu, na aksamicie', 'muzyka'],
    ['Czapka z piórami', 12, GARD, 'Pióra wyprostowane', 'Półka nad wieszakiem Jaśka'],
    ['Szabla kawaleryjska', 13, STOL_P, 'Wyczyszczona, w pochwie', 'Stojak przy prawej kulisie', 'bron'],
    ['Kosy × 4', 13, SCENA_2, 'Ostrza zabezpieczone taśmą', 'Oparte o ścianę stodoły', 'bron'],
    ['Sznur do dzwonu', 14, SCENA_2, 'Rozwinięty, bez supłów', 'Zwisa z rampy po lewej'],
    ['Kubek blaszany', 14, STOL_P, 'Pusty', 'Dolna półka stołu', 'szklo'],
    ['Taca z chlebem', 14, STOL_P, 'Chleb świeży, pokrojony na pół', 'Górna półka stołu'],
    ['Kufel gliniany', 15, STOL_P, 'Pusty, ucho do widowni', 'Na beczce w izbie', 'szklo'],
    ['Pęk kluczy', 15, STOL_L, 'Sześć kluczy na kółku', 'Haczyk na boku stołu', 'drobne'],
    ['Chusty do tańca × 6', 15, GARD, 'Rozdać tancerzom przed wejściem', 'Kosz przy wyjściu z garderoby', 'tkaniny'],
    ['Krzyż drewniany', 15, SCENA_2, null, 'Ściana izby, nad stołem'],
    ['Kosz z jabłkami', 15, SCENA_2, 'Jabłka umyte, sztuczne na spodzie', 'Przy ławie, prawa strona'],
]

const props = await api('performance_props', {
    method: 'POST',
    body: propDefs.map(([name, scene, area, how, where, group, cast], i) => ({
        performance_id: perf.id,
        item_name: name,
        scene_number: scene,
        act_number: scene === 0 ? 0 : scene <= 9 ? 1 : 2,
        area,
        description: [how, where].filter(Boolean).join(', '),
        prep: how,
        place: where,
        structured_at: new Date().toISOString(),
        group_id: group ? grp[group] : null,
        cast_only: cast ?? null,
        order: i,
    })),
})

// Terminy i listy zadań -------------------------------------------------------------

const lists = await api('show_lists', {
    method: 'POST',
    body: [
        { performance_id: perf.id, show_date: `${day(-1)}T11:00:00`, kind: 'rehearsal', cast: 'second' },
        { performance_id: perf.id, show_date: `${day(0)}T19:00:00`, kind: 'show', cast: 'second' },
        { performance_id: perf.id, show_date: `${day(2)}T19:00:00`, kind: 'show', cast: 'first' },
        { performance_id: perf.id, show_date: `${day(5)}T18:00:00`, kind: 'show', cast: 'second' },
    ],
})
const [rehearsal, today] = lists

// Próba zamknięta, a przed dzisiejszym spektaklem zrobiona mniej więcej 3/4.
const castOk = (p, cast) => !p.cast_only || p.cast_only === cast
const checks = [
    ...props.filter(p => castOk(p, 'second')).map(p => ({ show_list_id: rehearsal.id, performance_prop_id: p.id, stage: 'rehearsal' })),
    // Po próbie wszystko z magazynu wróciło na miejsce (etap „po spektaklu” obejmuje rzeczy z grupą).
    ...props.filter(p => castOk(p, 'second') && p.group_id).map(p => ({ show_list_id: rehearsal.id, performance_prop_id: p.id, stage: 'postshow' })),
    ...props.filter((p, i) => castOk(p, 'second') && i % 4 !== 1 && !['srebro', 'bron', 'wience'].some(k => p.group_id === grp[k]))
        .map(p => ({ show_list_id: today.id, performance_prop_id: p.id, stage: 'preshow' })),
]
await api('show_list_checks', { method: 'POST', body: checks })

console.log(`Gotowe: „Wesele” (${perf.id}), ${props.length} rekwizytów, ${groups.length} grup, ${lists.length} terminy, ${checks.length} odhaczeń.`)
