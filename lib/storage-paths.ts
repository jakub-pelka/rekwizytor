import type { SupabaseClient } from '@supabase/supabase-js'

// Standard ścieżek plików (docs/TEATRY.md): <teatr>/<rodzaj>/<id rzeczy>/<losowe>[-mini].<rozszerzenie>.
// Pierwszy człon to teatr: reguły storage pozwalają zapisywać i usuwać tylko pliki bieżącego teatru.
// Losowa końcówka zostaje, żeby podmienione zdjęcie nie wisiało w pamięci przeglądarki pod starym adresem.
export type FileKind = 'plakaty' | 'rekwizyty' | 'miejsca'

/**
 * Ścieżka nowego pliku. `theatreId` z `activeTheatreId`; bez niego (baza przed migracją teatrów) ścieżka
 * zaczyna się od rodzaju, tak jak pozwalały dawne reguły.
 */
export function filePath(theatreId: string | null, kind: FileKind, ownerId: string, ext: string, base = crypto.randomUUID()) {
    return [theatreId, kind, ownerId, `${base}.${ext.toLowerCase()}`].filter(Boolean).join('/')
}

/** Miniatura obok pliku głównego: ta sama nazwa z dopiskiem „-mini”. */
export const miniPath = (path: string) => path.replace(/(\.[a-z0-9]+)$/i, '-mini$1')

/** Bieżący teatr żądania (null przed migracją teatrów albo bez teatru). */
export async function activeTheatreId(supabase: SupabaseClient): Promise<string | null> {
    const { data, error } = await supabase.rpc('active_theatre_id')
    return error ? null : (data as string | null)
}
