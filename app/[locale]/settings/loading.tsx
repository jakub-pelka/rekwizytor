import { Skeleton } from "@/components/ui/Skeleton"

export default function Loading() {
    return (
        <div>
            {/* Mobile Top placeholder */}
            <div className="flex items-center justify-between px-4 py-2 md:hidden">
                <Skeleton className="h-6 w-24 rounded" />
                <Skeleton className="h-6 w-24 rounded" />
            </div>

            <div className="mx-auto max-w-[1184px] px-4 pt-2 pb-12 md:px-12 md:pt-8">
                {/* Header */}
                <header className="mb-6 md:mb-8 space-y-1">
                    <Skeleton className="h-4 w-48 rounded hidden md:block" />
                    <Skeleton className="h-9 w-36 rounded" />
                </header>

                <div className="md:grid md:grid-cols-[180px_minmax(0,1fr)] md:gap-12">
                    {/* Left Settings Navigation */}
                    <nav className="hidden md:block" aria-hidden="true">
                        <ul className="rk-settings-nav sticky top-8 space-y-3">
                            <li><Skeleton className="h-5 w-20 rounded" /></li>
                            <li><Skeleton className="h-5 w-36 rounded" /></li>
                            <li><Skeleton className="h-5 w-32 rounded" /></li>
                            <li><Skeleton className="h-5 w-16 rounded" /></li>
                            <li><Skeleton className="h-5 w-24 rounded" /></li>
                        </ul>
                    </nav>

                    {/* Right Settings Rows */}
                    <div className="flex max-w-[712px] flex-col gap-12">
                        {/* Account Section */}
                        <section className="space-y-4">
                            <div className="pl-sect-head pl-sect-head--rule mb-2">
                                <Skeleton className="h-6 w-20 rounded" />
                            </div>
                            <div className="space-y-4">
                                <div className="rk-setting max-md:flex-wrap">
                                    <div className="rk-setting__text space-y-1">
                                        <Skeleton className="h-4 w-28 rounded" />
                                        <Skeleton className="h-3 w-64 rounded" />
                                    </div>
                                    <div className="rk-setting__control">
                                        <Skeleton className="h-9 w-60 rounded-md" />
                                    </div>
                                </div>
                                <div className="rk-setting max-md:flex-wrap">
                                    <div className="rk-setting__text space-y-1">
                                        <Skeleton className="h-4 w-16 rounded" />
                                        <Skeleton className="h-3 w-72 rounded" />
                                    </div>
                                    <div className="rk-setting__control">
                                        <Skeleton className="h-8 w-20 rounded-md" />
                                    </div>
                                </div>
                                <div className="rk-setting max-md:flex-wrap">
                                    <div className="rk-setting__text space-y-1">
                                        <Skeleton className="h-4 w-24 rounded" />
                                        <Skeleton className="h-3 w-56 rounded" />
                                    </div>
                                    <div className="rk-setting__control">
                                        <Skeleton className="h-8 w-28 rounded-md" />
                                    </div>
                                </div>
                            </div>
                        </section>

                        {/* Look & Motion Section */}
                        <section className="space-y-4">
                            <div className="pl-sect-head pl-sect-head--rule mb-2">
                                <Skeleton className="h-6 w-36 rounded" />
                            </div>
                            <div className="space-y-4">
                                <div className="rk-setting max-md:flex-wrap">
                                    <div className="rk-setting__text space-y-1">
                                        <Skeleton className="h-4 w-16 rounded" />
                                        <Skeleton className="h-3 w-56 rounded" />
                                    </div>
                                    <div className="rk-setting__control">
                                        <Skeleton className="h-9 w-36 rounded-md" />
                                    </div>
                                </div>
                                <div className="rk-setting max-md:flex-wrap">
                                    <div className="rk-setting__text space-y-1">
                                        <Skeleton className="h-4 w-20 rounded" />
                                        <Skeleton className="h-3 w-64 rounded" />
                                    </div>
                                    <div className="rk-setting__control">
                                        <Skeleton className="h-9 w-36 rounded-md" />
                                    </div>
                                </div>
                                <div className="rk-setting max-md:flex-wrap">
                                    <div className="rk-setting__text space-y-1">
                                        <Skeleton className="h-4 w-16 rounded" />
                                    </div>
                                    <div className="rk-setting__control">
                                        <Skeleton className="h-9 w-28 rounded-md" />
                                    </div>
                                </div>
                            </div>
                        </section>

                        {/* Lists Section */}
                        <section className="space-y-4">
                            <div className="pl-sect-head pl-sect-head--rule mb-2">
                                <Skeleton className="h-6 w-32 rounded" />
                            </div>
                            <div className="space-y-4">
                                <div className="rk-setting max-md:flex-wrap">
                                    <div className="rk-setting__text space-y-1">
                                        <Skeleton className="h-4 w-28 rounded" />
                                        <Skeleton className="h-3 w-64 rounded" />
                                    </div>
                                    <div className="rk-setting__control">
                                        <Skeleton className="h-8 w-60 rounded-md" />
                                    </div>
                                </div>
                                <div className="rk-setting max-md:flex-wrap">
                                    <div className="rk-setting__text space-y-1">
                                        <Skeleton className="h-4 w-32 rounded" />
                                        <Skeleton className="h-3 w-48 rounded" />
                                    </div>
                                    <div className="rk-setting__control">
                                        <Skeleton className="h-9 w-36 rounded-md" />
                                    </div>
                                </div>
                            </div>
                        </section>
                    </div>
                </div>
            </div>
        </div>
    )
}
