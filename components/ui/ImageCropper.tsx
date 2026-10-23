'use client'

import { useState, useRef, useEffect } from 'react'
import ReactCrop, { Crop, PixelCrop, centerCrop, makeAspectCrop } from 'react-image-crop'
import 'react-image-crop/dist/ReactCrop.css'
import getCroppedImg from '@/utils/canvasUtils'
import { useTranslations } from 'next-intl'
import { Button } from '@/components/ui/Button'
import { notify } from '@/utils/notify'
import { RotateCw } from 'lucide-react'

type Props = {
    imageSrc: string
    onCropComplete: (croppedBlob: Blob) => void
    onCancel: () => void
}

function centerAspectCrop(mediaWidth: number, mediaHeight: number, aspect: number) {
    return centerCrop(
        makeAspectCrop(
            {
                unit: '%',
                width: 90,
            },
            aspect,
            mediaWidth,
            mediaHeight,
        ),
        mediaWidth,
        mediaHeight,
    )
}

export function ImageCropper({ imageSrc, onCropComplete, onCancel }: Props) {
    const t = useTranslations('SceneImport')
    const [crop, setCrop] = useState<Crop>()
    const [completedCrop, setCompletedCrop] = useState<PixelCrop>()
    const [rotation, setRotation] = useState(0)
    const [processing, setProcessing] = useState(false)
    const imgRef = useRef<HTMLImageElement>(null)

    // Setup initial crop when image loads
    function onImageLoad(e: React.SyntheticEvent<HTMLImageElement>) {
        const { width, height } = e.currentTarget
        // Determine landscape or portrait and set a reasonable default
        const initialCrop = centerCrop(
            makeAspectCrop(
                {
                    unit: '%',
                    width: 50, // Default to 50% width
                },
                16 / 9, // Dummy aspect
                width,
                height
            ),
            width,
            height
        )
        // Unlock aspect
        setCrop(initialCrop)
    }

    const handleSave = async () => {
        if (!completedCrop || !imgRef.current) {
            notify.error(t('cropNone'))
            return
        }

        setProcessing(true)
        try {
            // Fix: Scale the crop coordinates to match the natural image size
            // The crop from state is based on the displayed (scaled) image in the UI
            const image = imgRef.current
            const scaleX = image.naturalWidth / image.width
            const scaleY = image.naturalHeight / image.height

            const finalCrop = {
                x: completedCrop.x * scaleX,
                y: completedCrop.y * scaleY,
                width: completedCrop.width * scaleX,
                height: completedCrop.height * scaleY,
            }

            const croppedImage = await getCroppedImg(
                imageSrc,
                finalCrop, // Use scaled crop
                rotation,
                { horizontal: false, vertical: false },
                true // Apply filters
            )
            if (croppedImage) {
                onCropComplete(croppedImage)
            }
        } catch (e) {
            console.error(e)
            notify.error(t('cropFailed'))
        } finally {
            setProcessing(false)
        }
    }

    // Force rotation by recreating the URL or handling in canvas.
    // getCroppedImg handles rotation. But for PREVIEW, standard css rotate is okay.
    // Note: react-image-crop doesn't inherently support rotating the *source* easily without canvas, 
    // so visual rotation might be tricky. We'll rotate the container.

    // Esc działa jak „Anuluj”.
    useEffect(() => {
        const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onCancel() }
        document.addEventListener('keydown', onKey)
        return () => document.removeEventListener('keydown', onKey)
    }, [onCancel])

    return (
        <div className="rk-overlay fixed inset-0 z-[60] overflow-y-auto rounded-none">
            <div className="rk-modal max-w-[1040px]" role="dialog" aria-modal="true" aria-labelledby="image-crop-title">
                <div className="rk-modal__head">
                    <div>
                        <h3 className="rk-modal__title" id="image-crop-title">{t('cropTitle')}</h3>
                        <p className="rk-modal__desc">{t('cropDescription')}</p>
                    </div>
                    <button type="button" className="rk-btn rk-btn--secondary rk-btn--sm" onClick={() => setRotation(r => r + 90)}>
                        <RotateCw />{t('cropRotate')}
                    </button>
                </div>

                <div className="rk-modal__body">
                    <div className="rk-ai__photo flex min-h-[320px] items-center justify-center overflow-auto p-4">
                        <div style={{ transform: `rotate(${rotation}deg)`, transition: 'transform 0.3s' }}>
                            <ReactCrop
                                crop={crop}
                                onChange={(_, percentCrop) => setCrop(percentCrop)}
                                onComplete={(c) => setCompletedCrop(c)}
                                aspect={undefined} // Fully freeform
                                ruleOfThirds
                            >
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img
                                    ref={imgRef}
                                    alt={t('cropAlt')}
                                    src={imageSrc}
                                    onLoad={onImageLoad}
                                    style={{ maxHeight: '60vh', maxWidth: '100%', objectFit: 'contain' }}
                                />
                            </ReactCrop>
                        </div>
                    </div>
                </div>

                <div className="rk-modal__foot">
                    <Button onClick={onCancel} variant="ghost">{t('cropCancel')}</Button>
                    <Button onClick={handleSave} isLoading={processing}>{t('cropConfirm')}</Button>
                </div>
            </div>
        </div>
    )
}
