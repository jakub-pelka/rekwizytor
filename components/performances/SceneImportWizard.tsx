'use client'

import { useState } from 'react'
import { Upload, X, Wand2, Loader2, Save } from 'lucide-react'
import { Modal } from '@/components/ui/Modal'
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

    const supabase = createClient()
    const router = useRouter()

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
                    alert(`Error scanning image ${i + 1}: ${result.error}`)
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
            alert('Analysis failed')
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

            router.refresh()
            onClose()

        } catch (error) {
            console.error(error)
            alert('Failed to save scenes. Check for duplicates.')
        }
    }

    return (
        <Modal
            isOpen={true}
            onClose={onClose}
            title={
                <div className="flex items-center gap-2">
                    <Wand2 className="w-5 h-5 text-purple-400" />
                    Import Scenes with AI
                </div>
            }
            description="Scan paper breakdowns using AI vision"
            maxWidth="4xl"
        >
            <div className="flex flex-col h-[70vh] relative">
                <div className="flex-1 overflow-y-auto p-1 relative custom-scrollbar">

                    {step === 'upload' && (
                        <div
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
                            className={`h-64 border-2 border-dashed rounded-xl flex flex-col items-center justify-center transition-all bg-neutral-950 ${isDragging ? 'border-purple-500 bg-purple-500/10' : 'border-neutral-800 hover:border-neutral-600'
                                }`}
                        >
                            <Upload className={`w-10 h-10 mb-4 ${isDragging ? 'text-purple-400' : 'text-neutral-600'}`} />
                            <p className="text-neutral-400 mb-2">
                                {isDragging ? 'Drop images here' : 'Upload photos of your breakdown'}
                            </p>
                            <label className="cursor-pointer">
                                <span className="bg-white text-black px-4 py-2 rounded-md font-medium text-sm hover:bg-neutral-200 transition-colors">
                                    Select Photos
                                </span>
                                <input type="file" multiple accept="image/*" className="hidden" onChange={handleFileSelect} />
                            </label>
                            <p className="text-xs text-neutral-600 mt-4">Supports JPG, PNG, WEBP</p>
                        </div>
                    )}

                    {step === 'crop' && (
                        <div className="flex flex-col items-center justify-center h-full space-y-4">
                            {isAnalyzing ? (
                                <div className="text-center space-y-4">
                                    <div className="w-16 h-16 border-4 border-purple-500/30 border-t-purple-500 rounded-full animate-spin mx-auto"></div>
                                    <h3 className="text-lg font-medium text-white">Analyzing with AI...</h3>
                                    <p className="text-neutral-400">Extracting structure, acts, and names</p>
                                </div>
                            ) : (
                                <div className="text-center">
                                    <p className="text-neutral-400">Preparing images...</p>
                                </div>
                            )}
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

                    {/* Image Cropper Overlay */}
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

                {/* Footer */}
                <div className="pt-4 mt-4 border-t border-neutral-800 flex justify-between items-center">
                    <div className="text-xs text-neutral-500">
                        {step === 'crop' && `Processing image ${currentCropIndex + 1} of ${images.length}`}
                        {step === 'staging' && `${scannedScenes.length} scenes found`}
                    </div>

                    <div className="flex gap-3">
                        <Button
                            onClick={onClose}
                            variant="ghost"
                        >
                            Cancel
                        </Button>
                        {step === 'staging' && (
                            <Button
                                onClick={handleSave}
                                variant="primary"
                                leftIcon={<Save className="w-4 h-4" />}
                            >
                                Save to Performance
                            </Button>
                        )}
                    </div>
                </div>
            </div>
        </Modal>
    )
}
