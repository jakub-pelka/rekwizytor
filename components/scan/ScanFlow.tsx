'use client'

import { useEffect, useRef, useState } from 'react'
import { useTranslations } from 'next-intl'
import { Camera, Check, ChevronDown, ChevronLeft, Layers, Plus } from 'lucide-react'
import { useRouter } from '@/i18n/routing'
import { notify } from '@/utils/notify'
import { RkIcon } from '@/components/rk/RkIcon'
import { Button } from '@/components/ui/Button'
import { Modal } from '@/components/ui/Modal'
import { useDesktop } from './use-desktop'
import { ScanDesktop } from './ScanDesktop'
import type { PlaceNode } from './ScanPlacePicker'
import { boxArea, pinPositions, type ScanRow } from './scan-pins'
import { saveScan, scanPhotoBoth, type ScanFinding, type ScanImageSize, type ScanMode } from '@/app/actions/scan-photo'

type Place = { id: string; label: string }
type Props = { places: Place[]; tree: PlaceNode[]; initialPlace: string | null; canEdit: boolean }
type Recognition = { status: 'pending' | 'done' | 'error'; findings: ScanFinding[]; error?: string }
type Row = ScanRow

const LAST_PLACE = 'rk-scan-place'
const RECENT_PLACES = 'rk-scan-recent'
// Ok. 1,15 Mpx: większe zdjęcie Anthropic i tak zmniejsza po swojej stronie, a ramki w pikselach muszą się
// odnosić do tego, co model widzi. Na wzorcu z 9.10 wynik taki sam jak przy 1600 px, a taniej i szybciej.
const MAX_PIXELS = 1_150_000

// Zmniejszamy zdjęcie przed wysłaniem, także w skanie grup (POMYSLY 14: dziś leci w pełnym rozmiarze).
async function resize(file: File): Promise<{ image: string; size: ScanImageSize }> {
    const bitmap = await createImageBitmap(file)
    const scale = Math.min(1, Math.sqrt(MAX_PIXELS / (bitmap.width * bitmap.height)))
    const canvas = document.createElement('canvas')
    canvas.width = Math.round(bitmap.width * scale)
    canvas.height = Math.round(bitmap.height * scale)
    canvas.getContext('2d')!.drawImage(bitmap, 0, 0, canvas.width, canvas.height)
    return { image: canvas.toDataURL('image/jpeg', 0.85), size: { width: canvas.width, height: canvas.height } }
}

const area = boxArea

