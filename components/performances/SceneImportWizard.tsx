'use client'

import { useEffect, useState } from 'react'
import { Camera } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { Steps } from '@/components/rk/Steps'
import { notify } from '@/utils/notify'
import { ImageCropper } from '@/components/ui/ImageCropper'
import { Button } from '@/components/ui/Button'
import { scanSceneImage, ScannedScene } from '@/app/actions/scan-scenes'
import { StagingTable } from './StagingTable'
import { createClient } from '@/utils/supabase/client'
import { useRouter } from 'next/navigation'

type Props = {
    performanceId: string
    existingScenes: { act: number, number: number }[]
    onClose: () => void
}

type WizardStep = 'upload' | 'crop' | 'staging'

export function SceneImportWizard({ performanceId, existingScenes, onClose }: Props) {
    const [step, setStep] = useState<WizardStep>('upload')
    const [images, setImages] = useState<File[]>([])
    const [croppedBlobs, setCroppedBlobs] = useState<Blob[]>([])
    const [imageUrls, setImageUrls] = useState<string[]>([])
    const [isDragging, setIsDragging] = useState(false)

    // Cropping State
    const [currentCropIndex, setCurrentCropIndex] = useState(0)
    const [isCropping, setIsCropping] = useState(false)
    const [currentImageSrc, setCurrentImageSrc] = useState<string | null>(null)

    // Analysis State
    const [scannedScenes, setScannedScenes] = useState<ScannedScene[]>([])
    const [isAnalyzing, setIsAnalyzing] = useState(false)

    const t = useTranslations('SceneImport')
    const supabase = createClient()
    const router = useRouter()

    // Esc działa jak „Anuluj”, ale nie w polu tekstowym (tam nie ma gubić rozpoznanych scen), nie przy kadrowaniu
    // (zamyka je sam kadr) i nie w trakcie przygotowania i rozpoznawania zdjęć.
    useEffect(() => {
        const onKey = (e: KeyboardEvent) => {
            if (e.key !== 'Escape' || isCropping || step === 'crop') return
            if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return
            onClose()
        }
        document.addEventListener('keydown', onKey)
        return () => document.removeEventListener('keydown', onKey)
    }, [isCropping, step, onClose])

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files.length > 0) {
            setImages(Array.from(e.target.files))
            setStep('crop')
            startCropFlow(Array.from(e.target.files))
        }
    }

    const startCropFlow = (files: File[]) => {
        if (files.length === 0) return
        setCurrentCropIndex(0)
        loadFileForCrop(files[0])
    }

    const loadFileForCrop = (file: File) => {
        const reader = new FileReader()
        reader.onload = () => {
            setCurrentImageSrc(reader.result as string)
            setIsCropping(true)
        }
        reader.readAsDataURL(file)
    }

    const handleCropComplete = (blob: Blob) => {
        const newBlobs = [...croppedBlobs, blob]
        setCroppedBlobs(newBlobs)
        setIsCropping(false)
        setCurrentImageSrc(null)

        // Move to next image or finish
        if (currentCropIndex + 1 < images.length) {
            const nextIndex = currentCropIndex + 1
            setCurrentCropIndex(nextIndex)
            setTimeout(() => loadFileForCrop(images[nextIndex]), 100) // small delay for UI reset
        } else {
            // All done, auto-start analysis
            analyzeImages(newBlobs)
        }
    }

    const analyzeImages = async (blobs: Blob[]) => {
        setIsAnalyzing(true)
        const allScenes: ScannedScene[] = []
        const currentUrls = blobs.map(b => URL.createObjectURL(b))
        setImageUrls(currentUrls)

        try {
            for (let i = 0; i < blobs.length; i++) {
                const blob = blobs[i]
                const formData = new FormData()
                formData.append('file', blob, 'crop.webp')

                const result = await scanSceneImage(formData)
                if (result.error) {
                    notify.error(t('scanFailed', { n: i + 1, reason: t(result.error) }))
                }
                if (result.scenes) {
                    const mappedScenes = result.scenes.map(s => ({ ...s, source_index: i }))

                    // Merge duplicate scenes (same act + scene number)
                    mappedScenes.forEach(scene => {
                        const lastScene = allScenes[allScenes.length - 1]
                        if (lastScene && lastScene.scene_number === scene.scene_number && lastScene.act_number === scene.act_number) {
                            // Merge logic: append name
                            if (scene.name && scene.name !== '???') {
                                const currentName = lastScene.name === '???' ? '' : lastScene.name
                                lastScene.name = currentName ? `${currentName}, ${scene.name}` : scene.name
                            }
                        } else {
                            allScenes.push(scene)
                        }
                    })
                }
            }

            // Auto-renumber or fix acts?
            // For now, raw results.
            setScannedScenes(allScenes)
            setStep('staging')

        } catch (e) {
            console.error(e)
            notify.error(t('analysisFailed'))
        } finally {
            setIsAnalyzing(false)
        }
    }

    const handleSceneUpdate = (index: number, updates: Partial<ScannedScene>) => {
        const newScenes = [...scannedScenes]
        newScenes[index] = { ...newScenes[index], ...updates }
        setScannedScenes(newScenes)
    }

    const handleSceneRemove = (index: number) => {
        setScannedScenes(scannedScenes.filter((_, i) => i !== index))
    }

    const handleReorder = (newScenes: ScannedScene[]) => {
        setScannedScenes(newScenes)
    }

    const handleSave = async () => {
        try {
            // Bulk insert
            const scenesToInsert = scannedScenes.map(s => ({
                performance_id: performanceId,
                scene_number: s.scene_number,
                act_number: s.act_number || 1, // Default to 1 if missing
                name: s.name === '???' ? null : s.name
            }))

            const { error } = await supabase.from('scenes').insert(scenesToInsert)

            if (error) throw error

            notify.success(t('saved'))
            router.refresh()
            onClose()

        } catch (error) {
            console.error(error)
            notify.error(t('saveFailed'))
        }
    }

    const steps = [
        { label: t('stepPhotos') },
        { label: t('stepCrop') },
        { label: t('stepCheck'), note: step === 'staging' ? t('stepCheckNote', { count: scannedScenes.length }) : undefined },
    ]
    const currentStep = step === 'upload' ? 0 : step === 'crop' ? 1 : 2

    return (
        <div className="rk-overlay fixed inset-0 z-50 overflow-y-auto rounded-none">
            <div
                className={`rk-modal ${step === 'staging' ? 'max-w-[1040px]' : ''}`}
                role="dialog"
                aria-modal="true"
                aria-labelledby="scene-import-title"
            >
                <div className="rk-modal__head">
                    <div>
                        <h3 className="rk-modal__title" id="scene-import-title">{t('title')}</h3>
                        <p className="rk-modal__desc">{t('description')}</p>
                    </div>
                </div>

                <div className="rk-modal__body rk-stack">
                    <Steps steps={steps} current={currentStep} label={t('stepsLabel')} />

                    {step === 'upload' && (
                        <label
                            onDragOver={(e) => {
                                e.preventDefault()
                                setIsDragging(true)
                            }}
                            onDragLeave={(e) => {
                                e.preventDefault()
                                setIsDragging(false)
                            }}
                            onDrop={(e) => {
                                e.preventDefault()
                                setIsDragging(false)
                                if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
                                    setImages(Array.from(e.dataTransfer.files))
                                    setStep('crop')
                                    startCropFlow(Array.from(e.dataTransfer.files))
                                }
                            }}
                            className={`rk-drop-zone cursor-pointer ${isDragging ? 'is-over' : ''}`}
                        >
                            <span className="rk-drop-zone__icon"><Camera /></span>
                            <b>{isDragging ? t('dropOver') : t('dropTitle')}</b>
                            <small>{t('dropHint')}</small>
                            <input type="file" multiple accept="image/*" className="sr-only" onChange={handleFileSelect} />
                        </label>
                    )}

                    {step === 'crop' && (
                        <div className="flex flex-col items-center gap-3 py-8 text-center" role="status">
                            <span className="rk-bells" aria-hidden="true"><i></i><i></i><i></i></span>
                            <b className="text-ink">{isAnalyzing ? t('analyzing') : t('preparing')}</b>
                            {isAnalyzing && <p className="rk-hint">{t('analyzingHint')}</p>}
                        </div>
                    )}

                    {step === 'staging' && (
                        <StagingTable
                            scannedScenes={scannedScenes}
                            existingScenes={existingScenes}
                            imageUrls={imageUrls}
                            onUpdate={handleSceneUpdate}
                            onRemove={handleSceneRemove}
                            onReorder={handleReorder}
                        />
                    )}
                </div>

                <div className="rk-modal__foot">
                    <span className="rk-tally mr-auto self-center">
                        {step === 'crop' && t('progress', { current: Math.min(currentCropIndex + 1, images.length), total: images.length })}
                        {step === 'staging' && t('found', { count: scannedScenes.length })}
                    </span>
                    <Button onClick={onClose} variant="ghost">{t('cancel')}</Button>
                    {step === 'staging' && (
                        <Button onClick={handleSave} variant="primary">{t('save')}</Button>
                    )}
                </div>
            </div>

            {isCropping && currentImageSrc && (
                <ImageCropper
                    imageSrc={currentImageSrc}
                    onCropComplete={handleCropComplete}
                    onCancel={() => {
                        setIsCropping(false)
                        setStep('upload') // Reset if cancelled
                    }}
                />
            )}
        </div>
    )
}
