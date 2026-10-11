'use client'

import { Fragment, useEffect, useRef, useState, type ReactNode } from 'react'
import { useTranslations } from 'next-intl'
import { ChevronLeft, GripVertical, Layers, Plus, Tag, Trash2, X } from 'lucide-react'
import {
    DndContext, DragOverlay, KeyboardSensor, PointerSensor, closestCenter, pointerWithin, useDroppable, useSensor, useSensors,
    type CollisionDetection, type DragEndEvent, type DragOverEvent, type DragStartEvent,
} from '@dnd-kit/core'
import { SortableContext, arrayMove, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { Link, useRouter } from '@/i18n/routing'
import { Button } from '@/components/ui/Button'
import { ActionMenu } from '@/components/rk/ActionMenu'
import { PropEntry } from '@/components/rk/PropEntry'
import { SaveState, type SaveStateValue } from '@/components/rk/SaveState'
import { Steps } from '@/components/rk/Steps'
import { Tooltip } from '@/components/rk/Tooltip'
import { notify } from '@/utils/notify'
import { plural, roman } from '@/lib/rk-format'
import { smoothScrollTo } from '@/lib/smooth-scroll'
import {
    addPropNames, movePerformanceProp, removePerformanceProp, removePerformanceProps, renamePerformanceProp,
    restorePerformanceProp, savePerformanceProp, type PropTarget,
} from '@/app/actions/save-performance-prop'
import {
    addScene, deleteAct, deleteScene, normalizeScenes, renameScene, restoreScene, saveSceneOrder, swapActs,
} from '@/app/actions/scenes'
import type { PerformanceStructure, StructuredProp } from '@/lib/performance-structure'
import { PropEditDialog, type GroupOption } from './PropEditDialog'
import { SceneImportWizard } from './SceneImportWizard'

/** Rzecz z magazynu do podpowiedzi przy nazwie: grupa albo rozpisany przedmiot. */
export type StorageSuggestion = { id: string; name: string; path: string | null; description: string | null; groupId: string; itemId: string | null }

type Props = {
    performanceId: string
    performanceTitle: string
    structure: PerformanceStructure
    groups: GroupOption[]
    storage: StorageSuggestion[]
    /** Drugi krok dodawania spektaklu: kroki u góry zamiast powrotu. */
    isNew: boolean
}

type SceneData = { id: string; act: number; name: string }
/** Rekwizyt w edytorze; `slot` to miejsce: `s:<id sceny>`, `a:<akt>` (cały akt) albo `none`. */
type Item = { id: string; name: string; slot: string; how: string | null; where: string | null }
type Slot = { key: string; label: string; code: string | null; name: string | null }
type Suggestion = {
    key: string
    source: 'show' | 'storage'
    name: string
    detail: string | null
    description: string | null
    groupId: string | null
    itemId: string | null
    /** Dodatkowy tekst do szukania: ścieżka w magazynie, grupa. */
    extra: string
}
type Draft = { name: string; description: string; pick: Suggestion | null }
type Confirm = { kind: 'scene'; scene: SceneData } | { kind: 'act'; act: number }

const TEMP = 'tmp-'
const EMPTY: Draft = { name: '', description: '', pick: null }
const isTemp = (id: string) => id.startsWith(TEMP)

// Wklejona lista z Worda albo maila: każda linia to rekwizyt; zdejmujemy punktory i numerację („1.”, „-”, „•”).
const splitLines = (text: string) =>
    text.split(/\r?\n/).map(l => l.replace(/^\s*(?:[-–•*·]|\d+[.)])\s*/, '').trim()).filter(Boolean)

// Porównanie bez wielkości liter i polskich znaków, żeby „lampa” znalazła „Lampa naftowa”, a „swiece” „Świece”.
const fold = (s: string) => s.toLocaleLowerCase('pl').replace(/ł/g, 'l').normalize('NFD').replace(/\p{Diacritic}/gu, '')

/**
 * Dopasowanie do wpisanego tekstu: każde słowo musi się znaleźć. 0 i 1: w nazwie (od początku / gdzieś),
 * 2: w nazwie albo miejscu („szafa kielich”), 3: także w opisie („srebrny”, „naczynia”). -1: brak.
 */
function score(query: string, name: string, extra: string, description: string | null): number {
    const words = fold(query).split(/\s+/).filter(Boolean)
    if (words.length === 0) return -1
    const n = fold(name)
    const withPlace = `${n} ${fold(extra)}`
    const all = `${withPlace} ${fold(description ?? '')}`
    if (words.every(w => n.includes(w))) return n.startsWith(words[0]) ? 0 : 1
    if (words.every(w => withPlace.includes(w))) return 2
    if (words.every(w => all.includes(w))) return 3
    return -1
}

/** Dopasowany fragment podkreślony jak w palecie poleceń (`mark` w `.rk-cmd__item`). */
function Highlight({ text, query }: { text: string; query: string }) {
    const i = fold(text).indexOf(fold(query))
    if (!query || i < 0) return <>{text}</>
    return <>{text.slice(0, i)}<mark>{text.slice(i, i + query.length)}</mark>{text.slice(i + query.length)}</>
}

function fromStructure(structure: PerformanceStructure) {
    const idByNumber = new Map([...structure.preparation, ...structure.acts.flatMap(a => a.scenes)].map(s => [s.number, s.id]))
    const scenes: SceneData[] = structure.acts.flatMap(a => a.scenes.map(s => ({ id: s.id, act: s.act, name: s.name })))
    const items: Item[] = structure.props.map(p => {
        const sceneId = p.scene != null ? idByNumber.get(p.scene) : undefined
        const slot = sceneId ? `s:${sceneId}` : p.act != null && p.act > 0 ? `a:${p.act}` : 'none'
        return { id: p.id, name: p.name, slot, how: p.how, where: p.where }
    })
    return { scenes, items }
}

