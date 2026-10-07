'use client'

import { useState } from 'react'
import { createClient } from '@/utils/supabase/client'
import { useRouter } from '@/i18n/routing'
import { Loader2, Save, Calendar, Trash2, Upload, X } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { compressImage, createThumbnail } from '@/utils/image-processing'
import { extractTopColors } from '@/utils/colors'
import Image from 'next/image'
import { useTranslations } from 'next-intl'
import { refreshSearchIndex } from '@/app/actions/unified-search'

type Performance = {
    id: string
    title: string
    premiere_date: string | null
    notes: string | null
    status: 'upcoming' | 'active' | 'archived'
    image_url: string | null
    thumbnail_url: string | null
    color: string | null
    source_url: string | null
    venue: string | null
    structure: string
}

type Props = {
    performance: Performance
}

export function EditPerformanceForm({ performance }: Props) {
    const t = useTranslations('EditPerformanceForm')
    const [title, setTitle] = useState(performance.title)
    const [premiereDate, setPremiereDate] = useState(performance.premiere_date ? new Date(performance.premiere_date).toISOString().split('T')[0] : '')
    const [notes, setNotes] = useState(performance.notes || '')
    const [sourceUrl, setSourceUrl] = useState(performance.source_url || '')
    const [status, setStatus] = useState<Performance['status']>(performance.status)
    const [venue, setVenue] = useState(performance.venue ?? '')
    const [structure, setStructure] = useState(performance.structure === 'acts_only' ? 'acts_only' : 'acts_scenes')
    const [imageFile, setImageFile] = useState<File | null>(null)
    const [imagePreview, setImagePreview] = useState<string | null>(performance.image_url)
    const [extractedColors, setExtractedColors] = useState<string[]>([])
    const [selectedColor, setSelectedColor] = useState<string | null>(performance.color)
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [isDragging, setIsDragging] = useState(false)

    const router = useRouter()
    const supabase = createClient()

    const processFile = async (file: File) => {
        try {
            // Create preview immediately
            const previewUrl = URL.createObjectURL(file)
            setImagePreview(previewUrl)

            // Extract colors from preview
            const colors = await extractTopColors(previewUrl)
            setExtractedColors(colors)
            if (colors.length > 0) {
                setSelectedColor(colors[0])
            } else {
                setSelectedColor(null)
            }

            setImageFile(file)
        } catch (err) {
            console.error('Error processing image:', err)
        }
    }

    const handleImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            await processFile(e.target.files[0])
        }
    }

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault()
        setIsDragging(true)
    }

    const handleDragLeave = (e: React.DragEvent) => {
        e.preventDefault()
        setIsDragging(false)
    }

    const handleDrop = async (e: React.DragEvent) => {
        e.preventDefault()
        setIsDragging(false)

        if (e.dataTransfer.files && e.dataTransfer.files[0]) {
            const file = e.dataTransfer.files[0]
            if (file.type.startsWith('image/')) {
                await processFile(file)
            }
        }
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true)
        setError(null)

        try {

            let imageUrl = performance.image_url
            let thumbnailUrl = performance.thumbnail_url

            if (imageFile) {
                const fileExt = imageFile.name.split('.').pop()
                const fileName = `${Math.random()}.${fileExt}`
                const thumbnailName = `thumb_${fileName}`

                // Compress main image
                const compressedBlob = await compressImage(imageFile)
                const compressedFile = new File([compressedBlob], fileName, { type: 'image/jpeg' })

                // Create thumbnail
                const thumbnailBlob = await createThumbnail(imageFile, 300)
                const thumbnailFile = new File([thumbnailBlob], thumbnailName, { type: 'image/jpeg' })

                // Upload main image
                const { error: uploadError } = await supabase.storage
                    .from('posters')
                    .upload(fileName, compressedFile)

                if (uploadError) throw uploadError

                // Upload thumbnail
                const { error: thumbError } = await supabase.storage
                    .from('posters')
                    .upload(thumbnailName, thumbnailFile)

                if (thumbError) throw thumbError

                // Get public URLs
                const { data: { publicUrl: publicImgUrl } } = supabase.storage
                    .from('posters')
                    .getPublicUrl(fileName)

                const { data: { publicUrl: publicThumbUrl } } = supabase.storage
                    .from('posters')
                    .getPublicUrl(thumbnailName)

                imageUrl = publicImgUrl
                thumbnailUrl = publicThumbUrl
            }

            const { error: updateError } = await supabase
                .from('performances')
                .update({
                    title,
                    premiere_date: premiereDate || null,
                    notes: notes || null,
                    status,
                    image_url: imageUrl,
                    thumbnail_url: thumbnailUrl,
                    color: selectedColor,
                    source_url: sourceUrl || null,
                    venue: venue.trim() || null,
                    structure,
                })
                .eq('id', performance.id)

            if (updateError) throw updateError

            // Refresh search index
            try {
                await refreshSearchIndex()
            } catch (e) {
                console.error('Failed to refresh search index:', e)
            }

            router.push(`/performances/${performance.id}`)
            router.refresh()
        } catch (err: unknown) {
            if (err instanceof Error) {
                setError(err.message)
            } else {
                setError(t('unknownError'))
            }
        } finally {
            setLoading(false)
        }
    }

    const handleDelete = async () => {
        if (!confirm(t('deleteConfirmation'))) return

        setLoading(true)
        try {
            const { error: deleteError } = await supabase
                .from('performances')
                .update({ deleted_at: new Date().toISOString() })
                .eq('id', performance.id)

            if (deleteError) throw deleteError

            // Refresh search index
            try {
                await refreshSearchIndex()
            } catch (e) {
                console.error('Failed to refresh search index:', e)
            }

            router.push('/performances')
            router.refresh()
        } catch (err: unknown) {
            if (err instanceof Error) {
                setError(err.message)
            } else {
                setError(t('unknownError'))
            }
            setLoading(false)
        }
    }

    return (
        <form onSubmit={handleSubmit} className="space-y-8 max-w-3xl">
            <div className="space-y-8 bg-neutral-900/50 p-6 md:p-8 rounded-2xl border border-white/5 shadow-2xl backdrop-blur-sm">
                <div>
                    <label htmlFor="title" className="block text-sm font-medium text-neutral-300">
                        {t('showTitle')} <span className="text-red-500">*</span>
                    </label>
                    <input
                        type="text"
                        id="title"
                        required
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        className="mt-2 block w-full rounded-xl border border-white/10 bg-black/50 px-4 py-3 text-white placeholder-neutral-500 focus:border-purple-500 focus:outline-none focus:ring-1 focus:ring-purple-500 shadow-inner transition-all sm:text-sm"
                    />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                        <label htmlFor="premiereDate" className="block text-sm font-medium text-neutral-300">
                            {t('premiereDate')}
                        </label>
                        <div className="relative mt-2">
                            <input
                                type="date"
                                id="premiereDate"
                                value={premiereDate}
                                onChange={(e) => {
                                    const newDate = e.target.value
                                    setPremiereDate(newDate)

                                    if (newDate) {
                                        const date = new Date(newDate)
                                        const today = new Date()
                                        today.setHours(0, 0, 0, 0)

                                        if (date > today) {
                                            setStatus('upcoming')
                                        } else {
                                            // If it was upcoming, move to active. 
                                            // If it was archived, maybe keep it archived? 
                                            // User said: "if equal or after [today/past] then it can only be active or archive"
                                            // Let's default to 'active' if it was 'upcoming', otherwise leave it be (user might have manually set archive)
                                            if (status === 'upcoming') {
                                                setStatus('active')
                                            }
                                        }
                                    }
                                }}
                                className="block w-full rounded-xl border border-white/10 bg-black/50 px-4 py-3 text-white placeholder-neutral-500 focus:border-purple-500 focus:outline-none focus:ring-1 focus:ring-purple-500 shadow-inner transition-all sm:text-sm pl-10 scheme-dark"
                            />
                            <Calendar className="absolute left-3 top-2.5 h-4 w-4 text-neutral-500" />
                        </div>
                    </div>

                    <div>
                        <label htmlFor="status" className="block text-sm font-medium text-neutral-300">
                            {t('status')}
                        </label>
                        <select
                            id="status"
                            value={status}
                            onChange={(e) => setStatus(e.target.value as Performance['status'])}
                            className="mt-2 block w-full rounded-xl border border-white/10 bg-black/50 px-4 py-3 text-white placeholder-neutral-500 focus:border-purple-500 focus:outline-none focus:ring-1 focus:ring-purple-500 shadow-inner transition-all sm:text-sm"
                        >
                            <option value="upcoming">{t('statuses.upcoming')}</option>
                            <option value="active">{t('statuses.active')}</option>
                            <option value="archived">{t('statuses.archived')}</option>
                        </select>
                    </div>
                </div>

                <div className="grid gap-6 sm:grid-cols-2">
                    <label className="rk-field">
                        <span className="rk-label">{t('venue')}</span>
                        <input className="rk-input" value={venue} onChange={e => setVenue(e.target.value)} placeholder={t('venuePlaceholder')} />
                    </label>
                    <label className="rk-field">
                        <span className="rk-label">{t('structure')}</span>
                        <span className="rk-select">
                            <select value={structure} onChange={e => setStructure(e.target.value)}>
                                <option value="acts_scenes">{t('structureScenes')}</option>
                                <option value="acts_only">{t('structureActs')}</option>
                            </select>
                        </span>
                        <span className="rk-hint">{t('structureHint')}</span>
                    </label>
                </div>

                <div>
                    <label htmlFor="notes" className="block text-sm font-medium text-neutral-300">
                        {t('notes')}
                    </label>
                    <textarea
                        id="notes"
                        rows={3}
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                        className="mt-2 block w-full rounded-xl border border-white/10 bg-black/50 px-4 py-3 text-white placeholder-neutral-500 focus:border-purple-500 focus:outline-none focus:ring-1 focus:ring-purple-500 shadow-inner transition-all sm:text-sm"
                    />
                </div>

                <div>
                    <label htmlFor="sourceUrl" className="block text-sm font-medium text-neutral-300">
                        {t('sourceUrl')}
                    </label>
                    <input
                        type="url"
                        id="sourceUrl"
                        value={sourceUrl}
                        onChange={(e) => setSourceUrl(e.target.value)}
                        placeholder="https://..."
                        className="mt-2 block w-full rounded-xl border border-white/10 bg-black/50 px-4 py-3 text-white placeholder-neutral-500 focus:border-purple-500 focus:outline-none focus:ring-1 focus:ring-purple-500 shadow-inner transition-all sm:text-sm"
                    />
                </div>

                {/* Poster Upload */}
                <div>
                    <label className="block text-sm font-medium text-neutral-300 mb-2">
                        {t('showPoster')}
                    </label>
                    <div
                        className={`flex items-start gap-6 p-4 rounded-lg border-2 border-dashed transition-colors ${isDragging ? 'border-neutral-500 bg-neutral-800/50' : 'border-transparent'}`}
                        onDragOver={handleDragOver}
                        onDragLeave={handleDragLeave}
                        onDrop={handleDrop}
                    >
                        <div
                            className="relative w-32 h-48 bg-neutral-950 rounded-lg border border-neutral-800 overflow-hidden flex items-center justify-center shrink-0"
                            style={{ borderColor: selectedColor || undefined }}
                        >
                            {imagePreview ? (
                                <>
                                    <Image
                                        src={imagePreview}
                                        alt="Preview"
                                        fill
                                        className="object-cover"
                                        unoptimized
                                    />
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setImageFile(null)
                                            setImagePreview(null)
                                            setExtractedColors([])
                                            setSelectedColor(null)
                                        }}
                                        className="absolute top-1 right-1 bg-black/60 text-white p-1 rounded-full hover:bg-black/80"
                                    >
                                        <X className="w-3 h-3" />
                                    </button>
                                </>
                            ) : (
                                <div className="text-neutral-600 flex flex-col items-center gap-2">
                                    <Upload className="w-6 h-6" />
                                    <span className="text-xs">{t('noPoster')}</span>
                                </div>
                            )}
                        </div>

                        <div className="flex-1 space-y-4">
                            <div>
                                <input
                                    type="file"
                                    id="poster"
                                    accept="image/*"
                                    onChange={handleImageChange}
                                    className="block w-full text-sm text-neutral-400 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-neutral-800 file:text-white hover:file:bg-neutral-700"
                                />
                                <p className="mt-2 text-xs text-neutral-500">
                                    {t('uploadPoster')}
                                    <br />
                                    <span className="text-neutral-400">{t('dragDrop')}</span>
                                </p>
                            </div>

                            {extractedColors.length > 0 ? (
                                <div className="space-y-2">
                                    <p className="text-xs font-medium text-neutral-400">{t('selectThemeColor')}</p>
                                    <div className="flex gap-3">
                                        {extractedColors.map((color) => (
                                            <button
                                                key={color}
                                                type="button"
                                                onClick={() => setSelectedColor(color)}
                                                className={`w-8 h-8 rounded-full shadow-sm ring-2 transition-all ${selectedColor === color ? 'ring-white scale-110' : 'ring-transparent hover:scale-105'}`}
                                                style={{ backgroundColor: color }}
                                                title={color}
                                            />
                                        ))}
                                    </div>
                                    {/* Hex code removed as per user request */}
                                </div>
                            ) : selectedColor && (
                                <div className="flex items-center gap-3 p-3 bg-neutral-950 rounded-md border border-neutral-800">
                                    <div
                                        className="w-8 h-8 rounded-full shadow-sm ring-2 ring-white/10"
                                        style={{ backgroundColor: selectedColor }}
                                    />
                                    <div>
                                        <p className="text-xs font-medium text-white">{t('currentThemeColor')}</p>
                                        {/* Hex code removed */}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {error && (
                <div className="rounded-md bg-red-900/20 p-4 text-sm text-red-400 border border-red-900/50">
                    {error}
                </div>
            )}

            <div className="flex items-center justify-between">
                <Button
                    type="button"
                    onClick={handleDelete}
                    disabled={loading}
                    variant="glassy-danger"
                    leftIcon={<Trash2 className="h-4 w-4" />}
                >
                    {t('deleteProduction')}
                </Button>

                <div className="flex gap-4">
                    <Button
                        type="button"
                        onClick={() => router.back()}
                        variant="ghost"
                    >
                        {t('cancel')}
                    </Button>
                    <Button
                        type="submit"
                        disabled={loading}
                        variant="glassy-success"
                        isLoading={loading}
                        leftIcon={<Save className="h-4 w-4" />}
                    >
                        {t('saveChanges')}
                    </Button>
                </div>
            </div>
        </form>
    )
}
