'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/utils/supabase/client'
import { useRouter } from 'next/navigation'
import { Loader2, Clock, CheckCircle2, ChevronRight, ChevronLeft, AlertCircle, Plus, Trash2, Edit2 } from 'lucide-react'
import DatePicker from 'react-datepicker'
import "react-datepicker/dist/react-datepicker.css"
import { format } from 'date-fns'
import { pl, enUS } from 'date-fns/locale'
import { useTranslations, useLocale } from 'next-intl'
import { Stepper } from '@/components/ui/Stepper'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'

type Props = {
    isOpen: boolean
    onClose: () => void
    performanceId: string
    performanceColor: string | null
    editData?: {
        date: Date
        cast: CastType
        originalDate: string
    }
}

type CastType = 'first' | 'second' | 'other'

type ScheduledItem = {
    id: string
    date: Date
    cast: CastType
}

export function ScheduleShowDialog({ isOpen, onClose, performanceId, performanceColor, editData }: Props) {
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

    const router = useRouter()
    const supabase = createClient()

    // Reset or Initialize when dialog opens or editData changes
    useEffect(() => {
        if (!isOpen) return

        if (editData) {
            setSelectedDate(editData.date)
            setSelectedTime(editData.date)
            setSelectedCast(editData.cast)
            setStep(1)
            setQueue([])
        } else {
            // Default init for create mode
            setStep(1)
            setQueue([])
            setSelectedDate(new Date())
            const d = new Date()
            d.setHours(19, 0, 0, 0)
            setSelectedTime(d)
            setSelectedCast('first')
        }
        setError(null)
        setLoading(false)
    }, [isOpen, editData])

    const handleClose = () => {
        onClose()
    }

    // If editData is provided, we bypass the queue logic for add/next
    // actually, let's unify.
    // If editData, "Next" at step 2 goes to "Review" (Step 3) where we show the single item to be updated.

    const createScheduledItem = (finalDate: Date): ScheduledItem => {
        if (editData) {
            return {
                id: 'edit-item',
                date: finalDate,
                cast: selectedCast
            }
        }

        return {
            id: crypto.randomUUID(),
            date: finalDate,
            cast: selectedCast
        }
    }

    const combineDateAndTime = (): Date => {
        const finalDate = new Date(selectedDate!)
        finalDate.setHours(selectedTime!.getHours())
        finalDate.setMinutes(selectedTime!.getMinutes())
        return finalDate
    }

    const handleNext = () => {
        if (step === 1 && selectedDate) {
            setStep(2)
            return
        }

        if (step === 2 && selectedTime && selectedDate) {
            const finalDate = combineDateAndTime()
            const newItem = createScheduledItem(finalDate)

            if (editData) {
                setQueue([newItem])
            } else {
                setQueue(prev => [...prev, newItem])
            }

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
    }

    const handleBack = () => {
        if (step === 1) {
            if (queue.length > 0) {
                setStep(3)
            } else {
                handleClose()
            }
        } else if (step === 2) {
            setStep(1)
        } else if (step === 3) {
            // If in edit mode, Back from step 3 means re-edit the values
            if (editData) {
                setStep(2)
            } else {
                handleAddAnother()
            }
        }
    }

    const handleSubmit = async () => {
        if (queue.length === 0) return

        setLoading(true)
        setError(null)

        try {
            if (editData) {
                // EDIT MODE UPDATE
                const item = queue[0] // Should be only one
                console.log('Updating show:', { editData, item, performanceId })
                const dateTime = format(item.date, "yyyy-MM-dd'T'HH:mm:ssXXX")

                const { error: updateError } = await supabase
                    .from('scene_checklists')
                    .update({
                        show_date: dateTime,
                        cast: item.cast
                    })
                    .eq('performance_id', performanceId)
                    .eq('show_date', editData.originalDate)

                if (updateError) {
                    console.error('Update failed:', updateError)
                    throw updateError
                }
                console.log('Update successful')

            } else {
                // CREATE MODE
                // Create a SINGLE checklist row for the entire performance run.
                // The new Live View (LiveNoteView) uses this single row to store state for ALL scenes in the 'checklist_state' JSON column.

                // Check if one already exists for this exact time? Ideally we allow multiple if really needed, but likely user just wants one.
                // For now, just insert.

                for (const item of queue) {
                    // Use date-fns format with offset (XXX) to ensure we send local time + offset.
                    // If DB column is TIMESTAMP (no TZ), it stores the local time numbers (17:33).
                    // If DB column is TIMESTAMPTZ, it handles the offset correctly.
                    const dateTime = format(item.date, "yyyy-MM-dd'T'HH:mm:ssXXX")

                    const { error: insertError } = await supabase
                        .from('scene_checklists')
                        .insert({
                            performance_id: performanceId,
                            show_date: dateTime,
                            scene_number: '1', // Default/Dummy value as table requires it or legacy compat
                            scene_name: 'Live View', // Master container
                            is_active: false,
                            cast: item.cast,
                            checklist_state: {} // Initialize empty state
                        })

                    if (insertError) throw insertError
                }
            }

            router.refresh()
            handleClose()
        } catch (err: unknown) {
            console.error(err)
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
        <Modal
            isOpen={isOpen}
            onClose={handleClose}
            title={
                editData ? t('titles.reviewSchedule') : // Or "Edit Schedule" but reusing title is fine or can add key
                    step === 1 ? t('titles.selectDate') :
                        step === 2 ? t('titles.selectTime') :
                            t('titles.reviewSchedule')
            }
            description={
                editData ? "Edit the date and time of the performance." :
                    step === 1 ? t('subtitles.selectDate') :
                        step === 2 ? t('subtitles.selectTime') :
                            t('subtitles.reviewSchedule', { count: queue.length })
            }
            maxWidth="xl"
            className="overflow-visible"
        >
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
                    float: none;
                }
                .react-datepicker__header {
                    background-color: transparent;
                    border-bottom: none;
                    padding-top: 1rem;
                }
                .react-datepicker__current-month {
                    color: #e5e5e5;
                    font-size: 1.2rem;
                    margin-bottom: 0.5rem;
                    font-weight: 600;
                }
                .react-datepicker-time__header {
                    color: #e5e5e5 !important;
                    font-size: 1rem;
                    font-weight: 600;
                    margin-bottom: 0.5rem;
                }
                .react-datepicker__day-name {
                    color: #737373;
                    width: 2.5rem;
                    line-height: 2.5rem;
                    margin: 0.1rem;
                    font-size: 0.8rem;
                }
                .react-datepicker__day {
                    color: #e5e5e5;
                    width: 2.5rem;
                    line-height: 2.5rem;
                    margin: 0.1rem;
                    border-radius: 50%;
                    font-size: 0.9rem;
                    transition: all 0.2s;
                }
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
                    padding: 0.5rem !important;
                    color: #e5e5e5;
                    font-size: 1rem;
                    margin: 0.2rem 0;
                    border-radius: 0.5rem;
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
            `}</style>

            <div className="mt-4">
                {/* Progress Steps */}
                <div className="mb-8 px-4">
                    <Stepper
                        steps={[
                            { id: 1, label: t('steps.date') },
                            { id: 2, label: t('steps.time') },
                            { id: 3, label: t('steps.review') }
                        ]}
                        currentStep={step}
                        onStepClick={(s) => {
                            if (s < step) setStep(s)
                        }}
                        color={performanceColor}
                    />
                </div>

                <div className="min-h-[400px] flex flex-col">
                    <div className="flex-1 flex flex-col items-center justify-center w-full">
                        {step === 1 && (
                            <div className="w-full flex justify-center">
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
                            <div className="w-full max-w-xs flex flex-col gap-6">
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
                                        <div key={item.id} className="bg-neutral-900/50 p-4 rounded-xl border border-neutral-800 flex items-center justify-between group hover:border-neutral-700 transition-colors">
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

                                {!editData && (
                                    <button
                                        onClick={handleAddAnother}
                                        className="w-full py-3 border-2 border-dashed border-neutral-800 rounded-xl text-neutral-400 hover:text-white hover:border-neutral-600 hover:bg-neutral-900/50 transition-all flex items-center justify-center gap-2 font-medium"
                                    >
                                        <Plus className="w-4 h-4" />
                                        {t('addAnother')}
                                    </button>
                                )}

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
                        <Button
                            onClick={handleBack}
                            variant="glassy-secondary"
                            className="flex items-center gap-2"
                        >
                            <ChevronLeft className="w-4 h-4" />
                            {step === 1 && queue.length > 0 ? t('cancel') : t('back')}
                        </Button>

                        {step < 3 ? (
                            <Button
                                onClick={handleNext}
                                disabled={step === 1 ? !selectedDate : !selectedTime}
                                variant="glassy-primary"
                                className="flex items-center gap-2"
                            >
                                {t('nextStep')}
                                <ChevronRight className="w-4 h-4 ml-2" />
                            </Button>
                        ) : (
                            <Button
                                onClick={handleSubmit}
                                disabled={loading || queue.length === 0}
                                variant="glassy-primary"
                                isLoading={loading}
                                className="flex items-center gap-2"
                                style={{
                                    backgroundColor: performanceColor || undefined,
                                    borderColor: performanceColor || undefined,
                                    boxShadow: performanceColor ? `0 4px 10px -1px ${performanceColor}40` : undefined
                                }}
                            >
                                <CheckCircle2 className="w-4 h-4 mr-2" />
                                {editData ? "Update Schedule" : (queue.length > 1 ? t('scheduleShows', { count: queue.length }) : t('confirm'))}
                            </Button>
                        )}
                    </div>
                </div>
            </div>
        </Modal>
    )
}
