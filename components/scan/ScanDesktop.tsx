'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import { Camera, Check, ChevronLeft, Layers, Pencil, Plus } from 'lucide-react'
import { Link } from '@/i18n/routing'
import { Button } from '@/components/ui/Button'
import { RkIcon } from '@/components/rk/RkIcon'
import type { ScanMode } from '@/app/actions/scan-photo'
import { boxArea, pinPositions, type ScanRow } from './scan-pins'
import { ScanPlacePicker, type PlaceNode } from './ScanPlacePicker'

type Status = 'pending' | 'done' | 'error'

type Props = {
    photo: string
    photoSize: { width: number; height: number } | null
    mode: ScanMode
    onMode: (m: ScanMode) => void
    status: Record<ScanMode, { status: Status; count: number }>
    error?: string
    rows: ScanRow[] | null
    selected: string | null
    onSelect: (key: string | null, scroll?: boolean) => void
    onUpdate: (key: string, patch: Partial<ScanRow>) => void
    onAddRow: () => void
    onSetAll: (checked: boolean) => void
    tree: PlaceNode[]
    place: string
    onPlace: (id: string) => void
    recent: string[]
    canEdit: boolean
    saving: boolean
    saveDisabled: boolean
    saveLabel: string
    onSave: () => void
    onNewPhoto: () => void
    children?: React.ReactNode
}

