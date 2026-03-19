'use client'

import { Fragment, useState, useRef } from 'react'
import { X, Camera, ScanLine, Loader2, Check, Trash2, Plus } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Modal } from '@/components/ui/Modal'

import { createClient } from '@/utils/supabase/client'
import { useRouter } from 'next/navigation'
import { analyzeGroupImage } from '@/app/actions/vision-group'
import { generateGroupEmbedding } from '@/app/actions/generate-group-embeddings'

interface GroupScannerDialogProps {
    isOpen: boolean
    onClose: () => void
    parentId?: string | null
}

export function GroupScannerDialog({ isOpen, onClose, parentId }: GroupScannerDialogProps) {
    const supabase = createClient()
    const router = useRouter()
    const fileInputRef = useRef<HTMLInputElement>(null)

    // State
    const [step, setStep] = useState<'capture' | 'analyzing' | 'confirm'>('capture')
    const [previewUrl, setPreviewUrl] = useState<string | null>(null)
    const [groups, setGroups] = useState<Array<{ name: string, description: string }>>([])
    const [editingIndex, setEditingIndex] = useState<number | null>(null)
    const [editingValue, setEditingValue] = useState('')
    const [newGroupName, setNewGroupName] = useState('')
    const [isSaving, setIsSaving] = useState(false)

    const reset = () => {
        setStep('capture')
        setPreviewUrl(null)
        setGroups([])
        setEditingIndex(null)
        setEditingValue('')
        setNewGroupName('')
        setIsSaving(false)
    }

    const handleClose = () => {
        reset()
        onClose()
    }

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (!file) return

        // Create Preview
        const url = URL.createObjectURL(file)
        setPreviewUrl(url)
        setStep('analyzing')

        // Convert to Base64
        const reader = new FileReader()
        reader.onloadend = async () => {
            const base64 = reader.result as string

            // Call AI
            const result = await analyzeGroupImage(base64)

            if (result.error) {
                console.error(result.error)
                setGroups([]) // Empty list on error
            } else {
                setGroups(result.groups || [])
            }
            setStep('confirm')
        }
        reader.readAsDataURL(file)
    }

    const handleAddGroup = () => {
        if (!newGroupName.trim()) return

        // Check for duplicates in current list (case-insensitive)
        const existingNames = groups.map(g => g.name.toLowerCase())
        const baseName = newGroupName.trim()
        const lowerBase = baseName.toLowerCase()

        let finalName = baseName
        if (existingNames.includes(lowerBase)) {
            let counter = 1
            while (existingNames.includes(`${lowerBase} #${counter}`)) {
                counter++
            }
            finalName = `${baseName} #${counter}`
        }

        setGroups([...groups, { name: finalName, description: '' }])
        setNewGroupName('')
    }

    const handleRemoveGroup = (index: number) => {
        setGroups(groups.filter((_, i) => i !== index))
    }

    const handleStartEdit = (index: number) => {
        setEditingIndex(index)
        setEditingValue(groups[index].name)
    }

    const handleSaveEdit = () => {
        if (editingIndex !== null && editingValue.trim()) {
            const newGroups = [...groups]
            newGroups[editingIndex] = { ...newGroups[editingIndex], name: editingValue.trim() }
            setGroups(newGroups)
        }
        setEditingIndex(null)
        setEditingValue('')
    }

    const handleCancelEdit = () => {
        setEditingIndex(null)
        setEditingValue('')
    }

    const handleSave = async () => {
        if (groups.length === 0) return

        setIsSaving(true)
        try {
            // Fetch existing group names to check for duplicates
            const { data: existingGroups } = await supabase
                .from('groups')
                .select('name')

            const existingNames = existingGroups?.map(g => g.name.toLowerCase()) || []

            // Helper function to get unique name
            const getUniqueName = (baseName: string, usedNames: string[]): string => {
                const lowerBase = baseName.toLowerCase()
                if (!usedNames.includes(lowerBase)) {
                    return baseName
                }

                let counter = 1
                while (usedNames.includes(`${lowerBase} #${counter}`)) {
                    counter++
                }
                return `${baseName} #${counter}`
            }

            // Track used names to handle duplicates within the current batch
            const usedNames = [...existingNames]

            // Bulk insert all groups with unique names
            const groupsToInsert = groups.map(group => {
                const uniqueName = getUniqueName(group.name, usedNames)
                usedNames.push(uniqueName.toLowerCase())

                return {
                    name: uniqueName,
                    icon: 'Box' // Default icon
                }
            })

            const { data, error } = await supabase
                .from('groups')
                .insert(groupsToInsert)
                .select('id')

            if (error) throw error

            // Generate embeddings in background (don't wait for them)
            if (data && data.length > 0) {
                data.forEach(group => {
                    generateGroupEmbedding(group.id).catch(err =>
                        console.error('Failed to generate embedding:', err)
                    )
                })
            }

            router.refresh()
            handleClose()
        } catch (e) {
            console.error(e)
            setIsSaving(false)
        }
    }

    return (
        <Modal
            isOpen={isOpen}
            onClose={handleClose}
            title={
                <div className="flex items-center justify-center sm:justify-start gap-2">
                    <ScanLine className="w-5 h-5 text-accent-main" />
                    Scan & Add Group
                </div>
            }
            maxWidth="md"
        >
            <div className="text-center sm:text-left sm:mt-2">
                {/* STEP: CAPTURE */}
                {step === 'capture' && (
                    <div className="py-8 space-y-4 text-center">
                        <div className="w-20 h-20 bg-neutral-800 rounded-full flex items-center justify-center mx-auto mb-4 animate-pulse">
                            <Camera className="w-8 h-8 text-neutral-500" />
                        </div>
                        <p className="text-neutral-400 text-sm">
                            Take a photo of items to automatically create a category.
                        </p>
                        <Button
                            variant="glassy-primary"
                            onClick={() => fileInputRef.current?.click()}
                            className="w-full"
                        >
                            Open Camera / Gallery
                        </Button>
                        <input
                            ref={fileInputRef}
                            type="file"
                            accept="image/*"
                            capture="environment"
                            className="hidden"
                            onChange={handleFileChange}
                        />
                    </div>
                )}

                {/* STEP: ANALYZING */}
                {step === 'analyzing' && (
                    <div className="py-8 space-y-4 text-center">
                        {previewUrl && (
                            <div className="w-full h-48 rounded-lg overflow-hidden relative mx-auto mb-4 border border-neutral-700">
                                <img src={previewUrl} alt="Preview" className="w-full h-full object-cover opacity-50" />
                                <div className="absolute inset-0 flex items-center justify-center">
                                    <Loader2 className="w-10 h-10 text-accent-main animate-spin" />
                                </div>
                            </div>
                        )}
                        <p className="text-white font-medium animate-pulse">Analyzing image...</p>
                        <p className="text-neutral-500 text-xs">Identifying objects and suggesting a category name.</p>
                    </div>
                )}

                {/* STEP: CONFIRM & EDIT */}
                {step === 'confirm' && (
                    <div className="space-y-4 text-left max-h-[60vh] overflow-y-auto pr-1">
                        {previewUrl && (
                            <div className="w-full h-32 rounded-lg overflow-hidden border border-neutral-700 mb-4">
                                <img src={previewUrl} alt="Preview" className="w-full h-full object-cover" />
                            </div>
                        )}

                        <div>
                            <label className="block text-sm font-medium text-neutral-400 mb-2">
                                Found Groups ({groups.length})
                            </label>

                            {/* Groups List */}
                            <div className="space-y-2 mb-4">
                                {groups.map((group, index) => (
                                    <div key={index} className="flex items-center gap-2 bg-neutral-900 border border-neutral-700 rounded-md p-2">
                                        {editingIndex === index ? (
                                            <>
                                                <input
                                                    type="text"
                                                    value={editingValue}
                                                    onChange={e => setEditingValue(e.target.value)}
                                                    onKeyDown={e => {
                                                        if (e.key === 'Enter') handleSaveEdit()
                                                        if (e.key === 'Escape') handleCancelEdit()
                                                    }}
                                                    className="flex-1 bg-neutral-800 border border-neutral-600 rounded px-2 py-1 text-white text-sm focus:outline-none focus:ring-2 focus:ring-accent-main"
                                                    autoFocus
                                                />
                                                <button
                                                    onClick={handleSaveEdit}
                                                    className="p-1 text-green-400 hover:text-green-300"
                                                >
                                                    <Check className="h-4 w-4" />
                                                </button>
                                                <button
                                                    onClick={handleCancelEdit}
                                                    className="p-1 text-neutral-400 hover:text-white"
                                                >
                                                    <X className="h-4 w-4" />
                                                </button>
                                            </>
                                        ) : (
                                            <>
                                                <span
                                                    onClick={() => handleStartEdit(index)}
                                                    onKeyDown={(e) => {
                                                        if (e.key === 'Enter' || e.key === ' ') {
                                                            e.preventDefault()
                                                            handleStartEdit(index)
                                                        }
                                                    }}
                                                    role="button"
                                                    tabIndex={0}
                                                    className="flex-1 text-white text-sm cursor-pointer hover:text-accent-main"
                                                >
                                                    {group.name}
                                                </span>
                                                <button
                                                    onClick={() => handleRemoveGroup(index)}
                                                    className="p-1 text-neutral-400 hover:text-red-400"
                                                >
                                                    <Trash2 className="h-4 w-4" />
                                                </button>
                                            </>
                                        )}
                                    </div>
                                ))}
                            </div>

                            {/* Add New Group */}
                            <div className="flex gap-2">
                                <input
                                    type="text"
                                    value={newGroupName}
                                    onChange={e => setNewGroupName(e.target.value)}
                                    onKeyDown={e => e.key === 'Enter' && handleAddGroup()}
                                    placeholder="Add another group..."
                                    className="flex-1 bg-neutral-900 border border-neutral-700 rounded-md py-2 px-3 text-white text-sm placeholder-neutral-500 focus:outline-none focus:ring-2 focus:ring-accent-main"
                                />
                                <Button
                                    variant="secondary"
                                    size="sm"
                                    onClick={handleAddGroup}
                                    disabled={!newGroupName.trim()}
                                >
                                    <Plus className="h-4 w-4" />
                                </Button>
                            </div>
                        </div>

                        <div className="flex gap-2 pt-2">
                            <Button variant="secondary" onClick={reset} className="flex-1">Retake</Button>
                            <Button
                                variant="primary"
                                onClick={handleSave}
                                isLoading={isSaving}
                                disabled={groups.length === 0}
                                className="flex-1"
                            >
                                Add {groups.length} Group{groups.length !== 1 ? 's' : ''}
                            </Button>
                        </div>
                    </div>
                )}
            </div>
        </Modal>
    )
}

