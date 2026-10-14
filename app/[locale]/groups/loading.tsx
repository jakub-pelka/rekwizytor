import { Skeleton } from "@/components/ui/Skeleton"

export default function Loading() {
    return (
        <div>
            {/* Mobile Top Brand placeholder */}
            <div className="flex items-center justify-between px-4 py-2 md:hidden">
                <Skeleton className="h-6 w-32 rounded" />
                <div className="flex gap-2">
                    <Skeleton className="h-9 w-9 rounded-full" />
                    <Skeleton className="h-9 w-9 rounded-full" />
                </div>
            </div>

            <div className="mx-auto flex max-w-[1184px] flex-col gap-6 px-4 pt-2 pb-8 md:gap-8 md:px-12 md:pt-8 md:pb-12">
                {/* Header */}
                <header className="rk-page-header flex-wrap items-center border-b-0 pb-0">
                    <Skeleton className="h-9 w-36 rounded" />
                    <div className="hidden md:flex gap-3">
                        <Skeleton className="h-10 w-24 rounded-md" />
                        <Skeleton className="h-10 w-32 rounded-md" />
                    </div>
                </header>

                {/* Search Bar & Filter */}
                <div className="flex gap-3">
                    <Skeleton className="h-10 w-full rounded-md" />
                    <Skeleton className="h-10 w-44 rounded-md hidden md:block shrink-0" />
                </div>

                {/* Rooms Section */}
                <section className="pl-sect">
                    <div className="pl-sect-head pl-sect-head--rule">
                        <Skeleton className="h-6 w-36 rounded" />
                        <Skeleton className="h-4 w-28 rounded" />
                    </div>
                    <ul className="rk-inv-list pl-list space-y-2">
                        {Array.from({ length: 4 }).map((_, i) => (
                            <li key={i} className="relative">
                                <div className="rk-inv-row rk-inv-row--box pointer-events-none">
                                    <Skeleton className="h-10 w-10 rounded-md shrink-0" />
                                    <div className="flex-1 space-y-1.5 ml-2">
                                        <Skeleton className="h-4 w-36 rounded" />
                                        <Skeleton className="h-3 w-48 rounded" />
                                    </div>
                                    <Skeleton className="h-4 w-4 rounded shrink-0 ml-auto" />
                                </div>
                            </li>
                        ))}
                    </ul>
                </section>

                {/* Unassigned Section */}
                <section className="pl-sect">
                    <div className="pl-sect-head pl-sect-head--rule">
                        <Skeleton className="h-6 w-28 rounded" />
                        <Skeleton className="h-4 w-16 rounded" />
                    </div>
                    <ul className="rk-inv-list pl-list space-y-2">
                        {Array.from({ length: 2 }).map((_, i) => (
                            <li key={i} className="relative">
                                <div className="rk-inv-row pointer-events-none">
                                    <Skeleton className="h-10 w-10 rounded-md shrink-0" />
                                    <div className="flex-1 space-y-1.5 ml-2">
                                        <Skeleton className="h-4 w-40 rounded" />
                                        <Skeleton className="h-3 w-32 rounded" />
                                    </div>
                                    <Skeleton className="h-4 w-4 rounded shrink-0 ml-auto" />
                                </div>
                            </li>
                        ))}
                    </ul>
                </section>

                {/* Legend */}
                <div className="flex gap-6 pt-2">
                    <Skeleton className="h-4 w-28 rounded" />
                    <Skeleton className="h-4 w-28 rounded" />
                </div>
            </div>
        </div>
    )
}
