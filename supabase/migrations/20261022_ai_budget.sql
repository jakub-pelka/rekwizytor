-- Limit kosztów AI na teatr (PYTANIA.md pkt 27, decyzja 22.10.2026).
-- Każde wywołanie modelu zapisuje swój koszt w dolarach w ai_usage_logs (wiersz należy do teatru, RLS po theatre_id).
-- Limit to kolumna theatres.ai_budget_usd (domyślnie 3 $ na cały pilotaż, nie na miesiąc). Zmiana dla jednego teatru:
--   UPDATE public.theatres SET ai_budget_usd = 10 WHERE name = 'Nazwa teatru';
-- Aplikacja sprawdza zużycie przed każdym wywołaniem modelu (ai_budget_status) i odrzuca je po przekroczeniu limitu.
-- Wymaga migracji 20261011_theatres.sql. Kod aplikacji działa też przed tą migracją (bez limitu), po niej liczy koszty.
-- Cofnięcie: SQL na końcu pliku, w komentarzu.

BEGIN;

-- 1. Limit teatru. Zmienia go tylko superadmin (reguła theatres_write), kierownik pracowni limitu nie podniesie.
ALTER TABLE public.theatres
    ADD COLUMN IF NOT EXISTS ai_budget_usd numeric(8,2) NOT NULL DEFAULT 3.00;
ALTER TABLE public.theatres DROP CONSTRAINT IF EXISTS theatres_ai_budget_nonneg;
ALTER TABLE public.theatres ADD CONSTRAINT theatres_ai_budget_nonneg CHECK (ai_budget_usd >= 0);

-- 2. Koszt wywołania. Stare wiersze mają 0 (nie znamy ich kosztu), więc limit liczy się od tej migracji.
--    cost_source: 'provider' = koszt podany przez dostawcę w odpowiedzi (OpenRouter), 'estimate' = policzony
--    z tokenów i cennika w kodzie (utils/ai/pricing.ts).
ALTER TABLE public.ai_usage_logs
    ADD COLUMN IF NOT EXISTS cost_usd numeric(12,6) NOT NULL DEFAULT 0,
    ADD COLUMN IF NOT EXISTS cost_source text NOT NULL DEFAULT 'estimate';
ALTER TABLE public.ai_usage_logs DROP CONSTRAINT IF EXISTS ai_usage_logs_cost_nonneg;
ALTER TABLE public.ai_usage_logs ADD CONSTRAINT ai_usage_logs_cost_nonneg CHECK (cost_usd >= 0);
ALTER TABLE public.ai_usage_logs DROP CONSTRAINT IF EXISTS ai_usage_logs_cost_source_check;
ALTER TABLE public.ai_usage_logs ADD CONSTRAINT ai_usage_logs_cost_source_check CHECK (cost_source IN ('provider', 'estimate'));

-- 3. Zapis zużycia: tylko do bieżącego teatru wołającego. Wcześniej WITH CHECK (true) przyjmował wiersz z dowolnym
--    theatre_id. Wyzwalacz a_set_theatre_id uzupełnia theatre_id przed sprawdzeniem reguły. Wierszy nie da się
--    zmienić ani usunąć (brak reguł UPDATE i DELETE), a ujemny koszt blokuje CHECK, więc zużycie nie maleje.
DROP POLICY IF EXISTS theatre_insert ON public.ai_usage_logs;
CREATE POLICY theatre_insert ON public.ai_usage_logs FOR INSERT TO authenticated
    WITH CHECK (theatre_id = (SELECT public.active_theatre_id()));

-- 4. Stan limitu bieżącego teatru: jeden wiersz (limit i zużycie w dolarach). Funkcja widzi tylko teatr wołającego
--    (active_theatre_id), więc nie zdradza zużycia innego teatru. Niezalogowani nie mają wykonania.
CREATE INDEX IF NOT EXISTS ai_usage_logs_theatre_cost_idx ON public.ai_usage_logs (theatre_id) INCLUDE (cost_usd);

CREATE OR REPLACE FUNCTION public.ai_budget_status() RETURNS TABLE (budget_usd numeric, spent_usd numeric)
    LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
    SELECT t.ai_budget_usd,
           coalesce((SELECT sum(l.cost_usd) FROM public.ai_usage_logs l WHERE l.theatre_id = t.id), 0)
      FROM public.theatres t
     WHERE t.id = public.active_theatre_id()
$$;
REVOKE ALL ON FUNCTION public.ai_budget_status() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.ai_budget_status() TO authenticated;

COMMIT;

-- Cofnięcie (wklej w SQL Editor; usuwa też zapisane koszty):
--   BEGIN;
--   DROP FUNCTION IF EXISTS public.ai_budget_status();
--   DROP INDEX IF EXISTS public.ai_usage_logs_theatre_cost_idx;
--   DROP POLICY IF EXISTS theatre_insert ON public.ai_usage_logs;
--   CREATE POLICY theatre_insert ON public.ai_usage_logs FOR INSERT TO authenticated WITH CHECK (true);
--   ALTER TABLE public.ai_usage_logs DROP CONSTRAINT IF EXISTS ai_usage_logs_cost_source_check;
--   ALTER TABLE public.ai_usage_logs DROP CONSTRAINT IF EXISTS ai_usage_logs_cost_nonneg;
--   ALTER TABLE public.ai_usage_logs DROP COLUMN IF EXISTS cost_source, DROP COLUMN IF EXISTS cost_usd;
--   ALTER TABLE public.theatres DROP CONSTRAINT IF EXISTS theatres_ai_budget_nonneg;
--   ALTER TABLE public.theatres DROP COLUMN IF EXISTS ai_budget_usd;
--   COMMIT;
