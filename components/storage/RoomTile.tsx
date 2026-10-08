import { Archive, Armchair, Box, Crown, DoorOpen, Drama, Hammer, House, KeyRound, Shirt, Warehouse, type LucideIcon } from 'lucide-react'
import { roomIconName, type RoomIconName } from '@/lib/room-style'

const ICONS: Record<RoomIconName, LucideIcon> = {
    Hammer, Drama, Crown, House, DoorOpen, Armchair, Shirt, KeyRound, Warehouse, Archive, Box,
}

// Kafelek pomieszczenia (karta Magazyn): ikona z nazwy i przygaszony kolor z palety awatarów, oba nadawane automatycznie.
// Biała ikona na ciemnym tle; kolory są stałe i nie zależą od motywu, tak jak awatary.
export function RoomTile({ name, color }: { name: string; color: string }) {
    const Icon = ICONS[roomIconName(name)]
    return (
        <span className="rk-inv-ico" style={{ background: color, color: '#ffffff', border: 0 }} aria-hidden="true">
            <Icon />
        </span>
    )
}
