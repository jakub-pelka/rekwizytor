import { Skeleton } from "@/components/ui/Skeleton"

export default function Loading() {
    return (
        <div className="mx-auto flex max-w-[1184px] flex-col gap-6 px-4 pt-2 pb-8 md:gap-8 md:px-12 md:pt-8 md:pb-12">
            {/* Header / Eyebrow date */}
            <header className="rk-page-header hidden flex-wrap items-center justify-end border-b-0 pb-0 md:flex">
                <Skeleton className="h-5 w-52 rounded" />
            </header>

            {/* Mobile Top Brand placeholder on small screens */}
            <div className="flex items-center justify-between py-2 md:hidden">
                <Skeleton className="h-6 w-36 rounded" />
                <div className="flex gap-2">
                    <Skeleton className="h-9 w-9 rounded-full" />
                    <Skeleton className="h-9 w-9 rounded-full" />
                </div>
            </div>

            <div className="flex flex-col gap-8 md:gap-12">
                {/* Top Row: Hero on left, Storage (mobile) / Week on right */}
                <div className="flex flex-col gap-8 md:flex-row md:flex-wrap md:items-start md:gap-12">
                    {/* Hero section */}
                    <section className="pl-hero !gap-6 max-md:!p-4 md:flex-[2_1_560px]">
                        <div className="flex flex-col gap-3">
                            <div className="flex flex-wrap items-center justify-between gap-3">
                                <Skeleton className="h-4 w-48 rounded" />
                                <Skeleton className="h-6 w-28 rounded-full" />
                            </div>
                            <div className="flex flex-wrap items-end justify-between gap-4">
                                <Skeleton className="h-10 md:h-14 w-56 md:w-80 rounded" />
                                <div className="hidden md:flex flex-col items-end gap-1">
                                    <Skeleton className="h-6 w-24 rounded" />
                                    <Skeleton className="h-3 w-16 rounded" />
                                </div>
                            </div>
                            <Skeleton className="h-3 w-36 rounded md:hidden" />
                        </div>

                        {/* Ticket progress bar */}
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
                                        <Skeleton className="h-3 w-14 rounded" />
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Blocking list or empty notice */}
                        <div className="rounded-lg border border-[var(--border)]/50 p-3 space-y-2">
                            <div className="flex items-center justify-between">
                                <Skeleton className="h-4 w-36 rounded" />
                                <Skeleton className="h-5 w-20 rounded" />
                            </div>
                            <div className="flex items-center gap-2">
                                <Skeleton className="h-4 w-4 rounded" />
                                <Skeleton className="h-4 w-48 rounded" />
                            </div>
                        </div>

                        {/* Footer action bar */}
                        <div className="flex flex-wrap items-center justify-between gap-4 pt-1">
                            <div className="hidden md:flex items-center gap-2">
                                <div className="flex -space-x-1">
                                    <Skeleton className="h-8 w-8 rounded-full" />
                                    <Skeleton className="h-8 w-8 rounded-full" />
                                </div>
                                <Skeleton className="h-3.5 w-32 rounded ml-2" />
                            </div>
                            <div className="flex w-full flex-wrap justify-end gap-3 md:w-auto">
                                <Skeleton className="h-10 w-24 rounded-md hidden md:block" />
                                <Skeleton className="h-10 w-36 max-md:w-full rounded-md" />
                            </div>
                        </div>
                    </section>

                    {/* Mobile Storage */}
                    <div className="md:hidden w-full">
                        <section className="pl-sect">
                            <div className="pl-sect-head pl-sect-head--rule">
                                <Skeleton className="h-6 w-24 rounded" />
                                <Skeleton className="h-4 w-28 rounded" />
                            </div>
                            <div className="pl-figs pl-figs--grid">
                                {Array.from({ length: 4 }).map((_, i) => (
                                    <div key={i} className="pl-fig space-y-2">
                                        <Skeleton className="h-3 w-16 rounded" />
                                        <Skeleton className="h-7 w-12 rounded" />
                                        <Skeleton className="h-3 w-20 rounded" />
                                    </div>
                                ))}
                            </div>
                        </section>
                    </div>

                    {/* Week Schedule section */}
                    <section className="pl-sect md:flex-[1_1_280px]">
                        <div className="pl-sect-head pl-sect-head--rule">
                            <Skeleton className="h-6 w-28 rounded" />
                            <Skeleton className="h-4 w-16 rounded" />
                        </div>
                        <ul className="pl-list pl-list--date space-y-3">
                            {Array.from({ length: 4 }).map((_, i) => (
                                <li key={i} className="flex items-center gap-3">
                                    <div className="flex flex-col items-center gap-1 w-10 shrink-0">
                                        <Skeleton className="h-3 w-6 rounded" />
                                        <Skeleton className="h-5 w-8 rounded" />
                                    </div>
                                    <div className="flex-1 space-y-1">
                                        <Skeleton className="h-4 w-32 rounded" />
                                        <Skeleton className="h-3 w-20 rounded" />
                                    </div>
                                    <Skeleton className="h-5 w-12 rounded-full shrink-0" />
                                </li>
                            ))}
                        </ul>
                        <Skeleton className="h-4 w-24 rounded mt-4" />
                    </section>
                </div>

                {/* Storage section on desktop */}
                <div className="hidden md:block">
                    <section className="pl-sect">
                        <div className="pl-sect-head pl-sect-head--rule">
                            <Skeleton className="h-6 w-24 rounded" />
                            <Skeleton className="h-4 w-36 rounded" />
                        </div>
                        <div className="pl-figs">
                            {Array.from({ length: 4 }).map((_, i) => (
                                <div key={i} className="pl-fig space-y-2">
                                    <Skeleton className="h-3 w-20 rounded" />
                                    <Skeleton className="h-8 w-14 rounded" />
                                    <Skeleton className="h-3 w-24 rounded" />
                                </div>
                            ))}
                        </div>
                    </section>
                </div>

                {/* Bottom Row: Activity log + Mentions */}
                <div className="flex flex-col gap-8 md:flex-row md:flex-wrap md:items-start md:gap-12">
                    {/* Activity */}
                    <section className="pl-sect md:flex-[1_1_380px]">
                        <div className="pl-sect-head pl-sect-head--rule">
                            <Skeleton className="h-6 w-36 rounded" />
                        </div>
                        <ul className="pl-list pl-list--media space-y-4">
                            {Array.from({ length: 3 }).map((_, i) => (
                                <li key={i} className="flex items-start gap-3">
                                    <Skeleton className="h-8 w-8 rounded-full shrink-0" />
                                    <div className="flex-1 space-y-1.5">
                                        <Skeleton className="h-4 w-48 rounded" />
                                        <Skeleton className="h-3 w-16 rounded" />
                                    </div>
                                </li>
                            ))}
                        </ul>
                    </section>

                    {/* Mentions */}
                    <section className="pl-sect md:flex-[1_1_380px]">
                        <div className="pl-sect-head pl-sect-head--rule">
                            <Skeleton className="h-6 w-36 rounded" />
                            <Skeleton className="h-5 w-6 rounded-full" />
                        </div>
                        <ul className="pl-list space-y-3">
                            {Array.from({ length: 2 }).map((_, i) => (
                                <li key={i} className="flex items-start justify-between gap-3">
                                    <Skeleton className="h-4 w-40 rounded" />
                                    <Skeleton className="h-3 w-14 rounded shrink-0" />
                                </li>
                            ))}
                        </ul>
                    </section>
                </div>
            </div>
        </div>
    )
}
