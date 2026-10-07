import type { SVGProps } from 'react'
import { RK_ICON_PATHS, type RkIconName } from './icon-paths'

// Ikony teatru i rekwizytów z design systemu (karty IkonyTeatru, IkonyRekwizytow).
// Ta sama gramatyka co lucide: siatka 24, kreska 2, zaokrąglone końce; kolor dziedziczy tekst.
export function RkIcon({ name, ...props }: { name: RkIconName } & SVGProps<SVGSVGElement>) {
    return (
        <svg
            xmlns="http://www.w3.org/2000/svg"
            width={24}
            height={24}
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
            {...props}
        >
            {RK_ICON_PATHS[name].map(d => <path key={d} d={d} />)}
        </svg>
    )
}
