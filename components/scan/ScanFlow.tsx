'use client'

import { useEffect, useRef, useState } from 'react'
import { useTranslations } from 'next-intl'
import { Camera, Check, ChevronDown, ChevronLeft, Layers, Plus } from 'lucide-react'
import { useRouter } from '@/i18n/routing'
import { notify } from '@/utils/notify'
import { RkIcon } from '@/components/rk/RkIcon'
import { Button } from '@/components/ui/Button'
import { saveScan, scanPhoto, type ScanFinding, type ScanMode } from '@/app/actions/scan-photo'

type Place = { id: string; label: string }
type Props = { places: Place[]; initialPlace: string | null; canEdit: boolean }
type Recognition = { status: 'pending' | 'done' | 'error'; findings: ScanFinding[]; error?: string }
type Row = ScanFinding & { key: string; checked: boolean }

const LAST_PLACE = 'rk-scan-place'
const MAX_SIDE = 1600

// Zmniejszamy zdjęcie przed wysłaniem, także w skanie grup (POMYSLY 14: dziś leci w pełnym rozmiarze).
async function resize(file: File): Promise<string> {
    const bitmap = await createImageBitmap(file)
    const scale = Math.min(1, MAX_SIDE / Math.max(bitmap.width, bitmap.height))
    const canvas = document.createElement('canvas')
    canvas.width = Math.round(bitmap.width * scale)
    canvas.height = Math.round(bitmap.height * scale)
    canvas.getContext('2d')!.drawImage(bitmap, 0, 0, canvas.width, canvas.height)
    return canvas.toDataURL('image/jpeg', 0.85)
}

// Skan zdjęcia (ekran „Skan”): dwa rozpoznania naraz, pytanie „Jak to zapisać?”, potem lista do sprawdzenia
// z numerami zgodnymi z ramkami na zdjęciu. AI proponuje, człowiek zatwierdza.
export function ScanFlow({ places, initialPlace, canEdit }: Props) {
    const t = useTranslations('Scan')
    const router = useRouter()
    const [photo, setPhoto] = useState<string | null>(null)
    const [mode, setMode] = useState<ScanMode | null>(null)
    const [recognition, setRecognition] = useState<Record<ScanMode, Recognition>>({
        groups: { status: 'pending', findings: [] }, items: { status: 'pending', findings: [] },
    })
    const [rows, setRows] = useState<Record<ScanMode, Row[] | null>>({ groups: null, items: null })
    const [focused, setFocused] = useState<string | null>(null)
    const [place, setPlace] = useState<string>(initialPlace ?? '')
    const [over, setOver] = useState(false)
    const [saving, setSaving] = useState(false)
    const fileRef = useRef<HTMLInputElement>(null)

    useEffect(() => {
        if (initialPlace) return
        try { const last = localStorage.getItem(LAST_PLACE); if (last && places.some(p => p.id === last)) setPlace(last) } catch { /* brak pamięci */ }
    }, [initialPlace, places])

    const start = async (file: File) => {
        const image = await resize(file)
        setPhoto(image)
        setMode(null)
        setRows({ groups: null, items: null })
        setRecognition({ groups: { status: 'pending', findings: [] }, items: { status: 'pending', findings: [] } })
        // Oba rozpoznania naraz; zanim człowiek odpowie, wynik zwykle już jest.
        for (const m of ['groups', 'items'] as const) {
            void scanPhoto(image, m).then(r => setRecognition(prev => ({
                ...prev,
                [m]: 'error' in r ? { status: 'error', findings: [], error: r.error } : { status: 'done', findings: r.findings },
            })))
        }
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

    const updateRow = (key: string, patch: Partial<Row>) =>
        setRows(prev => mode ? { ...prev, [mode]: prev[mode]!.map(r => (r.key === key ? { ...r, ...patch } : r)) } : prev)

    const save = async () => {
        if (!mode || !current) return
        setSaving(true)
        const result = await saveScan(mode, place || null, checked.map(r => ({ name: r.name, description: r.description, approxCount: r.approxCount })))
        setSaving(false)
        if (!result.ok) { notify.error(result.error); return }
        try { if (place) localStorage.setItem(LAST_PLACE, place) } catch { /* brak pamięci */ }
        notify.success(t('saved', { count: result.count }))
        router.push('/groups')
        router.refresh()
    }

    const marks = (list: Row[] | ScanFinding[] | null) => photo && (
        <div className="rk-ai__photo rk-marks">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={photo} alt={t('photoAlt')} className="block w-full" />
            {list?.map((f, i) => f.box && (
                <span
                    key={i}
                    className={`rk-mark ${'checked' in f && f.checked ? 'rk-mark--ok' : ''} ${f.low && !('checked' in f && f.checked) ? 'rk-mark--low' : ''} ${'key' in f && focused === f.key ? 'rk-mark--selected' : ''} ${f.box.y < 0.08 ? 'rk-mark--inside' : ''}`}
                    style={{ left: `${f.box.x * 100}%`, top: `${f.box.y * 100}%`, width: `${f.box.w * 100}%`, height: `${f.box.h * 100}%` }}
                >
                    <span className="rk-mark__n">{`${i + 1}${f.low ? '?' : ''}`}</span>
                </span>
            ))}
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
                            onClick={() => setRows(prev => ({ ...prev, [mode]: [...(prev[mode] ?? []), { name: '', description: null, approxCount: null, box: null, low: false, key: `${mode}-new-${Date.now()}`, checked: true }] }))}
                        >
                            <Plus />
                        </button>
                    ))}
                    <div className="flex flex-col gap-6 px-4 pt-2">
                        {marks(current)}
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
                                    <div key={r.key} className="rk-ai__item" onFocus={() => setFocused(r.key)} onBlur={() => setFocused(null)}>
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
                                <Button size="lg" className="w-full" onClick={save} isLoading={saving} loadingLabel={t('saving')} disabled={!checked.length}>
                                    {mode === 'groups' ? t('saveGroups', { count: checked.length }) : t('saveItems', { count: checked.length })}
                                </Button>
                                <button type="button" className="rk-btn rk-btn--ghost w-full" onClick={() => setMode(mode === 'groups' ? 'items' : 'groups')}>
                                    {mode === 'groups' ? t('switchToItems') : t('switchToGroups')}
                                </button>
                            </div>
                        )}
                    </div>
                </>
            )}
        </div>
    )
}