// Skan zdjęcia (ekran „Skan”): dwa rozpoznania naraz, pytanie „Jak to zapisać?”, potem lista do sprawdzenia
// z numerami zgodnymi z ramkami na zdjęciu. AI proponuje, człowiek zatwierdza.
export function ScanFlow({ places, tree, initialPlace, canEdit }: Props) {
    const t = useTranslations('Scan')
    const router = useRouter()
    const [photo, setPhoto] = useState<string | null>(null)
    const desktop = useDesktop()
    const [picked, setMode] = useState<ScanMode | null>(null)
    // Na komputerze nie ma osobnego kroku „Jak to zapisać?”: od razu pokazujemy przedmioty, a tryb przełącza się u góry.
    const mode: ScanMode | null = picked ?? (desktop && photo ? 'items' : null)
    const [recognition, setRecognition] = useState<Record<ScanMode, Recognition>>({
        groups: { status: 'pending', findings: [] }, items: { status: 'pending', findings: [] },
    })
    const [rows, setRows] = useState<Record<ScanMode, Row[] | null>>({ groups: null, items: null })
    const [selected, setSelected] = useState<string | null>(null)
    const [photoSize, setPhotoSize] = useState<ScanImageSize | null>(null)
    // Pozycje, na które człowiek spojrzał: wybrał je, poprawił albo zaznaczył. Niepewnych, których nikt nie ruszył,
    // przy zapisie pytamy osobno, zamiast po cichu je pomijać.
    const [touched, setTouched] = useState<Set<string>>(new Set())
    const [lowOpen, setLowOpen] = useState(false)
    const [lowPick, setLowPick] = useState<Set<string>>(new Set())
    const [place, setPlace] = useState<string>(initialPlace ?? '')
    const [over, setOver] = useState(false)
    const [recent, setRecent] = useState<string[]>([])
    const [saving, setSaving] = useState(false)
    const fileRef = useRef<HTMLInputElement>(null)

    useEffect(() => {
        if (initialPlace) return
        try { const last = localStorage.getItem(LAST_PLACE); if (last && places.some(p => p.id === last)) setPlace(last) } catch { /* brak pamięci */ }
    }, [initialPlace, places])

    useEffect(() => {
        try {
            const list: unknown = JSON.parse(localStorage.getItem(RECENT_PLACES) ?? '[]')
            if (Array.isArray(list)) setRecent(list.filter((id): id is string => typeof id === 'string' && places.some(p => p.id === id)).slice(0, 2))
        } catch { /* brak pamięci */ }
    }, [places])

    const start = async (file: File) => {
        const { image, size } = await resize(file)
        setPhoto(image)
        setPhotoSize(size)
        setSelected(null)
        setTouched(new Set())
        setMode(null)
        setRows({ groups: null, items: null })
        setRecognition({ groups: { status: 'pending', findings: [] }, items: { status: 'pending', findings: [] } })
        // Oba rozpoznania naraz, w jednej akcji serwera (osobne wywołania Next.js ustawia w kolejce, co podwajało czas).
        void scanPhotoBoth(image, size).then(r => setRecognition({
            groups: 'error' in r.groups ? { status: 'error', findings: [], error: r.groups.error } : { status: 'done', findings: r.groups.findings },
            items: 'error' in r.items ? { status: 'error', findings: [], error: r.items.error } : { status: 'done', findings: r.items.findings },
        }))
    }

    // Wiersze do edycji powstają, gdy rozpoznanie wybranego trybu jest gotowe.
    useEffect(() => {
        if (!mode || rows[mode] || recognition[mode].status !== 'done') return
        setRows(prev => ({
            ...prev,
            [mode]: recognition[mode].findings.map((f, i) => ({ ...f, key: `${mode}-${i}`, checked: !f.low })),
        }))
    }, [mode, recognition, rows])

    const current = mode ? rows[mode] : null
    const shown = current ?? (mode ? null : recognition.groups.status === 'done' ? recognition.groups.findings.map((f, i) => ({ ...f, key: `g-${i}`, checked: !f.low })) : null)
    const checked = current?.filter(r => r.checked) ?? []

    const touch = (key: string) => setTouched(prev => (prev.has(key) ? prev : new Set(prev).add(key)))

    const updateRow = (key: string, patch: Partial<Row>) => {
        touch(key)
        setRows(prev => mode ? { ...prev, [mode]: prev[mode]!.map(r => (r.key === key ? { ...r, ...patch } : r)) } : prev)
    }

    const addRow = () => {
        if (!mode) return
        setRows(prev => ({ ...prev, [mode]: [...(prev[mode] ?? []), { name: '', description: null, approxCount: null, box: null, low: false, key: `${mode}-new-${Date.now()}`, checked: true }] }))
    }

    // Niepewne pozycje, których nikt nie sprawdził (nie są zaznaczone ani dotknięte).
    const unseen = current?.filter(r => r.low && !r.checked && !touched.has(r.key)) ?? []

    const save = async (extra: Set<string> = new Set()) => {
        if (!mode || !current) return
        const toSave = current.filter(r => r.checked || extra.has(r.key))
        if (!toSave.length) return
        setSaving(true)
        const result = await saveScan(mode, place || null, toSave.map(r => ({ name: r.name, description: r.description, approxCount: r.approxCount })))
        setSaving(false)
        if (!result.ok) { notify.error(result.error); return }
        try {
            if (place) {
                localStorage.setItem(LAST_PLACE, place)
                localStorage.setItem(RECENT_PLACES, JSON.stringify([place, ...recent.filter(id => id !== place)].slice(0, 2)))
            }
        } catch { /* brak pamięci */ }
        notify.success(t('savedIn', { count: result.count, place: places.find(p => p.id === place)?.label ?? t('unassigned') }))
        router.push('/groups')
        router.refresh()
    }

    // Zapis z przycisku: jeśli są niepewne pozycje, na które nikt nie spojrzał, najpierw pytamy o nie.
    const trySave = () => {
        if (unseen.length) { setLowPick(new Set()); setLowOpen(true) } else void save()
    }

    // Wybór pozycji: z listy, ze znacznika albo dotknięciem zdjęcia. Z ekranu przeglądu przewijamy listę do wiersza.
    const select = (key: string | null, scroll = false) => {
        setSelected(key)
        if (key) touch(key)
        if (key && scroll) document.getElementById(`scan-row-${key}`)?.scrollIntoView({ block: 'center', behavior: 'smooth' })
    }

    // Dotknięcie zdjęcia wybiera najmniejszą ramkę z tego punktu; kolejne dotknięcie w to samo miejsce przechodzi
    // do coraz większej (rzecz, potem to, co ją obejmuje), a po największej zdejmuje wybór.
    const pick = (e: React.MouseEvent<HTMLDivElement>, list: Row[]) => {
        const r = e.currentTarget.getBoundingClientRect()
        const px = (e.clientX - r.left) / r.width, py = (e.clientY - r.top) / r.height
        const hits = list
            .filter(f => f.box && px >= f.box.x && px <= f.box.x + f.box.w && py >= f.box.y && py <= f.box.y + f.box.h)
            .sort((a, b) => area(a.box!) - area(b.box!))
        const at = hits.findIndex(f => f.key === selected)
        select(at === hits.length - 1 ? null : hits[at + 1]?.key ?? null, true)
    }

    // Na zdjęciu są numerowane znaczniki, a ramkę ma tylko wybrana pozycja, z przyciemnionym resztą zdjęcia.
    // Wszystkie ramki naraz zamieniały gęste zdjęcie w ścianę linii (test 10.10).
    const marks = (list: Row[] | null, sticky = false) => photo && (
        <div className={sticky ? 'rk-ai__stage is-sticky' : undefined}>
            <div
                className="rk-ai__photo rk-marks"
                style={sticky ? { width: 'fit-content', maxWidth: '100%', marginInline: 'auto' } : undefined}
                onClick={e => list && pick(e, list)}
            >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={photo} alt={t('photoAlt')} className={sticky ? 'block max-h-[40vh] w-auto max-w-full' : 'block w-full'} />
                {(() => {
                    const items = list ?? []
                    const pins = photoSize ? pinPositions(items, photoSize.height / photoSize.width) : new Map<string, { x: number; y: number }>()
                    const sel = items.find(f => f.key === selected)
                    const selIndex = sel ? items.indexOf(sel) : -1
                    return (
                        <>
                            {sel?.box && (
                                <span
                                    className={`rk-mark rk-mark--selected rk-mark--spot ${sel.box.y < 0.08 ? 'rk-mark--inside' : ''}`}
                                    style={{ left: `${sel.box.x * 100}%`, top: `${sel.box.y * 100}%`, width: `${sel.box.w * 100}%`, height: `${sel.box.h * 100}%` }}
                                >
                                    <span className="rk-mark__n" style={{ maxWidth: 220, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                        {`${selIndex + 1}${sel.low ? '?' : ''}${sel.name ? ` ${sel.name}` : ''}`}
                                    </span>
                                </span>
                            )}
                            {items.map((f, i) => {
                                const at = pins.get(f.key)
                                if (!at) return null
                                const state = f.key === selected ? 'rk-pin--selected' : f.low && !f.checked ? 'rk-pin--low' : !f.checked ? 'rk-pin--off' : ''
                                return (
                                    <button
                                        key={f.key}
                                        type="button"
                                        className={`rk-pin ${state}`}
                                        style={{ left: `${at.x * 100}%`, top: `${at.y * 100}%` }}
                                        aria-label={`${i + 1}. ${f.name}`}
                                        aria-pressed={f.key === selected}
                                        onClick={e => { e.stopPropagation(); select(f.key === selected ? null : f.key, true) }}
                                    >
                                        {`${i + 1}${f.low ? '?' : ''}`}
                                    </button>
                                )
                            })}
                        </>
                    )
                })()}
            </div>
        </div>
    )

    const statusRow = (m: ScanMode) => {
        const r = recognition[m]
        const label = m === 'groups' ? t('groups') : t('items')
        if (r.status === 'done') return <span className="rk-scan-status__row is-done"><Check />{t('statusDone', { what: label })}</span>
        if (r.status === 'error') return <span className="rk-scan-status__row">{t('statusError', { what: label })}</span>
        return (
            <span className="rk-scan-status__row">
                <span className="rk-bells" aria-hidden="true"><i></i><i></i><i></i></span>
                {t('statusPending', { what: label })}
            </span>
        )
    }

    const top = (label: string, onBack: () => void, action?: React.ReactNode) => (
        <nav className="rk-mtop" aria-label={t('nav')}>
            <button type="button" className="rk-mtop__back" onClick={onBack}><ChevronLeft /><span>{label}</span></button>
            {action && <div className="rk-mtop__actions">{action}</div>}
        </nav>
    )

    const lowModal = (
        <Modal isOpen={lowOpen} onClose={() => setLowOpen(false)} title={t('lowTitle')} description={t('lowLead')} maxWidth="md">
            <div className="flex flex-col gap-4 text-left">
                <div className="rk-ai__list">
                    {unseen.map(r => {
                        const n = (current?.indexOf(r) ?? 0) + 1
                        return (
                            <label key={r.key} className="rk-ai__item cursor-pointer">
                                <span className="rk-check">
                                    <input
                                        type="checkbox"
                                        checked={lowPick.has(r.key)}
                                        onChange={e => setLowPick(prev => { const next = new Set(prev); if (e.target.checked) next.add(r.key); else next.delete(r.key); return next })}
                                        aria-label={t('include', { name: r.name || `#${n}` })}
                                    />
                                    <span className="rk-box"><Check className="i-chk" /></span>
                                </span>
                                <span className="min-w-0 truncate">{`${n}? ${r.name}`}</span>
                                <span className="rk-tally !text-warning">{t('check')}</span>
                            </label>
                        )
                    })}
                </div>
                <div className="flex flex-col gap-3">
                    <Button size="lg" className="w-full" isLoading={saving} loadingLabel={t('saving')}
                        onClick={async () => { await save(lowPick); setLowOpen(false) }}
                        disabled={!checked.length && !lowPick.size}>
                        {t('lowSave', { count: lowPick.size })}
                    </Button>
                    <button type="button" className="rk-btn rk-btn--secondary w-full" onClick={() => setLowOpen(false)}>{t('lowBack')}</button>
                </div>
            </div>
        </Modal>
    )

    const saveLabel = mode === 'groups' ? t('saveGroups', { count: checked.length }) : t('saveItems', { count: checked.length })

    if (photo && desktop && mode) {
        const count = (m: ScanMode) => recognition[m].findings.length
        return (
            <ScanDesktop
                photo={photo}
                photoSize={photoSize}
                mode={mode}
                onMode={m => { setMode(m); setSelected(null) }}
                status={{
                    items: { status: recognition.items.status, count: count('items') },
                    groups: { status: recognition.groups.status, count: count('groups') },
                }}
                error={recognition[mode].error}
                rows={current}
                selected={selected}
                onSelect={select}
                onUpdate={updateRow}
                onAddRow={addRow}
                onSetAll={on => setRows(prev => ({ ...prev, [mode]: (prev[mode] ?? []).map(r => ({ ...r, checked: on })) }))}
                tree={tree}
                place={place}
                onPlace={setPlace}
                recent={recent}
                canEdit={canEdit}
                saving={saving}
                saveDisabled={!checked.length && !unseen.length}
                saveLabel={saveLabel}
                onSave={trySave}
                onNewPhoto={() => { setPhoto(null); setMode(null) }}
            >
                {lowModal}
            </ScanDesktop>
        )
    }

    return (
        <div className="mx-auto flex max-w-[480px] flex-col pb-8 md:pt-8">
            {!photo && (
                <>
                    {top(t('cancel'), () => router.back())}
                    <div className="flex flex-col gap-6 px-4 pt-2">
                        <div className="flex flex-col gap-1">
                            <h1 className="rk-page-header__title">{t('title')}</h1>
                            <p className="pl-meta" style={{ font: '400 14px/20px var(--font-sans)' }}>{t('lead')}</p>
                        </div>
                        <label
                            className={`rk-drop-zone cursor-pointer ${over ? 'is-over' : ''}`}
                            onDragOver={e => { e.preventDefault(); setOver(true) }}
                            onDragLeave={() => setOver(false)}
                            onDrop={e => { e.preventDefault(); setOver(false); const f = e.dataTransfer.files[0]; if (f) void start(f) }}
                        >
                            <span className="rk-drop-zone__icon"><Camera /></span>
                            <b>{t('takePhoto')}</b>
                            <small>{t('photoHint')}</small>
                            <input
                                ref={fileRef}
                                type="file"
                                accept="image/*"
                                capture="environment"
                                className="sr-only"
                                onChange={e => { const f = e.target.files?.[0]; if (f) void start(f) }}
                            />
                        </label>
                        {!canEdit && <p className="pl-meta">{t('signInHint')}</p>}
                    </div>
                </>
            )}

            {photo && !mode && (
                <>
                    {top(t('cancel'), () => setPhoto(null))}
                    <div className="flex flex-col gap-6 px-4 pt-2">
                        {marks(shown)}
                        <div className="flex flex-col gap-1">
                            <h1 className="rk-page-header__title">{t('howToSave')}</h1>
                            <p className="pl-meta" style={{ font: '400 14px/20px var(--font-sans)' }}>{t('howToSaveLead')}</p>
                        </div>
                        <div className="rk-choice">
                            <button type="button" className="rk-choice__opt text-left" onClick={() => setMode('groups')}>
                                <span className="rk-choice__ico"><Layers /></span>
                                <span><b>{t('asGroups')}</b><small>{t('asGroupsLead')}</small></span>
                            </button>
                            <button type="button" className="rk-choice__opt text-left" onClick={() => setMode('items')}>
                                <span className="rk-choice__ico rk-choice__ico--item"><RkIcon name="metka" /></span>
                                <span><b>{t('asItems')}</b><small>{t('asItemsLead')}</small></span>
                            </button>
                        </div>
                        <div className="rk-scan-status" aria-live="polite">{statusRow('groups')}{statusRow('items')}</div>
                    </div>
                </>
            )}

            {photo && mode && (
                <>
                    {top(t('back'), () => setMode(null), canEdit && current && (
                        <button
                            type="button"
                            className="rk-btn rk-btn--ghost rk-btn--icon"
                            aria-label={t('addRow')}
                            onClick={addRow}
                        >
                            <Plus />
                        </button>
                    ))}
                    <div className="flex flex-col gap-6 px-4 pt-2">
                        {marks(current, true)}
                        <div className="flex flex-col gap-1">
                            <span className="rk-tally">
                                {`${mode === 'groups' ? t('groups') : t('items')} · ${current ? t('recognized', { count: current.length }) : t('recognizing')}`}
                            </span>
                            <h1 className="rk-page-header__title">{t('review')}</h1>
                        </div>

                        {recognition[mode].status === 'pending' && (
                            <div className="rk-scan-status">{statusRow(mode)}</div>
                        )}
                        {recognition[mode].status === 'error' && <p className="pl-meta">{recognition[mode].error}</p>}

                        {current && (
                            <div className="rk-ai__list">
                                {current.map((r, i) => (
                                    <div key={r.key} id={`scan-row-${r.key}`} className={`rk-ai__item ${r.key === selected ? 'is-selected' : ''}`} onFocus={() => select(r.key)} onClick={() => select(r.key)}>
                                        <label className="rk-check">
                                            <input type="checkbox" checked={r.checked} onChange={e => updateRow(r.key, { checked: e.target.checked })} aria-label={t('include', { name: r.name || `#${i + 1}` })} />
                                            <span className="rk-box"><Check className="i-chk" /></span>
                                        </label>
                                        <div className="flex min-w-0 items-center gap-2">
                                            <span className={`rk-ai__n ${r.low && !r.checked ? 'rk-ai__n--low' : r.checked ? 'rk-ai__n--selected' : ''}`}>{`${i + 1}${r.low ? '?' : ''}`}</span>
                                            <input
                                                className="rk-input min-w-0 flex-1"
                                                value={r.name}
                                                onChange={e => updateRow(r.key, { name: e.target.value })}
                                                aria-label={t('nameOf', { n: i + 1 })}
                                            />
                                        </div>
                                        <span className={`rk-tally ${r.low ? '!text-warning' : ''}`}>{r.low ? t('check') : t('sure')}</span>
                                    </div>
                                ))}
                            </div>
                        )}

                        <div className="rk-scan-place">
                            <span className="rk-tally">{t('saveIn')}</span>
                            <span className="rk-scan-place__path">
                                <span className="rk-select w-full">
                                    <select value={place} onChange={e => setPlace(e.target.value)} aria-label={t('saveIn')} className="!h-8 !border-0 !bg-transparent !pl-0 !font-semibold">
                                        <option value="">{t('unassigned')}</option>
                                        {places.map(p => <option key={p.id} value={p.id}>{p.label}</option>)}
                                    </select>
                                    <ChevronDown />
                                </span>
                            </span>
                        </div>

                        {canEdit && (
                            <div className="flex flex-col gap-3">
                                <Button size="lg" className="w-full" onClick={trySave} isLoading={saving} loadingLabel={t('saving')} disabled={!checked.length && !unseen.length}>
                                    {saveLabel}
                                </Button>
                                <button type="button" className="rk-btn rk-btn--ghost w-full" onClick={() => setMode(mode === 'groups' ? 'items' : 'groups')}>
                                    {mode === 'groups' ? t('switchToItems') : t('switchToGroups')}
                                </button>
                            </div>
                        )}
                    </div>
                </>
            )}
            {lowModal}
        </div>
    )
}