// Rozpiska (scenariusz UX 1b i 2): akty, sceny i rekwizyty na jednym ekranie, w tym samym układzie co rozpiska
// na ekranie Spektakl. Sceny i rekwizyty przeciąga się za uchwyt (także do innej sceny albo aktu), wszystko inne jest
// w menu „…” przy akcie, scenie i rekwizycie. Zapis idzie sam, w kolejce; po serii zapisów bierzemy świeży stan z serwera.
export function BreakdownEditor({ performanceId, performanceTitle, structure, groups, storage, isNew }: Props) {
    const t = useTranslations('Breakdown')
    const router = useRouter()
    const initial = fromStructure(structure)
    const [scenes, setScenes] = useState<SceneData[]>(initial.scenes)
    const [items, setItems] = useState<Item[]>(initial.items)
    const [extraAct, setExtraAct] = useState<number | null>(null)
    const [saveState, setSaveState] = useState<SaveStateValue>({ pending: false, at: null })
    const [leaving, setLeaving] = useState(false)
    const [editing, setEditing] = useState<StructuredProp | null>(null)
    const [moving, setMoving] = useState<Item | null>(null)
    const [confirm, setConfirm] = useState<Confirm | null>(null)
    const [showWizard, setShowWizard] = useState(false)
    const homeHref = `/performances/${performanceId}`
    const actsOnly = structure.actsOnly

    // ——— Kolejka zapisów ———
    // Zapisy idą po kolei; stan z serwera przyjmujemy dopiero, gdy nic nie czeka. Sceny i rekwizyty dodane przed
    // chwilą mają tymczasowe id, a prawdziwe trafiają do `realId`, zanim ruszy następny zapis z kolejki.
    const queue = useRef<Promise<unknown>>(Promise.resolve())
    const pending = useRef(0)
    const failed = useRef(false)
    const realId = useRef(new Map<string, string>())
    const knownScenes = useRef(new Set(initial.scenes.map(s => s.id)))
    const resolve = (id: string) => realId.current.get(id) ?? id

    const save = <T,>(work: () => Promise<T>, onDone: (result: T) => void = () => {}) => {
        // Nowa seria zapisów zaczyna od czystego konta: blokuje „Gotowe” tylko ostatnia, nieudana seria.
        if (pending.current === 0) failed.current = false
        pending.current++
        setSaveState(s => ({ ...s, pending: true, failed: false }))
        queue.current = queue.current.then(async () => {
            try {
                onDone(await work())
            } catch (error) {
                failed.current = true
                notify.error(t('offline'))
                console.error('Rozpiska:', error)
            } finally {
                pending.current--
                if (pending.current === 0) {
                    setSaveState({ pending: false, failed: failed.current, at: failed.current ? null : new Date() })
                    router.refresh()
                }
            }
        })
    }
    const fail = (error?: string, detail?: string) => {
        failed.current = true
        notify.error(error ?? t('offline'))
        if (detail) console.error('Rozpiska:', detail)
    }

    useEffect(() => {
        if (pending.current > 0) return
        const next = fromStructure(structure)
        setScenes(next.scenes)
        setItems(next.items)
        knownScenes.current = new Set(next.scenes.map(s => s.id))
    }, [structure])

    const targetOf = (slot: string): PropTarget =>
        slot.startsWith('s:') ? { sceneId: resolve(slot.slice(2)) } : slot.startsWith('a:') ? { act: Number(slot.slice(2)) } : null

    // ——— Układ: akty, miejsca na rekwizyty, kolejność „następnej sceny” ———
    const acts = [...new Set([
        ...scenes.map(s => s.act),
        ...items.filter(i => i.slot.startsWith('a:')).map(i => Number(i.slot.slice(2))),
        ...(actsOnly ? structure.acts.map(a => a.act) : []),
        ...(extraAct ? [extraAct] : []),
    ])].sort((a, b) => a - b)
    const scenesIn = (act: number) => scenes.filter(s => s.act === act)
    const codeOf = (scene: SceneData) => `${roman(scene.act)}.${scenesIn(scene.act).findIndex(s => s.id === scene.id) + 1}`
    const inSlot = (key: string) => items.filter(i => i.slot === key)

    const showNone = inSlot('none').length > 0 || acts.length === 0
    const prepSingle = structure.preparation.length === 1
    const prepSlots: Slot[] = structure.preparation.map(s => ({
        key: `s:${s.id}`, label: prepSingle ? t('preparation') : `${s.code} ${s.name}`, code: prepSingle ? null : s.code, name: prepSingle ? null : s.name,
    }))
    const actSlot = (act: number): Slot | null => {
        const key = `a:${act}`
        const hasScenes = !actsOnly && scenesIn(act).length > 0
        if (hasScenes && inSlot(key).length === 0) return null
        return { key, label: hasScenes ? `${t('act', { act: roman(act) })} · ${t('wholeAct')}` : t('act', { act: roman(act) }), code: null, name: hasScenes ? t('wholeAct') : null }
    }
    const sceneSlot = (scene: SceneData): Slot => ({ key: `s:${scene.id}`, label: `${codeOf(scene)} ${scene.name}`, code: codeOf(scene), name: scene.name })
    const slots: Slot[] = [
        ...(showNone ? [{ key: 'none', label: t('unassigned'), code: null, name: null }] : []),
        ...prepSlots,
        ...acts.flatMap(act => [actSlot(act), ...(actsOnly ? [] : scenesIn(act).map(sceneSlot))].filter((s): s is Slot => !!s)),
    ]
    const addable = (key: string) => key !== 'none' || acts.length === 0
    // Każda scena i każdy akt może przyjąć rekwizyt (także „Cały akt”, gdy jeszcze go nie widać): do „Przenieś do…”.
    // Cel „Przenieś do…”: sceny w kolejności rozpiski; cały akt tylko w akcie bez scen, „Bez sceny” tylko bez aktów.
    const moveTargets: Slot[] = [
        ...(acts.length === 0 ? [{ key: 'none', label: t('unassigned'), code: null, name: null }] : []),
        ...prepSlots,
        ...acts.flatMap(act => actsOnly || scenesIn(act).length === 0
            ? [{ key: `a:${act}`, label: t('act', { act: roman(act) }), code: null, name: null }]
            : scenesIn(act).map(sceneSlot)),
    ]

    // ——— Spis sekcji ———
    const sections = [
        ...(showNone ? [{ id: 'none', title: t('unassigned') }] : []),
        ...(structure.preparation.length > 0 ? [{ id: 'prep', title: t('preparation') }] : []),
        ...acts.map(act => ({ id: `act-${act}`, title: t('act', { act: roman(act) }) })),
    ]
    const [current, setCurrent] = useState(sections[0]?.id ?? '')
    const sectionIds = sections.map(s => s.id).join(',')
    useEffect(() => {
        const observer = new IntersectionObserver(entries => {
            const visible = entries.filter(e => e.isIntersecting).sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)[0]
            if (visible) setCurrent(visible.target.id.replace('pe-', ''))
        }, { rootMargin: '-10% 0px -70% 0px' })
        sectionIds.split(',').forEach(id => { const el = document.getElementById(`pe-${id}`); if (el) observer.observe(el) })
        return () => observer.disconnect()
    }, [sectionIds])

    // ——— Rekwizyty: dodawanie ———
    const [addingTo, setAddingTo] = useState<string | null>(() => {
        // Pusta rozpiska z gotowymi scenami: od razu kursor w pierwszej scenie (nowy spektakl zaczyna od nazwy sceny).
        if (structure.props.length > 0 || isNew) return null
        return slots.find(s => s.key.startsWith('s:') && !prepSlots.some(p => p.key === s.key))?.key ?? slots.find(s => addable(s.key))?.key ?? null
    })
    const [draft, setDraft] = useState<Draft>(EMPTY)

    const addTemps = (slot: string, names: string[]) => {
        const temps = names.map(name => ({ id: `${TEMP}${crypto.randomUUID()}`, name, slot, how: null, where: null }))
        setItems(prev => [...prev, ...temps])
        const drop = () => setItems(prev => prev.filter(i => !temps.some(tmp => tmp.id === i.id)))
        const settle = (ids: string[]) => {
            temps.forEach((tmp, i) => { if (ids[i]) realId.current.set(tmp.id, ids[i]) })
            setItems(prev => prev.map(i => realId.current.get(i.id) && temps.some(tmp => tmp.id === i.id) ? { ...i, id: realId.current.get(i.id)! } : i))
        }
        return { drop, settle }
    }

    // Dodanie przez pomyłkę: jeden toast „Cofnij” na ostatnie dodanie (kolejne go podmieniają, nie piętrzą się).
    const offerUndoAdd = (ids: string[], names: string[]) => {
        const message = names.length === 1 ? t('added', { name: names[0] }) : t('addedMany', { count: names.length })
        notify.undo(message, t('undo'), () => {
            setItems(prev => prev.filter(i => !ids.includes(i.id)))
            save(() => removePerformanceProps(ids, performanceId), r => { if (!r.ok) fail(r.error) })
        }, 'props-added')
    }

    // Same nazwy (także wklejona lista) idą jednym zapisem; nazwa z opisem albo z magazynu przez pełny zapis z podziałem opisu.
    const addNames = (slot: string, names: string[]) => {
        const clean = names.map(n => n.trim()).filter(Boolean)
        if (clean.length === 0) return
        const { drop, settle } = addTemps(slot, clean)
        save(() => addPropNames(performanceId, clean, targetOf(slot)), result => {
            if (!result.ok) { fail(result.error); drop(); return }
            settle(result.props.map(p => p.id))
            offerUndoAdd(result.props.map(p => p.id), clean)
        })
    }

    const addDraft = (slot: string, d: Draft) => {
        const name = d.name.trim()
        if (!name) return
        if (!d.description.trim() && !d.pick) { addNames(slot, [name]); return }
        const { drop, settle } = addTemps(slot, [name])
        save(() => savePerformanceProp({
            performanceId, name, description: d.description, sceneNumber: null, actNumber: null, target: targetOf(slot),
            groupId: d.pick?.groupId ?? null, itemId: d.pick?.itemId ?? null, castOnly: null, area: null,
        }), result => {
            if (!result.ok) { fail(result.error); drop(); return }
            settle([result.id])
            offerUndoAdd([result.id], [name])
        })
    }

    const openSlot = (key: string | null) => {
        if (addingTo && draft.name.trim()) addDraft(addingTo, draft)
        setAddingTo(key)
        setDraft(EMPTY)
    }
    const nextSlot = (key: string) => {
        const i = slots.findIndex(s => s.key === key)
        return slots.slice(i + 1).find(s => addable(s.key))?.key ?? null
    }

    // ——— Podpowiedzi przy nazwie ———
    const showSuggestions: Suggestion[] = []
    const seen = new Set<string>()
    for (const p of structure.props) {
        const k = fold(p.name)
        if (seen.has(k)) continue
        seen.add(k)
        const detail = p.code === 'PRZ' ? t('preparation') : p.scene != null ? t('inScene', { code: p.code }) : p.act != null ? t('act', { act: roman(p.act) }) : null
        showSuggestions.push({ key: `p:${p.id}`, source: 'show', name: p.name, detail, description: p.description, groupId: p.group?.id ?? null, itemId: null, extra: p.from ?? '' })
    }
    const toSuggestion = (x: StorageSuggestion): Suggestion => ({
        key: `m:${x.id}`, source: 'storage', name: x.name, detail: x.path, description: x.description, groupId: x.groupId, itemId: x.itemId, extra: x.path ?? '',
    })
    const suggest = (query: string): Suggestion[] => {
        if (fold(query).trim().length < 2) return []
        const top = <T,>(list: T[], get: (x: T) => Suggestion, n: number) =>
            list.map(x => ({ x, r: score(query, get(x).name, get(x).extra, get(x).description) }))
                .filter(o => o.r >= 0).sort((a, b) => a.r - b.r).slice(0, n).map(o => get(o.x))
        return [...top(showSuggestions, x => x, 3), ...top(storage, toSuggestion, 5)]
    }

    // ——— Rekwizyty: zmiana, przenoszenie, usuwanie ———
    const renameProp = (item: Item, name: string) => {
        setItems(prev => prev.map(i => i.id === item.id ? { ...i, name } : i))
        save(() => renamePerformanceProp(resolve(item.id), performanceId, name), result => {
            if (!result.ok) { fail(result.error); return }
            notify.undo(t('renamed', { name }), t('undo'), () => renameProp({ ...item, name }, item.name), `prop-rename-${item.id}`)
        })
    }

    const persistMove = (id: string, slot: string, list: Item[]) => {
        const order = list.filter(i => i.slot === slot).map(i => i.id)
        save(() => movePerformanceProp(performanceId, resolve(id), targetOf(slot), order.map(resolve).filter(x => !isTemp(x))), r => {
            if (!r.ok) fail(r.error)
        })
    }

    const moveProp = (item: Item, slot: string) => {
        if (item.slot === slot) return
        const next = [...items.filter(i => i.id !== item.id), { ...item, slot }]
        setItems(next)
        persistMove(item.id, slot, next)
        notify.success(t('moved', { name: item.name, where: moveTargets.find(s => s.key === slot)?.label ?? '' }))
    }

    const removeProp = (item: Item) => {
        setItems(prev => prev.filter(i => i.id !== item.id))
        save(() => removePerformanceProp(resolve(item.id), performanceId), result => {
            if (!result.ok) { fail(result.error); setItems(prev => [...prev, item]); return }
            notify.undo(t('deleted', { name: item.name }), t('undo'), async () => {
                const restored = await restorePerformanceProp(result.row)
                if (!restored.ok) { notify.error(restored.error ?? t('offline')); return }
                router.refresh()
            })
        })
    }

    const details = (item: Item) => {
        const prop = structure.props.find(p => p.id === item.id)
        if (prop) setEditing({ ...prop, name: item.name })
    }

    // ——— Sceny i akty ———
    const [addingScene, setAddingScene] = useState<number | null>(null)
    const [sceneDraft, setSceneDraft] = useState('')
    const [autoEditScene] = useState(isNew && initial.scenes.length === 1 && initial.items.length === 0 ? initial.scenes[0].id : null)

    const addSceneTo = (act: number, typed: string) => {
        const name = typed.trim() || t('defaultSceneName', { n: scenesIn(act).length + 1 })
        const temp = `${TEMP}${crypto.randomUUID()}`
        setScenes(prev => [...prev, { id: temp, act, name }])
        if (extraAct === act) setExtraAct(null)
        save(() => addScene(performanceId, act, name), result => {
            if (!result.ok) { fail(result.error, result.detail); setScenes(prev => prev.filter(s => s.id !== temp)); return }
            const created = result.scenes.find(s => !knownScenes.current.has(s.id))
            result.scenes.forEach(s => knownScenes.current.add(s.id))
            if (created) realId.current.set(temp, created.id)
        })
    }

    const openSceneInput = (act: number | null) => {
        if (addingScene !== null && sceneDraft.trim()) addSceneTo(addingScene, sceneDraft)
        if (addingScene !== null && extraAct === addingScene && !sceneDraft.trim() && act !== addingScene) setExtraAct(null)
        setAddingScene(act)
        setSceneDraft('')
    }

    const startAct = () => {
        const act = (acts.at(-1) ?? 0) + 1
        setExtraAct(act)
        openSceneInput(act)
    }

    const renameSceneTo = (scene: SceneData, name: string) => {
        setScenes(prev => prev.map(s => s.id === scene.id ? { ...s, name } : s))
        save(() => renameScene(performanceId, resolve(scene.id), name), r => { if (!r.ok) fail(r.error, r.detail) })
    }

    const persistSceneOrder = (list: SceneData[]) => {
        save(() => saveSceneOrder(performanceId, list.map(s => ({ id: resolve(s.id), act: s.act })).filter(s => !isTemp(s.id))), r => {
            if (!r.ok) fail(r.error, r.detail)
        })
    }

    const moveSceneToAct = (scene: SceneData, act: number) => {
        const next = [...scenes.filter(s => s.id !== scene.id), { ...scene, act }]
        setScenes(next)
        persistSceneOrder(next)
    }

    const removeScene = (scene: SceneData) => {
        const index = scenesIn(scene.act).findIndex(s => s.id === scene.id)
        const propIds = inSlot(`s:${scene.id}`).map(i => i.id)
        setScenes(prev => prev.filter(s => s.id !== scene.id))
        setItems(prev => prev.map(i => i.slot === `s:${scene.id}` ? { ...i, slot: `a:${scene.act}` } : i))
        save(() => deleteScene(performanceId, resolve(scene.id)), result => {
            if (!result.ok) { fail(result.error, result.detail); return }
            notify.undo(t('sceneDeleted', { name: scene.name }), t('undo'), () => {
                save(() => restoreScene(performanceId, { name: scene.name, act: scene.act, index }, propIds.map(resolve).filter(x => !isTemp(x))), r => {
                    if (!r.ok) fail(r.error, r.detail)
                })
            }, `scene-deleted-${scene.id}`)
        })
    }

    const removeAct = (act: number) => {
        setScenes(prev => prev.filter(s => s.act !== act).map(s => s.act > act ? { ...s, act: s.act - 1 } : s))
        const sceneIds = new Set(scenesIn(act).map(s => `s:${s.id}`))
        setItems(prev => prev.map(i => {
            if (sceneIds.has(i.slot) || i.slot === `a:${act}`) return { ...i, slot: 'none' }
            if (i.slot.startsWith('a:') && Number(i.slot.slice(2)) > act) return { ...i, slot: `a:${Number(i.slot.slice(2)) - 1}` }
            return i
        }))
        if (extraAct === act) setExtraAct(null)
        save(() => deleteAct(performanceId, act), r => { if (!r.ok) fail(r.error, r.detail) })
    }

    const swapAct = (a: number, b: number) => {
        const swap = (n: number) => (n === a ? b : n === b ? a : n)
        setScenes(prev => prev.map(s => ({ ...s, act: swap(s.act) })))
        setItems(prev => prev.map(i => i.slot.startsWith('a:') ? { ...i, slot: `a:${swap(Number(i.slot.slice(2)))}` } : i))
        save(() => swapActs(performanceId, a, b), r => { if (!r.ok) fail(r.error, r.detail) })
    }

    // ——— Przeciąganie ———
    const sensors = useSensors(
        useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
        useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
    )
    const [dragging, setDragging] = useState<{ type: 'prop' | 'scene'; id: string } | null>(null)
    const snapshot = useRef<{ items: Item[]; scenes: SceneData[]; from: string } | null>(null)

    // Rekwizyt trafia tylko na rekwizyty i miejsca, scena tylko na sceny i akty; najpierw konkretny wiersz, potem kontener.
    const collision: CollisionDetection = args => {
        const type = args.active.data.current?.type
        const allowed = type === 'prop' ? ['prop', 'slot'] : ['scene', 'act']
        const containers = args.droppableContainers.filter(c => allowed.includes(c.data.current?.type))
        const within = pointerWithin({ ...args, droppableContainers: containers })
        const rows = within.filter(c => ['prop', 'scene'].includes(containers.find(x => x.id === c.id)?.data.current?.type))
        if (rows.length) return rows
        if (within.length) return within
        return closestCenter({ ...args, droppableContainers: containers })
    }

    const onDragStart = ({ active }: DragStartEvent) => {
        const [type, id] = [active.data.current?.type as 'prop' | 'scene', String(active.id).split(':').slice(1).join(':')]
        setDragging({ type, id })
        const from = type === 'prop' ? items.find(i => i.id === id)?.slot ?? '' : String(scenes.find(s => s.id === id)?.act ?? '')
        snapshot.current = { items, scenes, from }
    }

    const onDragOver = ({ over }: DragOverEvent) => {
        if (!over || !dragging) return
        const overType = over.data.current?.type
        if (dragging.type === 'prop') {
            const item = items.find(i => i.id === dragging.id)
            const toSlot = overType === 'slot' ? over.data.current?.slot as string
                : overType === 'prop' ? items.find(i => `p:${i.id}` === over.id)?.slot : undefined
            if (!item || !toSlot || toSlot === item.slot) return
            setItems(prev => {
                const rest = prev.filter(i => i.id !== item.id)
                const moved = { ...item, slot: toSlot }
                const at = overType === 'prop' ? rest.findIndex(i => `p:${i.id}` === over.id) : -1
                if (at >= 0) return [...rest.slice(0, at), moved, ...rest.slice(at)]
                return [...rest, moved]
            })
        } else {
            const scene = scenes.find(s => s.id === dragging.id)
            const toAct = overType === 'act' ? over.data.current?.act as number
                : overType === 'scene' ? scenes.find(s => `sc:${s.id}` === over.id)?.act : undefined
            if (!scene || toAct == null || toAct === scene.act) return
            setScenes(prev => {
                const rest = prev.filter(s => s.id !== scene.id)
                const moved = { ...scene, act: toAct }
                const at = overType === 'scene' ? rest.findIndex(s => `sc:${s.id}` === over.id) : -1
                if (at >= 0) return [...rest.slice(0, at), moved, ...rest.slice(at)]
                return [...rest, moved]
            })
        }
    }

    const onDragEnd = ({ active, over }: DragEndEvent) => {
        const start = snapshot.current
        const drag = dragging
        setDragging(null)
        snapshot.current = null
        if (!drag || !start) return
        if (drag.type === 'prop') {
            let next = items
            if (over && over.data.current?.type === 'prop' && over.id !== active.id) {
                const from = items.findIndex(i => i.id === drag.id)
                const to = items.findIndex(i => `p:${i.id}` === over.id)
                if (from >= 0 && to >= 0 && items[from].slot === items[to].slot) next = arrayMove(items, from, to)
            }
            setItems(next)
            const item = next.find(i => i.id === drag.id)
            if (!item) return
            const before = start.items.filter(i => i.slot === item.slot).map(i => i.id).join()
            const after = next.filter(i => i.slot === item.slot).map(i => i.id).join()
            if (item.slot !== start.from || before !== after) persistMove(item.id, item.slot, next)
        } else {
            let next = scenes
            if (over && over.data.current?.type === 'scene' && over.id !== active.id) {
                const from = scenes.findIndex(s => s.id === drag.id)
                const to = scenes.findIndex(s => `sc:${s.id}` === over.id)
                if (from >= 0 && to >= 0 && scenes[from].act === scenes[to].act) next = arrayMove(scenes, from, to)
            }
            setScenes(next)
            if (next.map(s => `${s.id}:${s.act}`).join() !== start.scenes.map(s => `${s.id}:${s.act}`).join()) persistSceneOrder(next)
        }
    }

    const onDragCancel = () => {
        if (snapshot.current) { setItems(snapshot.current.items); setScenes(snapshot.current.scenes) }
        snapshot.current = null
        setDragging(null)
    }

    // „Gotowe” niczego nie zapisuje (zapis idzie sam): czeka na zapisy w toku i zamyka ekran. Gdy coś się nie zapisało,
    // zostajemy z komunikatem; drugie „Gotowe” wychodzi mimo to.
    const finish = async () => {
        openSlot(null)
        openSceneInput(null)
        setLeaving(true)
        await queue.current
        if (failed.current) {
            failed.current = false
            setLeaving(false)
            notify.error(t('unsaved'))
            return
        }
        router.push(homeHref)
    }

    // ——— Widok ———
    const propsTally = (n: number) => plural(n, ['rekwizyt', 'rekwizyty', 'rekwizytów'])

    const slotBody = (slot: Slot, indent: boolean) => {
        const list = inSlot(slot.key)
        return (
            <DroppableSlot slot={slot.key} className="flex flex-col gap-3" style={{ marginLeft: indent ? 56 : 0 }}>
                <SortableContext items={list.map(i => `p:${i.id}`)} strategy={verticalListSortingStrategy}>
                    {list.length > 0 && (
                        <ul className="sp-props" style={{ margin: 0 }}>
                            {list.map(item => (
                                <PropRow
                                    key={item.id}
                                    item={item}
                                    onRename={name => renameProp(item, name)}
                                    onDetails={() => details(item)}
                                    onMove={() => setMoving(item)}
                                    onRemove={() => removeProp(item)}
                                />
                            ))}
                        </ul>
                    )}
                    {list.length === 0 && dragging?.type === 'prop' && <div className="rk-inv-drop">{t('dropHere')}</div>}
                </SortableContext>
                {addable(slot.key) && (addingTo === slot.key ? (
                    <AddRow
                        key={slot.key}
                        where={slot.label}
                        first={list.length === 0}
                        draft={draft}
                        onChange={setDraft}
                        suggest={suggest}
                        storage={storage}
                        toSuggestion={toSuggestion}
                        onAdd={() => { addDraft(slot.key, draft); setDraft(EMPTY) }}
                        onPaste={lines => { addNames(slot.key, [draft.name, ...lines]); setDraft(EMPTY) }}
                        onNext={() => openSlot(nextSlot(slot.key))}
                        onClose={() => { setAddingTo(null); setDraft(EMPTY) }}
                    />
                ) : (
                    <button type="button" className="pl-link self-start" onClick={() => openSlot(slot.key)}>
                        <Plus />{t('addProp')}
                    </button>
                ))}
            </DroppableSlot>
        )
    }

    const sectionHead = (id: string, title: string, tally: string, menu?: ReactNode) => (
        <div className="pl-sect-head pl-sect-head--rule items-center">
            <h2 className="pl-h2" id={`pe-${id}-title`}>{title}</h2>
            <div className="flex items-center gap-2">
                <span className="rk-tally">{tally}</span>
                {menu}
            </div>
        </div>
    )

    const draggedItem = dragging?.type === 'prop' ? items.find(i => i.id === dragging.id) : null
    const draggedScene = dragging?.type === 'scene' ? scenes.find(s => s.id === dragging.id) : null

    return (
        <main className="mx-auto flex w-full max-w-[1184px] flex-col gap-8 px-4 pt-6 pb-12 md:px-12 md:pt-8">
            {showWizard && (
                <SceneImportWizard
                    performanceId={performanceId}
                    existingScenes={scenes.map((s, i) => ({ act: s.act, number: i + 1 }))}
                    onClose={() => { setShowWizard(false); save(() => normalizeScenes(performanceId)) }}
                />
            )}

            {/* Nagłówek kończy się tam, gdzie rozpiska (spis 180 + odstęp 48 + treść 760), żeby „Gotowe” stało nad jej prawą krawędzią. */}
            <header className="flex flex-col gap-4 md:max-w-[988px]">
                {isNew ? (
                    <Steps
                        label={t('stepsLabel')}
                        current={1}
                        steps={[
                            { label: t('stepDetails'), note: performanceTitle, href: `/performances/${performanceId}/edit` },
                            { label: t('stepBreakdown') },
                        ]}
                    />
                ) : (
                    <Link className="pl-back" href={homeHref}><ChevronLeft />{performanceTitle}</Link>
                )}
                <div className="rk-page-header items-end border-b-0 pb-0 max-md:flex-wrap">
                    <div className="flex min-w-0 flex-1 flex-col gap-1">
                        <h1 className="rk-page-header__title">{t('title')}</h1>
                        <p className="max-w-[640px] text-ink-muted" style={{ fontSize: 14, lineHeight: '20px' }}>{t('hint')}</p>
                    </div>
                    <div className="flex shrink-0 items-center gap-4">
                        <SaveState state={saveState} />
                        <button type="button" className="rk-btn rk-btn--secondary" onClick={() => setShowWizard(true)}>{t('fromPhoto')}</button>
                        <Button onClick={finish} isLoading={leaving} loadingLabel={t('finishing')}>{t('done')}</Button>
                    </div>
                </div>
            </header>

            <div className="md:grid md:grid-cols-[180px_minmax(0,760px)] md:gap-12">
                {/* Spis sekcji (karta Ustawienia, .rk-settings-nav): przy długiej rozpisce skok do aktu bez przewijania. */}
                <nav className="hidden md:block" aria-label={t('sections')}>
                    <ul className="rk-settings-nav sticky top-8">
                        {sections.map(s => (
                            <li key={s.id}>
                                <a
                                    href={`#pe-${s.id}`}
                                    aria-current={current === s.id ? 'true' : undefined}
                                    onClick={e => {
                                        const el = document.getElementById(`pe-${s.id}`)
                                        if (!el) return
                                        e.preventDefault()
                                        smoothScrollTo(el)
                                        setCurrent(s.id)
                                    }}
                                >{s.title}</a>
                            </li>
                        ))}
                    </ul>
                </nav>

                <DndContext
                    id="breakdown-dnd"
                    sensors={sensors}
                    collisionDetection={collision}
                    onDragStart={onDragStart}
                    onDragOver={onDragOver}
                    onDragEnd={onDragEnd}
                    onDragCancel={onDragCancel}
                >
                    <div className="flex min-w-0 flex-col gap-8">
                        {showNone && (
                            <section className="pl-sect scroll-mt-8" id="pe-none" aria-labelledby="pe-none-title">
                                {sectionHead('none', t('unassigned'), propsTally(inSlot('none').length))}
                                {slotBody({ key: 'none', label: t('unassigned'), code: null, name: null }, false)}
                            </section>
                        )}

                        {structure.preparation.length > 0 && (
                            <section className="pl-sect scroll-mt-8" id="pe-prep" aria-labelledby="pe-prep-title">
                                {sectionHead('prep', t('preparation'), propsTally(prepSlots.reduce((n, s) => n + inSlot(s.key).length, 0)))}
                                {prepSingle ? slotBody(prepSlots[0], false) : (
                                    <ul className="pl-list sp-scenes">
                                        {prepSlots.map(slot => (
                                            <li key={slot.key}>
                                                <div className="sp-scene" style={{ cursor: 'default' }}>
                                                    <span className="sp-scene__n">{slot.code}</span>
                                                    <span className="sp-scene__name">{slot.name}</span>
                                                    <span className="rk-tally">{inSlot(slot.key).length}</span>
                                                </div>
                                                <div style={{ marginBottom: 12 }}>{slotBody(slot, true)}</div>
                                            </li>
                                        ))}
                                    </ul>
                                )}
                            </section>
                        )}

                        {acts.map((act, actIndex) => {
                            const actScenes = actsOnly ? [] : scenesIn(act)
                            const whole = actSlot(act)
                            const count = items.filter(i => i.slot === `a:${act}` || actScenes.some(s => i.slot === `s:${s.id}`)).length
                            const tally = actScenes.length > 0 ? `${plural(actScenes.length, ['scena', 'sceny', 'scen'])} · ${propsTally(count)}` : propsTally(count)
                            return (
                                <section className="pl-sect scroll-mt-8" id={`pe-act-${act}`} aria-labelledby={`pe-act-${act}-title`} key={act}>
                                    {sectionHead(`act-${act}`, t('act', { act: roman(act) }), tally, (
                                        <ActionMenu
                                            label={t('actActions', { act: roman(act) })}
                                            items={[
                                                ...(actIndex > 0 ? [{ type: 'button' as const, label: t('moveActUp'), onSelect: () => swapAct(act, acts[actIndex - 1]) }] : []),
                                                ...(actIndex < acts.length - 1 ? [{ type: 'button' as const, label: t('moveActDown'), onSelect: () => swapAct(act, acts[actIndex + 1]) }] : []),
                                                ...(acts.length > 1 ? [{ type: 'separator' as const }] : []),
                                                { type: 'button' as const, label: t('deleteAct'), danger: true, onSelect: () => setConfirm({ kind: 'act', act }) },
                                            ]}
                                        />
                                    ))}

                                    {whole && slotBody(whole, actScenes.length > 0)}

                                    {!actsOnly && (
                                        <DroppableAct act={act}>
                                            <SortableContext items={actScenes.map(s => `sc:${s.id}`)} strategy={verticalListSortingStrategy}>
                                                {actScenes.length > 0 && (
                                                    <ul className="pl-list sp-scenes">
                                                        {actScenes.map((scene, i) => (
                                                            <SceneBlock
                                                                key={scene.id}
                                                                scene={scene}
                                                                code={codeOf(scene)}
                                                                count={inSlot(`s:${scene.id}`).length}
                                                                otherActs={acts.filter(a => a !== act)}
                                                                autoEdit={scene.id === autoEditScene}
                                                                onRename={name => renameSceneTo(scene, name)}
                                                                onMove={a => moveSceneToAct(scene, a)}
                                                                onRemove={() => setConfirm({ kind: 'scene', scene })}
                                                                onEnter={i === actScenes.length - 1 ? () => openSceneInput(act) : undefined}
                                                            >
                                                                {slotBody(sceneSlot(scene), true)}
                                                            </SceneBlock>
                                                        ))}
                                                    </ul>
                                                )}
                                                {actScenes.length === 0 && dragging?.type === 'scene' && <div className="rk-inv-drop">{t('dropHere')}</div>}
                                            </SortableContext>
                                        </DroppableAct>
                                    )}

                                    {!actsOnly && (addingScene === act ? (
                                        <SceneInput
                                            code={`${roman(act)}.${actScenes.length + 1}`}
                                            act={roman(act)}
                                            value={sceneDraft}
                                            n={actScenes.length + 1}
                                            onChange={setSceneDraft}
                                            onAdd={() => { addSceneTo(act, sceneDraft); setSceneDraft('') }}
                                            onClose={() => openSceneInput(null)}
                                        />
                                    ) : (
                                        <button type="button" className="pl-link self-start" onClick={() => openSceneInput(act)}>
                                            <Plus />{t('addScene')}
                                        </button>
                                    ))}
                                </section>
                            )
                        })}

                        {!actsOnly && extraAct === null && (
                            <button type="button" className="rk-btn rk-btn--secondary self-start" onClick={startAct}>
                                <Plus />{t('addAct', { act: roman((acts.at(-1) ?? 0) + 1) })}
                            </button>
                        )}
                    </div>

                    <DragOverlay>
                        {draggedItem && (
                            <div className="rk-cmd" style={{ padding: '8px 12px', maxWidth: 480 }}>
                                <PropEntry name={draggedItem.name} how={draggedItem.how} where={draggedItem.where} small />
                            </div>
                        )}
                        {draggedScene && (
                            <div className="rk-cmd sp-scene" style={{ padding: '8px 12px', maxWidth: 480 }}>
                                <span className="sp-scene__n">{codeOf(draggedScene)}</span>
                                <span className="sp-scene__name">{draggedScene.name}</span>
                            </div>
                        )}
                    </DragOverlay>
                </DndContext>
            </div>

            {editing && (
                <PropEditDialog performanceId={performanceId} structure={structure} groups={groups} prop={editing} onClose={() => setEditing(null)} />
            )}

            {moving && (
                <MovePicker
                    item={moving}
                    targets={moveTargets}
                    onPick={slot => { moveProp(moving, slot); setMoving(null) }}
                    onClose={() => setMoving(null)}
                />
            )}

            {confirm && (
                <ConfirmDialog
                    title={confirm.kind === 'scene' ? t('deleteSceneTitle', { name: confirm.scene.name }) : t('deleteActTitle', { act: roman(confirm.act) })}
                    desc={confirm.kind === 'scene'
                        ? t('deleteSceneDesc', { count: inSlot(`s:${confirm.scene.id}`).length, act: roman(confirm.scene.act) })
                        : t('deleteActDesc', { scenes: scenesIn(confirm.act).length })}
                    confirmLabel={confirm.kind === 'scene' ? t('deleteSceneConfirm') : t('deleteActConfirm')}
                    onCancel={() => setConfirm(null)}
                    onConfirm={() => {
                        if (confirm.kind === 'scene') removeScene(confirm.scene)
                        else removeAct(confirm.act)
                        setConfirm(null)
                    }}
                />
            )}
        </main>
    )
}

