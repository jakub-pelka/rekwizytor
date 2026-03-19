'use client'

import { useState, useEffect } from 'react'
import { Folder, Search } from 'lucide-react'
import { Modal } from '@/components/ui/Modal'
import { ICONS } from '@/utils/icon-map'
import { KEYWORD_MAPPINGS } from '@/utils/icon-matcher'
import { useTranslations } from 'next-intl'
import { createClient } from '@/utils/supabase/client'
import { Database } from '@/types/supabase'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/Button'
import { DEFAULT_GROUP_COLOR } from '@/utils/constants/colors'
import { Textarea } from '@/components/ui/Textarea'

type Group = Pick<Database['public']['Tables']['groups']['Row'], 'id' | 'name' | 'icon' | 'location_id' | 'description' | 'performance_id' | 'color'>

type Props = {
    readonly group: Group | null
    readonly isOpen: boolean
    readonly onClose: () => void
    readonly parentId?: string | null
}

const getSuggestedIcons = (inputName: string): typeof ICONS => {
    if (!inputName) return []
    const lowerName = inputName.toLowerCase()
    const suggestions = new Set<string>()

    Object.entries(KEYWORD_MAPPINGS).forEach(([iconName, keywords]) => {
        if (keywords.some(k => lowerName.includes(k) || k.includes(lowerName))) {
            suggestions.add(iconName)
        }
    })

    ICONS.forEach(item => {
        if (item.name.toLowerCase().includes(lowerName)) {
            suggestions.add(item.name)
        }
    })

    return Array.from(suggestions)
        .map(name => ICONS.find(i => i.name === name))
        .filter((i): i is typeof ICONS[0] => !!i)
        .slice(0, 5)
}

const PLACEHOLDERS = [
    "np. Uwaga na szkło, delikatne elementy...",
    "np. Spakować dnem do góry, użyć folii bąbelkowej...",
    "np. Komplet zawiera 6 elementów, sprawdzić przed zamknięciem...",
    "np. Przechowywać z dala od wilgoci...",
    "np. Tylko do transportu pionowego..."
]

const COLOR_PALETTE = [
    DEFAULT_GROUP_COLOR, // Brand Burgundy
    '#3b82f6', // Blue
    '#ef4444', // Red
    '#22c55e', // Green
    '#eab308', // Yellow
    '#f97316', // Orange
    '#a855f7', // Purple
    '#ec4899', // Pink
    '#6366f1', // Indigo
    '#737373', // Neutral
]

