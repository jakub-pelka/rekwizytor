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
                {/* Page Header */}
                <header className="rk-page-header flex-wrap items-center border-b-0 pb-0">
                    <Skeleton className="h-9 w-40 rounded" />
                    <Skeleton className="h-10 w-40 rounded-md hidden md:block" />
                </header>

                {/* Filter Bar */}
                <div className="flex flex-wrap items-center gap-3 md:justify-between">
                    <Skeleton className="h-9 w-36 rounded-md w-full md:order-2 md:w-44" />
                    <div className="pl-chips md:order-1 flex gap-2">
                        <Skeleton className="h-8 w-28 rounded-full" />
                        <Skeleton className="h-8 w-24 rounded-full max-md:hidden" />
                        <Skeleton className="h-8 w-24 rounded-full max-md:hidden" />
                    </div>
                </div>

                {/* Playing section */}
                <section className="pl-sect">
                    <div className="pl-sect-head pl-sect-head--rule">
                        <Skeleton className="h-6 w-44 rounded" />
                        <Skeleton className="h-4 w-20 rounded" />
                    </div>
                    <ul className="pl-list sl-list space-y-2">
                        {Array.from({ length: 3 }).map((_, i) => (
                            <li key={i}>
                                <div className="sl-row pointer-events-none">
                                    <span className="rk-poster">
                                        <Skeleton className="h-full w-full rounded" />
                                    </span>
                                    <span className="pl-main space-y-1.5">
                                        <Skeleton className="h-5 w-44 md:w-56 rounded" />
                                        <Skeleton className="h-3.5 w-52 md:w-72 rounded" />
                                    </span>
                                    <span className="sl-when hidden md:block space-y-1">
                                        <Skeleton className="h-3 w-16 rounded" />
                                        <Skeleton className="h-3.5 w-32 rounded" />
                                    </span>
                                    <span className="hidden md:inline-flex">
                                        <Skeleton className="h-6 w-24 rounded-full" />
                                    </span>
                                    <Skeleton className="h-5 w-5 rounded shrink-0 ml-auto md:ml-0" />
                                </div>
                            </li>
                        ))}
                    </ul>
                </section>

                {/* Preparing section */}
                <section className="pl-sect">
                    <div className="pl-sect-head pl-sect-head--rule">
                        <Skeleton className="h-6 w-36 rounded" />
                        <Skeleton className="h-4 w-16 rounded" />
                    </div>
                    <ul className="pl-list sl-list space-y-2">
                        {Array.from({ length: 2 }).map((_, i) => (
                            <li key={i}>
                                <div className="sl-row pointer-events-none">
                                    <span className="rk-poster">
                                        <Skeleton className="h-full w-full rounded" />
                                    </span>
                                    <span className="pl-main space-y-1.5">
                                        <Skeleton className="h-5 w-40 md:w-48 rounded" />
                                        <Skeleton className="h-3.5 w-48 md:w-60 rounded" />
                                    </span>
                                    <span className="hidden md:inline-flex">
                                        <Skeleton className="h-6 w-24 rounded-full" />
                                    </span>
                                    <Skeleton className="h-5 w-5 rounded shrink-0 ml-auto md:ml-0" />
                                </div>
                            </li>
                        ))}
                    </ul>
                </section>
            </div>
        </div>
    )
}
