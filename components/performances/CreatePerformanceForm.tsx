'use client'

import { useRef, useState } from 'react'
import { activeTheatreId, filePath, miniPath } from '@/lib/storage-paths'
import { createClient } from '@/utils/supabase/client'
import { Link, useRouter } from '@/i18n/routing'
import { ChevronDown, ChevronLeft, Upload, X } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { VenueSelect } from '@/components/performances/VenueSelect'
import { compressImage, createThumbnail } from '@/utils/image-processing'
import { extractTopColors } from '@/utils/colors'
import { useTranslations } from 'next-intl'
import { Database } from '@/types/supabase'
import { scrapePerformance } from '@/app/actions/scrape-performance'
import { revalidatePerformances } from '@/app/actions/revalidate'
import { refreshSearchIndex } from '@/app/actions/unified-search'
import { Steps } from '@/components/rk/Steps'

// Helper for converting base64 to blob
const base64ToBlob = (dataURI: string) => {
    const splitDataURI = dataURI.split(',')
    const byteString = splitDataURI[0].indexOf('base64') >= 0 ? atob(splitDataURI[1]) : decodeURI(splitDataURI[1])
    const mimeString = splitDataURI[0].split(':')[1].split(';')[0]
    const ia = new Uint8Array(byteString.length)
    for (let i = 0; i < byteString.length; i++) {
        ia[i] = byteString.charCodeAt(i)
    }
    return new Blob([ia], { type: mimeString })
}

