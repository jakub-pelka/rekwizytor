import { Archive, ClipboardList, MapPin } from 'lucide-react'

// Wpis rekwizytu (karta WpisRekwizytu, .rk-entry): „co” mocno, a „jak”, „gdzie” i „skąd” cicho,
// każde z ikoną i w tym samym stylu. Nic nie ucinamy. Odhaczony wpis zwija się do nazwy
// (robi to CSS, gdy przed .rk-entry stoi zaznaczony input).
export function PropEntry({
    name, how, where, from, small = false,
}: {
    name: string
    how?: string | null
    where?: string | null
    from?: string | null
    small?: boolean
}) {
    return (
        <span className={`rk-entry ${small ? 'rk-entry--sm' : ''}`}>
            <span className="rk-entry__name">{name}</span>
            {how && <span className="rk-entry__how"><ClipboardList /><span>{how}</span></span>}
            {where && <span className="rk-entry__where"><MapPin /><span>{where}</span></span>}
            {from && <span className="rk-entry__from"><Archive /><span>{from}</span></span>}
        </span>
    )
}
