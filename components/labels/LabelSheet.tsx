'use client'

import React, { useState, useMemo } from 'react'
import { useTranslations } from 'next-intl'
import { Printer, AlertCircle, ArrowLeft } from 'lucide-react'
import Link from 'next/link'
import { Button } from '@/components/ui/Button'
import { StatusBanner } from '@/components/rk/StatusBanner'
import { EmptyState } from '@/components/rk/EmptyState'
import { Label, LabelFormat, PrintableLabelItem } from './Label'

export interface SheetFormatConfig {
    key: LabelFormat
    label: string
    subLabel: string
    widthMm: number
    heightMm: number
    columns: number
    rows: number
    perSheet: number
    paddingX: number
    paddingY: number
}

const FORMAT_KEY = {
    item: 'formatItem',
    mini: 'formatMini',
    flag: 'formatFlag',
    group: 'formatGroup',
    place: 'formatPlace',
} as const

// Siatki odpowiadają arkuszom Avery Zweckform z Lyreco (A4). Marginesy są wyliczone symetrycznie:
// (210 - kolumny × szerokość) / 2 oraz (297 - rzędy × wysokość) / 2. Do potwierdzenia wydrukiem próbnym:
// szablon producenta może się różnić o 1-2 mm.
export const SHEET_FORMATS: Record<LabelFormat, SheetFormatConfig> = {
    item: {
        key: 'item',
        label: 'Rekwizyt',
        subLabel: '48,5 × 25,4 mm · 40 na A4 · Lyreco 1.099.939 lub 1.099.872',
        widthMm: 48.5,
        heightMm: 25.4,
        columns: 4,
        rows: 10,
        perSheet: 40,
        paddingX: 8,
        paddingY: 21.5,
    },
    mini: {
        key: 'mini',
        label: 'Mini',
        subLabel: '38 × 21,2 mm · 65 na A4 · Lyreco 1.099.859',
        widthMm: 38,
        heightMm: 21.2,
        columns: 5,
        rows: 13,
        perSheet: 65,
        paddingX: 10,
        paddingY: 10.7,
    },
    flag: {
        key: 'flag',
        label: 'Flaga',
        subLabel: '70 × 32 mm · 27 na A4 · Lyreco 1.102.236',
        widthMm: 70,
        heightMm: 32,
        columns: 3,
        rows: 9,
        perSheet: 27,
        paddingX: 0,
        paddingY: 4.5,
    },
    group: {
        key: 'group',
        label: 'Grupa',
        subLabel: '105 × 57 mm · 10 na A4 · Lyreco 1.100.161',
        widthMm: 105,
        heightMm: 57,
        columns: 2,
        rows: 5,
        perSheet: 10,
        paddingX: 0,
        paddingY: 6,
    },
    place: {
        key: 'place',
        label: 'Miejsce',
        subLabel: '105 × 57 mm · 10 na A4 · Lyreco 1.100.161',
        widthMm: 105,
        heightMm: 57,
        columns: 2,
        rows: 5,
        perSheet: 10,
        paddingX: 0,
        paddingY: 6,
    },
}

interface LabelSheetProps {
    items: PrintableLabelItem[]
    missingCount?: number
    missingNames?: string[]
    initialKind?: 'group' | 'item' | 'place'
    origin?: string
    /** Wejście z menu (bez wybranych pozycji): nie ma do czego wracać. */
    fromMenu?: boolean
}

