'use client'

import { useState, use, useEffect } from 'react'
import { createClient } from '@/utils/supabase/client'
import { useRouter } from 'next/navigation'
import { Loader2, Clock, CheckCircle2, ChevronRight, ChevronLeft, AlertCircle, Plus, Trash2, Edit2 } from 'lucide-react'
import DatePicker from 'react-datepicker'
import "react-datepicker/dist/react-datepicker.css"
import { format } from 'date-fns'
import { pl, enUS } from 'date-fns/locale'
import { useTranslations, useLocale } from 'next-intl'
import { Stepper } from '@/components/ui/Stepper'

type Props = {
    params: Promise<{ id: string }>
}

type CastType = 'first' | 'second' | 'other'

type ScheduledItem = {
    id: string
    date: Date
    cast: CastType
}

export default function ScheduleShowPage({ params }: Props) {
    const { id } = use(params)
    const [step, setStep] = useState(1)
    const t = useTranslations('ScheduleShow')
    const locale = useLocale()
    const dateLocale = locale === 'pl' ? pl : enUS

    // Queue of shows to be scheduled
    const [queue, setQueue] = useState<ScheduledItem[]>([])

    // Current selection state
    const [selectedDate, setSelectedDate] = useState<Date | null>(new Date())
    const [selectedTime, setSelectedTime] = useState<Date | null>(() => {
        const d = new Date()
        d.setHours(19, 0, 0, 0) // Default to 19:00
        return d
    })
    const [selectedCast, setSelectedCast] = useState<CastType>('first')

    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [performanceColor, setPerformanceColor] = useState<string | null>(null)

    const router = useRouter()
    const supabase = createClient()

    useEffect(() => {
        const fetchPerformance = async () => {
            const { data } = await supabase
                .from('performances')
                .select('color')
                .eq('id', id)
                .single()

            if (data) {
                setPerformanceColor(data.color)
            }
        }
        fetchPerformance()
    }, [id, supabase])

    const handleNext = () => {
        if (step === 1 && selectedDate) {
            setStep(2)
        } else if (step === 2 && selectedTime && selectedDate) {
            // Combine date and time
            const finalDate = new Date(selectedDate)
            finalDate.setHours(selectedTime.getHours())
            finalDate.setMinutes(selectedTime.getMinutes())

            // Add to queue
            const newItem: ScheduledItem = {
                id: crypto.randomUUID(),
                date: finalDate,
                cast: selectedCast
            }

            setQueue(prev => [...prev, newItem])

            // Go to review step
            setStep(3)
        }
    }

    const handleAddAnother = () => {
        // Reset selection for new item
        setSelectedDate(new Date())
        const defaultTime = new Date()
        defaultTime.setHours(19, 0, 0, 0)
        setSelectedTime(defaultTime)
        setSelectedCast('first')

        // Go back to start
        setStep(1)
    }

    const handleEdit = (item: ScheduledItem) => {
        // Remove from queue
        setQueue(prev => prev.filter(i => i.id !== item.id))

        // Load into selection
        setSelectedDate(item.date)
        setSelectedTime(item.date)
        setSelectedCast(item.cast)

        // Go to start
        setStep(1)
    }

    const handleDelete = (itemId: string) => {
        setQueue(prev => prev.filter(i => i.id !== itemId))
        // If queue becomes empty, we could go back to step 1, 
        // but staying on step 3 with empty state is also fine (or auto-redirect).
        // For now, if empty, we just show empty list and "Add Another" is primary action.
    }

    const handleBack = () => {
        if (step === 1) {
            if (queue.length > 0) {
                // If we have items in queue, back means "Cancel adding this new one" -> Go to review
                setStep(3)
            } else {
                // If queue is empty, back means "Exit page"
                router.back()
            }
        } else if (step === 2) {
            setStep(1)
        } else if (step === 3) {
            // In step 3, back could mean "Add Another" or just do nothing?
            // Let's make it "Add Another" effectively, or just hide back button if queue has items?
            // Actually, let's allow going back to edit the *last added* item? 
            // Or just rely on the "Edit" buttons in the list.
            // Let's make "Back" in step 3 go to Step 1 to add another (same as Add Another button).
            handleAddAnother()
        }
    }

    const handleSubmit = async () => {
        if (queue.length === 0) return

        setLoading(true)
        setError(null)

        try {
            // 1. Fetch performance props and defined scenes (once for all)
            const [propsResult, scenesResult] = await Promise.all([
                supabase
                    .from('performance_props')
                    .select('*')
                    .eq('performance_id', id),
                supabase
                    .from('scenes')
                    .select('*')
                    .eq('performance_id', id)
            ])

            const masterProps = propsResult.data || []
            const definedScenes = scenesResult.data || []

            if (propsResult.error) throw propsResult.error
            if (scenesResult.error) throw scenesResult.error

            // Prepare data structures
            const propsByScene: Record<string, typeof masterProps> = {}
            if (masterProps.length > 0) {
                masterProps.forEach(prop => {
                    const scene = prop.scene_number?.toString() || '1'
                    if (!propsByScene[scene]) {
                        propsByScene[scene] = []
                    }
                    propsByScene[scene].push(prop)
                })
            }

            // Process each scheduled item in the queue
            for (const item of queue) {
                const dateTime = item.date.toISOString()

                if (masterProps.length === 0) {
                    // Create empty checklist if no props
                    const { error: insertError } = await supabase
                        .from('scene_checklists')
                        .insert({
                            performance_id: id,
                            show_date: dateTime,
                            scene_number: '1',
                            scene_name: 'General',
                            is_active: false,
                            cast: item.cast
                        })

                    if (insertError) throw insertError
                } else {
                    // Create checklists for each scene
                    for (const [sceneNum, props] of Object.entries(propsByScene)) {
                        const definedScene = definedScenes.find(s => s.scene_number === parseInt(sceneNum))
                        const sceneName = definedScene?.name || props[0].scene_name

                        const { data: checklist, error: insertError } = await supabase
                            .from('scene_checklists')
                            .insert({
                                performance_id: id,
                                show_date: dateTime,
                                scene_number: sceneNum,
                                scene_name: sceneName,
                                is_active: false,
                                cast: item.cast
                            })
                            .select()
                            .single()

                        if (insertError) throw insertError

                        const checklistItems = props.map(prop => ({
                            scene_checklist_id: checklist.id,
                            performance_prop_id: prop.id,
                            item_name_snapshot: prop.item_name,
                            item_image_url_snapshot: null,
                            is_prepared: false
                        }))

                        const { error: itemsError } = await supabase
                            .from('scene_checklist_items')
                            .insert(checklistItems)

                        if (itemsError) throw itemsError
                    }
                }

                // Zapis do nowego modelu show_lists (zadanie H)
                const { error: showListError } = await supabase
                    .from('show_lists')
                    .upsert({
                        performance_id: id,
                        show_date: dateTime,
                        kind: 'show',
                        cast: item.cast
                    }, { onConflict: 'performance_id,show_date', ignoreDuplicates: true })

                if (showListError) throw showListError
            }

            router.push(`/performances/${id}`)
            router.refresh()
        } catch (err: unknown) {
            if (err instanceof Error) {
                setError(err.message)
            } else {
                setError(t('unknownError'))
            }
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="min-h-screen p-6 md:p-10 flex items-center justify-center">
            <style jsx global>{`
                .react-datepicker {
                    font-family: inherit;
                    background-color: transparent;
                    border: none;
                    color: #e5e5e5;
                    width: 100%;
                    display: flex;
                    justify-content: center;
                }
                .react-datepicker__month-container {
                    width: 100%;
                    max-width: 400px;
                    float: none;
                }
                .react-datepicker__header {
                    background-color: transparent;
                    border-bottom: none;
                    padding-top: 1rem;
                }
                .react-datepicker__current-month {
                    color: #e5e5e5;
                    font-size: 1.5rem;
                    margin-bottom: 1rem;
                    font-weight: 600;
                }
                .react-datepicker-time__header {
                    color: #e5e5e5 !important;
                    font-size: 1.2rem;
                    font-weight: 600;
                    margin-bottom: 1rem;
                }
                .react-datepicker__day-name {
                    color: #737373;
                    width: 3rem;
                    line-height: 3rem;
                    margin: 0.2rem;
                    font-size: 0.9rem;
                }
                .react-datepicker__day {
                    color: #e5e5e5;
                    width: 3rem;
                    line-height: 3rem;
                    margin: 0.2rem;
                    border-radius: 50%;
                    font-size: 1.1rem;
                    transition: all 0.2s;
                }
                /* Improved Hover Visibility */
                .react-datepicker__day:hover {
                    background-color: #404040 !important;
                    color: white !important;
                    cursor: pointer;
                }
                .react-datepicker__day--selected, .react-datepicker__day--keyboard-selected {
                    background-color: ${performanceColor || '#3b82f6'} !important;
                    color: white !important;
                    font-weight: bold;
                }
                .react-datepicker__day--outside-month {
                    color: #404040;
                }
                .react-datepicker__navigation {
                    top: 1.5rem;
                }
                .react-datepicker__navigation-icon::before {
                    border-color: #737373;
                    border-width: 2px 2px 0 0;
                    height: 10px;
                    width: 10px;
                }
                
                /* Time Picker Styling */
                .react-datepicker__time-container {
                    width: 100% !important;
                    border-left: none !important;
                    padding-left: 0 !important;
                }
                .react-datepicker__time-container .react-datepicker__time {
                    background-color: transparent !important;
                }
                .react-datepicker__time-container .react-datepicker__time .react-datepicker__time-box {
                    width: 100% !important;
                    border-radius: 0.5rem;
                }
                .react-datepicker__time-container .react-datepicker__time .react-datepicker__time-box ul.react-datepicker__time-list li.react-datepicker__time-list-item {
                    height: auto !important;
                    padding: 1rem !important;
                    color: #e5e5e5;
                    font-size: 1.2rem;
                    margin: 0.5rem 0;
                    border-radius: 0.5rem;
                    /* Fix border clipping */
                    border: none !important;
                    outline: none !important;
                }
                .react-datepicker__time-container .react-datepicker__time .react-datepicker__time-box ul.react-datepicker__time-list li.react-datepicker__time-list-item:hover {
                    background-color: #262626 !important;
                }
                .react-datepicker__time-container .react-datepicker__time .react-datepicker__time-box ul.react-datepicker__time-list li.react-datepicker__time-list-item--selected {
                    background-color: ${performanceColor || '#3b82f6'} !important;
                    color: white !important;
                }

                /* Custom Scrollbar */
                .custom-scrollbar::-webkit-scrollbar {
                    width: 8px;
                }
                .custom-scrollbar::-webkit-scrollbar-track {
                    background: transparent;
                }
                .custom-scrollbar::-webkit-scrollbar-thumb {
                    background: #404040;
                    border-radius: 10px;
                }
                .custom-scrollbar::-webkit-scrollbar-thumb:hover {
                    background: #555;
                }
            `}</style>

            <div className="w-full max-w-xl">
                {/* Progress Steps */}
                <div className="mb-12">
                    <Stepper
                        steps={[
                            { id: 1, label: t('steps.date') },
                            { id: 2, label: t('steps.time') },
                            { id: 3, label: t('steps.review') }
                        ]}
                        currentStep={step}
                        onStepClick={(s) => {
                            // Only allow going back to completed steps
                            if (s < step) setStep(s)
                        }}
                        color={performanceColor}
                    />
                </div>

                <div className="bg-neutral-900/50 backdrop-blur-xl p-8 rounded-3xl border border-neutral-800 shadow-2xl min-h-[500px] flex flex-col">
                    <div className="mb-6 text-center">
                        <h1 className="text-3xl font-bold text-white mb-2">
                            {step === 1 && t('titles.selectDate')}
                            {step === 2 && t('titles.selectTime')}
                            {step === 3 && t('titles.reviewSchedule')}
                        </h1>
                        <p className="text-neutral-400">
                            {step === 1 && t('subtitles.selectDate')}
                            {step === 2 && t('subtitles.selectTime')}
                            {step === 3 && t('subtitles.reviewSchedule', { count: queue.length })}
                        </p>
                    </div>

                    <div className="flex-1 flex flex-col items-center justify-center w-full">
                        {step === 1 && (
                            <div className="w-full flex justify-center scale-110 transform origin-top">
                                <DatePicker
                                    selected={selectedDate}
                                    onChange={(date) => setSelectedDate(date)}
                                    inline
                                    locale={dateLocale}
                                    calendarClassName="!border-none !bg-transparent"
                                />
                            </div>
                        )}

                        {step === 2 && (
                            <div className="w-full max-w-xs flex flex-col gap-8">
                                <DatePicker
                                    selected={selectedTime}
                                    onChange={(date) => setSelectedTime(date)}
                                    showTimeSelect
                                    showTimeSelectOnly
                                    inline
                                    timeIntervals={15}
                                    timeCaption={t('steps.time')}
                                    dateFormat="h:mm aa"
                                    locale={dateLocale}
                                />

                                <div className="space-y-3">
                                    <label className="text-sm font-medium text-neutral-400 block text-center">{t('selectCast')}</label>
                                    <div className="grid grid-cols-3 gap-2">
                                        {(['first', 'second', 'other'] as const).map((cast) => (
                                            <button
                                                key={cast}
                                                onClick={() => setSelectedCast(cast)}
                                                className={`px-3 py-2 rounded-lg text-sm font-medium transition-all border ${selectedCast === cast
                                                    ? 'text-white shadow-lg'
                                                    : 'bg-neutral-800 text-neutral-400 border-neutral-700 hover:bg-neutral-700 hover:text-white'
                                                    }`}
                                                style={selectedCast === cast ? {
                                                    backgroundColor: performanceColor || '#2563eb',
                                                    borderColor: performanceColor || '#3b82f6',
                                                    boxShadow: `0 10px 15px -3px ${performanceColor || '#1e3a8a'}20`
                                                } : undefined}
                                            >
                                                {cast === 'first' ? t('cast.first') : cast === 'second' ? t('cast.second') : t('cast.other')}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        )}

                        {step === 3 && (
                            <div className="w-full space-y-6">
                                <div className="space-y-3 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
                                    {queue.map((item, index) => (
                                        <div key={item.id} className="bg-neutral-950/50 p-4 rounded-xl border border-neutral-800 flex items-center justify-between group hover:border-neutral-700 transition-colors">
                                            <div className="flex items-center gap-4">
                                                <div
                                                    className="w-10 h-10 rounded-full flex items-center justify-center shrink-0 font-bold text-sm"
                                                    style={{
                                                        backgroundColor: `${performanceColor || '#3b82f6'}20`,
                                                        color: performanceColor || '#3b82f6'
                                                    }}
                                                >
                                                    {index + 1}
                                                </div>
                                                <div>
                                                    <p className="text-white font-medium">
                                                        {format(item.date, 'PPP', { locale: dateLocale })}
                                                    </p>
                                                    <div className="flex items-center gap-2 text-sm text-neutral-400">
                                                        <Clock className="w-3 h-3" />
                                                        {format(item.date, 'p', { locale: dateLocale })}
                                                    </div>
                                                    <div className="mt-1">
                                                        <span className="text-[10px] uppercase tracking-wider px-1.5 py-0.5 rounded border bg-neutral-800 text-neutral-400 border-neutral-700">
                                                            {item.cast === 'first' ? t('cast.firstLabel') : item.cast === 'second' ? t('cast.secondLabel') : t('cast.otherLabel')}
                                                        </span>
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <button
                                                    onClick={() => handleEdit(item)}
                                                    className="p-2 text-neutral-400 hover:text-white hover:bg-neutral-800 rounded-lg transition-colors"
                                                    title={t('edit')}
                                                >
                                                    <Edit2 className="w-4 h-4" />
                                                </button>
                                                <button
                                                    onClick={() => handleDelete(item.id)}
                                                    className="p-2 text-neutral-400 hover:text-red-400 hover:bg-red-900/20 rounded-lg transition-colors"
                                                    title={t('remove')}
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                            </div>
                                        </div>
                                    ))}

                                    {queue.length === 0 && (
                                        <div className="text-center py-8 text-neutral-500 border-2 border-dashed border-neutral-800 rounded-xl">
                                            {t('noShows')}
                                        </div>
                                    )}
                                </div>

                                <button
                                    onClick={handleAddAnother}
                                    className="w-full py-3 border-2 border-dashed border-neutral-800 rounded-xl text-neutral-400 hover:text-white hover:border-neutral-600 hover:bg-neutral-900/50 transition-all flex items-center justify-center gap-2 font-medium"
                                >
                                    <Plus className="w-4 h-4" />
                                    {t('addAnother')}
                                </button>

                                {error && (
                                    <div className="bg-red-900/20 text-red-400 p-4 rounded-xl text-center text-sm border border-red-900/50 flex items-center justify-center gap-2">
                                        <AlertCircle className="w-4 h-4" />
                                        {error}
                                    </div>
                                )}
                            </div>
                        )}
                    </div>

                    <div className="flex justify-between items-center pt-8 mt-auto w-full">
                        <button
                            onClick={handleBack}
                            className={`flex items-center gap-2 px-4 py-2 text-sm font-medium transition-colors text-neutral-400 hover:text-white`}
                        >
                            <ChevronLeft className="w-4 h-4" />
                            {step === 1 && queue.length > 0 ? t('cancel') : t('back')}
                        </button>

                        {step < 3 ? (
                            <button
                                onClick={handleNext}
                                disabled={step === 1 ? !selectedDate : !selectedTime}
                                className="flex items-center gap-2 bg-white text-black px-8 py-3 rounded-xl font-bold hover:bg-neutral-200 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-white/10"
                            >
                                {t('nextStep')}
                                <ChevronRight className="w-4 h-4" />
                            </button>
                        ) : (
                            <button
                                onClick={handleSubmit}
                                disabled={loading || queue.length === 0}
                                className="flex items-center gap-2 text-white px-8 py-3 rounded-xl font-bold transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg"
                                style={{
                                    backgroundColor: performanceColor || '#2563eb',
                                    boxShadow: `0 10px 15px -3px ${performanceColor || '#2563eb'}40`
                                }}
                            >
                                {loading ? (
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                ) : (
                                    <CheckCircle2 className="w-4 h-4" />
                                )}
                                {queue.length > 1 ? t('scheduleShows', { count: queue.length }) : t('confirm')}
                            </button>
                        )}
                    </div>
                </div>
            </div>
        </div>
    )
}
