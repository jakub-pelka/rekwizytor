import { redirect } from 'next/navigation'
import { getLocale } from 'next-intl/server'
import { resolveCode } from '@/app/actions/resolve-code'

type Props = { searchParams: Promise<{ code?: string }> }

// Adres z kodu QR na etykiecie przedmiotu albo miejsca (REK-, MSC-): otwiera właściwy ekran
// z podświetleniem, a nieznany kod odsyła do skanera z wpisaniem numeru.
export default async function ResolvePage({ searchParams }: Props) {
    const { code } = await searchParams
    const locale = await getLocale()
    const path = code ? await resolveCode(code) : null
    redirect(path ? `/${locale}${path}` : `/${locale}/scan/label`)
}
