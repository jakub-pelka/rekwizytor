'use client'

import { useEffect, useRef, useState, type ReactNode } from 'react'
import { Ellipsis } from 'lucide-react'
import { Link } from '@/i18n/routing'

export type ActionMenuItem =
    | { type?: 'link'; label: string; href: string; icon?: ReactNode; danger?: boolean }
    | { type: 'button'; label: string; onSelect: () => void; icon?: ReactNode; danger?: boolean }
    | { type: 'separator' }

// Menu akcji pod „…” (karta ActionMenu, .rk-menu). Strzałki przesuwają fokus,
// Esc zamyka i wraca fokusem na przycisk.
export function ActionMenu({ label, items }: { label: string; items: ActionMenuItem[] }) {
    const [open, setOpen] = useState(false)
    const triggerRef = useRef<HTMLButtonElement>(null)
    const menuRef = useRef<HTMLDivElement>(null)

    useEffect(() => {
        if (!open) return
        const first = menuRef.current?.querySelector<HTMLElement>('.rk-menu__item')
        first?.focus()
        const onDown = (e: MouseEvent) => {
            if (!menuRef.current?.contains(e.target as Node) && !triggerRef.current?.contains(e.target as Node)) setOpen(false)
        }
        document.addEventListener('mousedown', onDown)
        return () => document.removeEventListener('mousedown', onDown)
    }, [open])

    const onKeyDown = (e: React.KeyboardEvent) => {
        const els = [...(menuRef.current?.querySelectorAll<HTMLElement>('.rk-menu__item') ?? [])]
        const i = els.indexOf(document.activeElement as HTMLElement)
        if (e.key === 'ArrowDown') { e.preventDefault(); els[(i + 1) % els.length]?.focus() }
        if (e.key === 'ArrowUp') { e.preventDefault(); els[(i - 1 + els.length) % els.length]?.focus() }
        if (e.key === 'Escape') { setOpen(false); triggerRef.current?.focus() }
    }

    return (
        <div className="relative">
            <button
                ref={triggerRef}
                className="rk-btn rk-btn--ghost rk-btn--icon"
                aria-label={label}
                aria-haspopup="menu"
                aria-expanded={open}
                onClick={() => setOpen(o => !o)}
            >
                <Ellipsis />
            </button>
            {open && (
                <div ref={menuRef} role="menu" className="rk-menu absolute right-0 top-full z-50 mt-1" onKeyDown={onKeyDown}>
                    {items.map((item, i) => {
                        if (item.type === 'separator') return <div key={i} className="rk-menu__sep" role="separator" />
                        const cls = `rk-menu__item ${item.danger ? 'rk-menu__item--danger' : ''}`
                        if (item.type === 'button') {
                            return (
                                <button key={i} role="menuitem" className={cls} onClick={() => { setOpen(false); item.onSelect() }}>
                                    {item.icon}{item.label}
                                </button>
                            )
                        }
                        return (
                            <Link key={i} role="menuitem" className={cls} href={item.href} onClick={() => setOpen(false)}>
                                {item.icon}{item.label}
                            </Link>
                        )
                    })}
                </div>
            )}
        </div>
    )
}
