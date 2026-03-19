'use client'

import { useState } from 'react'
import { createClient } from '@/utils/supabase/client'
import { useRouter } from '@/i18n/routing'
import { Save, Calendar, Upload, X, Globe, ArrowRight, SkipForward } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { compressImage, createThumbnail } from '@/utils/image-processing'
import { extractTopColors } from '@/utils/colors'
import Image from 'next/image'
import DatePicker from 'react-datepicker'
import "react-datepicker/dist/react-datepicker.css"
import { pl } from 'date-fns/locale'
import { useTranslations } from 'next-intl'
import { Database } from '@/types/supabase'
import { scrapePerformance } from '@/app/actions/scrape-performance'
import { revalidatePerformances } from '@/app/actions/revalidate'
import { refreshSearchIndex } from '@/app/actions/unified-search'
import { motion, AnimatePresence } from 'framer-motion'

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

export function CreatePerformanceForm() {
    const t = useTranslations('CreatePerformanceForm')
    const [title, setTitle] = useState('')
    const [premiereDate, setPremiereDate] = useState('')
    const [notes, setNotes] = useState('')
    const [imageFile, setImageFile] = useState<File | null>(null)
    const [imagePreview, setImagePreview] = useState<string | null>(null)
    const [extractedColors, setExtractedColors] = useState<string[]>([])
    const [selectedColor, setSelectedColor] = useState<string | null>(null)
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [isDragging, setIsDragging] = useState(false)
    const [scrapeUrl, setScrapeUrl] = useState('')
    const [isScraping, setIsScraping] = useState(false)
    const [upcomingDates, setUpcomingDates] = useState<string[]>([])
    const [step, setStep] = useState<'import' | 'edit'>('import')

    const router = useRouter()
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

    const handleUpload = async (file: File | Blob, name: string) => {
        const fileExt = (file instanceof File ? file.name : name).split('.').pop() || 'jpeg'
        const fileName = `${Math.random()}.${fileExt}`
        const thumbnailName = `thumb_${fileName}`

        const fileToProcess = file instanceof File ? file : new File([file], name, { type: file.type })

        // Compress and prepare files
        const mainBlob = await compressImage(fileToProcess)
        const mainFile = new File([mainBlob], fileName, { type: 'image/jpeg' })
        const thumbBlob = await createThumbnail(fileToProcess, 300, false)
        const thumbFile = new File([thumbBlob], thumbnailName, { type: 'image/jpeg' })

        // Parallel upload
        const [mainUpload, thumbUpload] = await Promise.all([
            supabase.storage.from('posters').upload(fileName, mainFile),
            supabase.storage.from('posters').upload(thumbnailName, thumbFile)
        ])

        if (mainUpload.error) throw mainUpload.error
        if (thumbUpload.error) throw thumbUpload.error

        return {
            imageUrl: supabase.storage.from('posters').getPublicUrl(fileName).data.publicUrl,
            thumbnailUrl: supabase.storage.from('posters').getPublicUrl(thumbnailName).data.publicUrl
        }
    }

    const handleFinalize = async (performanceId: string, performanceTitle: string, selectedColor: string | null, performanceNotes: string) => {
        // 1. Create Group
        const { data: groupData } = await supabase
            .from('groups')
            .insert({
                name: performanceTitle,
                color: selectedColor,
                performance_id: performanceId
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
            title: `${performanceTitle} - Master Note`,
            performance_id: performanceId,
            content: {
                type: 'doc',
                content: [
                    { type: 'heading', attrs: { level: 1 }, content: [{ type: 'text', text: `${performanceTitle} - Master Note` }] },
                    { type: 'paragraph', content: [{ type: 'text', text: performanceNotes || 'General information.' }] }
                ]
            },
            is_master: true
        })

        // 3. Handle Default Scenes and Dates
        const prepScene = { performance_id: performanceId, act_number: 0, scene_number: 0, name: 'Preparation', type: 'preparation' as const }
        const firstScene = { performance_id: performanceId, act_number: 1, scene_number: 1, name: 'Scene 1' }
        const intermissionScene = { performance_id: performanceId, act_number: 1, scene_number: 2, name: 'Przerwa', type: 'intermission' as const }

        await supabase.from('scenes').insert([prepScene, firstScene, intermissionScene])

        if (upcomingDates.length > 0) {
            const checklists: Database['public']['Tables']['scene_checklists']['Insert'][] = []

            upcomingDates.forEach(date => {
                // Add Preparation checklist
                checklists.push({
                    performance_id: performanceId,
                    show_date: date,
                    scene_number: '0',
                    scene_name: 'Preparation',
                    type: 'show',
                    is_active: false
                })

                // Add Scene 1 checklist
                checklists.push({
                    performance_id: performanceId,
                    show_date: date,
                    scene_number: '1',
                    scene_name: 'Scene 1',
                    type: 'show',
                    is_active: false
                })
            })

            await supabase.from('scene_checklists').insert(checklists)
        }
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true)
        setError(null)

        try {
            let imageUrl = null
            let thumbnailUrl = null

            if (imageFile) {
                const results = await handleUpload(imageFile, imageFile.name)
                imageUrl = results.imageUrl
                thumbnailUrl = results.thumbnailUrl
            } else if (imagePreview?.startsWith('data:')) {
                const blob = base64ToBlob(imagePreview)
                const results = await handleUpload(blob, 'scraped.jpeg')
                imageUrl = results.imageUrl
                thumbnailUrl = results.thumbnailUrl
            } else if (imagePreview?.startsWith('http')) {
                imageUrl = imagePreview
                thumbnailUrl = imagePreview
            }

            const { data: perf, error: perfErr } = await supabase
                .from('performances')
                .insert({
                    title,
                    premiere_date: premiereDate || null,
                    notes: notes || null,
                    status: (premiereDate && new Date(premiereDate) > new Date() ? 'upcoming' : 'active') as Database["public"]["Enums"]["performance_status_enum"],
                    image_url: imageUrl,
                    thumbnail_url: thumbnailUrl,
                    color: selectedColor,
                    source_url: scrapeUrl || null
                })
                .select()
                .single()

            if (perfErr) throw perfErr
            if (perf) await handleFinalize(perf.id, title, selectedColor, notes)

            await Promise.allSettled([refreshSearchIndex(), revalidatePerformances()])
            router.push('/performances')
        } catch (err: any) {
            setError(err.message || t('unknownError'))
        } finally {
            setLoading(false)
        }
    }

    const handleScrape = async () => {
        if (!scrapeUrl) return
        setIsScraping(true)
        setError(null)
        setUpcomingDates([])

        try {
            const result = await scrapePerformance(scrapeUrl)
            if (result.success && result.data) {
                const d = result.data
                if (d.title) setTitle(d.title)
                if (d.description) setNotes(d.description)
                if (d.premiereDate) setPremiereDate(d.premiereDate)
                if (d.imageUrl) {
                    setImagePreview(d.imageUrl)
                    setImageFile(null)
                    extractTopColors(d.imageUrl).then(colors => {
                        if (colors.length > 0) {
                            setExtractedColors(colors)
                            setSelectedColor(colors[0])
                        }
                    }).catch(() => { })
                }
                if (d.dates) setUpcomingDates(d.dates)
                setStep('edit')
            } else {
                setError(result.error || 'Failed to scrape')
            }
        } catch (error) {
            console.error('Failed to scrape performance data:', error)
            setError('Error scraping data')
        } finally {
            setIsScraping(false)
        }
    }

    return (
        <div className="w-full">
            <AnimatePresence mode="wait">
                {step === 'import' ? (
                    <motion.div
                        key="import-step"
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, x: -20 }}
                        className="space-y-8 max-w-2xl mx-auto"
                    >
                        <div className="space-y-2">
                            <h2 className="text-2xl font-bold bg-linear-to-r from-white to-neutral-400 bg-clip-text text-transparent">
                                {t('importTitle', { defaultMessage: 'Importuj dane' })}
                            </h2>
                            <p className="text-neutral-400">
                                {t('importDescription', { defaultMessage: 'Wklej link do strony spektaklu aby automatycznie uzupełnić dane.' })}
                            </p>
                        </div>

                        <div className="bg-neutral-900/50 p-4 md:p-8 rounded-xl border border-neutral-800 space-y-6 shadow-xl backdrop-blur-sm">
                            <div className="space-y-4">
                                <label htmlFor="scrapeUrl" className="text-sm font-medium text-neutral-300 flex items-center gap-2">
                                    <Globe className="w-4 h-4 text-blue-400" />
                                    {t('importFromUrl', { defaultMessage: 'Importuj ze strony teatru' })}
                                </label>
                                <div className="flex gap-2">
                                    <input
                                        type="url"
                                        id="scrapeUrl"
                                        value={scrapeUrl}
                                        onChange={(e) => setScrapeUrl(e.target.value)}
                                        className="flex-1 rounded-lg border border-neutral-700 bg-neutral-950 px-4 py-3 text-white placeholder-neutral-500 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 sm:text-sm transition-all"
                                        placeholder="https://teatr-rozrywki.pl/..."
                                        onKeyDown={(e) => {
                                            if (e.key === 'Enter') {
                                                e.preventDefault();
                                                handleScrape();
                                            }
                                        }}
                                    />
                                    <Button
                                        type="button"
                                        onClick={handleScrape}
                                        disabled={isScraping || !scrapeUrl}
                                        isLoading={isScraping}
                                        variant="glassy-primary"
                                        leftIcon={<ArrowRight className="w-4 h-4" />}
                                    >
                                        {t('next', { defaultMessage: 'Dalej' })}
                                    </Button>
                                </div>
                            </div>

                            <div className="relative">
                                <div className="absolute inset-0 flex items-center">
                                    <span className="w-full border-t border-neutral-800" />
                                </div>
                                <div className="relative flex justify-center text-xs uppercase">
                                    <span className="bg-neutral-900 px-2 text-neutral-500">
                                        Lub
                                    </span>
                                </div>
                            </div>

                            <Button
                                type="button"
                                onClick={() => setStep('edit')}
                                variant="glassy-secondary"
                                className="w-full justify-center"
                                leftIcon={<SkipForward className="w-4 h-4" />}
                            >
                                {t('manualEntry', { defaultMessage: 'Wypełnij ręcznie (Pomiń import)' })}
                            </Button>
                        </div>

                        {error && (
                            <div className="rounded-md bg-red-900/20 p-4 text-sm text-red-400 border border-red-900/50">
                                {error}
                            </div>
                        )}

                        <div className="flex justify-end pt-4">
                            <Button
                                type="button"
                                variant="glassy-secondary"
                                onClick={() => router.back()}
                                className="text-neutral-400 hover:text-white"
                            >
                                {t('cancel')}
                            </Button>
                        </div>
                    </motion.div>
                ) : (
                    <motion.div
                        key="edit-step"
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, y: 20 }}
                        className="max-w-5xl mx-auto"
                    >
                        <form onSubmit={handleSubmit} className="space-y-8">
                            <div className="flex items-center justify-between mb-6">
                                <h2 className="text-xl font-semibold text-white">{t('fillDetails', { defaultMessage: 'Uzupełnij szczegóły' })}</h2>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 bg-neutral-900/50 p-6 rounded-xl border border-neutral-800">
                                {/* Left Column: Image Upload */}
                                <div className="md:col-span-1 space-y-4">
                                    <label className="block text-sm font-medium text-neutral-300">
                                        {t('showPoster')}
                                    </label>
                                    <div
                                        className={`flex flex-col items-center gap-4 p-4 rounded-lg border-2 border-dashed transition-colors ${isDragging ? 'border-neutral-500 bg-neutral-800/50' : 'border-transparent bg-neutral-900/30'}`}
                                        onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                                        onDragLeave={(e) => { e.preventDefault(); setIsDragging(false); }}
                                        onDrop={async (e) => {
                                            e.preventDefault();
                                            setIsDragging(false);
                                            if (e.dataTransfer.files && e.dataTransfer.files[0]) {
                                                const file = e.dataTransfer.files[0];
                                                if (file.type.startsWith('image/')) await processFile(file);
                                            }
                                        }}
                                    >
                                        <div
                                            className="relative w-full aspect-2/3 bg-neutral-950 rounded-lg border border-neutral-800 overflow-hidden flex items-center justify-center shrink-0 shadow-lg"
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
                                                        className="absolute top-2 right-2 bg-black/60 text-white p-1.5 rounded-full hover:bg-black/80 transition-colors"
                                                    >
                                                        <X className="w-4 h-4" />
                                                    </button>
                                                </>
                                            ) : (
                                                <div className="text-neutral-600 flex flex-col items-center gap-3 p-4 text-center">
                                                    <Upload className="w-10 h-10 opacity-50" />
                                                    <span className="text-xs">{t('noPoster')}</span>
                                                </div>
                                            )}
                                        </div>

                                        <div className="w-full space-y-4">
                                            <div>
                                                <input
                                                    type="file"
                                                    id="poster"
                                                    accept="image/*"
                                                    onChange={handleImageChange}
                                                    className="hidden"
                                                />
                                                <Button
                                                    type="button"
                                                    variant="secondary"
                                                    size="sm"
                                                    className="w-full text-xs"
                                                    onClick={() => document.getElementById('poster')?.click()}
                                                >
                                                    {t('selectImage', { defaultMessage: 'Wybierz grafikę' })}
                                                </Button>
                                                <div className="mt-3 text-center space-y-1">
                                                    <p className="text-[10px] text-neutral-400 leading-tight">
                                                        {t('uploadPoster')}
                                                    </p>
                                                    <p className="text-[10px] text-neutral-500">
                                                        {t('dragDrop')}
                                                    </p>
                                                </div>
                                            </div>

                                            {extractedColors.length > 0 && (
                                                <div className="space-y-2 pt-2 border-t border-neutral-800">
                                                    <p className="text-xs font-medium text-neutral-400 text-center">{t('selectThemeColor')}</p>
                                                    <div className="flex gap-2 justify-center flex-wrap">
                                                        {extractedColors.map((color) => (
                                                            <button
                                                                key={color}
                                                                type="button"
                                                                onClick={() => setSelectedColor(color)}
                                                                className={`w-6 h-6 rounded-full shadow-sm ring-2 transition-all ${selectedColor === color ? 'ring-white scale-110' : 'ring-transparent hover:scale-105'}`}
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

                                {/* Right Column: Fields */}
                                <div className="md:col-span-2 space-y-6">
                                    {upcomingDates.length > 0 && (
                                        <div className="p-4 bg-green-900/10 border border-green-900/30 rounded-lg flex items-start gap-3">
                                            <Calendar className="w-5 h-5 text-green-400 mt-0.5" />
                                            <div>
                                                <h4 className="text-sm font-medium text-green-400">{t('scheduleImported', { defaultMessage: 'Pobrano harmonogram' })}</h4>
                                                <p className="text-xs text-green-500/80 mt-1">
                                                    {t('datesFound', { count: upcomingDates.length, defaultMessage: `Znaleziono ${upcomingDates.length} terminów do zaplanowania.` })}
                                                    {' '}{t('scheduleImportedDesc', { defaultMessage: 'Te terminy zostaną automatycznie dodane po zapisaniu.' })}
                                                </p>
                                            </div>
                                        </div>
                                    )}

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
                                            className="mt-2 block w-full rounded-md border border-neutral-800 bg-neutral-950 px-3 py-2 text-white placeholder-neutral-500 focus:border-neutral-500 focus:outline-none focus:ring-1 focus:ring-neutral-500 sm:text-sm"
                                            placeholder={t('titlePlaceholder')}
                                        />
                                    </div>

                                    <div>
                                        <label htmlFor="premiereDate" className="block text-sm font-medium text-neutral-300">
                                            {t('premiereDate')}
                                        </label>
                                        <div className="relative mt-2">
                                            <DatePicker
                                                selected={premiereDate ? new Date(premiereDate) : null}
                                                onChange={(date) => {
                                                    setPremiereDate(date ? date.toISOString() : '')
                                                }}
                                                dateFormat="dd.MM.yyyy"
                                                locale={pl}
                                                className="block w-full rounded-md border border-neutral-800 bg-neutral-950 px-3 py-2 text-white placeholder-neutral-500 focus:border-neutral-500 focus:outline-none focus:ring-1 focus:ring-neutral-500 sm:text-sm pl-10"
                                                placeholderText={t('datePlaceholder')}
                                                wrapperClassName="w-full"
                                            />
                                            <Calendar className="absolute left-3 top-2.5 h-4 w-4 text-neutral-500 pointer-events-none" />
                                        </div>
                                    </div>

                                    <div>
                                        <label htmlFor="sourceUrl" className="block text-sm font-medium text-neutral-300">
                                            {t('sourceUrl', { defaultMessage: 'Link do strony (źródłowy)' })}
                                        </label>
                                        <input
                                            type="url"
                                            id="sourceUrl"
                                            value={scrapeUrl}
                                            onChange={(e) => setScrapeUrl(e.target.value)}
                                            className="mt-2 block w-full rounded-md border border-neutral-800 bg-neutral-950 px-3 py-2 text-white placeholder-neutral-500 focus:border-neutral-500 focus:outline-none focus:ring-1 focus:ring-neutral-500 sm:text-sm"
                                            placeholder="https://teatr..."
                                        />
                                    </div>

                                    <div>
                                        <label htmlFor="notes" className="block text-sm font-medium text-neutral-300">
                                            {t('notes')}
                                        </label>
                                        <textarea
                                            id="notes"
                                            rows={6}
                                            value={notes}
                                            onChange={(e) => setNotes(e.target.value)}
                                            className="mt-2 block w-full rounded-md border border-neutral-800 bg-neutral-950 px-3 py-2 text-white placeholder-neutral-500 focus:border-neutral-500 focus:outline-none focus:ring-1 focus:ring-neutral-500 sm:text-sm"
                                            placeholder={t('notesPlaceholder')}
                                        />
                                    </div>
                                </div>
                            </div>

                            {error && (
                                <div className="rounded-md bg-red-900/20 p-4 text-sm text-red-400 border border-red-900/50">
                                    {error}
                                </div>
                            )}

                            <div className="flex items-center justify-between pt-4">
                                <Button
                                    type="button"
                                    variant="ghost"
                                    onClick={() => setStep('import')}
                                    className="text-neutral-400 hover:text-white"
                                >
                                    {t('backToImport', { defaultMessage: 'Wróć do importu' })}
                                </Button>
                                <div className="flex gap-4">
                                    <Button
                                        type="button"
                                        variant="glassy-secondary"
                                        onClick={() => router.back()}
                                        className="text-neutral-400 hover:text-white"
                                    >
                                        {t('cancel')}
                                    </Button>
                                    <Button
                                        type="submit"
                                        variant="glassy-success"
                                        isLoading={loading}
                                        leftIcon={<Save className="w-4 h-4" />}
                                    >
                                        {t('saveShow')}
                                    </Button>
                                </div>
                            </div>
                        </form>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    )
}
