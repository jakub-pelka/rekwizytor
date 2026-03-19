'use client'

import { useState } from 'react'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { KanbanBoard, KanbanColumn } from '@/components/ui/KanbanBoard'
import { Folder, Trash2, ArrowRight, Save, Plus, GripVertical, icons } from 'lucide-react'
import { createClient } from '@/utils/supabase/client'
import { useRouter } from 'next/navigation'
import { notify } from '@/utils/notify'
import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { getSuggestedIcon } from '@/utils/icon-matcher'
import { Textarea } from '@/components/ui/Textarea'
import { Stepper } from '@/components/ui/Stepper'

interface GroupImportDialogProps {
    readonly isOpen: boolean
    readonly onClose: () => void
    readonly parentId?: string | null
    readonly locations?: readonly { readonly id: string, readonly name: string }[]
}

// Dynamic icon component
const DynamicIcon = ({ name, className }: { readonly name: string, readonly className?: string }) => {
    const Icon = (icons as any)[name] || Folder
    return <Icon className={className} />
}

type ImportItem = {
    id: string
    name: string
    columnId: string // 'input' or locationId
    icon: string
}

const SortableImportItem = ({
    item,
    isOverlay,
    onDelete,
    onUpdate,
    locations
}: {
    readonly item: ImportItem,
    readonly isOverlay?: boolean,
    readonly onDelete: (id: string) => void,
    readonly onUpdate: (id: string, data: Partial<ImportItem>) => void,
    readonly locations: readonly { readonly id: string, readonly name: string }[]
}) => {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging
    } = useSortable({ id: item.id })

    const [isEditing, setIsEditing] = useState(false)
    const [editName, setEditName] = useState(item.name)

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.4 : 1,
    }

    const handleSaveName = () => {
        if (editName.trim()) {
            onUpdate(item.id, { name: editName })
        }
        setIsEditing(false)
    }

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter') handleSaveName()
        if (e.key === 'Escape') {
            setEditName(item.name)
            setIsEditing(false)
        }
    }

    if (isOverlay) {
        return (
            <div className="flex items-center gap-3 p-3 rounded-lg border border-neutral-700 bg-neutral-900 shadow-xl ring-2 ring-white/10 cursor-grabbing w-[300px]">
                <GripVertical className="w-4 h-4 text-white" />
                <DynamicIcon name={item.icon || 'Folder'} className="w-4 h-4 text-neutral-400" />
                <span className="flex-1 truncate text-white font-medium">{item.name}</span>
            </div>
        )
    }

    return (
        <div
            ref={setNodeRef}
            style={style}
            className="group flex items-center gap-3 p-3 rounded-lg border border-neutral-800 bg-neutral-900/90 text-sm shadow-sm hover:border-neutral-700 touch-none"
        >
            <div {...attributes} {...listeners} className="cursor-grab hover:text-white transition-colors p-1 -ml-1 text-neutral-600">
                <GripVertical className="w-4 h-4" />
            </div>

            <DynamicIcon name={item.icon || 'Folder'} className="w-4 h-4 text-neutral-500" />

            <div className="flex-1 min-w-0 flex flex-col gap-1">
                {isEditing ? (
                    <input
                        autoFocus
                        value={editName}
                        onChange={e => setEditName(e.target.value)}
                        onBlur={handleSaveName}
                        onKeyDown={handleKeyDown}
                        className="w-full bg-neutral-950 border border-neutral-700 rounded px-1.5 py-0.5 text-white text-sm focus:outline-none focus:border-amber-500"
                        onPointerDown={e => e.stopPropagation()}
                    />
                ) : (
                    <span
                        onClick={() => {
                            setEditName(item.name)
                            setIsEditing(true)
                        }}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter' || e.key === ' ') {
                                e.preventDefault()
                                setEditName(item.name)
                                setIsEditing(true)
                            }
                        }}
                        role="button"
                        tabIndex={0}
                        className="truncate text-neutral-200 font-medium cursor-text hover:text-white"
                    >
                        {item.name}
                    </span>
                )}
            </div>

            <button
                onClick={(e) => {
                    e.stopPropagation()
                    onDelete(item.id)
                }}
                className="p-1 text-neutral-600 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity"
            >
                <Trash2 className="w-3.5 h-3.5" />
            </button>
        </div>
    )
}




