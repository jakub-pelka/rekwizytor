import { redirect } from 'next/navigation'
import { getLocale } from 'next-intl/server'

// Listy zadań należą do terminów; wchodzi się do nich z Kalendarza (README, aktualizacja 8.10).
export default async function ListsPage() {
    redirect(`/${await getLocale()}/calendar`)
}