function DroppableSlot({ slot, className, style, children }: { slot: string; className?: string; style?: React.CSSProperties; children: ReactNode }) {
    const { setNodeRef } = useDroppable({ id: `slot:${slot}`, data: { type: 'slot', slot } })
    return <div ref={setNodeRef} className={className} style={style}>{children}</div>
}

function DroppableAct({ act, children }: { act: number; children: ReactNode }) {
    const { setNodeRef } = useDroppable({ id: `act:${act}`, data: { type: 'act', act } })
    return <div ref={setNodeRef}>{children}</div>
}

// Scena: wiersz z uchwytem, numerem i nazwą (kliknięcie zmienia nazwę), pod nim jej rekwizyty. Przeciąga się całość.
function SceneBlock({ scene, code, count, otherActs, autoEdit, onRename, onMove, onRemove, onEnter, children }: {
    scene: SceneData
    code: string
    count: number
    otherActs: number[]
    autoEdit: boolean
    onRename: (name: string) => void
    onMove: (act: number) => void
    onRemove: () => void
    /** Enter w nazwie ostatniej sceny aktu: zapisuje i otwiera pole kolejnej sceny. */
    onEnter?: () => void
    children: ReactNode
}) {
    const t = useTranslations('Breakdown')
    const [editing, setEditing] = useState(autoEdit)
    const [value, setValue] = useState(scene.name)
    const saved = !isTemp(scene.id)
    const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
        id: `sc:${scene.id}`, data: { type: 'scene' }, disabled: editing || !saved,
    })

    const begin = () => { setValue(scene.name); setEditing(true) }
    const commit = () => {
        setEditing(false)
        const name = value.trim()
        if (name && name !== scene.name) onRename(name)
        else setValue(scene.name)
    }

    return (
        <li ref={setNodeRef} style={{ transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.4 : 1 }}>
            <div className="sp-scene" style={{ paddingBlock: 6, cursor: 'default' }}>
                <button
                    type="button"
                    className="rk-btn rk-btn--ghost rk-btn--icon rk-btn--sm cursor-grab"
                    style={{ width: 24, marginRight: -8 }}
                    aria-label={t('dragScene', { name: scene.name })}
                    disabled={!saved}
                    {...attributes}
                    {...listeners}
                >
                    <GripVertical />
                </button>
                <span className="sp-scene__n">{code}</span>
                {editing ? (
                    <input
                        className="rk-input flex-1"
                        autoFocus
                        value={value}
                        aria-label={t('renameSceneLabel', { code })}
                        onFocus={e => e.currentTarget.select()}
                        onChange={e => setValue(e.target.value)}
                        onBlur={commit}
                        onKeyDown={e => {
                            if (e.key === 'Enter') { e.preventDefault(); commit(); onEnter?.() }
                            if (e.key === 'Escape') { setValue(scene.name); setEditing(false) }
                        }}
                    />
                ) : (
                    <button type="button" className="sp-scene__name cursor-text text-left" style={{ minHeight: 40 }} disabled={!saved} title={t('renameHint')} onClick={begin}>
                        {scene.name}
                    </button>
                )}
                <span className="rk-tally">{count}</span>
                {saved && (
                    <ActionMenu
                        label={t('sceneActions', { name: scene.name })}
                        items={[
                            { type: 'button', label: t('rename'), onSelect: begin },
                            ...otherActs.map(a => ({ type: 'button' as const, label: t('moveSceneTo', { act: roman(a) }), onSelect: () => onMove(a) })),
                            { type: 'separator' },
                            { type: 'button', label: t('deleteScene'), danger: true, onSelect: onRemove },
                        ]}
                    />
                )}
            </div>
            <div style={{ marginBottom: 12 }}>{children}</div>
        </li>
    )
}