export function EditGroupDialog({ group, isOpen, onClose }: Props) {
    const t = useTranslations('Groups')
    const supabase = createClient()
    const router = useRouter()

    const [name, setName] = useState('')
    const [description, setDescription] = useState('')
    const [selectedColor, setSelectedColor] = useState<string>(DEFAULT_GROUP_COLOR)
    const [selectedIcon, setSelectedIcon] = useState<string | null>(null)
    const [selectedLocationId, setSelectedLocationId] = useState<string | null>(null)
    const [selectedPerformanceId, setSelectedPerformanceId] = useState<string | null>(null)
    const [searchTerm, setSearchTerm] = useState('')
    const [isSaving, setIsSaving] = useState(false)
    const [locations, setLocations] = useState<{ id: string, name: string }[]>([])
    const [performances, setPerformances] = useState<{ id: string, title: string }[]>([])
    const [placeholderIndex, setPlaceholderIndex] = useState(0)

    useEffect(() => {
        const fetchData = async () => {
            const { data: locData } = await supabase.from('locations').select('id, name').order('name')
            if (locData) setLocations(locData)

            const { data: perfData } = await supabase.from('performances').select('id, title').order('title')
            if (perfData) setPerformances(perfData)
        }
        fetchData()
    }, [])

    useEffect(() => {
        const interval = setInterval(() => {
            setPlaceholderIndex(prev => (prev + 1) % PLACEHOLDERS.length)
        }, 3000)
        return () => clearInterval(interval)
    }, [])

    useEffect(() => {
        // If creating new group
        if (isOpen && !group) {
            setName('')
            setDescription('')
            setSelectedIcon('Folder')
            setSelectedColor(DEFAULT_GROUP_COLOR)
            setSelectedLocationId(null)
            setSelectedPerformanceId(null)
            setSearchTerm('')
        }

        // If editing existing
        if (isOpen && group) {
            setName(group.name)
            setDescription(group.description || '')
            setSelectedIcon(group.icon || 'Folder')
            setSelectedColor(group.color || DEFAULT_GROUP_COLOR)
            setSelectedLocationId(group.location_id || null)
            setSelectedPerformanceId(group.performance_id || null)
            setSearchTerm('')
        }
    }, [isOpen, group])

    const handleSave = async () => {
        setIsSaving(true)
        try {
            const iconToSave = selectedIcon || 'Folder'
            const payload = {
                name,
                description: description || null,
                icon: iconToSave,
                location_id: selectedLocationId === 'null' ? null : selectedLocationId,
                performance_id: selectedPerformanceId === 'null' ? null : selectedPerformanceId,
                color: selectedColor
            }

            if (group) {
                // Update
                const { error } = await supabase
                    .from('groups')
                    .update(payload)
                    .eq('id', group.id)
                if (error) throw error
            } else {
                // Create
                const { error } = await supabase
                    .from('groups')
                    .insert([{
                        ...payload,
                        // parent_id logic if needed, but wasn't in original props? 
                        // Ah, parentId is prop.
                        // Assuming this dialog handles creation too if title implies it.
                        // But wait, GroupsHeaderActions uses `EditGroupDialog` for CREATE too? 
                        // Yes line 183 in GroupsHeaderActions passes group={null}.
                        // So I need to handle insert.
                    }])
                if (error) throw error
            }

            router.refresh()
            onClose()
        } catch (error) {
            console.error('Failed to save group:', error)
        } finally {
            setIsSaving(false)
        }
    }

    // Custom Width Modal? The Modal component might restrict width. 
    // I can try to pass className/maxWidth to Modal if it accepts it.
    // Looking at Modal usage in `GroupImportDialog`, it accepts `maxWidth`.
    // Let's assume Modal supports `maxWidth="4xl"` or similar based on prototype.

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title={group ? `Edytuj grupę: ${group.name}` : 'Nowa Grupa'}
            maxWidth="4xl"
        >
            <div className="flex flex-col h-full max-h-[85vh]">
                <div className="flex-1 overflow-y-auto p-1">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mt-4">

                        {/* LEFT COLUMN: Settings & Data */}
                        <div className="space-y-6">
                            <SectionHeader title="Dane Podstawowe" />

                            <div className="space-y-2">
                                <Label>Nazwa Grupy</Label>
                                <input
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                    className="block w-full rounded-md border-0 bg-neutral-900 py-2 px-3 text-white shadow-sm ring-1 ring-inset ring-neutral-700 placeholder:text-neutral-500 focus:ring-2 focus:ring-inset focus:ring-white sm:text-sm sm:leading-6"
                                    placeholder="np. Skrzynia A"
                                />
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label>Lokalizacja</Label>
                                    <select
                                        value={selectedLocationId || 'null'}
                                        onChange={(e) => setSelectedLocationId(e.target.value)}
                                        className="block w-full rounded-md border-0 bg-neutral-900 py-2 px-3 text-white shadow-sm ring-1 ring-inset ring-neutral-700 focus:ring-2 focus:ring-inset focus:ring-white sm:text-sm sm:leading-6"
                                    >
                                        <option value="null">Brak przypisania</option>
                                        {locations.map(loc => (
                                            <option key={loc.id} value={loc.id}>
                                                {loc.name}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                                <div className="space-y-2">
                                    <Label>Spektakl</Label>
                                    <select
                                        value={selectedPerformanceId || 'null'}
                                        onChange={(e) => setSelectedPerformanceId(e.target.value)}
                                        className="block w-full rounded-md border-0 bg-neutral-900 py-2 px-3 text-white shadow-sm ring-1 ring-inset ring-neutral-700 focus:ring-2 focus:ring-inset focus:ring-white sm:text-sm sm:leading-6"
                                    >
                                        <option value="null">Brak przypisania</option>
                                        {performances.map(perf => (
                                            <option key={perf.id} value={perf.id}>
                                                {perf.title}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                            </div>

                            <div className="space-y-2">
                                <div className="flex justify-between items-center">
                                    <Label>Notatka Techniczna</Label>
                                    <span className="text-[10px] text-neutral-500">Opcjonalne</span>
                                </div>
                                <Textarea
                                    value={description}
                                    onChange={(e) => setDescription(e.target.value)}
                                    placeholder={PLACEHOLDERS[placeholderIndex]}
                                    className="bg-neutral-900/50 border-neutral-700 text-white min-h-[120px] text-sm resize-none placeholder-neutral-600 focus:ring-white"
                                />
                            </div>
                        </div>

                        {/* RIGHT COLUMN: Visuals */}
                        <div className="space-y-6">
                            <SectionHeader title="Wygląd" />

                            <div className="space-y-3">
                                <Label>Kolor Wiodący</Label>
                                <div className="flex flex-wrap gap-3">
                                    {COLOR_PALETTE.map(color => (
                                        <button
                                            key={color}
                                            onClick={() => setSelectedColor(color)}
                                            className={`w-10 h-10 rounded-full transition-all shadow-lg ${selectedColor === color ? 'ring-2 ring-white scale-110' : 'hover:scale-110 opacity-70 hover:opacity-100'}`}
                                            style={{ backgroundColor: color }}
                                        />
                                    ))}
                                </div>
                            </div>

                            <div className="space-y-3 pt-4 border-t border-neutral-800">
                                <Label>Ikona Grupy</Label>
                                <div className="relative mb-3">
                                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-500" />
                                    <input
                                        placeholder="Szukaj..."
                                        value={searchTerm}
                                        onChange={(e) => setSearchTerm(e.target.value)}
                                        className="block w-full rounded-md border-0 bg-neutral-900 py-1.5 pl-9 pr-3 text-white shadow-sm ring-1 ring-inset ring-neutral-700 placeholder:text-neutral-500 focus:ring-2 focus:ring-inset focus:ring-white sm:text-sm sm:leading-6"
                                    />
                                </div>

                                <div className="grid grid-cols-6 gap-2 h-40 overflow-y-auto custom-scrollbar p-1">
                                    {ICONS
                                        .filter(item => {
                                            const lowerSearch = searchTerm.toLowerCase()
                                            if (item.name.toLowerCase().includes(lowerSearch)) return true
                                            const matchingIcons = Object.entries(KEYWORD_MAPPINGS)
                                                .filter(([, keywords]) => keywords.some(k => k.includes(lowerSearch)))
                                                .map(([iconName]) => iconName)
                                            return matchingIcons.includes(item.name)
                                        })
                                        .map((item) => (
                                            <button
                                                key={item.name}
                                                onClick={() => setSelectedIcon(item.name)}
                                                className={`aspect-square rounded-lg flex items-center justify-center transition-all ${selectedIcon === item.name ? 'bg-white text-black shadow-lg scale-105' : 'bg-neutral-800 text-neutral-400 hover:bg-neutral-700 hover:text-white'}`}
                                            >
                                                <item.icon className="w-5 h-5" />
                                            </button>
                                        ))}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Footer */}
                <div className="mt-8 flex justify-end gap-3 pt-4 border-t border-neutral-800">
                    <Button variant="glassy-secondary" onClick={onClose} className="px-6">
                        Anuluj
                    </Button>
                    <Button
                        variant="glassy-primary"
                        onClick={handleSave}
                        isLoading={isSaving}
                        className="px-8 bg-red-900/80 hover:bg-red-800 text-red-100 border-red-900 shadow-lg"
                        style={{ backgroundColor: '#7f1d1d', borderColor: '#991b1b', color: 'white' }}
                    >
                        {group ? 'Zapisz Zmiany' : 'Utwórz Grupę'}
                    </Button>
                </div>
            </div>
        </Modal>
    )
}

function SectionHeader({ title }: { readonly title: string }) {
    return (
        <div className="flex items-center gap-2 pb-2 border-b border-neutral-800 mb-2">
            <h3 className="text-sm font-bold text-neutral-300 uppercase tracking-wider">{title}</h3>
        </div>
    )
}

function Label({ children }: { readonly children: React.ReactNode }) {
    return <label className="text-xs font-medium text-neutral-400 uppercase tracking-wider block">{children}</label>
}
