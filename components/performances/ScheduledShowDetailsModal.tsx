
import { useState, useEffect, useMemo } from 'react'
import { Database } from '@/types/supabase'
import { Calendar, Clock, Users, Edit2, Trash2, ArrowRight } from 'lucide-react'
import { useTimeFormat } from '@/hooks/useTimeFormat'
import { AddToCalendar } from '@/components/ui/AddToCalendar'
import { useTranslations } from 'next-intl'
import { format } from 'date-fns'
import { ScheduleShowDialog } from './ScheduleShowDialog'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { parseNoteToLiveScenes } from '@/utils/note-parser'
import { JSONContent } from '@tiptap/react'
import { createClient } from '@/utils/supabase/client'
import { useRouter } from 'next/navigation'
import { notify } from '@/utils/notify'

type ScheduledShow = Database['public']['Tables']['scene_checklists']['Row']

type Props = {
    isOpen: boolean
    onClose: () => void
    showDate: string
    shows: ScheduledShow[]
    productionTitle: string
    performanceColor?: string | null
    sceneNote?: { content: any } | null
}

export function ScheduledShowDetailsModal({ isOpen, onClose, showDate, shows, productionTitle, performanceColor, sceneNote }: Props) {
    const t = useTranslations('ScheduledShowDetailsModal')
    const { formatTime } = useTimeFormat()
    const supabase = createClient()
    const router = useRouter()

    const [isEditing, setIsEditing] = useState(false)
    const [isDeleting, setIsDeleting] = useState(false)

    // Close editing when modal closes
    useEffect(() => {
        if (!isOpen) setIsEditing(false)
    }, [isOpen])

    if (!shows || shows.length === 0) return null

    const firstShow = shows[0]
    const dateObj = new Date(showDate)

    const editData = useMemo(() => ({
        date: dateObj,
        cast: (firstShow.cast as any) || 'first',
        originalDate: showDate
    }), [dateObj.getTime(), firstShow.cast, showDate])

    // Parse scenes from Note if available, otherwise fallback to empty (or shows if we wanted legacy)
    const scenes = useMemo(() => {
        if (sceneNote?.content) {
            return parseNoteToLiveScenes(sceneNote.content as unknown as JSONContent)
        }
        return []
    }, [sceneNote])

    const handleDelete = async () => {
        if (!confirm(t('confirmDelete'))) return

        setIsDeleting(true)
        try {
            // Delete all shows for this specific date/performance
            // (Assuming showDate is unique enough or we delete by ID if single)
            // But ScheduledShowsList groups by exact show_date string.

            // Delete all shows in this group
            const ids = shows.map(s => s.id)
            const { error } = await supabase
                .from('scene_checklists')
                .delete()
                .in('id', ids)

            if (error) throw error

            // Ten sam termin w nowym modelu (kalendarz i listy zadań): bez tego zostałby w kalendarzu „duch”.
            if (firstShow.performance_id) {
                await supabase.from('show_lists').delete()
                    .eq('performance_id', firstShow.performance_id)
                    .eq('show_date', firstShow.show_date)
            }

            notify.success(t('deleteSuccess'))
            onClose()
            router.refresh()
        } catch (error) {
            console.error('Failed to delete show:', error)
            notify.error(t('deleteError'))
        } finally {
            setIsDeleting(false)
        }
    }

    return (
        <>
            <Modal
                isOpen={isOpen}
                onClose={onClose}
                title={productionTitle}
                description={
                    <span className="uppercase tracking-wider font-medium">
                        {firstShow.type || t('show')}
                    </span>
                }
                maxWidth="md"
            >
                <div className="space-y-6">
                    <div className="space-y-4">
                        <div className="flex items-center gap-3 text-neutral-300">
                            <Calendar className="h-5 w-5 text-neutral-500" />
                            <span>{format(dateObj, 'dd/MM/yyyy')}</span>
                        </div>
                        <div className="flex items-center gap-3 text-neutral-300">
                            <Clock className="h-5 w-5 text-neutral-500" />
                            <span>{formatTime(dateObj)}</span>
                        </div>
                        {firstShow.cast && (
                            <div className="flex items-center gap-3 text-neutral-300">
                                <Users className="h-5 w-5 text-neutral-500" />
                                <span className="capitalize">{firstShow.cast === 'first' ? t('cast.first') : firstShow.cast === 'second' ? t('cast.second') : t('cast.other')}</span>
                            </div>
                        )}
                    </div>

                    <div className="border-t border-neutral-800 pt-4">
                        <h3 className="text-sm font-medium text-white mb-3">{t('sceneBreakdown')}</h3>

                        {scenes.length > 0 ? (
                            <div className="max-h-48 overflow-y-auto space-y-1 pr-2 custom-scrollbar">
                                {scenes.map((scene, idx) => (
                                    <div key={scene.id} className="flex items-center gap-3 text-sm py-1.5 px-2 rounded hover:bg-neutral-800/50">
                                        <div className="flex items-center justify-center w-6 h-6 rounded bg-neutral-800 text-xs font-medium text-neutral-400">
                                            {idx + 1}
                                        </div>
                                        <span className="text-neutral-300 truncate">{scene.name || `Scene ${idx + 1}`}</span>
                                        <span className="text-xs text-neutral-600 ml-auto whitespace-nowrap">
                                            {scene.items.length} items
                                        </span>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <p className="text-sm text-neutral-500 italic">
                                {t ? t('noScenesFound') : 'No scenes found in the Scenic Note.'}
                            </p>
                        )}
                    </div>

                    <div className="pt-2 flex flex-col sm:flex-row gap-3 sm:justify-between sm:items-center">
                        <div className="flex gap-2">
                            <Button
                                onClick={() => setIsEditing(true)}
                                variant="glassy-secondary"
                                className="text-neutral-400 hover:text-white"
                            >
                                <Edit2 className="h-4 w-4 mr-2" />
                                {t('edit')}
                            </Button>
                            <Button
                                onClick={handleDelete}
                                variant="ghost"
                                disabled={isDeleting}
                                className="text-red-400 hover:text-red-300 hover:bg-red-900/20"
                            >
                                <Trash2 className="h-4 w-4" />
                            </Button>
                        </div>


                        <AddToCalendar
                            title={`${productionTitle} - ${firstShow.type || t('show')} `}
                            date={showDate}
                            details={`Cast: ${firstShow.cast || 'N/A'} \nScenes: ${scenes.map(s => s.name).join(', ')} `}
                            className="text-neutral-400 hover:text-white"
                        />
                    </div>
                </div>
            </Modal>

            <ScheduleShowDialog
                isOpen={isEditing}
                onClose={() => {
                    setIsEditing(false)
                }}
                performanceId={firstShow.performance_id || ''}
                performanceColor={performanceColor || null}
                editData={editData}
            />
        </>
    )
}
