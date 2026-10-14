import { Skeleton } from "@/components/ui/Skeleton"

export default function Loading() {
    return (
        <div className="p-4 md:p-10 space-y-6 max-w-7xl mx-auto">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="space-y-2">
                    <Skeleton className="h-8 w-32 rounded" />
                    <Skeleton className="h-4 w-64 rounded" />
                </div>
                <Skeleton className="h-10 w-full md:w-[140px] rounded-lg" />
            </div>

            {/* Search */}
            <Skeleton className="h-12 w-full rounded-xl" />

            {/* Groups */}
            <div className="space-y-8 pt-2">
                <div className="space-y-4">
                    {/* Group Header Button */}
                    <div className="flex items-center gap-3 py-2">
                        <Skeleton className="h-6 w-6 rounded-md shrink-0" />
                        <Skeleton className="h-4 w-40 rounded" />
                        <Skeleton className="h-5 w-8 rounded-full ml-1" />
                    </div>

                    {/* Cards Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {Array.from({ length: 6 }).map((_, i) => (
                            <div key={i} className="rounded-xl border border-[var(--border)]/40 bg-[var(--surface)] p-5 space-y-3">
                                <div className="flex items-start justify-between gap-2">
                                    <Skeleton className="h-5 w-3/4 rounded" />
                                    <Skeleton className="h-4 w-4 rounded shrink-0" />
                                </div>
                                <div className="space-y-1.5">
                                    <Skeleton className="h-3.5 w-full rounded" />
                                    <Skeleton className="h-3.5 w-5/6 rounded" />
                                </div>
                                <div className="pt-3 border-t border-[var(--border)]/20">
                                    <Skeleton className="h-3 w-24 rounded" />
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    )
}
