import { useTranslations } from 'next-intl'
import { Button } from '@/components/ui/Button'

type Props = {
    onStart: () => void
    starting: boolean
    /** Start zapisany lokalnie, czeka na sieć. */
    pending: boolean
    className?: string
}

// Cichy „Zaczynamy” (POMYSLY 7): ghost, nie główna akcja ekranu. Na czas pilotażu widzą go wszyscy z prawem zapisu.
// Stan i zapis w useLiveStart (jedna instancja na ekran).
export function LiveStartButton({ onStart, starting, pending, className }: Props) {
    const t = useTranslations('LiveStart')
    return (
        <div className={`flex flex-col items-start gap-1 ${className ?? ''}`}>
            <Button variant="ghost" size="sm" onClick={onStart} isLoading={starting} loadingLabel={t('button')} title={t('hint')}>
                {t('button')}
            </Button>
            {pending && <p className="pl-meta" role="status">{t('pending')}</p>}
        </div>
    )
}
