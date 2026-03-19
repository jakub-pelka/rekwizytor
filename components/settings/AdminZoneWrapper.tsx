'use client'

// We use dynamic import with ssr: false to load the AdminZone
// The catch() ensures that if the folder/file is missing (e.g., in production/git), it won't crash
// UNCOMMENT THE FOLLOWING LINES FOR LOCAL ADMIN DEVELOPMENT
/*
const AdminZoneContent = dynamic(
    () => import('@/components/admin/AdminZone').then(mod => mod.AdminZone).catch(() => () => null),
    { ssr: false }
)
*/
const AdminZoneContent = (_props: { role: string }) => null

interface AdminZoneWrapperProps {
    readonly role: string
}

export function AdminZoneWrapper({ role }: AdminZoneWrapperProps) {
    return <AdminZoneContent role={role} />
}
