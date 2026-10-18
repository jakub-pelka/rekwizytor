'use client'

import { Sidebar } from './Sidebar'
import { TabBar } from './rk/TabBar'
import { LegalFooter } from './rk/LegalFooter'
import { usePathname } from 'next/navigation'

import { GlobalSearchProvider } from './search/GlobalSearchProvider'

export function AppShell({ children }: { children: React.ReactNode }) {
    const pathname = usePathname()
    // Check for /login, /auth, /waiting, /rejected, /forgot-password, /update-password or localized versions
    const isAuthPage = /^\/(?:[a-z]{2}\/)?(?:login|auth|waiting|rejected|forgot-password|update-password|witaj|no-theatre)/.test(pathname)

    if (isAuthPage) {
        return <>{children}</>
    }

    return (
        <GlobalSearchProvider>
            <div className="flex min-h-screen bg-background">
                <Sidebar />
                <div className="flex flex-1 flex-col md:pl-[var(--rk-sidebar-w,256px)] min-w-0">
                    <main className="flex-1">
                        {children}
                    </main>
                    {/* Na telefonie stopka stoi nad dolnym menu. */}
                    <LegalFooter className="border-t border-border max-md:pb-24" />
                    <TabBar />
                </div>
            </div>
        </GlobalSearchProvider>
    )
}
