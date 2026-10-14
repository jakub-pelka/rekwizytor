'use client'

import { useEffect, useRef, useState, useTransition } from 'react'
import { activeTheatreId, filePath, miniPath } from '@/lib/storage-paths'
import { createClient } from '@/utils/supabase/client'
import { Link, useRouter } from '@/i18n/routing'
import { ChevronDown, ChevronLeft, Trash2, Upload, X } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { VenueSelect } from '@/components/performances/VenueSelect'
import { compressImage, createThumbnail } from '@/utils/image-processing'
import { extractTopColors } from '@/utils/colors'
import { useTranslations } from 'next-intl'
import { refreshSearchIndex } from '@/app/actions/unified-search'
import { restorePerformance, trashPerformance } from '@/app/actions/performance-trash'
import { notify } from '@/utils/notify'

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
    venues: string[]
}

export function EditPerformanceForm({ performance, venues }: Props) {
    const t = useTranslations('EditPerformanceForm')
    const [title, setTitle] = useState(performance.title)
    const [premiereDate, setPremiereDate] = useState(
        performance.premiere_date ? new Date(performance.premiere_date).toISOString().split('T')[0] : '',
    )
    const [notes, setNotes] = useState(performance.notes || '')
    const [sourceUrl, setSourceUrl] = useState(performance.source_url || '')
    const [status, setStatus] = useState<Performance['status']>(performance.status)
    const [venue, setVenue] = useState(performance.venue ?? '')
    const [structure, setStructure] = useState<'acts_scenes' | 'acts_only'>(
        performance.structure === 'acts_only' ? 'acts_only' : 'acts_scenes',
    )
    const [imageFile, setImageFile] = useState<File | null>(null)
    const [imagePreview, setImagePreview] = useState<string | null>(performance.image_url)
    const [extractedColors, setExtractedColors] = useState<string[]>([])
    const [selectedColor, setSelectedColor] = useState<string | null>(performance.color)
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [isDragging, setIsDragging] = useState(false)
    const [confirmDelete, setConfirmDelete] = useState(false)
    const [deleting, startDeleteTransition] = useTransition()

    const fileInputRef = useRef<HTMLInputElement>(null)
    const router = useRouter()
    const supabase = createClient()

    useEffect(() => {
        const onKey = (e: KeyboardEvent) => {
            if (e.key === 'Escape' && confirmDelete) setConfirmDelete(false)
        }
        document.addEventListener('keydown', onKey)
        return () => document.removeEventListener('keydown', onKey)
    }, [confirmDelete])

    const processFile = async (file: File) => {
        try {
            const previewUrl = URL.createObjectURL(file)
            setImagePreview(previewUrl)
            const colors = await extractTopColors(previewUrl)
            setExtractedColors(colors)
            setSelectedColor(colors.length > 0 ? colors[0] : null)
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
                // Ścieżka teatru (lib/storage-paths); kompresja zapisuje JPEG.
                const fileName = filePath(await activeTheatreId(supabase), 'plakaty', performance.id, 'jpg')
                const thumbnailName = miniPath(fileName)

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
            } else if (!imagePreview) {
                imageUrl = null
                thumbnailUrl = null
            }

            const { error: updateError } = await supabase
                .from('performances')
                .update({
                    title: title.trim(),
                    premiere_date: premiereDate || null,
                    notes: notes.trim() || null,
                    status,
                    image_url: imageUrl,
                    thumbnail_url: thumbnailUrl,
                    color: selectedColor,
                    source_url: sourceUrl.trim() || null,
                    venue: venue.trim() || null,
                    structure,
                })
                .eq('id', performance.id)

            if (updateError) throw updateError

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

    const handleDelete = () => {
        startDeleteTransition(async () => {
            const result = await trashPerformance(performance.id)
            if (!result.ok) {
                setError(result.error ?? t('unknownError'))
                setConfirmDelete(false)
                return
            }
            router.push('/performances')
            notify.undo(
                `Przeniesiono „${performance.title}” do kosza.`,
                'Cofnij',
                async () => {
                    const restored = await restorePerformance(performance.id)
                    if (!restored.ok) {
                        notify.error(restored.error ?? 'Nie udało się przywrócić.')
                        return
                    }
                    router.push(`/performances/${performance.id}`)
                },
            )
        })
    }

    return (
        <main className="mx-auto flex w-full max-w-[760px] flex-col gap-8 px-4 pt-6 pb-12 md:px-12 md:pt-8">
            <header className="flex flex-col gap-4">
                <Link className="pl-back" href={`/performances/${performance.id}`}>
                    <ChevronLeft className="w-4 h-4" />
                    {performance.title}
                </Link>
                <div className="flex flex-col gap-1">
                    <h1 className="st-title">{t('showTitle')}</h1>
                    <p className="text-ink-muted text-sm">{performance.title}</p>
                </div>
            </header>

            <form onSubmit={handleSubmit} className="flex flex-col gap-6">
                <label className="rk-field">
                    <span className="rk-label">
                        {t('showTitle')} <span className="text-danger">*</span>
                    </span>
                    <input
                        type="text"
                        required
                        className="rk-input"
                        value={title}
                        onChange={e => setTitle(e.target.value)}
                    />
                </label>

                <div className="grid gap-6 sm:grid-cols-2">
                    <VenueSelect
                        value={venue}
                        onChange={setVenue}
                        venues={venues}
                        label={t('venue')}
                        noneLabel={t('venueNone')}
                        otherLabel={t('venueOther')}
                        placeholder={t('venuePlaceholder')}
                    />

                    <label className="rk-field">
                        <span className="rk-label">{t('premiereDate')}</span>
                        <input
                            type="date"
                            className="rk-input"
                            value={premiereDate}
                            onChange={e => {
                                const newDate = e.target.value
                                setPremiereDate(newDate)
                                if (newDate) {
                                    const date = new Date(newDate)
                                    const today = new Date()
                                    today.setHours(0, 0, 0, 0)
                                    if (date > today) {
                                        setStatus('upcoming')
                                    } else if (status === 'upcoming') {
                                        setStatus('active')
                                    }
                                }
                            }}
                        />
                    </label>
                </div>

                <div className="grid gap-6 sm:grid-cols-2">
                    <label className="rk-field">
                        <span className="rk-label">{t('status')}</span>
                        <span className="rk-select">
                            <select
                                value={status}
                                onChange={e => setStatus(e.target.value as Performance['status'])}
                            >
                                <option value="upcoming">{t('statuses.upcoming')}</option>
                                <option value="active">{t('statuses.active')}</option>
                                <option value="archived">{t('statuses.archived')}</option>
                            </select>
                            <ChevronDown className="w-4 h-4" />
                        </span>
                    </label>

                    <label className="rk-field">
                        <span className="rk-label">{t('structure')}</span>
                        <span className="rk-select">
                            <select
                                value={structure}
                                onChange={e => setStructure(e.target.value as 'acts_scenes' | 'acts_only')}
                            >
                                <option value="acts_scenes">{t('structureScenes')}</option>
                                <option value="acts_only">{t('structureActs')}</option>
                            </select>
                            <ChevronDown className="w-4 h-4" />
                        </span>
                        <span className="rk-hint">{t('structureHint')}</span>
                    </label>
                </div>

                {/* Plakat spektaklu: .rk-poster--lg (144px per design system) */}
                <div className="rk-field">
                    <span className="rk-label">{t('showPoster')}</span>
                    <div
                        className={`flex flex-col sm:flex-row items-start gap-6 p-4 rounded-md border border-dashed transition-colors ${
                            isDragging ? 'border-kurtyna-text bg-surface-raised' : 'border-border'
                        }`}
                        onDragOver={handleDragOver}
                        onDragLeave={handleDragLeave}
                        onDrop={handleDrop}
                    >
                        <div className="relative shrink-0">
                            {imagePreview ? (
                                <span className="rk-poster rk-poster--lg">
                                    {/* eslint-disable-next-line @next/next/no-img-element */}
                                    <img src={imagePreview} alt="" />
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setImageFile(null)
                                            setImagePreview(null)
                                            setExtractedColors([])
                                            setSelectedColor(null)
                                        }}
                                        aria-label={t('noPoster')}
                                        className="absolute top-1 right-1 bg-surface/90 hover:bg-surface text-ink p-1 rounded-full border border-border shadow-sm transition-colors"
                                    >
                                        <X className="w-3.5 h-3.5" />
                                    </button>
                                </span>
                            ) : (
                                <span className="rk-poster rk-poster--lg rk-poster--empty" title={t('noPoster')}>
                                    {/* eslint-disable-next-line @next/next/no-img-element */}
                                    <img src="/brand/rekwizytor-znak-mono-bialy.svg" alt="" />
                                </span>
                            )}
                        </div>

                        <div className="flex-1 flex flex-col gap-3 min-w-0">
                            <div>
                                <input
                                    ref={fileInputRef}
                                    type="file"
                                    id="edit-poster"
                                    accept="image/*"
                                    onChange={handleImageChange}
                                    className="hidden"
                                />
                                <button
                                    type="button"
                                    className="rk-btn rk-btn--secondary rk-btn--sm"
                                    onClick={() => fileInputRef.current?.click()}
                                >
                                    <Upload className="w-4 h-4" />
                                    {t('uploadPoster')}
                                </button>
                                <p className="rk-hint mt-2">
                                    {t('dragDrop')}
                                </p>
                            </div>

                            {extractedColors.length > 0 ? (
                                <div className="flex flex-col gap-2 pt-2 border-t border-border">
                                    <span className="rk-hint">{t('selectThemeColor')}</span>
                                    <div className="flex gap-2 flex-wrap items-center">
                                        {extractedColors.map(color => (
                                            <button
                                                key={color}
                                                type="button"
                                                onClick={() => setSelectedColor(color)}
                                                className={`w-6 h-6 rounded-full border transition-all ${
                                                    selectedColor === color
                                                        ? 'border-white scale-110 ring-2 ring-kurtyna-text'
                                                        : 'border-border hover:scale-105'
                                                }`}
                                                style={{ backgroundColor: color }}
                                                title={color}
                                            />
                                        ))}
                                    </div>
                                </div>
                            ) : selectedColor && (
                                <div className="flex items-center gap-3 pt-2 border-t border-border">
                                    <div
                                        className="w-6 h-6 rounded-full border border-white"
                                        style={{ backgroundColor: selectedColor }}
                                    />
                                    <span className="rk-hint">{t('currentThemeColor')}</span>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                <label className="rk-field">
                    <span className="rk-label">{t('notes')}</span>
                    <textarea
                        className="rk-textarea"
                        rows={4}
                        value={notes}
                        onChange={e => setNotes(e.target.value)}
                    />
                </label>

                <label className="rk-field">
                    <span className="rk-label">{t('sourceUrl')}</span>
                    <input
                        type="url"
                        className="rk-input"
                        value={sourceUrl}
                        onChange={e => setSourceUrl(e.target.value)}
                        placeholder="https://..."
                    />
                </label>

                {error && (
                    <div className="rk-alert rk-alert--danger" role="alert">
                        <strong>{error}</strong>
                    </div>
                )}

                <div className="flex flex-wrap items-center justify-between gap-4 pt-4 border-t border-border">
                    <Button
                        type="button"
                        variant="danger"
                        onClick={() => setConfirmDelete(true)}
                        disabled={loading || deleting}
                        leftIcon={<Trash2 className="w-4 h-4" />}
                    >
                        {t('deleteProduction')}
                    </Button>

                    <div className="flex items-center gap-3">
                        <Link href={`/performances/${performance.id}`} className="rk-btn rk-btn--ghost">
                            {t('cancel')}
                        </Link>
                        <Button
                            type="submit"
                            variant="primary"
                            isLoading={loading}
                        >
                            {t('saveChanges')}
                        </Button>
                    </div>
                </div>
            </form>

            {confirmDelete && (
                <div className="rk-overlay fixed inset-0 z-50 rounded-none flex items-center justify-center p-4 bg-black/60">
                    <div
                        className="rk-modal rk-modal--confirm"
                        role="alertdialog"
                        aria-labelledby="perf-del-title"
                        aria-describedby="perf-del-desc"
                    >
                        <div className="rk-modal__head">
                            <span className="rk-modal__icon rk-modal__icon--danger">
                                <Trash2 className="w-5 h-5 text-danger" />
                            </span>
                            <div>
                                <h3 className="rk-modal__title" id="perf-del-title">
                                    {t('deleteProduction')}
                                </h3>
                                <p className="rk-modal__desc" id="perf-del-desc">
                                    {t('deleteConfirmation')}
                                </p>
                            </div>
                        </div>
                        <div className="rk-modal__foot">
                            <Button variant="ghost" onClick={() => setConfirmDelete(false)} autoFocus>
                                {t('cancel')}
                            </Button>
                            <Button
                                variant="danger"
                                onClick={handleDelete}
                                isLoading={deleting}
                                loadingLabel={t('deleteProduction')}
                            >
                                {t('deleteProduction')}
                            </Button>
                        </div>
                    </div>
                </div>
            )}
        </main>
    )
}