export function CreatePerformanceForm({ venues }: { venues: string[] }) {
    const t = useTranslations('CreatePerformanceForm')
    const router = useRouter()
    const [title, setTitle] = useState('')
    const [venue, setVenue] = useState('')
    const [structure, setStructure] = useState<'acts_scenes' | 'acts_only'>('acts_scenes')
    const [premiereDate, setPremiereDate] = useState('')
    const [notes, setNotes] = useState('')
    const [imageFile, setImageFile] = useState<File | null>(null)
    const [imagePreview, setImagePreview] = useState<string | null>(null)
    const [extractedColors, setExtractedColors] = useState<string[]>([])
    const [selectedColor, setSelectedColor] = useState<string | null>(null)
    const [error, setError] = useState<string | null>(null)
    const [isDragging, setIsDragging] = useState(false)
    const [scrapeUrl, setScrapeUrl] = useState('')
    const [upcomingDates, setUpcomingDates] = useState<string[]>([])
    const [submitting, setSubmitting] = useState(false)

    const fileInputRef = useRef<HTMLInputElement>(null)
    const supabase = createClient()

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

    // Plakat w ścieżce teatru (lib/storage-paths): <teatr>/plakaty/<spektakl>/<losowe>.jpg, miniatura z „-mini”.
    const handleUpload = async (file: File | Blob, name: string, performanceId: string) => {
        const fileName = filePath(await activeTheatreId(supabase), 'plakaty', performanceId, 'jpg')
        const thumbnailName = miniPath(fileName)

        const fileToProcess = file instanceof File ? file : new File([file], name, { type: file.type })

        // Compress and prepare files
        const mainBlob = await compressImage(fileToProcess)
        const mainFile = new File([mainBlob], fileName, { type: 'image/jpeg' })
        const thumbBlob = await createThumbnail(fileToProcess, 300, false)
        const thumbFile = new File([thumbBlob], thumbnailName, { type: 'image/jpeg' })

        // Parallel upload
        const [mainUpload, thumbUpload] = await Promise.all([
            supabase.storage.from('posters').upload(fileName, mainFile),
            supabase.storage.from('posters').upload(thumbnailName, thumbFile),
        ])

        if (mainUpload.error) throw mainUpload.error
        if (thumbUpload.error) throw thumbUpload.error

        return {
            imageUrl: supabase.storage.from('posters').getPublicUrl(fileName).data.publicUrl,
            thumbnailUrl: supabase.storage.from('posters').getPublicUrl(thumbnailName).data.publicUrl,
        }
    }

    const handleFinalize = async (performanceId: string, performanceTitle: string, color: string | null, performanceNotes: string) => {
        // 1. Create Group
        const { data: groupData } = await supabase
            .from('groups')
            .insert({
                name: performanceTitle,
                color,
                performance_id: performanceId,
            })
            .select('id')
            .single()

        if (groupData) {
            import('@/app/actions/generate-group-embeddings').then(({ generateGroupEmbedding }) => {
                generateGroupEmbedding(groupData.id).catch(e => console.error('Embedding error:', e))
            })
        }

        // 2. Create Master Note
        await supabase.from('notes').insert({
            title: t('masterNoteTitle', { title: performanceTitle }),
            performance_id: performanceId,
            content: {
                type: 'doc',
                content: [
                    { type: 'heading', attrs: { level: 1 }, content: [{ type: 'text', text: t('masterNoteTitle', { title: performanceTitle }) }] },
                    { type: 'paragraph', content: [{ type: 'text', text: performanceNotes || t('masterNoteBody') }] },
                ],
            },
            is_master: true,
        })

        // 3. Handle Default Scenes and Dates
        // Tylko przygotowanie: akty i sceny układa się w drugim kroku (albo później). Przerwy nie są scenami.
        await supabase.from('scenes').insert({ performance_id: performanceId, act_number: 0, scene_number: 0, name: 'Przygotowanie', type: 'preparation' })

        if (upcomingDates.length > 0) {
            const checklists: Database['public']['Tables']['scene_checklists']['Insert'][] = []

            upcomingDates.forEach(date => {
                checklists.push({
                    performance_id: performanceId,
                    show_date: date,
                    scene_number: '0',
                    scene_name: 'Przygotowanie',
                    type: 'show',
                    is_active: false,
                })
            })

            await supabase.from('scene_checklists').insert(checklists)

            // Każdy termin ma też listę zadań w nowym modelu (kalendarz, lista zadań, tryb na żywo).
            await supabase.from('show_lists').upsert(
                [...new Set(upcomingDates)].map(date => ({ performance_id: performanceId, show_date: date, kind: 'show' })),
                { onConflict: 'performance_id,show_date', ignoreDuplicates: true },
            )
        }
    }

    // Plakat wysyłamy po utworzeniu spektaklu, żeby nie trzymać nikogo na pierwszym ekranie.
    const uploadPoster = async (performanceId: string) => {
        let images: { imageUrl: string; thumbnailUrl: string } | null = null
        if (imageFile) images = await handleUpload(imageFile, imageFile.name, performanceId)
        else if (imagePreview?.startsWith('data:')) images = await handleUpload(base64ToBlob(imagePreview), 'scraped.jpeg', performanceId)
        else if (imagePreview?.startsWith('http')) images = { imageUrl: imagePreview, thumbnailUrl: imagePreview }
        if (!images) return
        await supabase.from('performances').update({ image_url: images.imageUrl, thumbnail_url: images.thumbnailUrl }).eq('id', performanceId)
    }

    const createPerformance = async (performanceId: string, firstSceneId: string) => {
        const { error: perfErr } = await supabase
            .from('performances')
            .insert({
                id: performanceId,
                title: title.trim(),
                venue: venue.trim() || null,
                structure,
                premiere_date: premiereDate || null,
                notes: notes.trim() || null,
                status: (premiereDate && new Date(premiereDate) > new Date() ? 'upcoming' : 'active') as Database["public"]["Enums"]["performance_status_enum"],
                color: selectedColor,
                source_url: scrapeUrl || null,
            })
        if (perfErr) throw perfErr
        // Punkt wyjścia: akt I ze sceną 1. To baza do zmiany w drugim kroku, a nie gotowy podział.
        await supabase.from('scenes').insert({ id: firstSceneId, performance_id: performanceId, act_number: 1, scene_number: 1, name: t('firstSceneName'), type: 'scene' })
        await handleFinalize(performanceId, title.trim(), selectedColor, notes.trim())
        void uploadPoster(performanceId).catch(err => console.error('Poster upload:', err))
        await Promise.allSettled([refreshSearchIndex(), revalidatePerformances()])
    }

    // Enter w polu przechodzi do następnego pola zamiast od razu tworzyć spektakl; tworzy go tylko przycisk.
    const focusNextOnEnter = (e: React.KeyboardEvent<HTMLFormElement>) => {
        const el = e.target as HTMLElement
        if (e.key !== 'Enter' || !(el instanceof HTMLInputElement) || el.type === 'file') return
        e.preventDefault()
        const fields = [...e.currentTarget.querySelectorAll<HTMLElement>('input:not([type=file]):not([type=hidden]), textarea, select, button[type=submit]')]
        fields[fields.indexOf(el) + 1]?.focus()
    }

    // Krok 2 (rozpiska) otwiera się, gdy spektakl i akt I ze sceną 1 są już w bazie; plakat wysyła się dalej w tle.
    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!title.trim() || submitting) return
        setError(null)
        setSubmitting(true)
        const performanceId = crypto.randomUUID()
        try {
            await createPerformance(performanceId, crypto.randomUUID())
            router.push(`/performances/${performanceId}/props?new=1`)
        } catch (err) {
            setError((err as { message?: string })?.message || t('unknownError'))
            setSubmitting(false)
        }
    }

    return (
        <main className="mx-auto flex w-full max-w-[760px] flex-col gap-8 px-4 pt-6 pb-12 md:px-12 md:pt-8">
            <header className="flex flex-col gap-4">
                <Link className="pl-back" href="/performances">
                    <ChevronLeft className="w-4 h-4" />
                    {t('backToPerformances')}
                </Link>
                <Steps
                    label={t('stepsLabel')}
                    current={0}
                    steps={[{ label: t('stepDetails') }, { label: t('stepScenes'), note: t('stepScenesNote') }]}
                />
                <div className="flex flex-col gap-1">
                    <h1 className="st-title">{t('fillDetails')}</h1>
                </div>
            </header>

            <form onSubmit={handleSubmit} onKeyDown={focusNextOnEnter} className="flex flex-col gap-6">
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
                        placeholder={t('titlePlaceholder')}
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
                            onChange={e => setPremiereDate(e.target.value)}
                        />
                    </label>
                </div>

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

                {/* Plakat spektaklu: .rk-poster--lg (144px per design system) */}
                <div className="rk-field">
                    <span className="rk-label">{t('showPoster')}</span>
                    <div
                        className={`flex flex-col sm:flex-row items-start gap-6 p-4 rounded-md border border-dashed transition-colors ${
                            isDragging ? 'border-kurtyna-text bg-surface-raised' : 'border-border'
                        }`}
                        onDragOver={e => {
                            e.preventDefault()
                            setIsDragging(true)
                        }}
                        onDragLeave={e => {
                            e.preventDefault()
                            setIsDragging(false)
                        }}
                        onDrop={async e => {
                            e.preventDefault()
                            setIsDragging(false)
                            if (e.dataTransfer.files && e.dataTransfer.files[0]) {
                                const file = e.dataTransfer.files[0]
                                if (file.type.startsWith('image/')) await processFile(file)
                            }
                        }}
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
                                    id="poster"
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
                                    {t('selectImage')}
                                </button>
                                <p className="rk-hint mt-2">
                                    {t('uploadPoster')} {t('dragDrop')}
                                </p>
                            </div>

                            {extractedColors.length > 0 && (
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
                        placeholder={t('notesPlaceholder')}
                    />
                </label>

                {error && (
                    <div className="rk-alert rk-alert--danger" role="alert">
                        <strong>{error}</strong>
                    </div>
                )}

                <div className="flex items-center justify-end gap-3 pt-4 border-t border-border">
                    <Link href="/performances" className="rk-btn rk-btn--ghost">
                        {t('cancel')}
                    </Link>
                    <Button type="submit" variant="primary" isLoading={submitting} loadingLabel={t('saving')}>
                        {t('nextScenes')}
                    </Button>
                </div>
            </form>
        </main>
    )
}
