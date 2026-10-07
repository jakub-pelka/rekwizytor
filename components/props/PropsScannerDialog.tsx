'use client'

import { Fragment, useState, useRef } from 'react'
import { X, Camera, ScanLine, Trash2, Plus, Check, Sparkles, AlertTriangle, Lightbulb } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { Button } from '@/components/ui/Button'
import { Modal } from '@/components/ui/Modal'

import { analyzePropsImage } from '@/app/actions/vision-props'
import { bulkInsertProps } from '@/app/actions/performance-props'
import { useRouter } from 'next/navigation'

interface PropsScannerDialogProps {
    isOpen: boolean
    onClose: () => void
    performanceId: string
    onItemsAdded?: () => void
}

/**
 * PropsScannerDialog - AI Vision for Props
 * 
 * UI Component cloned from GroupScannerDialog.tsx with modifications:
 * - Returns array of item names instead of single group name
 * - Allows editing the list before saving (add/remove/edit items)
 * - Bulk inserts to performance_props table
 * 
 * @note UI styling matches GroupScannerDialog - update both if changing design
 */
export function PropsScannerDialog({ isOpen, onClose, performanceId, onItemsAdded }: PropsScannerDialogProps) {
    const t = useTranslations('PropsScanner')
    const router = useRouter()
    const fileInputRef = useRef<HTMLInputElement>(null)

    // State
    const [step, setStep] = useState<'capture' | 'analyzing' | 'confirm'>('capture')
    const [previewUrl, setPreviewUrl] = useState<string | null>(null)
    const [items, setItems] = useState<string[]>([])
    const [editingIndex, setEditingIndex] = useState<number | null>(null)
    const [editingValue, setEditingValue] = useState('')
    const [newItemName, setNewItemName] = useState('')
    const [isSaving, setIsSaving] = useState(false)
    const [error, setError] = useState<string | null>(null)

    const reset = () => {
        setStep('capture')
        setPreviewUrl(null)
        setItems([])
        setEditingIndex(null)
        setEditingValue('')
        setNewItemName('')
        setIsSaving(false)
        setError(null)
    }

    const handleClose = () => {
        reset()
        onClose()
    }

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (!file) return

        // Create Preview
        const url = URL.createObjectURL(file)
        setPreviewUrl(url)
        setStep('analyzing')

        // Convert to Base64
        const reader = new FileReader()
        reader.onloadend = async () => {
            const base64 = reader.result as string
            // Resize image before sending
            const img = new Image()
            img.src = base64
            img.onload = async () => {
                const canvas = document.createElement('canvas')
                const MAX_SIDE = 1600
                const scale = Math.min(1, MAX_SIDE / Math.max(img.width, img.height))
                canvas.width = Math.round(img.width * scale)
                canvas.height = Math.round(img.height * scale)

                const ctx = canvas.getContext('2d')
                ctx?.drawImage(img, 0, 0, canvas.width, canvas.height)

                const resizedBase64 = canvas.toDataURL('image/jpeg', 0.8)

                // Call AI
                const result = await analyzePropsImage(resizedBase64)

                if (result.error) {
                    console.error(result.error)
                    setError(result.error === 'Unauthorized' ? t('unauthorized') : t('error'))
                    setItems([])
                } else {
                    setItems(result.items || [])
                }
                setStep('confirm')
            }
        }
        reader.readAsDataURL(file)
    }

    const handleAddItem = () => {
        if (!newItemName.trim()) return
        setItems([...items, newItemName.trim()])
        setNewItemName('')
    }

    const handleRemoveItem = (index: number) => {
        setItems(items.filter((_, i) => i !== index))
    }

    const handleStartEdit = (index: number) => {
        setEditingIndex(index)
        setEditingValue(items[index])
    }

    const handleSaveEdit = () => {
        if (editingIndex !== null && editingValue.trim()) {
            const newItems = [...items]
            newItems[editingIndex] = editingValue.trim()
            setItems(newItems)
        }
        setEditingIndex(null)
        setEditingValue('')
    }

    const handleCancelEdit = () => {
        setEditingIndex(null)
        setEditingValue('')
    }

    const handleSave = async () => {
        if (items.length === 0) return

        setIsSaving(true)
        try {
            const result = await bulkInsertProps(performanceId, items)

            if (result.error) {
                throw new Error(result.error)
            }

            router.refresh()
            if (onItemsAdded) onItemsAdded()
            handleClose()
        } catch (e) {
            console.error(e)
            setIsSaving(false)
        }
    }

    return (
        <Modal
            isOpen={isOpen}
            onClose={handleClose}
            title={
                <div className="flex items-center justify-center sm:justify-start gap-2">
                    <ScanLine className="w-5 h-5 text-burgundy-light" />
                    {t('title')}
                </div>
            }
        >
            <div className="text-center sm:text-left sm:mt-2">
                {/* STEP: CAPTURE */}
                {step === 'capture' && (
                    <div className="py-6 space-y-5 text-center">
                        <button
                            type="button"
                            onClick={() => fileInputRef.current?.click()}
                            className="group w-full rounded-2xl border-2 border-dashed border-neutral-700 hover:border-burgundy-light/60 bg-neutral-900/50 hover:bg-burgundy-main/5 transition-colors p-8 flex flex-col items-center gap-4"
                        >
                            <span className="relative flex h-16 w-16 items-center justify-center rounded-2xl bg-burgundy-main/15 border border-burgundy-light/20 text-burgundy-light group-hover:scale-105 transition-transform">
                                <Camera className="w-7 h-7" />
                                <Sparkles className="absolute -top-1.5 -right-1.5 w-4 h-4 text-amber-300" />
                            </span>
                            <p className="text-neutral-300 text-sm max-w-xs">{t('captureHint')}</p>
                        </button>
                        <Button
                            variant="glassy-primary"
                            onClick={() => fileInputRef.current?.click()}
                            className="w-full"
                        >
                            <Camera className="w-4 h-4 mr-2" />
                            {t('openCamera')}
                        </Button>
                        <p className="flex items-center justify-center gap-1.5 text-xs text-neutral-500">
                            <Lightbulb className="w-3.5 h-3.5" />
                            {t('tip')}
                        </p>
                        <input
                            ref={fileInputRef}
                            type="file"
                            accept="image/*"
                            capture="environment"
                            className="hidden"
                            onChange={handleFileChange}
                        />
                    </div>
                )}

                {/* STEP: ANALYZING */}
                {step === 'analyzing' && (
                    <div className="py-6 space-y-4 text-center">
                        {previewUrl && (
                            <div className="w-full h-56 rounded-xl overflow-hidden relative mx-auto border border-neutral-700">
                                <img src={previewUrl} alt="" className="w-full h-full object-cover" />
                                <div className="absolute inset-0 bg-black/40" />
                                <div className="absolute inset-x-0 h-16 bg-linear-to-b from-transparent via-burgundy-light/40 to-transparent animate-[scan_1.8s_ease-in-out_infinite]" />
                                <div className="absolute inset-3 rounded-lg border border-white/20" />
                            </div>
                        )}
                        <p className="text-white font-medium flex items-center justify-center gap-2">
                            <Sparkles className="w-4 h-4 text-burgundy-light animate-pulse" />
                            {t('analyzing')}
                        </p>
                        <p className="text-neutral-500 text-xs">{t('analyzingHint')}</p>
                    </div>
                )}

                {/* STEP: CONFIRM & EDIT */}
                {step === 'confirm' && (
                    <div className="space-y-4 text-left max-h-[65vh] overflow-y-auto pr-1">
                        {previewUrl && (
                            <div className="w-full h-36 rounded-xl overflow-hidden border border-neutral-700">
                                <img src={previewUrl} alt="" className="w-full h-full object-cover" />
                            </div>
                        )}

                        {error && (
                            <div className="flex items-start gap-2 rounded-lg border border-amber-900/50 bg-amber-950/30 p-3 text-sm text-amber-200">
                                <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
                                <span>{error}</span>
                            </div>
                        )}

                        <div>
                            <div className="flex items-baseline justify-between mb-2">
                                <span className="text-sm font-medium text-white">
                                    {t('found', { count: items.length })}
                                </span>
                                {items.length > 0 && (
                                    <span className="text-xs text-neutral-500">{t('editHint')}</span>
                                )}
                            </div>

                            {/* Items List */}
                            <div className="space-y-1.5 mb-4">
                                {items.map((item, index) => (
                                    <div
                                        key={index}
                                        className="flex items-center gap-2 bg-neutral-900 border border-neutral-800 hover:border-neutral-700 rounded-lg px-3 py-2 transition-colors animate-[item-in_0.3s_ease-out]"
                                        style={{ animationDelay: `${index * 40}ms`, animationFillMode: 'backwards' }}
                                    >
                                        {editingIndex === index ? (
                                            <>
                                                <input
                                                    type="text"
                                                    value={editingValue}
                                                    onChange={e => setEditingValue(e.target.value)}
                                                    onKeyDown={e => {
                                                        if (e.key === 'Enter') handleSaveEdit()
                                                        if (e.key === 'Escape') handleCancelEdit()
                                                    }}
                                                    className="flex-1 bg-neutral-800 border border-neutral-600 rounded px-2 py-1 text-white text-sm focus:outline-none focus:ring-2 focus:ring-burgundy-light"
                                                    autoFocus
                                                />
                                                <button
                                                    onClick={handleSaveEdit}
                                                    className="p-1 text-emerald-400 hover:text-emerald-300"
                                                >
                                                    <Check className="h-4 w-4" />
                                                </button>
                                                <button
                                                    onClick={handleCancelEdit}
                                                    className="p-1 text-neutral-400 hover:text-white"
                                                >
                                                    <X className="h-4 w-4" />
                                                </button>
                                            </>
                                        ) : (
                                            <>
                                                <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-burgundy-light" />
                                                <span
                                                    onClick={() => handleStartEdit(index)}
                                                    className="flex-1 text-white text-sm cursor-pointer hover:text-burgundy-light transition-colors"
                                                >
                                                    {item}
                                                </span>
                                                <button
                                                    onClick={() => handleRemoveItem(index)}
                                                    className="p-1 text-neutral-500 hover:text-red-400"
                                                >
                                                    <Trash2 className="h-4 w-4" />
                                                </button>
                                            </>
                                        )}
                                    </div>
                                ))}
                            </div>

                            {/* Add New Item */}
                            <div className="flex gap-2">
                                <input
                                    type="text"
                                    value={newItemName}
                                    onChange={e => setNewItemName(e.target.value)}
                                    onKeyDown={e => e.key === 'Enter' && handleAddItem()}
                                    placeholder={t('addPlaceholder')}
                                    className="flex-1 bg-neutral-900 border border-neutral-700 rounded-lg py-2 px-3 text-white text-sm placeholder-neutral-500 focus:outline-none focus:ring-2 focus:ring-burgundy-light"
                                />
                                <Button
                                    variant="glassy-secondary"
                                    size="sm"
                                    onClick={handleAddItem}
                                    disabled={!newItemName.trim()}
                                    className="h-auto"
                                >
                                    <Plus className="h-4 w-4" />
                                </Button>
                            </div>
                        </div>

                        <div className="flex gap-2 pt-2">
                            <Button variant="glassy-secondary" onClick={reset} className="flex-1">
                                <Camera className="w-4 h-4 mr-2" />
                                {t('retake')}
                            </Button>
                            <Button
                                variant="glassy-primary"
                                onClick={handleSave}
                                isLoading={isSaving}
                                disabled={items.length === 0}
                                className="flex-1"
                            >
                                {t('add', { count: items.length })}
                            </Button>
                        </div>
                    </div>
                )}
            </div>
        </Modal>
    )
}