// Pole nowej sceny: Enter dodaje i zostaje w polu (sceny wpisuje się ciągiem), Esc albo kliknięcie obok kończy.
function SceneInput({ code, act, value, n, onChange, onAdd, onClose }: {
    code: string
    act: string
    value: string
    n: number
    onChange: (v: string) => void
    onAdd: () => void
    onClose: () => void
}) {
    const t = useTranslations('Breakdown')
    return (
        <div className="flex items-center gap-3">
            <span className="sp-scene__n" style={{ marginLeft: 28 }}>{code}</span>
            <Tooltip text={t('sceneTip')} keys="Enter">
                <input
                    className="rk-input w-full"
                    autoFocus
                    value={value}
                    aria-label={t('newSceneLabel', { act })}
                    placeholder={t('newScenePlaceholder', { n })}
                    onChange={e => onChange(e.target.value)}
                    onBlur={onClose}
                    onKeyDown={e => {
                        if (e.key === 'Enter') { e.preventDefault(); onAdd() }
                        if (e.key === 'Escape') onClose()
                    }}
                />
            </Tooltip>
        </div>
    )
}

// Pole nowego rekwizytu: nazwa z podpowiedziami (wiersze palety poleceń, `.rk-cmd__item`) i opis obok.
// Opis jest jednym polem jak w oknie rekwizytu: przy zapisie model dzieli go na „jak” i „gdzie”.
function AddRow({ where, first, draft, onChange, suggest, storage, toSuggestion, onAdd, onPaste, onNext, onClose }: {
    where: string
    first: boolean
    draft: Draft
    onChange: (d: Draft) => void
    suggest: (query: string) => Suggestion[]
    storage: StorageSuggestion[]
    toSuggestion: (x: StorageSuggestion) => Suggestion
    onAdd: () => void
    onPaste: (lines: string[]) => void
    onNext: () => void
    onClose: () => void
}) {
    const t = useTranslations('Breakdown')
    const nameRef = useRef<HTMLInputElement>(null)
    const descRef = useRef<HTMLInputElement>(null)
    const [active, setActive] = useState(-1)
    const [dismissed, setDismissed] = useState(false)
    const [browsing, setBrowsing] = useState(false)
    const list = draft.pick || dismissed ? [] : suggest(draft.name)
    const listId = `pe-sugg-${where.replace(/\W+/g, '-')}`

    const pick = (s: Suggestion) => {
        onChange({ name: s.name, description: s.description ?? draft.description, pick: s })
        setActive(-1)
        descRef.current?.focus()
    }

    // Enter: oba pola puste → następna scena; jest nazwa, a opisu brak → przejście do opisu;
    // Enter w opisie (albo w nazwie, gdy opis już jest) → dodanie i powrót do nazwy.
    const add = () => { onAdd(); setDismissed(false); nameRef.current?.focus() }
    const enterInName = () => {
        if (!draft.name.trim()) { if (draft.description.trim()) return; onNext(); return }
        if (draft.description.trim()) add()
        else { setActive(-1); setDismissed(true); descRef.current?.focus() }
    }
    const enterInDescription = () => {
        if (draft.name.trim()) add()
        else if (draft.description.trim()) nameRef.current?.focus()
        else onNext()
    }

    // Kliknięcie poza polem zamyka je jak „Esc”: wpisana nazwa jest dodawana (nic nie ginie, „Cofnij” jest w komunikacie),
    // puste pola po prostu znikają. Fokus w oknie wyboru z magazynu leży wewnątrz tego bloku, więc go nie zamyka.
    const leave = (e: React.FocusEvent<HTMLDivElement>) => {
        if (e.currentTarget.contains(e.relatedTarget as Node | null)) return
        if (draft.name.trim()) onAdd()
        onClose()
    }

    return (
        <div className="flex flex-col gap-2" onBlur={leave}>
            <div className="grid gap-2 md:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]">
                <div className="relative">
                    <Tooltip text={t('addTip')} keys="Enter">
                        <input
                            ref={nameRef}
                            className="rk-input w-full"
                            autoFocus
                            value={draft.name}
                            role="combobox"
                            aria-expanded={list.length > 0}
                            aria-controls={listId}
                            aria-activedescendant={active >= 0 ? `${listId}-${active}` : undefined}
                            aria-autocomplete="list"
                            aria-label={t('newLabel', { where })}
                            placeholder={first ? t('placeholderFirst') : t('placeholderNext')}
                            onChange={e => { onChange({ ...draft, name: e.target.value, pick: null }); setActive(-1); setDismissed(false) }}
                            onPaste={e => {
                                const lines = splitLines(e.clipboardData.getData('text'))
                                if (lines.length < 2) return
                                e.preventDefault()
                                onPaste(lines)
                            }}
                            onKeyDown={e => {
                                if (e.key === 'ArrowDown' && list.length) { e.preventDefault(); setActive(a => (a + 1) % list.length) }
                                if (e.key === 'ArrowUp' && list.length) { e.preventDefault(); setActive(a => (a <= 0 ? list.length - 1 : a - 1)) }
                                if (e.key === 'Enter') {
                                    e.preventDefault()
                                    if (active >= 0 && list[active]) pick(list[active])
                                    else enterInName()
                                }
                                if (e.key === 'Escape') {
                                    if (list.length) { setDismissed(true); setActive(-1) }
                                    else onClose()
                                }
                            }}
                        />
                    </Tooltip>
                    {list.length > 0 && (
                        <div className="rk-cmd absolute top-full left-0 z-30 mt-1" style={{ maxWidth: 480 }}>
                            <ul className="rk-cmd__list" role="listbox" id={listId} aria-label={t('suggestions')}>
                                {list.map((s, i) => (
                                    <Fragment key={s.key}>
                                        {(i === 0 || list[i - 1].source !== s.source) && (
                                            <li className="rk-cmd__group" role="presentation">{s.source === 'show' ? t('fromShow') : t('fromStorage')}</li>
                                        )}
                                        <li
                                            id={`${listId}-${i}`}
                                            role="option"
                                            aria-selected={i === active}
                                            className="rk-cmd__item"
                                            onMouseDown={e => { e.preventDefault(); pick(s) }}
                                            onMouseEnter={() => setActive(i)}
                                        >
                                            {s.source === 'show' ? <Tag /> : <Layers />}
                                            <span className="min-w-0">
                                                <Highlight text={s.name} query={draft.name.trim()} />
                                                {s.detail && <small><Highlight text={s.detail} query={draft.name.trim()} /></small>}
                                            </span>
                                        </li>
                                    </Fragment>
                                ))}
                            </ul>
                        </div>
                    )}
                </div>
                <input
                    ref={descRef}
                    className="rk-input w-full"
                    value={draft.description}
                    aria-label={t('descriptionLabel', { where })}
                    placeholder={t('descriptionPlaceholder')}
                    onChange={e => onChange({ ...draft, description: e.target.value })}
                    onKeyDown={e => {
                        if (e.key === 'Enter') { e.preventDefault(); enterInDescription() }
                        if (e.key === 'Escape') onClose()
                    }}
                />
            </div>
            <div className="flex flex-wrap items-center gap-3">
                {draft.pick && (
                    <span className="rk-find__scope">
                        {draft.pick.source === 'show'
                            ? t('linkedShow', { where: draft.pick.detail ?? t('unassigned') })
                            : t('linkedStorage', { path: [draft.pick.detail, draft.pick.name].filter(Boolean).join(' › ') })}
                        <button type="button" aria-label={t('unlink')} onClick={() => { onChange({ ...draft, pick: null }); setDismissed(true); nameRef.current?.focus() }}><X /></button>
                    </span>
                )}
                <button type="button" className="pl-link" onClick={() => setBrowsing(true)}>{t('browse')}</button>
            </div>
            {browsing && (
                <StoragePicker
                    storage={storage}
                    toSuggestion={toSuggestion}
                    onPick={s => { setBrowsing(false); pick(s) }}
                    onClose={() => { setBrowsing(false); nameRef.current?.focus() }}
                />
            )}
        </div>
    )
}