export function LabelSheet({
    items,
    missingCount = 0,
    missingNames = [],
    initialKind = 'group',
    origin = '',
    fromMenu = false,
}: LabelSheetProps) {
    const t = useTranslations('Labels')

    // Initial format based on initialKind
    const defaultFormat: LabelFormat =
        initialKind === 'place' ? 'place' : initialKind === 'group' ? 'group' : 'item'

    const [currentFormat, setCurrentFormat] = useState<LabelFormat>(defaultFormat)
    const [startFrom, setStartFrom] = useState<number>(1)

    const formatConfig = SHEET_FORMATS[currentFormat]

    // Build paginated sheets according to startFrom offset
    const sheets = useMemo(() => {
        if (items.length === 0) return []

        const pages: Array<Array<PrintableLabelItem | null>> = []
        const perSheet = formatConfig.perSheet

        // First sheet blanks: 0 up to (perSheet - 1)
        const safeStartFrom = Math.max(1, Math.min(perSheet, startFrom))
        const firstSheetBlanks = safeStartFrom - 1

        const firstPage: Array<PrintableLabelItem | null> = Array(firstSheetBlanks).fill(null)
        let itemIndex = 0

        while (firstPage.length < perSheet && itemIndex < items.length) {
            firstPage.push(items[itemIndex++])
        }
        while (firstPage.length < perSheet) {
            firstPage.push(null)
        }
        pages.push(firstPage)

        // Subsequent sheets
        while (itemIndex < items.length) {
            const nextPage: Array<PrintableLabelItem | null> = []
            while (nextPage.length < perSheet && itemIndex < items.length) {
                nextPage.push(items[itemIndex++])
            }
            while (nextPage.length < perSheet) {
                nextPage.push(null)
            }
            pages.push(nextPage)
        }

        return pages
    }, [items, formatConfig.perSheet, startFrom])

    const handleFormatChange = (fmt: LabelFormat) => {
        setCurrentFormat(fmt)
        const nextConfig = SHEET_FORMATS[fmt]
        if (startFrom > nextConfig.perSheet) {
            setStartFrom(1)
        }
    }

    const handlePrint = () => {
        if (typeof window !== 'undefined') {
            window.print()
        }
    }

    return (
        <div className="rk-label-page flex flex-col min-h-screen bg-[var(--bg)] text-[var(--ink)]">
            <style dangerouslySetInnerHTML={{ __html: `
                @page {
                    size: A4 portrait;
                    margin: 0;
                }

                .rk-sheet-preview-wrap {
                    --sheet-mm: 3.4px;
                }

                @media (max-width: 840px) {
                    .rk-sheet-preview-wrap {
                        --sheet-mm: calc((100vw - 32px) / 210);
                    }
                }

                .rk-sheet-page .rk-lbl {
                    --mm: var(--sheet-mm) !important;
                }

                .rk-lbl-slot--empty {
                    box-sizing: border-box;
                    outline: 1px dashed var(--border-strong, #b5b5b5);
                    outline-offset: -1px;
                    background: transparent;
                }

                @media print {
                    html, body {
                        background: #ffffff !important;
                        color: #000000 !important;
                        margin: 0 !important;
                        padding: 0 !important;
                        height: auto !important;
                        min-height: 0 !important;
                        -webkit-print-color-adjust: exact !important;
                        print-color-adjust: exact !important;
                    }

                    .rk-label-page {
                        min-height: 0 !important;
                        display: block !important;
                    }

                    aside, nav, header, footer, .rk-sidebar, .rk-tabbar, .rk-no-print {
                        display: none !important;
                    }

                    main {
                        padding: 0 !important;
                        margin: 0 !important;
                    }

                    .md\\:pl-\\[var\\(--rk-sidebar-w\\,256px\\)\\] {
                        padding-left: 0 !important;
                    }

                    .rk-sheet-preview-wrap {
                        --sheet-mm: 1mm !important;
                        padding: 0 !important;
                        margin: 0 !important;
                        display: block !important;
                        overflow: visible !important;
                        background: transparent !important;
                    }

                    .rk-sheet-page {
                        --sheet-mm: 1mm !important;
                        width: 210mm !important;
                        height: 297mm !important;
                        min-height: 297mm !important;
                        max-height: 297mm !important;
                        margin: 0 !important;
                        box-shadow: none !important;
                        page-break-after: always !important;
                        break-after: page !important;
                        overflow: hidden !important;
                        box-sizing: border-box !important;
                        background: #ffffff !important;
                    }

                    .rk-sheet-page:last-child {
                        page-break-after: auto !important;
                        break-after: auto !important;
                    }

                    .rk-sheet-page .rk-lbl {
                        --mm: 1mm !important;
                        outline: none !important;
                        box-shadow: none !important;
                        background: #ffffff !important;
                        color: #000000 !important;
                    }

                    /* Tylko czerń: szare linie zgięcia flagi i ramki krawędzi nie idą na papier. */
                    .rk-sheet-page .rk-lbl--flag .rk-lbl__wrap::before,
                    .rk-sheet-page .rk-lbl--flag .rk-lbl__wrap::after {
                        display: none !important;
                    }

                    .rk-lbl-slot--empty {
                        outline: none !important;
                        border: none !important;
                        background: transparent !important;
                        visibility: hidden !important;
                    }
                }
            ` }} />

            {/* Screen Controls Header */}
            <div className="rk-no-print border-b border-[var(--border)] bg-[var(--surface)] sticky top-0 z-30">
                <div className="max-w-6xl mx-auto px-4 py-4 flex flex-col gap-4">
                    {/* Top Row: Title, Back & Print */}
                    <div className="flex items-center justify-between gap-4">
                        <div className="flex items-center gap-3">
                            {!fromMenu && (
                                <Link
                                    href="/groups"
                                    className="rk-btn rk-btn--ghost rk-btn--sm rk-btn--icon"
                                    title={t('backToStorage')}
                                    aria-label={t('backToStorage')}
                                >
                                    <ArrowLeft className="w-4 h-4" />
                                </Link>
                            )}
                            <div>
                                <h1 className="text-lg font-semibold text-[var(--ink)] leading-snug">
                                    {t('title')}
                                </h1>
                                <p className="text-xs text-[var(--ink-muted)]">
                                    {t('summary', { count: items.length, sheets: sheets.length })}
                                </p>
                            </div>
                        </div>

                        <div className="flex items-center gap-2">
                            <Button
                                variant="primary"
                                onClick={handlePrint}
                                disabled={items.length === 0}
                                leftIcon={<Printer className="w-4 h-4" />}
                            >
                                {t('print')}
                            </Button>
                        </div>
                    </div>

                    {/* Bottom Row: Sheet Format & Start From */}
                    <div className="flex flex-wrap items-center justify-between gap-4 pt-1 border-t border-[var(--border)]">
                        {/* Format selector chips */}
                        <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-xs font-medium text-[var(--ink-muted)] mr-1">
                                {t('sheetFormat')}:
                            </span>
                            <div className="rk-chips">
                                {(Object.keys(SHEET_FORMATS) as LabelFormat[]).map(key => {
                                    const fmt = SHEET_FORMATS[key]
                                    const isActive = currentFormat === key
                                    return (
                                        <button
                                            key={key}
                                            type="button"
                                            className="rk-chip"
                                            aria-pressed={isActive}
                                            onClick={() => handleFormatChange(key)}
                                        >
                                            <span>{t(FORMAT_KEY[key])}</span>
                                            <span className="rk-chip__n">{fmt.perSheet}</span>
                                        </button>
                                    )
                                })}
                            </div>
                        </div>

                        <p className="w-full text-xs text-[var(--ink-muted)]">{formatConfig.subLabel}</p>

                        {/* Start offset */}
                        <div className="flex items-center gap-2">
                            <label htmlFor="label-start-from" className="text-xs text-[var(--ink-muted)] whitespace-nowrap">
                                {t('startFrom')}:
                            </label>
                            <input
                                id="label-start-from"
                                type="number"
                                min={1}
                                max={formatConfig.perSheet}
                                value={startFrom}
                                onChange={e => {
                                    const val = parseInt(e.target.value, 10)
                                    if (Number.isNaN(val)) setStartFrom(1)
                                    else setStartFrom(Math.max(1, Math.min(formatConfig.perSheet, val)))
                                }}
                                className="rk-input !h-8 !w-20 !text-sm !px-2 text-center"
                                title={t('startFromHint')}
                            />
                            <span className="text-xs text-[var(--ink-subtle)] whitespace-nowrap">
                                / {formatConfig.perSheet}
                            </span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Warning Banner for Missing Codes */}
            {missingCount > 0 && (
                <div className="rk-no-print max-w-6xl mx-auto px-4 mt-4 w-full">
                    <StatusBanner tone="pending" icon={<AlertCircle className="w-4 h-4" />}>
                        {t('missingCodeAlert', {
                            count: missingCount,
                            names:
                                missingNames.slice(0, 4).join(', ') +
                                (missingNames.length > 4 ? ` ${t('andOthers', { count: missingNames.length - 4 })}` : ''),
                        })}{' '}
                        {t('missingCodeHint')}
                    </StatusBanner>
                </div>
            )}

            {/* Content Preview / Empty State */}
            {items.length === 0 ? (
                <div className="flex-1 flex items-center justify-center p-8">
                    <EmptyState
                        art="closed"
                        title={t('emptyTitle')}
                        actions={
                            fromMenu ? undefined : (
                                <Link href="/groups">
                                    <Button variant="secondary">{t('backToStorage')}</Button>
                                </Link>
                            )
                        }
                    >
                        {t(fromMenu ? 'emptyDescription' : 'emptyDescriptionIds')}
                    </EmptyState>
                </div>
            ) : (
                <div className="rk-sheet-preview-wrap flex-1 flex flex-col items-center gap-8 py-8 px-4 overflow-auto">
                    {sheets.map((sheetItems, pageIndex) => (
                        <div
                            key={pageIndex}
                            className="rk-sheet-page bg-white shadow-md relative"
                            style={{
                                width: 'calc(210 * var(--sheet-mm))',
                                height: 'calc(297 * var(--sheet-mm))',
                                paddingLeft: `calc(${formatConfig.paddingX} * var(--sheet-mm))`,
                                paddingRight: `calc(${formatConfig.paddingX} * var(--sheet-mm))`,
                                paddingTop: `calc(${formatConfig.paddingY} * var(--sheet-mm))`,
                                paddingBottom: `calc(${formatConfig.paddingY} * var(--sheet-mm))`,
                                display: 'grid',
                                gridTemplateColumns: `repeat(${formatConfig.columns}, calc(${formatConfig.widthMm} * var(--sheet-mm)))`,
                                gridTemplateRows: `repeat(${formatConfig.rows}, calc(${formatConfig.heightMm} * var(--sheet-mm)))`,
                                boxSizing: 'border-box',
                            }}
                        >
                            {sheetItems.map((item, cellIndex) =>
                                item ? (
                                    <Label
                                        key={`${pageIndex}-${cellIndex}-${item.id}`}
                                        format={currentFormat}
                                        item={item}
                                        origin={origin}
                                    />
                                ) : (
                                    <div
                                        key={`${pageIndex}-${cellIndex}-empty`}
                                        className="rk-lbl-slot rk-lbl-slot--empty"
                                        style={{
                                            width: `calc(${formatConfig.widthMm} * var(--sheet-mm))`,
                                            height: `calc(${formatConfig.heightMm} * var(--sheet-mm))`,
                                        }}
                                    />
                                )
                            )}
                        </div>
                    ))}
                </div>
            )}
        </div>
    )
}
