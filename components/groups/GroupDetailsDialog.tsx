'use client'

import { useState, useEffect } from 'react'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import {
    MapPin,
    Calendar,
    Folder,
    Edit2,
    Trash2,
    QrCode
} from 'lucide-react'
import * as LucideIcons from 'lucide-react'
import { format } from 'date-fns'
import { pl } from 'date-fns/locale'
import { useTranslations } from 'next-intl'
import { notify } from '@/utils/notify'
import { rasterizeIcon } from '@/utils/icon-rasterizer'
import { DEFAULT_GROUP_COLOR } from '@/utils/constants/colors'

interface GroupDetailsDialogProps {
    readonly group: {
        readonly id: string
        readonly name: string
        readonly icon: string | null
        readonly color: string | null
        readonly created_at: string | null
        readonly description?: string | null
        readonly performance_id?: string | null
        readonly locations?: { readonly name: string } | null
        readonly performances?: { readonly title: string; readonly color?: string | null } | null
    } | null
    readonly open: boolean
    readonly onOpenChange: (open: boolean) => void
    readonly onEdit: (group: any) => void
    readonly onDelete: (group: any) => void
}

const qrCache = new Map<string, string>()

export function GroupDetailsDialog({
    group,
    open,
    onOpenChange,
    onEdit,
    onDelete
}: GroupDetailsDialogProps) {
    const t = useTranslations('Groups')
    const [isGeneratingLabel, setIsGeneratingLabel] = useState(false)
    const [qrUrl, setQrUrl] = useState<string>('')

    useEffect(() => {
        if (group && open) {
            // Check cache first
            if (qrCache.has(group.id)) {
                setQrUrl(qrCache.get(group.id)!)
                return
            }

            // Get or create unique QR Code and generate image
            import('@/app/actions/qr-codes').then(({ getOrCreateGroupQrCode }) => {
                getOrCreateGroupQrCode(group.id, group.name).then(qrData => {
                    if (qrData?.code) {
                        const qrLink = `${globalThis.location.origin}/qr/${qrData.code}`
                        import('qrcode').then(QRCode => {
                            QRCode.toDataURL(qrLink, {
                                width: 200,
                                margin: 2,
                                color: {
                                    dark: '#000000',
                                    light: '#ffffff'
                                }
                            }).then(url => {
                                qrCache.set(group.id, url)
                                setQrUrl(url)
                            }).catch(console.error)
                        })
                    }
                })
            })
        }
    }, [group, open])

    // Resolve Effective Color (Unified Logic)
    const effectiveColor = group?.performances?.color || group?.color || DEFAULT_GROUP_COLOR

    if (!group) return null

    // Resolve icon component
    const IconComponent = group.icon && group.icon in LucideIcons
        // @ts-ignore
        ? LucideIcons[group.icon]
        : Folder

    const locationName = group.locations?.name || t('locations.unassigned')
    const formattedDate = group.created_at
        ? format(new Date(group.created_at), 'd MMMM yyyy, HH:mm', { locale: pl })
        : '-'

    const handlePrintLabel = async () => {
        const generatePromise = (async () => {
            // Use the rasterizeIcon utility
            const iconPng = await rasterizeIcon(group.icon || 'Folder', group.color || '#000000')

            const response = await fetch('/api/generate-labels', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    groups: [{
                        id: group.id,
                        name: group.name,
                        locationName: group.locations?.name,
                        iconImage: iconPng // Use iconImage as expected by the API
                    }]
                })
            })

            if (!response.ok) throw new Error('Label generation failed')

            const blob = await response.blob()
            const url = globalThis.URL.createObjectURL(blob)
            const a = document.createElement('a')
            a.href = url
            a.download = `label_${group.name.replaceAll(/[^a-z0-9]/gi, '_')}.pdf`
            document.body.appendChild(a)
            a.click()
            document.body.removeChild(a)
            globalThis.URL.revokeObjectURL(url)
        })()

        setIsGeneratingLabel(true)
        notify.promise(generatePromise, {
            loading: t('labels.generating'),
            success: t('labels.success'),
            error: t('labels.error')
        }, 'pdf').finally(() => setIsGeneratingLabel(false))
    }

    return (
        <Modal
            isOpen={open}
            onClose={() => onOpenChange(false)}
            className="group-details-modal p-0! gap-0 overflow-hidden sm:max-w-[500px] border-neutral-800 bg-neutral-900/95 backdrop-blur-xl shadow-2xl"
        >
            {/* Header with Color Strip */}
            <div className="relative h-32 w-full overflow-hidden">
                <div
                    className="absolute inset-0 opacity-20"
                    style={{ backgroundColor: effectiveColor }}
                />
                <div className="absolute inset-0 bg-linear-to-t from-neutral-900 via-neutral-900/60 to-transparent" />

                <div className="absolute bottom-4 left-6 flex items-end gap-4 z-10 w-full pr-6">
                    <div
                        className="w-16 h-16 rounded-2xl flex items-center justify-center shadow-lg transform transition-transform duration-300 hover:scale-105 shrink-0"
                        style={{
                            backgroundColor: effectiveColor,
                            boxShadow: `0 8px 32px -4px ${effectiveColor}40`
                        }}
                    >
                        <IconComponent className="w-8 h-8 text-white" />
                    </div>
                    <div className="mb-1 min-w-0 flex-1">
                        <h2 className="text-2xl font-bold text-white tracking-tight leading-none truncate pr-2">
                            {group.name}
                        </h2>
                        <div className="flex items-center gap-2 mt-2 text-sm font-medium text-neutral-400">
                            <MapPin className="w-3.5 h-3.5 text-neutral-500 shrink-0" />
                            <span className="truncate">{locationName}</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* 1. Metadata & Link Grid */}
            <div className="p-6 space-y-6">
                <div className="grid grid-cols-2 gap-3">
                    {/* Performance Link */}
                    {group.performances && (
                        <div className="col-span-2 p-3 rounded-xl bg-neutral-800/50 border border-neutral-800 flex items-center justify-between group cursor-default">
                            <div className="flex items-center gap-3">
                                <div
                                    className="w-8 h-8 rounded-lg flex items-center justify-center bg-neutral-800"
                                    style={{ color: group.performances.color || '#9ca3af' }}
                                >
                                    <Calendar className="w-4 h-4" />
                                </div>
                                <div className="flex flex-col">
                                    <span className="text-[10px] font-bold text-neutral-500 uppercase tracking-wider">
                                        {t('details.performance')}
                                    </span>
                                    <span className="text-sm font-semibold text-white truncate max-w-[200px]">
                                        {group.performances.title}
                                    </span>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Created At */}
                    <div className="col-span-2 p-3 rounded-xl bg-neutral-800/50 border border-neutral-800 space-y-1">
                        <div className="flex items-center gap-2 text-[10px] font-bold text-neutral-500 uppercase tracking-wider">
                            <Calendar className="w-3 h-3" />
                            {t('details.created')}
                        </div>
                        <div className="text-xs font-medium text-neutral-300 truncate">
                            {formattedDate}
                        </div>
                    </div>
                </div>

                {/* 2. Technical Note / Description (If present) - Highlighted */}
                {group.description && (
                    <div className="bg-amber-900/10 border border-amber-500/20 rounded-xl p-4 relative overflow-hidden">
                        <div className="absolute top-0 right-0 p-2 opacity-10">
                            <LucideIcons.FileText className="w-24 h-24 text-amber-500" />
                        </div>
                        <h4 className="text-xs font-bold text-amber-500 uppercase tracking-wider mb-2 flex items-center gap-2">
                            <LucideIcons.Info className="w-3 h-3" />
                            {t('description')}
                        </h4>
                        <p className="text-sm text-neutral-200 leading-relaxed font-mono whitespace-pre-wrap">
                            {group.description}
                        </p>
                    </div>
                )}

                {/* 3. QR Code & Actions */}
                <div className="flex gap-4 items-stretch">
                    {/* QR Code Display */}
                    <div className="w-24 h-24 bg-white p-2 rounded-xl flex items-center justify-center shrink-0 shadow-sm">
                        {qrUrl ? (
                            <img src={qrUrl} alt="QR Code" className="w-full h-full object-contain mix-blend-multiply" />
                        ) : (
                            <div className="animate-pulse bg-neutral-200 w-full h-full rounded-lg" />
                        )}
                    </div>

                    <div className="flex-1 flex flex-col gap-2 justify-center">
                        <Button
                            variant="glassy-primary"
                            onClick={handlePrintLabel}
                            disabled={isGeneratingLabel}
                            className="w-full h-10 font-semibold shadow-lg"
                        >
                            <QrCode className="w-4 h-4 mr-2" />
                            {isGeneratingLabel ? t('labels.generating') : t('labels.print')}
                        </Button>
                        <div className="flex gap-2">
                            <Button
                                variant="glassy-secondary"
                                onClick={() => {
                                    onOpenChange(false)
                                    onEdit(group)
                                }}
                                className="flex-1 h-10"
                            >
                                <Edit2 className="w-4 h-4 mr-2" />
                                {t('actions.edit')}
                            </Button>
                            <Button
                                variant="glassy-danger"
                                onClick={() => {
                                    onOpenChange(false)
                                    onDelete(group)
                                }}
                                className="h-10 px-3"
                            >
                                <Trash2 className="w-4 h-4" />
                            </Button>
                        </div>
                    </div>
                </div>
            </div>
        </Modal>
    )
}