/** Wspólny szkielet okien wyboru na tym ekranie (karta Modal): tytuł, opis, pole zawężania, lista wierszy palety. */
function PickerModal({ title, hint, search, onSearch, onClose, children }: {
    title: string
    hint: string
    search: string
    onSearch: (v: string) => void
    onClose: () => void
    children: ReactNode
}) {
    const t = useTranslations('Breakdown')
    useEffect(() => {
        const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') { e.stopPropagation(); onClose() } }
        document.addEventListener('keydown', onKey, true)
        return () => document.removeEventListener('keydown', onKey, true)
    }, [onClose])
    return (
        <div className="rk-overlay fixed inset-0 z-50 overflow-y-auto rounded-none" onMouseDown={e => { if (e.target === e.currentTarget) onClose() }}>
            <div className="rk-modal" role="dialog" aria-modal="true" aria-labelledby="pe-picker-title" style={{ maxWidth: 560 }}>
                <div className="rk-modal__head">
                    <div>
                        <h3 className="rk-modal__title" id="pe-picker-title">{title}</h3>
                        <p className="rk-modal__desc">{hint}</p>
                    </div>
                </div>
                <div className="rk-modal__body rk-stack">
                    <input className="rk-input w-full" autoFocus value={search} aria-label={t('pickerSearch')} placeholder={t('pickerSearch')} onChange={e => onSearch(e.target.value)} />
                    <ul className="rk-cmd__list" style={{ maxHeight: 360, padding: 0 }}>{children}</ul>
                </div>
                <div className="rk-modal__foot">
                    <Button variant="ghost" onClick={onClose}>{t('cancel')}</Button>
                </div>
            </div>
        </div>
    )
}

