import { createCipheriv, createDecipheriv, createHmac, randomBytes, randomInt, timingSafeEqual } from 'node:crypto'

// Kod zaproszenia (6 cyfr). Tylko serwer: nie importuj tego pliku z komponentów klienta (korzysta z node:crypto
// i sekretu INVITE_CODE_SECRET). Kod w bazie: code_enc = AES-256-GCM (do podglądu dla kierownika), code_mac = HMAC
// (do sprawdzania kodu wpisanego przez zapraszaną osobę).

export const INVITE_TTL_DAYS = 7
export const MAX_ATTEMPTS = 5
export const INVITE_SECRET_ERROR = 'Brak INVITE_CODE_SECRET (32 bajty base64).'

function secret(): Buffer {
    const raw = process.env.INVITE_CODE_SECRET
    const key = raw ? Buffer.from(raw, 'base64') : null
    if (!key || key.length !== 32) throw new Error(INVITE_SECRET_ERROR)
    return key
}

/** 6 cyfr 0–9, losowane kryptograficznie (z zerami wiodącymi). */
export function generateCode(): string {
    return String(randomInt(0, 1_000_000)).padStart(6, '0')
}

/** „482913” → „482 913”. */
export function formatCode(code: string): string {
    return `${code.slice(0, 3)} ${code.slice(3)}`
}

/** Usuwa wszystko poza cyframi; zwraca kod tylko wtedy, gdy ma dokładnie 6 cyfr. */
export function normalizeCode(input: string): string | null {
    const digits = (input ?? '').replace(/\D/g, '')
    return digits.length === 6 ? digits : null
}

/** base64(iv[12] | tag[16] | ciphertext). */
export function encryptCode(code: string): string {
    const iv = randomBytes(12)
    const cipher = createCipheriv('aes-256-gcm', secret(), iv, { authTagLength: 16 })
    const ct = Buffer.concat([cipher.update(code, 'utf8'), cipher.final()])
    return Buffer.concat([iv, cipher.getAuthTag(), ct]).toString('base64')
}

export function decryptCode(enc: string): string {
    const buf = Buffer.from(enc, 'base64')
    if (buf.length < 12 + 16 + 1) throw new Error('Uszkodzony kod zaproszenia.')
    const decipher = createDecipheriv('aes-256-gcm', secret(), buf.subarray(0, 12), { authTagLength: 16 })
    decipher.setAuthTag(buf.subarray(12, 28))
    return Buffer.concat([decipher.update(buf.subarray(28)), decipher.final()]).toString('utf8')
}

/** HMAC-SHA256(klucz, `${theatre_id}:${user_id}:${kod}`) jako hex. */
export function macCode(theatreId: string, userId: string, code: string): string {
    return createHmac('sha256', secret()).update(`${theatreId}:${userId}:${code}`).digest('hex')
}

/** Czy wpisany tekst jest właściwym kodem (porównanie stałoczasowe). */
export function checkCode(theatreId: string, userId: string, input: string, mac: string): boolean {
    const code = normalizeCode(input)
    if (!code) return false
    const expected = Buffer.from(macCode(theatreId, userId, code), 'hex')
    const actual = Buffer.from(mac ?? '', 'hex')
    if (expected.length !== actual.length) return false
    return timingSafeEqual(expected, actual)
}

/** Skrót adresu IP do limitu prób: HMAC z kluczem, żeby w bazie nie leżał sam adres. */
export function hashIp(ip: string): string {
    return createHmac('sha256', secret()).update(`ip:${ip}`).digest('hex')
}

export function expiryFromNow(): string {
    return new Date(Date.now() + INVITE_TTL_DAYS * 24 * 60 * 60 * 1000).toISOString()
}
