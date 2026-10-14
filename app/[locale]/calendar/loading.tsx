import { Skeleton } from "@/components/ui/Skeleton"

export default function Loading() {
    return (
        <div>
            {/* Mobile Top Brand placeholder */}
            <div className="flex items-center justify-between px-4 py-2 md:hidden">
                <Skeleton className="h-6 w-32 rounded" />
                <Skeleton className="h-9 w-9 rounded-full" />
            </div>

            <div className="mx-auto flex max-w-[1184px] flex-col gap-6 px-4 pt-2 pb-8 md:gap-8 md:px-12 md:pt-8 md:pb-12">
                {/* Header */}
                <header className="rk-page-header flex-wrap items-center border-b-0 pb-0">
                    <Skeleton className="h-9 w-36 rounded" />
                    <Skeleton className="h-10 w-36 rounded-md hidden md:block" />
                </header>

                {/* Tabs & Filters */}
                <div className="flex flex-wrap items-center justify-between gap-4">
                    <div className="flex flex-wrap items-center gap-3 md:gap-6">
                        <Skeleton className="h-8 w-44 rounded-md" />
                        <Skeleton className="h-8 w-60 rounded-md" />
                    </div>
                </div>

                {/* Date navigation bar */}
                <div className="flex items-center justify-between py-2">
                    <Skeleton className="h-7 w-48 rounded" />
                    <div className="flex gap-2">
                        <Skeleton className="h-8 w-8 rounded-md" />
                        <Skeleton className="h-8 w-16 rounded-md" />
                        <Skeleton className="h-8 w-8 rounded-md" />
                    </div>
                </div>

                {/* Timeline Days */}
                <div className="space-y-6 pt-2">
                    {Array.from({ length: 4 }).map((_, i) => (
                        <div key={i} className="flex gap-4">
                            {/* Date column */}
                            <div className="w-14 shrink-0 space-y-1 text-center">
                                <Skeleton className="h-3 w-8 mx-auto rounded" />
                                <Skeleton className="h-6 w-10 mx-auto rounded" />
                            </div>

                            {/* Timeline line & card */}
                            <div className="flex-1 space-y-2 pb-6 border-l-2 border-[var(--border)]/40 pl-6 relative">
                                <div className="absolute -left-[5px] top-1.5 h-2 w-2 rounded-full bg-[var(--border)]" />
                                <div className="p-4 rounded-xl border border-[var(--border)]/40 bg-[var(--surface)] space-y-2">
                                    <div className="flex items-center justify-between">
                                        <Skeleton className="h-5 w-44 rounded" />
                                        <Skeleton className="h-5 w-20 rounded-full" />
                                    </div>
                                    <Skeleton className="h-3.5 w-64 rounded" />
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    )
}
