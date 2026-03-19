'use client'

import { useState } from 'react'
import { Upload, Loader2 } from 'lucide-react'
import { createClient } from '@/utils/supabase/client'
import { useRouter } from 'next/navigation'
import { notify } from '@/utils/notify'
import { useTranslations } from 'next-intl'

interface MapUploaderProps {
    readonly locationId: string
}

export function MapUploader({ locationId }: MapUploaderProps) {
    const [uploading, setUploading] = useState(false)
    const supabase = createClient()
    const router = useRouter()
    const t = useTranslations('Notifications')

    const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!e.target.files || e.target.files.length === 0) return

        setUploading(true)
        const file = e.target.files[0]
        const fileExt = file.name.split('.').pop()
        const fileName = `${locationId}-${Math.random()}.${fileExt}`
        const filePath = `${fileName}`

        try {
            const { error: uploadError } = await supabase.storage
                .from('location-maps')
                .upload(filePath, file)

            if (uploadError) throw uploadError

            const { data: { publicUrl } } = supabase.storage
                .from('location-maps')
                .getPublicUrl(filePath)

            const { error: dbError } = await supabase
                .from('locations')
                .update({ map_image_url: publicUrl })
                .eq('id', locationId)

            if (dbError) throw dbError

            notify.success(t('mapUploaded'))
            router.refresh()

        } catch (error) {
            console.error(error)
            notify.error(t('mapUploadError'))
        } finally {
            setUploading(false)
        }
    }

    return (
        <div className="mt-4">
            <label className="flex items-center justify-center w-full px-4 py-8 border-2 border-neutral-700 border-dashed rounded-lg cursor-pointer hover:border-burgundy-main hover:bg-neutral-800 transition-colors">
                <div className="flex flex-col items-center">
                    {uploading ? (
                        <Loader2 className="w-8 h-8 text-burgundy-main animate-spin" />
                    ) : (
                        <Upload className="w-8 h-8 text-neutral-500 mb-2" />
                    )}
                    <span className="text-sm text-neutral-400">
                        {uploading ? 'Wgrywanie...' : 'Kliknij, aby wgrać zdjęcie/plan'}
                    </span>
                    <input
                        type="file"
                        className="hidden"
                        accept="image/*"
                        onChange={handleUpload}
                        disabled={uploading}
                    />
                </div>
            </label>
        </div>
    )
}
