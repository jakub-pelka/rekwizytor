/** Siła hasła 0–4: po punkcie za długość (8+), dużą literę, cyfrę i znak specjalny. Akceptujemy od 2. */
export const MIN_PASSWORD_STRENGTH = 2

export function getPasswordStrength(pass: string): number {
    if (!pass) return 0
    let score = 0
    if (pass.length >= 8) score += 1
    if (/[A-Z]/.test(pass)) score += 1
    if (/[0-9]/.test(pass)) score += 1
    if (/[^A-Za-z0-9]/.test(pass)) score += 1
    return score
}
