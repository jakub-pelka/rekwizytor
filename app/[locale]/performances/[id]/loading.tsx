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
                {/* Header with back link, poster, title and actions */}
                <header className="flex flex-col gap-4">
                    <Skeleton className="h-4 w-28 rounded" />

                    <div className="flex flex-wrap items-end justify-between gap-6">
                        <div className="flex items-end gap-6 min-w-0">
                            <span className="rk-poster rk-poster--md shrink-0">
                                <Skeleton className="h-full w-full rounded" />
                            </span>
                            <div className="flex flex-col gap-2 min-w-0">
                                <Skeleton className="h-10 md:h-14 w-60 md:w-96 rounded" />
                                <Skeleton className="h-4 w-64 md:w-[440px] rounded" />
                            </div>
                        </div>

                        {/* Nearest term & buttons */}
                        <div className="flex w-full flex-wrap items-center justify-between gap-4 pt-2 md:w-auto md:pt-0">
                            <Skeleton className="h-4 w-56 rounded hidden md:block" />
                            <div className="flex w-full items-center justify-end gap-3 md:w-auto">
                                <Skeleton className="h-10 w-24 rounded-md hidden md:block" />
                                <Skeleton className="h-10 w-36 max-md:w-full rounded-md" />
                            </div>
                        </div>
                    </div>
                </header>

                {/* 2-Column Grid: Breakdown on left, aside on right */}
                <div className="grid items-start gap-12 @[760px]:grid-cols-[minmax(0,1fr)_288px] md:grid-cols-[minmax(0,1fr)_288px]">
                    {/* Main Column */}
                    <div className="flex min-w-0 flex-col gap-8">
                        {/* Title & Tabs */}
                        <div className="flex min-h-10 items-center justify-between gap-4">
                            <Skeleton className="h-6 w-24 rounded" />
                            <Skeleton className="h-8 w-44 rounded-md" />
                        </div>

                        {/* Act 1 */}
                        <section className="space-y-3">
                            <div className="pl-sect-head pl-sect-head--rule">
                                <Skeleton className="h-5 w-24 rounded" />
                                <Skeleton className="h-4 w-32 rounded" />
                            </div>
                            <ul className="space-y-2">
                                {Array.from({ length: 4 }).map((_, i) => (
                                    <li key={i} className="flex items-center gap-3 p-3 rounded-lg border border-[var(--border)]/40 bg-[var(--surface)]">
                                        <Skeleton className="h-5 w-8 rounded shrink-0" />
                                        <Skeleton className="h-5 w-44 md:w-64 rounded" />
                                        <Skeleton className="h-5 w-7 rounded-full ml-auto shrink-0" />
                                        <Skeleton className="h-4 w-4 rounded shrink-0" />
                                    </li>
                                ))}
                            </ul>
                        </section>

                        {/* Act 2 */}
                        <section className="space-y-3">
                            <div className="pl-sect-head pl-sect-head--rule">
                                <Skeleton className="h-5 w-24 rounded" />
                                <Skeleton className="h-4 w-28 rounded" />
                            </div>
                            <ul className="space-y-2">
                                {Array.from({ length: 3 }).map((_, i) => (
                                    <li key={i} className="flex items-center gap-3 p-3 rounded-lg border border-[var(--border)]/40 bg-[var(--surface)]">
                                        <Skeleton className="h-5 w-8 rounded shrink-0" />
                                        <Skeleton className="h-5 w-40 md:w-56 rounded" />
                                        <Skeleton className="h-5 w-7 rounded-full ml-auto shrink-0" />
                                        <Skeleton className="h-4 w-4 rounded shrink-0" />
                                    </li>
                                ))}
                            </ul>
                        </section>
                    </div>

                    {/* Aside Column */}
                    <aside className="flex min-w-0 flex-col gap-8">
                        <div className="hidden min-h-10 md:block" aria-hidden="true" />

                        {/* Later terms */}
                        <section className="space-y-3">
                            <div className="flex items-center justify-between pb-2 border-b border-[var(--border)]/40">
                                <Skeleton className="h-4 w-28 rounded" />
                                <Skeleton className="h-4 w-20 rounded" />
                            </div>
                            <ul className="space-y-2">
                                {Array.from({ length: 2 }).map((_, i) => (
                                    <li key={i} className="p-3 rounded-lg border border-[var(--border)]/40 bg-[var(--surface)] space-y-1.5">
                                        <Skeleton className="h-4 w-36 rounded" />
                                        <Skeleton className="h-3 w-24 rounded" />
                                    </li>
                                ))}
                            </ul>
                        </section>

                        {/* Related screens */}
                        <section className="space-y-3">
                            <div className="pb-2 border-b border-[var(--border)]/40">
                                <Skeleton className="h-4 w-24 rounded" />
                            </div>
                            <ul className="space-y-2">
                                {Array.from({ length: 3 }).map((_, i) => (
                                    <li key={i} className="flex items-center justify-between p-3 rounded-lg border border-[var(--border)]/40 bg-[var(--surface)]">
                                        <div className="space-y-1">
                                            <Skeleton className="h-4 w-24 rounded" />
                                            <Skeleton className="h-3 w-28 rounded" />
                                        </div>
                                        <Skeleton className="h-4 w-4 rounded shrink-0" />
                                    </li>
                                ))}
                            </ul>
                        </section>
                    </aside>
                </div>
            </div>
        </div>
    )
}
