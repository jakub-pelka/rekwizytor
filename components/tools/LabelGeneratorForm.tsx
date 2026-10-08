'use client'

import * as React from 'react'
import { useTranslations } from 'next-intl'
import { FileText, Printer, Copy, Monitor, Type, AlignLeft, AlertCircle } from 'lucide-react'
import { useSearchParams } from 'next/navigation'

export function LabelGeneratorForm() {
    const t = useTranslations('Tools.Labels') // Assuming new strings, will fallback or use placeholders

    // Form State
    const [title, setTitle] = React.useState('')
    const [description, setDescription] = React.useState('')
    const [labelSize, setLabelSize] = React.useState<'a4' | 'a5' | 'a6' | 'small'>('a6')
    const [copies, setCopies] = React.useState(1)
    const [fillPage, setFillPage] = React.useState(false)

    // Calculate max copies based on size if fillPage is false
    const getMaxOnPage = (size: string) => {
        switch (size) {
            case 'a4': return 1
            case 'a5': return 2
            case 'a6': return 4
            case 'small': return 10 // Based on existing logic
            default: return 1
        }
    }

    React.useEffect(() => {
        if (fillPage) {
            setCopies(getMaxOnPage(labelSize))
        }
    }, [fillPage, labelSize])

    const handleGenerate = (e: React.FormEvent) => {
        e.preventDefault()
        window.open('/labels?kind=group', '_blank')
    }

    return (
        <div className="w-full max-w-2xl mx-auto space-y-8">
            <div className="text-center space-y-2">
                <h1 className="text-3xl font-bold font-heading">Label Generator</h1>
                <p className="text-neutral-400">Create simplified labels for props, sets, or quick notes.</p>
            </div>

            <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-6 md:p-8 shadow-xl">
                <form onSubmit={handleGenerate} className="space-y-6">
                    {/* Content Section */}
                    <div className="space-y-4">
                        <h2 className="text-sm font-bold uppercase tracking-wider text-neutral-500 flex items-center gap-2">
                            <Type className="w-4 h-4" /> Content
                        </h2>

                        <div className="space-y-2">
                            <label className="text-sm font-medium text-neutral-300">Title</label>
                            <input
                                type="text"
                                value={title}
                                onChange={e => setTitle(e.target.value)}
                                placeholder="e.g. Prop Name / Box #1"
                                className="w-full bg-black/40 border border-neutral-800 rounded-xl px-4 py-3 text-white placeholder:text-neutral-600 focus:outline-none focus:ring-2 focus:ring-accent-main/50 transition-all font-bold text-lg"
                                required
                            />
                        </div>

                        <div className="space-y-2">
                            <label className="text-sm font-medium text-neutral-300">Description / Subtitle</label>
                            <textarea
                                value={description}
                                onChange={e => setDescription(e.target.value)}
                                placeholder="Optional details..."
                                className="w-full bg-black/40 border border-neutral-800 rounded-xl px-4 py-3 text-white placeholder:text-neutral-600 focus:outline-none focus:ring-2 focus:ring-accent-main/50 transition-all min-h-[80px]"
                            />
                        </div>
                    </div>

                    <div className="h-px bg-neutral-800 w-full" />

                    {/* Layout Section */}
                    <div className="space-y-4">
                        <h2 className="text-sm font-bold uppercase tracking-wider text-neutral-500 flex items-center gap-2">
                            <Printer className="w-4 h-4" /> Layout
                        </h2>

                        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                            {[
                                { id: 'a4', label: 'A4', sub: '1 per page' },
                                { id: 'a5', label: 'A5', sub: '2 per page' },
                                { id: 'a6', label: 'A6', sub: '4 per page' },
                                { id: 'small', label: 'Small', sub: '10 per page' },
                            ].map((opt) => (
                                <button
                                    key={opt.id}
                                    type="button"
                                    onClick={() => setLabelSize(opt.id as any)}
                                    className={`relative p-3 rounded-xl border text-left transition-all ${labelSize === opt.id
                                        ? 'bg-accent-main/10 border-accent-main text-white'
                                        : 'bg-black/20 border-neutral-800 text-neutral-400 hover:border-neutral-600'
                                        }`}
                                >
                                    <div className="font-bold text-lg">{opt.label}</div>
                                    <div className="text-xs opacity-70">{opt.sub}</div>
                                </button>
                            ))}
                        </div>

                        <div className="flex items-center gap-4 pt-2">
                            <div className="flex-1 space-y-2">
                                <label className="text-sm font-medium text-neutral-300">Copies</label>
                                <div className="flex items-center gap-3">
                                    <button
                                        type="button"
                                        onClick={() => setCopies(Math.max(1, copies - 1))}
                                        disabled={fillPage}
                                        className="w-10 h-10 rounded-lg bg-neutral-800 flex items-center justify-center hover:bg-neutral-700 disabled:opacity-50"
                                    >
                                        -
                                    </button>
                                    <span className={`w-12 text-center font-mono text-xl ${fillPage ? 'text-neutral-500' : 'text-white'}`}>
                                        {copies}
                                    </span>
                                    <button
                                        type="button"
                                        onClick={() => setCopies(copies + 1)}
                                        disabled={fillPage}
                                        className="w-10 h-10 rounded-lg bg-neutral-800 flex items-center justify-center hover:bg-neutral-700 disabled:opacity-50"
                                    >
                                        +
                                    </button>
                                </div>
                            </div>

                            <div className="flex-1">
                                <button
                                    type="button"
                                    onClick={() => setFillPage(!fillPage)}
                                    className={`w-full p-3 rounded-xl border flex flex-col items-center justify-center gap-1 transition-all ${fillPage
                                        ? 'bg-emerald-500/10 border-emerald-500 text-emerald-400'
                                        : 'bg-black/20 border-neutral-800 text-neutral-400 hover:border-neutral-600'
                                        }`}
                                >
                                    <Copy className="w-5 h-5" />
                                    <span className="text-xs font-bold uppercase">Fill Page</span>
                                </button>
                            </div>
                        </div>
                    </div>

                    <div className="h-4" />

                    <button
                        type="submit"
                        className="w-full py-4 rounded-xl bg-accent-main text-white font-bold text-lg shadow-lg shadow-accent-main/20 hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-3"
                    >
                        <Printer className="w-5 h-5" />
                        Otwórz ekran drukowania etykiet
                    </button>
                </form>
            </div>

            <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-4 flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
                <div className="text-sm text-amber-200/80">
                    <p className="font-bold text-amber-500 mb-1">Printing Tip</p>
                    Make sure to set "Scale" to "100%" or "Actual Size" in your print dialog to ensure correct dimensions.
                </div>
            </div>
        </div>
    )
}