const pickerRow = (key: string, label: ReactNode, onPick: () => void, icon?: ReactNode) => (
    <li key={key} className="rk-cmd__item" tabIndex={0} role="button" onClick={onPick}
        onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onPick() } }}>
        {icon}<span className="min-w-0">{label}</span>
    </li>
)

// „Nie pamiętam nazwy”: przeglądanie magazynu według miejsc, z polem do zawężania. Szuka po nazwie, miejscu i opisie.
function StoragePicker({ storage, toSuggestion, onPick, onClose }: {
    storage: StorageSuggestion[]
    toSuggestion: (x: StorageSuggestion) => Suggestion
    onPick: (s: Suggestion) => void
    onClose: () => void
}) {
    const t = useTranslations('Breakdown')
    const [query, setQuery] = useState('')
    const q = query.trim()
    const place = (x: StorageSuggestion) => (x.itemId ? x.path?.split(' › ')[0] : x.path) || t('noPlace')
    const rows = storage
        .map(x => ({ x, r: q ? score(q, x.name, x.path ?? '', x.description) : 0 }))
        .filter(o => o.r >= 0)
        .sort((a, b) => place(a.x).localeCompare(place(b.x), 'pl') || a.r - b.r || a.x.name.localeCompare(b.x.name, 'pl'))
        .slice(0, 150)
        .map(o => o.x)
    return (
        <PickerModal title={t('pickerTitle')} hint={t('pickerHint')} search={query} onSearch={setQuery} onClose={onClose}>
            {rows.length === 0 && <li className="rk-cmd__group" role="presentation">{t('pickerEmpty')}</li>}
            {rows.map((x, i) => (
                <Fragment key={x.id}>
                    {(i === 0 || place(rows[i - 1]) !== place(x)) && <li className="rk-cmd__group" role="presentation">{place(x)}</li>}
                    {pickerRow(x.id, <>
                        {x.name}
                        {x.itemId && x.path && <small>{x.path.split(' › ').slice(1).join(' › ')}</small>}
                        {x.description && <small>{x.description}</small>}
                    </>, () => onPick(toSuggestion(x)), <Layers />)}
                </Fragment>
            ))}
        </PickerModal>
    )
}

