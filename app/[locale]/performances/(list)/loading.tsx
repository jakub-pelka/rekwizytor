import { Skeleton } from "@/components/ui/Skeleton"

export default function Loading() {
    return (
        <div className="p-4 md:p-10 space-y-6 max-w-7xl mx-auto">
            {/* Page Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="space-y-2">
                    <Skeleton className="h-8 w-48 mb-2" />
                    <Skeleton className="h-4 w-64" />
                </div>
                <div className="grid grid-cols-2 w-full md:flex md:w-auto gap-2">
                    <Skeleton className="h-10 w-full md:w-32 rounded-lg" />
                    <Skeleton className="h-10 w-full md:w-32 rounded-lg" />
                </div>
            </div>

            {/* Filter Bar */}
            <div className="flex items-center gap-4">
                <Skeleton className="h-12 w-full rounded-xl" />
                <Skeleton className="h-12 w-24 shrink-0 rounded-xl" />
            </div>

            {/* List View Skeletons (Default) */}
            <div className="space-y-3">
                {Array.from({ length: 6 }).map((_, i) => (
                    <div key={i} className="flex items-center gap-4 border border-neutral-800 rounded-xl p-3 bg-neutral-900/40">
                        {/* Thumbnail */}
                        <Skeleton className="h-24 w-16 shrink-0 rounded-lg" />

                        {/* Content */}
                        <div className="flex-1 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            <div className="space-y-2">
                                <Skeleton className="h-5 w-48" />
                                <Skeleton className="h-4 w-20 rounded-lg" />
                            </div>
                            <div className="hidden md:block">
                                <Skeleton className="h-4 w-32" />
                            </div>
                        </div>

                        {/* Chevron */}
                        <Skeleton className="h-10 w-10 round-full shrink-0 rounded-full" />
                    </div>
                ))}
            </div>
        </div>
    )
}