export function GroupImportDialog({ isOpen, onClose, parentId, locations = [] }: GroupImportDialogProps) {
    const [step, setStep] = useState(1)
    const [inputText, setInputText] = useState('')
    const [items, setItems] = useState<ImportItem[]>([])
    const [isSaving, setIsSaving] = useState(false)

    const supabase = createClient()
    const router = useRouter()

    const COL_INPUT = 'input'

    const columns: KanbanColumn[] = [
        { id: COL_INPUT, title: 'Grupy do utworzenia' },
        ...locations.map(l => ({ id: l.id, title: l.name }))
    ]

    const handleParse = () => {
        const lines = inputText.split('\n').map(l => l.trim()).filter(l => l.length > 0)
        const newItems: ImportItem[] = lines.map(line => ({
            id: crypto.randomUUID(),
            name: line,
            columnId: COL_INPUT,
            icon: getSuggestedIcon(line)
        }))
        setItems(prev => [...prev, ...newItems])
        // setInputText('') // Keep text in step 1 if user goes back? Maybe not necessary.
        setStep(2)
    }

    const handleUpdateItem = (id: string, updates: Partial<ImportItem>) => {
        setItems(prev => prev.map(item => {
            if (item.id === id) {
                const newItem = { ...item, ...updates }
                if (updates.name && !updates.icon) {
                    newItem.icon = getSuggestedIcon(updates.name)
                }
                return newItem
            }
            return item
        }))
    }

    const handleSave = async () => {
        if (items.length === 0) return
        setIsSaving(true)

        try {
            const inserts = items.map(item => ({
                name: item.name,
                location_id: item.columnId === COL_INPUT ? null : item.columnId,
                icon: item.icon || 'Folder',
                color: '#000000'
            }))

            const { data, error } = await supabase.from('groups').insert(inserts).select('id')
            if (error) throw error

            if (data && data.length > 0) {
                const { generateGroupEmbedding } = await import('@/app/actions/generate-group-embeddings')
                // Generate embeddings in background using separate calls
                for (const group of data) {
                    generateGroupEmbedding(group.id).catch(err =>
                        console.error('Failed to generate embedding:', err)
                    )
                }
            }

            notify.success(`Utworzono ${items.length} grup`)
            router.refresh()
            onClose()
            setItems([])
            setStep(1)
            setInputText('')
        } catch (error) {
            console.error('Import error:', error)
            notify.error('Błąd podczas tworzenia grup')
        } finally {
            setIsSaving(false)
        }
    }

    const handleDeleteItem = (id: string) => setItems(prev => prev.filter(i => i.id !== id))

    const renderItem = (item: ImportItem, isOverlay?: boolean) => (
        <SortableImportItem
            key={item.id}
            item={item}
            isOverlay={isOverlay}
            onDelete={handleDeleteItem}
            onUpdate={handleUpdateItem}
            locations={locations}
        />
    )

    const renderColumnHeader = (col: KanbanColumn, colItems: ImportItem[]) => (
        <div className="flex items-center justify-between p-3 border-b border-neutral-800 bg-neutral-900/50 rounded-t-lg">
            <span className="font-medium text-neutral-400 text-sm">{col.title}</span>
            <span className="text-xs bg-neutral-800 text-neutral-500 px-2 py-0.5 rounded-full">
                {colItems.length}
            </span>
        </div>
    )

    // Reset step when closed
    if (!isOpen && step !== 1) setStep(1)

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title="Importuj Grupy z Listy"
            maxWidth="4xl"
        >
            <div className="flex flex-col h-[70vh] relative">

                {/* Stepper Header (Visual) */}
                <div className="absolute top-0 right-0 flex items-center gap-1">
                    <div className={`h-1.5 w-8 rounded-full transition-colors ${step >= 1 ? 'bg-white' : 'bg-neutral-800'}`} />
                    <div className={`h-1.5 w-8 rounded-full transition-colors ${step >= 2 ? 'bg-white' : 'bg-neutral-800'}`} />
                </div>

                {/* STEP 1: INPUT */}
                {step === 1 && (
                    <div className="flex flex-col h-full pt-4">
                        <div className="flex-1 relative mb-4">
                            <Textarea
                                placeholder={`Krzesła\nStoły\nLampy\n...`}
                                value={inputText}
                                onChange={(e) => setInputText(e.target.value)}
                                className="w-full h-full bg-neutral-950 border border-neutral-800 rounded-lg p-6 text-sm text-white placeholder-neutral-600 focus:ring-1 focus:ring-amber-500 resize-none font-mono leading-relaxed"
                            />
                        </div>
                        <div className="flex justify-end pt-2">
                            <Button
                                type="button"
                                variant="glassy-primary"
                                onClick={handleParse}
                                disabled={!inputText.trim()}
                                className="px-8 shadow-xl"
                            >
                                Dalej <ArrowRight className="w-4 h-4 ml-2" />
                            </Button>
                        </div>
                    </div>
                )}

                {/* STEP 2: KANBAN */}
                {step === 2 && (
                    <div className="flex flex-col h-full pt-4 overflow-hidden">
                        <div className="flex justify-between items-center mb-4 shrink-0">
                            <p className="text-sm text-neutral-400">Przeciągnij elementy do odpowiednich kolumn lokalizacji</p>
                        </div>

                        <div className="flex-1 min-h-0 border border-neutral-800 rounded-xl bg-neutral-950/30 overflow-hidden relative">
                            <div className="absolute inset-0 overflow-auto p-4">
                                <KanbanBoard
                                    items={items}
                                    columns={columns}
                                    onItemReorder={setItems}
                                    renderItem={renderItem}
                                    renderColumnHeader={renderColumnHeader}
                                />
                            </div>
                        </div>

                        <div className="flex justify-between items-center pt-4 border-t border-neutral-800 mt-4 shrink-0 z-10">
                            <Button variant="ghost" onClick={() => setStep(1)} className="text-neutral-400 hover:text-white">
                                Wróć do listy
                            </Button>
                            <div className="flex gap-3">
                                <Button variant="glassy-secondary" onClick={onClose}>
                                    Anuluj
                                </Button>
                                <Button
                                    variant="glassy-primary"
                                    onClick={handleSave}
                                    disabled={items.length === 0}
                                    isLoading={isSaving}
                                    className="bg-red-900/80 hover:bg-red-800 text-red-100 border-red-900 shadow-xl"
                                    style={{ backgroundColor: '#7f1d1d', borderColor: '#991b1b', color: 'white' }}
                                >
                                    <Save className="w-4 h-4 mr-2" />
                                    Utwórz {items.length} Grup
                                </Button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </Modal>
    )
}