// „Przenieś do…”: to samo co przeciąganie, dla klawiatury i długich rozpisek. Lista scen w kolejności rozpiski.
function MovePicker({ item, targets, onPick, onClose }: { item: Item; targets: Slot[]; onPick: (slot: string) => void; onClose: () => void }) {
    const t = useTranslations('Breakdown')
    const [query, setQuery] = useState('')
    const rows = targets.filter(s => s.key !== item.slot && (!query.trim() || fold(s.label).includes(fold(query.trim()))))
    return (
        <PickerModal title={t('moveTitle', { name: item.name })} hint={t('moveHint')} search={query} onSearch={setQuery} onClose={onClose}>
            {rows.length === 0 && <li className="rk-cmd__group" role="presentation">{t('pickerEmpty')}</li>}
            {rows.map(s => pickerRow(s.key, s.label, () => onPick(s.key)))}
        </PickerModal>
    )
}

// Potwierdzenie usunięcia (karta Modal, --confirm): nazwa w pytaniu, w opisie skutki.
function ConfirmDialog({ title, desc, confirmLabel, onConfirm, onCancel }: {
    title: string
    desc: string
    confirmLabel: string
    onConfirm: () => void
    onCancel: () => void
}) {
    const t = useTranslations('Breakdown')
    useEffect(() => {
        const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onCancel() }
        document.addEventListener('keydown', onKey)
        return () => document.removeEventListener('keydown', onKey)
    }, [onCancel])
    return (
        <div className="rk-overlay fixed inset-0 z-50 rounded-none">
            <div className="rk-modal rk-modal--confirm" role="alertdialog" aria-labelledby="pe-confirm-title" aria-describedby="pe-confirm-desc">
                <div className="rk-modal__head">
                    <span className="rk-modal__icon rk-modal__icon--danger"><Trash2 /></span>
                    <div>
                        <h3 className="rk-modal__title" id="pe-confirm-title">{title}</h3>
                        <p className="rk-modal__desc" id="pe-confirm-desc">{desc}</p>
                    </div>
                </div>
                <div className="rk-modal__foot">
                    <Button variant="ghost" onClick={onCancel} autoFocus>{t('cancel')}</Button>
                    <Button variant="danger" onClick={onConfirm}>{confirmLabel}</Button>
                </div>
            </div>
        </div>
    )
}

