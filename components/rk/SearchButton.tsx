'use client'

import { Search } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { useGlobalSearch } from '@/components/search/GlobalSearchProvider'
import type { SearchContext } from '@/components/search/GlobalSearchDialog'

// Lupa w górnym wierszu telefonu: pełnoekranowe wyszukiwanie (paleta) z zakresem bieżącego ekranu.
export function SearchButton({ context }: { context?: SearchContext }) {
    const t = useTranslations('Navigation')
    const { openSearch } = useGlobalSearch()
    return (
        <button type="button" className="rk-btn rk-btn--ghost rk-btn--icon" aria-label={t('search')} onClick={() => openSearch(context)}>
            <Search />
        </button>
    )
}
