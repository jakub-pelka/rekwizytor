'use client'

import React, { createContext, useContext, useState, useCallback, useEffect } from 'react'
import { GlobalSearchDialog, SearchContext } from './GlobalSearchDialog'

interface GlobalSearchContextType {
    isOpen: boolean
    openSearch: (context?: SearchContext) => void
    closeSearch: () => void
}

const GlobalSearchContext = createContext<GlobalSearchContextType | undefined>(undefined)

export function useGlobalSearch() {
    const context = useContext(GlobalSearchContext)
    if (!context) {
        throw new Error('useGlobalSearch must be used within a GlobalSearchProvider')
    }
    return context
}

export function GlobalSearchProvider({ children }: { readonly children: React.ReactNode }) {
    const [isOpen, setIsOpen] = useState(false)
    const [context, setContext] = useState<SearchContext>(undefined)

    const openSearch = useCallback((newContext?: SearchContext) => {
        setContext(newContext)
        setIsOpen(true)
    }, [])

    const closeSearch = useCallback(() => {
        setIsOpen(false)
        // Delay clearing context slightly to avoid UI flicker during close animation if needed,
        // but for now clearing it immediately or keeping it is fine. 
        // We'll keep it simple.
        setTimeout(() => setContext(undefined), 300)
    }, [])

    // Global keyboard shortcut
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
                e.preventDefault()
                if (isOpen) {
                    closeSearch()
                } else {
                    openSearch()
                }
            }
        }

        globalThis.addEventListener('keydown', handleKeyDown)
        return () => globalThis.removeEventListener('keydown', handleKeyDown)
    }, [isOpen, openSearch, closeSearch])

    return (
        <GlobalSearchContext.Provider value={{ isOpen, openSearch, closeSearch }}>
            {children}
            <GlobalSearchDialog
                isOpen={isOpen}
                onClose={closeSearch}
                initialContext={context}
            />
        </GlobalSearchContext.Provider>
    )
}