// Skan zdjęcia na komputerze (ekrany Skan-komputer i Skan-komputer-grupy): zdjęcie stoi po lewej,
// po prawej przewija się lista do sprawdzenia, a miejsce zapisu i przycisk są przypięte na dole.
export function ScanDesktop(p: Props) {
    const t = useTranslations('Scan')
    const [renaming, setRenaming] = useState<string | null>(null)
    const rows = p.rows ?? []
    const checked = rows.filter(r => r.checked).length
    const aspect = p.photoSize ? p.photoSize.width / p.photoSize.height : 4 / 3
    const pins = pinPositions(rows, 1 / aspect)
    const sel = rows.find(r => r.key === p.selected)
    const selIndex = sel ? rows.indexOf(sel) : -1
    const unsure = rows.map((r, i) => ({ r, i })).filter(x => x.r.low)
    const sure = rows.map((r, i) => ({ r, i })).filter(x => !x.r.low)
    const recognized = p.status[p.mode]

    // Dotknięcie zdjęcia: najmniejsza ramka z tego punktu, kolejne w to samo miejsce przechodzi do większej.
    const pick = (e: React.MouseEvent<HTMLDivElement>) => {
        const r = e.currentTarget.getBoundingClientRect()
        const px = (e.clientX - r.left) / r.width, py = (e.clientY - r.top) / r.height
        const hits = rows
            .filter(f => f.box && px >= f.box.x && px <= f.box.x + f.box.w && py >= f.box.y && py <= f.box.y + f.box.h)
            .sort((a, b) => boxArea(a.box!) - boxArea(b.box!))
        const at = hits.findIndex(f => f.key === p.selected)
        p.onSelect(at === hits.length - 1 ? null : hits[at + 1]?.key ?? null, true)
    }

    const row = (r: ScanRow, i: number) => {
        const isSel = r.key === p.selected
        const sub = r.description
        return (
            <div
                key={r.key}
                id={`scan-row-${r.key}`}
                className={`sk-row ${r.checked ? 'is-on' : ''} ${isSel ? 'is-selected' : ''}`}
                onClick={() => p.onSelect(r.key)}
            >
                <label className="rk-check" onClick={e => e.stopPropagation()}>
                    <input type="checkbox" checked={r.checked} onChange={e => p.onUpdate(r.key, { checked: e.target.checked })} aria-label={t('include', { name: r.name || `#${i + 1}` })} />
                    <span className="rk-box"><Check className="i-chk" /></span>
                </label>
                <span className={`sk-n ${isSel ? 'sk-n--sel' : r.low ? 'sk-n--low' : ''}`}>{`${i + 1}${r.low ? '?' : ''}`}</span>
                <span className="sk-main">
                    {isSel || !r.name ? (
                        <input
                            className="rk-input"
                            value={r.name}
                            autoFocus={renaming === r.key || !r.name}
                            onFocus={e => { if (renaming === r.key) { e.target.select(); setRenaming(null) } }}
                            onChange={e => p.onUpdate(r.key, { name: e.target.value })}
                            aria-label={t('nameOf', { n: i + 1 })}
                        />
                    ) : (
                        <b>{r.name}</b>
                    )}
                    {sub && <small className={r.low ? 'low' : undefined}>{sub}</small>}
                </span>
                <span className="sk-side">
                    {p.mode === 'groups' && r.approxCount != null && <span className="sk-qty">{t('approx', { count: r.approxCount })}</span>}
                    {!isSel && r.name && (
                        <button
                            type="button"
                            className="rk-btn rk-btn--ghost rk-btn--icon"
                            aria-label={t('rename')}
                            onClick={e => { e.stopPropagation(); setRenaming(r.key); p.onSelect(r.key) }}
                        >
                            <Pencil />
                        </button>
                    )}
                </span>
            </div>
        )
    }

    const seg = (m: ScanMode, label: string, icon: React.ReactNode) => (
        <button type="button" className="rk-seg__opt" aria-pressed={p.mode === m} onClick={() => p.onMode(m)}>
            {icon}{label}
            {p.status[m].status === 'done' && <span className="rk-count">{p.status[m].count}</span>}
        </button>
    )

    return (
        <section className="sk" aria-label={t('title')}>
            <div className="sk-head">
                <div className="sk-head__l">
                    <Link className="sk-back" href="/groups"><ChevronLeft />{t('deskBack')}</Link>
                    <span className="rk-tally">{t('deskTally', { recognized: t('recognized', { count: rows.length }), toSave: checked })}</span>
                    <h1>{t('review')}</h1>
                </div>
                <div className="sk-head__r">
                    <div className="rk-seg" role="group" aria-label={t('howGroup')}>
                        {seg('items', t('items'), <RkIcon name="metka" />)}
                        {seg('groups', t('groups'), <Layers />)}
                    </div>
                    <button type="button" className="rk-btn rk-btn--ghost" onClick={p.onNewPhoto}><Camera />{t('newPhoto')}</button>
                </div>
            </div>

            <div className="sk-body">
                <div className="sk-photo">
                    <div className="sk-stage" style={{ '--sk-aspect': aspect } as React.CSSProperties}>
                        <div className="sk-pic rk-marks" onClick={pick}>
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img src={p.photo} alt={t('photoAlt')} />
                            {sel?.box && (
                                <span
                                    className="rk-mark--spot"
                                    style={{ left: `${sel.box.x * 100}%`, top: `${sel.box.y * 100}%`, width: `${sel.box.w * 100}%`, height: `${sel.box.h * 100}%` }}
                                >
                                    <b>{`${selIndex + 1}${sel.low ? '?' : ''}${sel.name ? ` · ${sel.name}` : ''}`}</b>
                                </span>
                            )}
                            {rows.map((f, i) => {
                                const at = pins.get(f.key)
                                if (!at) return null
                                const state = f.key === p.selected ? 'rk-pin--selected' : f.low && !f.checked ? 'rk-pin--low' : !f.checked ? 'rk-pin--off' : ''
                                return (
                                    <button
                                        key={f.key}
                                        type="button"
                                        className={`rk-pin ${state}`}
                                        style={{ left: `${at.x * 100}%`, top: `${at.y * 100}%` }}
                                        aria-label={`${i + 1}. ${f.name}`}
                                        aria-pressed={f.key === p.selected}
                                        onClick={e => { e.stopPropagation(); p.onSelect(f.key === p.selected ? null : f.key, true) }}
                                    >
                                        {`${i + 1}${f.low ? '?' : ''}`}
                                    </button>
                                )
                            })}
                        </div>
                    </div>
                    <div className="sk-hint">
                        <span>{t('deskHint')}</span>
                        <span className="sk-legend"><span><i></i>{t('legendSave')}</span><span><i className="low"></i>{t('legendCheck')}</span><span><i className="off"></i>{t('legendOff')}</span></span>
                    </div>
                </div>

                <div className="sk-list">
                    <div className="sk-list__head">
                        <span className="rk-tally">{p.mode === 'groups' ? t('listGroups') : t('listItems')}</span>
                        {p.canEdit && rows.length > 0 && (
                            <button type="button" className="pl-link" onClick={() => p.onSetAll(checked < rows.length)}>
                                {checked < rows.length ? t('checkAll') : t('uncheckAll')}
                            </button>
                        )}
                    </div>
                    <div className="sk-scroll">
                        {recognized.status === 'pending' && (
                            <span className="rk-scan-status__row">
                                <span className="rk-bells" aria-hidden="true"><i></i><i></i><i></i></span>
                                {t('recognizingShort')}
                            </span>
                        )}
                        {recognized.status === 'error' && <p className="pl-meta">{p.error}</p>}
                        {unsure.length > 0 && (
                            <div className="sk-group">
                                <span className="rk-tally" style={{ color: 'var(--warning)' }}>{t('toCheck', { count: unsure.length })}</span>
                                {unsure.map(x => row(x.r, x.i))}
                            </div>
                        )}
                        {rows.length > 0 && (
                            <div className="sk-group">
                                {unsure.length > 0 && <span className="rk-tally">{t('sureCount', { count: sure.length })}</span>}
                                {sure.map(x => row(x.r, x.i))}
                                {p.canEdit && (
                                    <button type="button" className="sk-add" onClick={p.onAddRow}><Plus />{t('addUnrecognized')}</button>
                                )}
                            </div>
                        )}
                    </div>
                    {p.canEdit && (
                        <div className="sk-foot">
                            <ScanPlacePicker nodes={p.tree} value={p.place} onChange={p.onPlace} recent={p.recent} disabled={p.saving} />
                            <Button size="lg" className="w-full" onClick={p.onSave} isLoading={p.saving} loadingLabel={t('saving')} disabled={p.saveDisabled}>
                                {p.saveLabel}
                            </Button>
                        </div>
                    )}
                </div>
            </div>
            {p.children}
        </section>
    )
}
