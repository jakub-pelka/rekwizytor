import { AuthShell } from '@/components/auth/AuthShell'

/**
 * Układ ekranu /witaj: ten sam co logowanie (kurtyna i logo po lewej), kroki zaproszenia po prawej.
 */
export function InviteShell({ children }: { children: React.ReactNode }) {
    return (
        <AuthShell>
            <div className="lg-form lz-form">
                {children}
            </div>
        </AuthShell>
    )
}
