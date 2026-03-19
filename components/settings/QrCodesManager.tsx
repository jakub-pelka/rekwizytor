'use client'

import React, { useState, useEffect } from 'react'
import { ExternalLink, Trash2, Edit2, Copy, Lock, Globe, Users, Archive, ChevronRight, ChevronDown, Box, Theater, Link as LinkIcon } from 'lucide-react'
import { notify } from '@/utils/notify'
import { updateQrCode, deleteQrCode, type QrCode } from '@/app/actions/qr-codes'
import { getLinkTargets, type LinkTarget } from '@/app/actions/link-targets'
import QRCode from 'qrcode'
import { useTranslations } from 'next-intl'
import { clsx } from 'clsx'

interface QrCodesManagerProps {
    readonly initialCodes: QrCode[]
}

type GroupedCodes = {
    groups: QrCode[]
    performances: QrCode[]
    custom: QrCode[]
}

export function QrCodesManager({ initialCodes }: QrCodesManagerProps) {
    const t = useTranslations('QrManager')
    const [codes, setCodes] = useState(initialCodes)
    const [editingCode, setEditingCode] = useState<string | null>(null)
    const [loading, setLoading] = useState(false)
    const [selectedCodes, setSelectedCodes] = useState<Set<string>>(new Set())
    const [linkTargets, setLinkTargets] = useState<LinkTarget[]>([])

    // Collapsed states
    const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set())

    // For smart edit
    const [editTargetType, setEditTargetType] = useState<'group' | 'performance' | 'custom'>('custom')

    useEffect(() => {
        // Prefetch simple list for dropdowns
        async function loadTargets() {
            const groupedTargets = await getLinkTargets('group')
            const perfs = await getLinkTargets('performance')
            setLinkTargets([...groupedTargets, ...perfs])
        }
        loadTargets()
    }, [])

    // Grouping Logic
    type Section = {
        id: string
        title: string
        items: QrCode[]
        type: 'batch' | 'legacy_group' | 'legacy_performance' | 'legacy_other'
        date: Date
    }

    const sectionsMap = new Map<string, Section>()

    codes.forEach(code => {
        if (code.batch_group) {
            if (!sectionsMap.has(code.batch_group)) {
                sectionsMap.set(code.batch_group, {
                    id: code.batch_group,
                    title: code.batch_group,
                    items: [],
                    type: 'batch',
                    date: new Date(code.created_at)
                })
            }
            const section = sectionsMap.get(code.batch_group)!
            section.items.push(code)
            if (new Date(code.created_at) > section.date) section.date = new Date(code.created_at)
        } else {
            // Legacy buckets
            let key = 'others'
            let title = t('filterOthers')
            let type: Section['type'] = 'legacy_other'

            if (code.target_url.includes('/groups')) {
                key = 'groups'
                title = t('filterGroups')
                type = 'legacy_group'
            } else if (code.target_url.includes('/performances')) {
                key = 'performances'
                title = t('filterPerformances')
                type = 'legacy_performance'
            }

            if (!sectionsMap.has(key)) {
                sectionsMap.set(key, {
                    id: key,
                    title,
                    items: [],
                    type,
                    date: new Date(code.created_at)
                })
            }
            const section = sectionsMap.get(key)!
            section.items.push(code)
            if (new Date(code.created_at) > section.date) section.date = new Date(code.created_at)
        }
    })

    // Sort items within sections
    sectionsMap.forEach(section => {
        section.items.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    })

    // Sort sections by date
    const sortedSections = Array.from(sectionsMap.values()).sort((a, b) => b.date.getTime() - a.date.getTime())


    const toggleSection = (section: string) => {
        const next = new Set(expandedSections)
        if (next.has(section)) next.delete(section)
        else next.add(section)
        setExpandedSections(next)
    }

    // Toggle Selection
    const toggleSelect = (code: string) => {
        const next = new Set(selectedCodes)
        if (next.has(code)) next.delete(code)
        else next.add(code)
        setSelectedCodes(next)
    }

    // Bulk Actions
    const handleBulkDelete = async () => {
        if (!confirm(t('actions.delete') + '?')) return
        setLoading(true)
        const toastId = notify.loading(t('actions.delete') + '...')
        try {
            await Promise.all(Array.from(selectedCodes).map(c => deleteQrCode(c)))
            setCodes(codes.filter(c => !selectedCodes.has(c.code)))
            setSelectedCodes(new Set())
            notify.dismiss(toastId)
            notify.success(t('toast.success.deleted', { defaultMessage: 'Deleted' }))
        } catch (error) {
            console.error('Failed to delete selected QR codes:', error)
            notify.dismiss(toastId)
            notify.error('Error')
        } finally {
            setLoading(false)
        }
    }

    // Update
    const handleUpdate = async (code: string, data: any) => {
        setLoading(true)
        const toastId = notify.loading(t('edit.save') + '...')
        try {
            await updateQrCode(code, data)
            setCodes(codes.map(c => c.code === code ? { ...c, ...data } : c))
            setEditingCode(null)
            notify.dismiss(toastId)
            notify.success(t('toast.success.updated', { defaultMessage: 'Updated' }))
        } catch (error) {
            console.error(error)
            notify.dismiss(toastId)
            notify.error('Failed to update')
        } finally {
            setLoading(false)
        }
    }

    const handleDelete = async (code: string) => {
        if (!confirm(t('actions.delete') + '?')) return
        setLoading(true)
        const toastId = notify.loading(t('actions.delete') + '...')
        try {
            await deleteQrCode(code)
            setCodes(codes.filter(c => c.code !== code))
            notify.dismiss(toastId)
            notify.success(t('toast.success.deleted', { defaultMessage: 'Deleted' }))
        } catch (error) {
            console.error(error)
            notify.dismiss(toastId)
            notify.error('Failed to delete')
        } finally {
            setLoading(false)
        }
    }

    const downloadQr = async (code: string, desc: string) => {
        try {
            const baseUrl = globalThis.location.origin
            const url = `${baseUrl}/qr/${code}`
            const dataUrl = await QRCode.toDataURL(url, { width: 400, margin: 1 })
            const link = document.createElement('a')
            link.href = dataUrl
            link.download = `qr_${desc.replaceAll(/[^a-z0-9]/gi, '_')}.png`
            document.body.appendChild(link)
            link.click()
            document.body.removeChild(link)
        } catch (error) {
            console.error('Failed to download QR code:', error)
            notify.error('Error')
        }
    }

    const copyLink = (code: string) => {
        const url = `${globalThis.location.origin}/qr/${code}`
        navigator.clipboard.writeText(url)
        notify.success('Link copied!')
    }

    const getAccessIcon = (level: string) => {
        switch (level) {
            case 'public': return <Globe className="w-3 h-3 text-emerald-400" />
            case 'authenticated': return <Users className="w-3 h-3 text-blue-400" />
            case 'private': return <Lock className="w-3 h-3 text-amber-400" />
            default: return null
        }
    }

    const RenderSection = ({ id, title, items, icon: Icon, colorClass }: { id: string, title: string, items: QrCode[], icon: React.ElementType, colorClass: string }) => {
        const isExpanded = expandedSections.has(id)
        if (items.length === 0) return null

        return (
            <div className="mb-2" key={id}>
                <button
                    onClick={() => toggleSection(id)}
                    className="w-full flex items-center gap-3 p-3 bg-neutral-900/40 hover:bg-neutral-900/60 rounded-lg transition-colors group text-left"
                >
                    <div className={clsx("transition-transform duration-200 text-neutral-500 group-hover:text-white", isExpanded && "rotate-90")}>
                        <ChevronRight className="w-4 h-4" />
                    </div>

                    <div className={clsx("w-1 h-4 rounded-full", colorClass)} />

                    <span className="font-bold text-sm tracking-wide text-neutral-300 group-hover:text-white uppercase">
                        {title}
                    </span>

                    <span className="bg-neutral-800 text-neutral-500 text-[10px] px-2 py-0.5 rounded-full font-mono">
                        {items.length}
                    </span>
                </button>

                {isExpanded && (
                    <div className="mt-1 ml-4 border-l border-neutral-800/50 pl-4 space-y-2 animate-in slide-in-from-top-2 duration-200">
                        {items.map(code => (
                            <div
                                key={code.code}
                                className={clsx(
                                    "group relative bg-neutral-900/30 border rounded-lg p-3 flex flex-col md:flex-row md:items-center gap-4 transition-all hover:bg-neutral-900/80",
                                    selectedCodes.has(code.code) ? "border-purple-500/30 bg-purple-900/10" : "border-neutral-800 hover:border-neutral-700"
                                )}
                            >
                                {/* Checkbox */}
                                <div className="absolute left-2 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity z-10 md:static md:opacity-100 md:w-8 flex justify-center">
                                    <input
                                        type="checkbox"
                                        className="bg-neutral-800 border-neutral-700 rounded focus:ring-purple-500 cursor-pointer"
                                        checked={selectedCodes.has(code.code)}
                                        onChange={() => toggleSelect(code.code)}
                                    />
                                </div>

                                {/* Info Block */}
                                <div className="flex-1 min-w-0 pl-6 md:pl-0">
                                    {editingCode === code.code ? (
                                        /* Edit Mode */
                                        <form onSubmit={(e) => {
                                            e.preventDefault()
                                            const form = e.target as HTMLFormElement
                                            const desc = (form.elements.namedItem('desc') as HTMLInputElement).value

                                            // Determine URL
                                            let finalUrl = ''
                                            if (editTargetType === 'custom') {
                                                finalUrl = (form.elements.namedItem('custom_url') as HTMLInputElement).value
                                            } else if (editTargetType === 'group') {
                                                finalUrl = `/groups?viewGroup=${(form.elements.namedItem('target_id') as HTMLSelectElement).value}`
                                            } else if (editTargetType === 'performance') {
                                                finalUrl = `/performances/${(form.elements.namedItem('target_id') as HTMLSelectElement).value}`
                                            }

                                            handleUpdate(code.code, {
                                                description: desc,
                                                target_url: finalUrl,
                                                access_level: (form.elements.namedItem('access') as HTMLSelectElement).value,
                                                active: (form.elements.namedItem('active') as HTMLInputElement).checked
                                            })
                                        }} className="flex flex-col gap-3 bg-neutral-950/80 p-3 rounded-lg border border-neutral-800 backdrop-blur-sm z-20 relative">
                                            <div className="flex flex-col md:flex-row gap-3">
                                                <div className="flex-1">
                                                    <label className="text-[10px] uppercase text-neutral-500 font-bold mb-1 block">{t('columns.label')}</label>
                                                    <input name="desc" defaultValue={code.description || ''} className="w-full bg-neutral-900 border border-neutral-700 rounded px-2 py-1.5 text-sm text-white focus:border-purple-500 outline-none" placeholder="Label" autoFocus />
                                                </div>
                                                <div className="w-full md:w-32">
                                                    <label className="text-[10px] uppercase text-neutral-500 font-bold mb-1 block">Access</label>
                                                    <select name="access" defaultValue={code.access_level} className="w-full bg-neutral-900 border border-neutral-700 rounded px-2 py-1.5 text-sm text-white focus:border-purple-500 outline-none">
                                                        <option value="public">Public</option>
                                                        <option value="authenticated">Auth Only</option>
                                                        <option value="private">Private</option>
                                                    </select>
                                                </div>
                                            </div>

                                            {/* Smart Target Selector */}
                                            <div>
                                                <label className="text-[10px] uppercase text-neutral-500 font-bold mb-1 block">{t('columns.target')}</label>
                                                <div className="flex flex-col md:flex-row gap-2">
                                                    <div className="flex rounded-md shadow-sm">
                                                        <button type="button" onClick={() => setEditTargetType('group')} className={clsx("px-3 py-1.5 text-xs font-medium border rounded-l-md transition-colors", editTargetType === 'group' ? "bg-purple-600 text-white border-purple-600" : "bg-neutral-800 text-neutral-400 border-neutral-700 hover:text-white")}>{t('types.group')}</button>
                                                        <button type="button" onClick={() => setEditTargetType('performance')} className={clsx("px-3 py-1.5 text-xs font-medium border-t border-b border-r transition-colors", editTargetType === 'performance' ? "bg-purple-600 text-white border-purple-600" : "bg-neutral-800 text-neutral-400 border-neutral-700 hover:text-white")}>{t('types.performance')}</button>
                                                        <button type="button" onClick={() => setEditTargetType('custom')} className={clsx("px-3 py-1.5 text-xs font-medium border-t border-b border-r rounded-r-md transition-colors", editTargetType === 'custom' ? "bg-purple-600 text-white border-purple-600" : "bg-neutral-800 text-neutral-400 border-neutral-700 hover:text-white")}>{t('edit.customUrl')}</button>
                                                    </div>

                                                    <div className="flex-1">
                                                        {editTargetType === 'custom' ? (
                                                            <input name="custom_url" defaultValue={code.target_url} className="w-full bg-neutral-900 border border-neutral-700 rounded px-3 py-1.5 text-sm text-white font-mono focus:border-purple-500 outline-none" placeholder="/..." />
                                                        ) : (
                                                            <select name="target_id" className="w-full bg-neutral-900 border border-neutral-700 rounded px-3 py-1.5 text-sm text-white focus:border-purple-500 outline-none appearance-none">
                                                                <option value="">{t('edit.selectItem')}...</option>
                                                                {linkTargets.filter(t => t.type === editTargetType).map(target => (
                                                                    <option key={target.id} value={target.id}>
                                                                        {target.name}
                                                                    </option>
                                                                ))}
                                                            </select>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="flex items-center justify-between pt-2 border-t border-neutral-800 mt-1">
                                                <label className="flex items-center gap-2 text-xs text-neutral-300 cursor-pointer select-none">
                                                    <input name="active" type="checkbox" defaultChecked={code.active} className="rounded border-neutral-600 bg-neutral-800 text-purple-600 focus:ring-offset-black" />
                                                    {t('actions.activate')}
                                                </label>
                                                <div className="flex items-center gap-2">
                                                    <button type="button" onClick={() => setEditingCode(null)} className="px-3 py-1.5 text-xs text-neutral-400 hover:text-white">{t('edit.cancel')}</button>
                                                    <button type="submit" className="px-3 py-1.5 bg-white text-black text-xs font-bold rounded-md hover:bg-neutral-200">{t('edit.save')}</button>
                                                </div>
                                            </div>
                                        </form>
                                    ) : (
                                        /* Read Mode */
                                        <>
                                            <div className="flex items-center gap-3">
                                                <h3 className="font-bold text-white text-sm truncate">{code.description || 'Untitled Code'}</h3>

                                                <div className="flex items-center gap-2">
                                                    {getAccessIcon(code.access_level)}
                                                    {!code.active && <span className="w-2 h-2 rounded-full bg-red-500" title="Inactive" />}
                                                </div>
                                            </div>

                                            <div className="flex items-center gap-2 mt-1">
                                                <span className="font-mono text-[10px] text-purple-400 bg-purple-900/10 px-1.5 py-0.5 rounded select-all">
                                                    {code.code}
                                                </span>
                                                <span className="text-[10px] text-neutral-600 mx-1">•</span>
                                                <div className="text-[10px] text-neutral-500 font-mono truncate max-w-[200px]" title={code.target_url}>
                                                    {code.target_url}
                                                </div>
                                            </div>
                                        </>
                                    )}
                                </div>

                                {/* Desktop Meta */}
                                {!editingCode && (
                                    <>
                                        <div className="hidden md:flex flex-col items-end text-right gap-1 min-w-[100px]">
                                            <span className="text-[10px] text-neutral-500">{new Date(code.created_at).toLocaleDateString()}</span>
                                            <div className="flex items-center gap-1 text-[10px] text-neutral-400 bg-neutral-800/50 px-2 py-0.5 rounded-full">
                                                <span>{code.clicks}</span>
                                                <span className="text-neutral-600">clicks</span>
                                            </div>
                                        </div>

                                        {/* Row Actions */}
                                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <button onClick={() => copyLink(code.code)} className="p-1.5 text-neutral-500 hover:text-white hover:bg-neutral-800 rounded"><Copy className="w-3.5 h-3.5" /></button>
                                            <button onClick={() => downloadQr(code.code, code.description || code.code)} className="p-1.5 text-neutral-500 hover:text-white hover:bg-neutral-800 rounded"><ExternalLink className="w-3.5 h-3.5" /></button>
                                            <button onClick={() => {
                                                setEditingCode(code.code)
                                                if (code.target_url.includes('/groups')) setEditTargetType('group')
                                                else if (code.target_url.includes('/performances')) setEditTargetType('performance')
                                                else setEditTargetType('custom')
                                            }} className="p-1.5 text-neutral-500 hover:text-white hover:bg-neutral-800 rounded"><Edit2 className="w-3.5 h-3.5" /></button>
                                            <button onClick={() => handleDelete(code.code)} title="Delete" className="p-1.5 text-neutral-500 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors">
                                                <Trash2 className="w-3.5 h-3.5" />
                                            </button>
                                        </div>
                                    </>
                                )}
                            </div>
                        ))}
                    </div>
                )}
            </div>
        )
    }

    const getSectionIcon = (type: Section['type']) => {
        switch (type) {
            case 'legacy_group': return Box
            case 'legacy_performance': return Theater
            case 'legacy_other': return LinkIcon
            case 'batch': return Archive
        }
    }

    const getSectionColor = (type: Section['type']) => {
        switch (type) {
            case 'legacy_group': return 'bg-purple-500'
            case 'legacy_performance': return 'bg-amber-500'
            case 'legacy_other': return 'bg-blue-500'
            case 'batch': return 'bg-emerald-500'
        }
    }

    return (
        <div className="space-y-6">
            {/* Bulk Actions Header */}
            {selectedCodes.size > 0 && (
                <div className="sticky top-4 z-30 flex items-center justify-between gap-3 bg-purple-900/90 border border-purple-500/30 px-4 py-2 rounded-lg backdrop-blur shadow-lg animate-in fade-in slide-in-from-top-2">
                    <span className="text-sm text-white font-medium">{t('selected', { count: selectedCodes.size })}</span>
                    <button onClick={handleBulkDelete} className="px-3 py-1 bg-red-500/20 hover:bg-red-500/30 text-red-200 border border-red-500/30 rounded text-xs font-bold transition-colors flex items-center gap-1">
                        <Trash2 className="w-3 h-3" /> {t('actions.delete')}
                    </button>
                </div>
            )}

            <div className="space-y-1">
                {sortedSections.map(section => (
                    <RenderSection
                        key={section.id}
                        id={section.id}
                        title={section.title}
                        items={section.items}
                        icon={getSectionIcon(section.type)}
                        colorClass={getSectionColor(section.type)}
                    />
                ))}

                {codes.length === 0 && (
                    <div className="text-center py-10 text-neutral-500 bg-neutral-900/50 rounded-xl border border-neutral-800 border-dashed">
                        No universal QR codes created yet.
                    </div>
                )}
            </div>
        </div>
    )
}
