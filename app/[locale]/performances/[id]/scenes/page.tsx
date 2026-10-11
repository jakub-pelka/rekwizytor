import { redirect } from 'next/navigation'

type Props = {
    params: Promise<{ locale: string; id: string }>
    searchParams: Promise<{ new?: string }>
}

// Akty i sceny edytuje się teraz na jednym ekranie z rekwizytami (Rozpiska); stary adres prowadzi tam.
export default async function ManageScenesPage({ params, searchParams }: Props) {
    const { locale, id } = await params
    const { new: isNew } = await searchParams
    redirect(`/${locale}/performances/${id}/props${isNew === '1' ? '?new=1' : ''}`)
}
