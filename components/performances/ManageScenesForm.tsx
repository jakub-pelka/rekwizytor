'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/utils/supabase/client'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/Button'
import { PageHeader } from '@/components/ui/PageHeader'
import { Wand2, ArrowLeft, Layers } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { SceneImportWizard } from './SceneImportWizard'
import { SceneKanbanBoard } from './SceneKanbanBoard'

type Scene = {
    id: string
    scene_number: number
    name: string | null
    act_number: number
    performance_id?: string
}

type Props = {
    performanceId: string
    initialScenes: Scene[]
    performanceColor?: string | null
    pageTitle: string
    pageSubtitle?: string
}

export function ManageScenesForm({ performanceId, initialScenes, performanceColor, pageTitle, pageSubtitle }: Props) {
    const t = useTranslations('ManageScenesForm')
    const [scenes, setScenes] = useState<Scene[]>(initialScenes)
    const [loading, setLoading] = useState(false)
    const [showWizard, setShowWizard] = useState(false)

    const router = useRouter()
    const supabase = createClient()

    const [isMenuOpen, setIsMenuOpen] = useState(false)

    // Check if scenes changed significantly
    const hasChanges = JSON.stringify(initialScenes) !== JSON.stringify(scenes)

    const handleBackWithCheck = () => {
        router.back()
    }





    // Handlers for Kanban
    const handleReorder = async (newScenes: Scene[]) => {
        setScenes(newScenes)
        try {
            const updates = newScenes.map(s => ({
                id: s.id,
                performance_id: performanceId,
                act_number: s.act_number,
                scene_number: s.scene_number,
                name: s.name
            }))
            const { error } = await supabase.from('scenes').upsert(updates)
            if (error) throw error
        } catch (error) {
            console.error('Error reordering scenes:', error)
            alert(t('updateError'))
            router.refresh()
        }
    }

    const handleQuickAdd = async (act: number, name: string) => {
        const actScenes = scenes.filter(s => s.act_number === act)
        const isNewAct = actScenes.length === 0 && act > 0
        const nextNum = act === 0 && actScenes.length === 0 ? 0 : Math.max(0, ...actScenes.map(s => s.scene_number)) + 1
        const tempId = crypto.randomUUID()
        const newScene: Scene = { id: tempId, act_number: act, scene_number: nextNum, name: name, performance_id: performanceId }

        // If creating a new act (not Act 0), also prepare an intermission scene
        const tempIntermissionId = isNewAct ? crypto.randomUUID() : null
        const intermissionScene: Scene | null = isNewAct ? {
            id: tempIntermissionId!,
            act_number: act,
            scene_number: nextNum + 1,
            name: 'Przerwa',
            performance_id: performanceId
        } : null

        setScenes(intermissionScene ? [...scenes, newScene, intermissionScene] : [...scenes, newScene])

        try {
            // Insert the main scene
            const { data, error } = await supabase
                .from('scenes')
                .insert({ performance_id: performanceId, act_number: act, scene_number: nextNum, name: name })
                .select()
                .single()

            if (error) throw error
            
            // Update the temp scene with real ID
            setScenes(prev => prev.map(s => s.id === tempId ? { ...s, id: data.id } : s))

            // If this is a new act, also insert the intermission
            if (isNewAct && intermissionScene) {
                const { data: intermissionData, error: intermissionError } = await supabase
                    .from('scenes')
                    .insert({
                        performance_id: performanceId,
                        act_number: act,
                        scene_number: nextNum + 1,
                        name: 'Przerwa',
                        type: 'intermission'
                    })
                    .select()
                    .single()

                if (intermissionError) {
                    console.error('Error creating intermission:', intermissionError)
                } else {
                    setScenes(prev => prev.map(s => s.id === tempIntermissionId ? { ...s, id: intermissionData.id } : s))
                }
            }

            router.refresh()
        } catch (error) {
            console.error('Error adding scene:', error)
            alert(t('addError'))
            setScenes(scenes)
        }
    }

    const handleUpdate = async (id: string, updates: Partial<Scene>) => {
        setScenes(scenes.map(s => s.id === id ? { ...s, ...updates } : s))
        try {
            const { error } = await supabase.from('scenes').update(updates).eq('id', id)
            if (error) throw error
            router.refresh()
        } catch (error) {
            console.error('Error updating scene:', error)
            alert(t('updateError'))
        }
    }

    // Sync state with server/prop data when router refreshes
    useEffect(() => {
        setScenes(initialScenes)
    }, [initialScenes])

    const renumberScenesInAct = async (actNumber: number, currentScenes: Scene[]) => {
        const actScenes = currentScenes.filter(s => s.act_number === actNumber)
            .sort((a, b) => a.scene_number - b.scene_number)

        const updates = actScenes.map((s, index) => {
            const expectedNumber = actNumber === 0 ? index : index + 1
            if (s.scene_number !== expectedNumber) {
                return { ...s, scene_number: expectedNumber }
            }
            return null
        }).filter(Boolean) as Scene[]

        if (updates.length > 0) {
            // Apply optimistic updates to full state
            setScenes(prev => prev.map(s => {
                const update = updates.find(u => u.id === s.id)
                return update ? update : s
            }))

            try {
                const dbUpdates = updates.map(s => ({
                    id: s.id,
                    scene_number: s.scene_number
                }))

                // Process individually to avoid conflicts or complex upserts, or just use upsert
                for (const update of dbUpdates) {
                    await supabase.from('scenes').update({ scene_number: update.scene_number }).eq('id', update.id)
                }
            } catch (err) {
                console.error("Failed to renumber", err)
            }
        }
    }

    const handleDelete = async (id: string) => {
        if (!confirm(t('deleteConfirm'))) return

        const sceneToDelete = scenes.find(s => s.id === id)
        if (!sceneToDelete) return

        // Optimistic delete
        const newScenes = scenes.filter(s => s.id !== id)
        setScenes(newScenes)

        try {
            const { error } = await supabase.from('scenes').delete().eq('id', id)
            if (error) throw error

            // Renumber remaining scenes in that act
            await renumberScenesInAct(sceneToDelete.act_number, newScenes)

            router.refresh()
        } catch (error) {
            console.error('Error deleting scene:', error)
            alert(t('deleteError'))
            router.refresh()
        }
    }

    const handleDeleteAct = async (actNumber: number) => {
        if (!confirm(t('deleteActConfirm', { actNumber }))) return
        setScenes(scenes.filter(s => s.act_number !== actNumber))
        try {
            const { error } = await supabase.from('scenes').delete().eq('performance_id', performanceId).eq('act_number', actNumber)
            if (error) throw error
            router.refresh()
        } catch (error) {
            console.error('Error deleting act:', error)
            alert(t('deleteError'))
            router.refresh()
        }
    }

    return (
        <div className="space-y-6">


            {showWizard && (
                <SceneImportWizard
                    performanceId={performanceId}
                    existingScenes={scenes.map(s => ({ act: s.act_number, number: s.scene_number }))}
                    onClose={() => setShowWizard(false)}
                />
            )}

            <PageHeader
                title={pageTitle}
                subtitle={pageSubtitle}
                icon={<Layers className="w-6 h-6 text-white" />}
                iconColor="text-purple-400"
            >
                <Button
                    variant="glassy"
                    onClick={() => setShowWizard(true)}
                    leftIcon={<Wand2 className="w-4 h-4" />}
                >
                    {t('aiImport')}
                </Button>
                <Button
                    onClick={handleBackWithCheck}
                    variant="glassy-success"
                    leftIcon={<ArrowLeft className="w-4 h-4" />}
                >
                    {t('done')}
                </Button>
            </PageHeader>

            <SceneKanbanBoard
                scenes={scenes}
                onReorder={handleReorder}
                onUpdate={handleUpdate}
                onRemove={handleDelete}
                onRemoveAct={handleDeleteAct}
                onAdd={handleQuickAdd}
            />
        </div>
    )
}
