import { useMemo } from 'react'
import { Database } from '@/types/supabase'
import { useTranslations } from 'next-intl'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { Edit2 } from 'lucide-react'
import { getSceneNotesFromContent } from '@/components/notes/scene-utils'

type Scene = Database['public']['Tables']['scenes']['Row']

type Props = {
    readonly isOpen: boolean
    readonly onClose: () => void
    readonly scene: Scene
    readonly sceneNote?: { readonly content: any } | null
    readonly allScenes: Scene[]
}

// Helper to extract text from Tiptap nodes
const getTextFromNodes = (nodes: any[]): string => {
    if (!nodes) return ''
    return nodes.map(node => {
        if (node.type === 'text') return node.text
        if (node.content) return getTextFromNodes(node.content)
        if (node.type === 'listItem' || node.type === 'paragraph') return getTextFromNodes(node.content || []) + '\n'
        return ''
    }).join('').trim()
}

export function SceneDetailModal({ isOpen, onClose, scene, sceneNote, allScenes }: Props) {
    const t = useTranslations('SceneDetailModal')

    // Sanitize scenes for utils
    const sanitizedScenes = useMemo(() =>
        allScenes.map(s => ({
            ...s,
            act_number: s.act_number ?? 1
        })), [allScenes]
    )

    // Extract notes map
    const sceneNotesMap = useMemo(() =>
        sceneNote ? getSceneNotesFromContent(sceneNote.content, sanitizedScenes) : new Map(),
        [sceneNote, sanitizedScenes]
    )

    // Get content for this specific scene
    const noteContent = sceneNotesMap.get(scene.id)
    const noteText = noteContent ? getTextFromNodes(noteContent) : null
    const noteLines = noteText ? noteText.split('\n').filter((l: string) => l.trim().length > 0) : []

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title={t('title')}
            maxWidth="2xl"
        >
            <div className="flex flex-col md:flex-row gap-6">
                {/* Left Column: Scene Info */}
                <div className="md:w-24 shrink-0">
                    <div className="text-4xl font-bold text-white leading-none mb-2">
                        {(scene.scene_number === 0 || scene.type === 'intermission') ? 'P' : scene.scene_number}
                    </div>
                    {(() => {
                        if (scene.scene_number === 0 || scene.type === 'preparation') {
                            return (
                                <div className="text-xs uppercase tracking-wide text-burgundy-light font-bold leading-tight">
                                    {t('preparation', { defaultValue: 'Przygotowanie' })}
                                </div>
                            )
                        }
                        if (scene.type === 'intermission') {
                            return (
                                <div className="text-xs uppercase tracking-wide text-neutral-500 font-bold leading-tight">
                                    {scene.name || 'PRZERWA'}
                                </div>
                            )
                        }
                        if (scene.name) {
                            return (
                                <div className="text-xs uppercase tracking-wide text-neutral-500 leading-tight">
                                    {scene.name}
                                </div>
                            )
                        }
                        return null
                    })()}
                </div>

                {/* Right Column: Scene Content */}
                <div className="flex-1 min-w-0">
                    {noteLines.length > 0 ? (
                        <div className="prose dark:prose-invert max-w-none">
                            <ul className="list-disc list-inside space-y-2 text-neutral-300">
                                {noteLines.map((line: string, i: number) => (
                                    <li key={i} className="text-sm">{line}</li>
                                ))}
                            </ul>
                        </div>
                    ) : (
                        <p className="text-sm text-neutral-500 italic">
                            {t('noContent')}
                        </p>
                    )}
                </div>
            </div>

            {/* Footer with Edit Button */}
            <div className="pt-4 mt-4 border-t border-neutral-800 flex justify-end">
                <Button
                    onClick={() => {
                        // Navigate to task editor
                        globalThis.location.href = `/performances/${scene.performance_id}/tasks/edit`
                    }}
                    variant="glassy-secondary"
                    className="text-neutral-400 hover:text-white"
                >
                    <Edit2 className="h-4 w-4 mr-2" />
                    {t('edit')}
                </Button>
            </div>
        </Modal>
    )
}
