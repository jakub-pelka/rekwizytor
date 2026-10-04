import type { MetadataRoute } from 'next'

// Ikony wg księgi znaku: "any" = znak (rama za kształtem), "maskable" i "monochrome" = zbliżenie 2b.
export default function manifest(): MetadataRoute.Manifest {
    return {
        name: 'Rekwizytor',
        short_name: 'Rekwizytor',
        description: 'Narzędzie dla teatru',
        start_url: '/',
        display: 'standalone',
        background_color: '#0D0B0B',
        theme_color: '#A0232F',
        icons: [
            { src: '/icons/icon-any-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
            { src: '/icons/icon-any-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
            { src: '/icons/icon-maskable-192.png', sizes: '192x192', type: 'image/png', purpose: 'maskable' },
            { src: '/icons/icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
            { src: '/icons/icon-monochrome-512.png', sizes: '512x512', type: 'image/png', purpose: 'monochrome' },
        ],
    }
}