function PropRow({ item, onRename, onDetails, onMove, onRemove }: {
    item: Item
    onRename: (name: string) => void
    onDetails: () => void
    onMove: () => void
    onRemove: () => void
}) {
    const t = useTranslations('Breakdown')
    const [editing, setEditing] = useState(false)
    const [value, setValue] = useState(item.name)
    const saved = !isTemp(item.id)
    const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
        id: `p:${item.id}`, data: { type: 'prop' }, disabled: editing || !saved,
    })

    const begin = () => { setValue(item.name); setEditing(true) }
    const commit = () => {
        setEditing(false)
        const name = value.trim()
        if (name && name !== item.name) onRename(name)
        else setValue(item.name)
    }

    return (
        <li
            ref={setNodeRef}
            className="items-center"
            style={{ transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.4 : saved ? 1 : 0.6 }}
        >
            <button
                type="button"
                className="rk-btn rk-btn--ghost rk-btn--icon rk-btn--sm cursor-grab"
                style={{ width: 24, marginLeft: -8, marginRight: -4 }}
                aria-label={t('dragProp', { name: item.name })}
                disabled={!saved}
                {...attributes}
                {...listeners}
            >
                <GripVertical />
            </button>
            {editing ? (
                <input
                    className="rk-input flex-1"
                    autoFocus
                    value={value}
                    aria-label={t('renameLabel', { name: item.name })}
                    onFocus={e => e.currentTarget.select()}
                    onChange={e => setValue(e.target.value)}
                    onBlur={commit}
                    onKeyDown={e => {
                        if (e.key === 'Enter') { e.preventDefault(); commit() }
                        if (e.key === 'Escape') { setValue(item.name); setEditing(false) }
                    }}
                />
            ) : (
                <button type="button" className="min-w-0 flex-1 cursor-text text-left" disabled={!saved} title={t('renameHint')} onClick={begin}>
                    <PropEntry name={item.name} how={item.how} where={item.where} small />
                </button>
            )}
            {saved && !editing && (
                <ActionMenu
                    label={t('actions', { name: item.name })}
                    items={[
                        { type: 'button', label: t('rename'), onSelect: begin },
                        { type: 'button', label: t('details'), onSelect: onDetails },
                        { type: 'button', label: t('moveTo'), onSelect: onMove },
                        { type: 'separator' },
                        { type: 'button', label: t('delete'), danger: true, onSelect: onRemove },
                    ]}
                />
            )}
        </li>
    )
}
