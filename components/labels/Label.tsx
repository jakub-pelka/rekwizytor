'use client'

import React, { useEffect, useState } from 'react'
import QRCode from 'qrcode'
import { getLabelQrUrl, type LabelFormat, type PrintableLabelItem } from '@/lib/labels'

export type { LabelFormat, PrintableLabelItem }


export interface LabelProps {
    format: LabelFormat
    item: PrintableLabelItem
    origin?: string
    style?: React.CSSProperties
    className?: string
}

function injectQrClass(rawSvg: string): string {
    if (!rawSvg) return ''
    return rawSvg.replace('<svg ', '<svg class="rk-lbl__qr" ')
}

export function Label({ format, item, origin = '', style, className = '' }: LabelProps) {
    const [qrSvg, setQrSvg] = useState<string>(item.qrSvg || '')

    useEffect(() => {
        if (item.qrSvg) {
            setQrSvg(item.qrSvg)
            return
        }

        let isMounted = true
        const url = getLabelQrUrl(item, origin)

        QRCode.toString(url, { type: 'svg', margin: 2 })
            .then(svg => {
                if (isMounted) setQrSvg(svg)
            })
            .catch(err => {
                console.error('Failed to generate QR code SVG:', err)
            })

        return () => {
            isMounted = false
        }
    }, [item.qrSvg, item.id, item.kind, item.code, item.shortId, origin])

    const qrElement = qrSvg ? (
        <span
            className="contents"
            dangerouslySetInnerHTML={{ __html: injectQrClass(qrSvg) }}
        />
    ) : (
        <span className="rk-lbl__qr" aria-hidden="true" />
    )

    if (format === 'mini') {
        return (
            <div className={`rk-lbl rk-lbl--mini ${className}`} style={style}>
                {qrElement}
                <div className="rk-lbl__text">
                    <div className="rk-lbl__id">{item.code}</div>
                    {/* Mini: zamiast napisu „Rekwizytor” sam znak, tuż pod numerem (karta InventoryLabel). */}
                    <div className="rk-lbl__foot">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src="/brand/rekwizytor-znak-mono-czarny.svg" alt="" />
                    </div>
                </div>
            </div>
        )
    }

    if (format === 'flag') {
        return (
            <div className={`rk-lbl rk-lbl--flag ${className}`} style={style}>
                <div className="rk-lbl__half">
                    <div className="rk-lbl__id">{item.code}</div>
                    <div className="rk-lbl__name" title={item.name}>{item.name}</div>
                    <div className="rk-lbl__foot">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src="/brand/rekwizytor-znak-mono-czarny.svg" alt="" />
                        <span className="rk-lbl__brand">Rekwizytor</span>
                    </div>
                </div>
                <div className="rk-lbl__wrap" aria-hidden="true">
                    <span className="rk-lbl__tick rk-lbl__tick--t" />
                    <span className="rk-lbl__tick rk-lbl__tick--b" />
                </div>
                <div className="rk-lbl__half rk-lbl__half--qr">
                    {qrElement}
                </div>
            </div>
        )
    }

    if (format === 'group') {
        return (
            <div className={`rk-lbl rk-lbl--group ${className}`} style={style}>
                <div className="rk-lbl__text">
                    <div className="rk-lbl__kind">Grupa</div>
                    <div className="rk-lbl__name" title={item.name}>{item.name}</div>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 'calc(2 * var(--mm, 4px))' }}>
                        <div className="rk-lbl__id">{item.code}</div>
                        <div className="rk-lbl__foot">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img src="/brand/rekwizytor-znak-mono-czarny.svg" alt="" />
                            <span className="rk-lbl__brand">Rekwizytor</span>
                        </div>
                    </div>
                </div>
                {qrElement}
            </div>
        )
    }

    if (format === 'place') {
        return (
            <div className={`rk-lbl rk-lbl--place ${className}`} style={style}>
                <div className="rk-lbl__band">
                    <span className="rk-lbl__kind">Miejsce w magazynie</span>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src="/brand/rekwizytor-znak-mono-bialy.svg" alt="" />
                </div>
                <div className="rk-lbl__text">
                    <div>
                        <div className="rk-lbl__where">{item.whereName || item.name}</div>
                        {item.subName && <div className="rk-lbl__sub">{item.subName}</div>}
                    </div>
                    <div className="rk-lbl__id">{item.code}</div>
                </div>
                {qrElement}
            </div>
        )
    }

    // Default: 'item' (rekwizyt 48,5 x 25,4 mm)
    return (
        <div className={`rk-lbl rk-lbl--item ${className}`} style={style}>
            {qrElement}
            <div className="rk-lbl__text">
                <div className="rk-lbl__id">{item.code}</div>
                <div className="rk-lbl__name" title={item.name}>{item.name}</div>
                <div className="rk-lbl__foot">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src="/brand/rekwizytor-znak-mono-czarny.svg" alt="" />
                    <span className="rk-lbl__brand">Rekwizytor</span>
                </div>
            </div>
        </div>
    )
}
