/** Wynik sprawdzenia adresu w zaproszeniach (kontrakt akcji lookupInvite / verifyInviteCode, app/actions/invite-entry.ts). */
export type InviteLookup =
    | { state: 'code'; inviterName: string | null; theatreName: string; roleLabel: string; attemptsLeft: number; expiresAt: string }
    | { state: 'locked' | 'expired'; inviterName: string | null; theatreName: string; expiresAt: string }
    | { state: 'revoked'; inviterName: string | null; theatreName: string }
    | { state: 'account' }
    | { state: 'none' }

/** Dane do linijki „Zaprasza cię … ”. */
export type InviteWho = { inviterName: string | null; theatreName: string }

export const CODE_LENGTH = 6
