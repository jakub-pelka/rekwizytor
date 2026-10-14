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
                <header className="flex flex-col gap-3">
                    <Skeleton className="h-4 w-28 rounded" />
                    <div className="flex flex-wrap items-end justify-between gap-4">
                        <div className="space-y-2">
                            <Skeleton className="h-10 md:h-14 w-60 md:w-80 rounded" />
                            <Skeleton className="h-4 w-48 rounded" />
                        </div>
                        <Skeleton className="h-6 w-36 rounded-full" />
                    </div>
                </header>

                {/* Ticket Progress Bar */}
                <div className="pl-tix">
                    <div className="pl-tix__bar grid grid-cols-3 gap-2">
                        <Skeleton className="h-1.5 w-full rounded-full" />
                        <Skeleton className="h-1.5 w-full rounded-full" />
                        <Skeleton className="h-1.5 w-full rounded-full" />
                    </div>
                    <div className="pl-tix__labels grid grid-cols-3 gap-3 mt-2">
                        {Array.from({ length: 3 }).map((_, i) => (
                            <div key={i} className="space-y-1">
                                <Skeleton className="h-4 w-24 rounded" />
                                <Skeleton className="h-3 w-16 rounded" />
                            </div>
                        ))}
                    </div>
                </div>

                {/* Filter and Grouping Bar */}
                <div className="flex flex-wrap items-center justify-between gap-4">
                    <Skeleton className="h-8 w-52 rounded-md" />
                    <Skeleton className="h-8 w-36 rounded-md" />
                </div>

                {/* Props Checklist Group */}
                <section className="space-y-3">
                    <div className="pl-sect-head pl-sect-head--rule">
                        <Skeleton className="h-5 w-36 rounded" />
                        <Skeleton className="h-4 w-16 rounded" />
                    </div>
                    <ul className="space-y-2">
                        {Array.from({ length: 6 }).map((_, i) => (
                            <li key={i} className="flex items-center gap-3 p-3 rounded-lg border border-[var(--border)]/40 bg-[var(--surface)]">
                                <Skeleton className="h-5 w-5 rounded shrink-0" />
                                <div className="flex-1 space-y-1.5">
                                    <Skeleton className="h-4 w-44 md:w-64 rounded" />
                                    <Skeleton className="h-3 w-36 md:w-48 rounded" />
                                </div>
                                <Skeleton className="h-5 w-20 rounded-full shrink-0" />
                            </li>
                        ))}
                    </ul>
                </section>
            </div>
        </div>
    )
}
