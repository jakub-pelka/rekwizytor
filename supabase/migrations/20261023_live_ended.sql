-- Koniec trybu na żywo (RK-02).
-- „Zakończ spektakl” zapisuje chwilę końca w show_lists.live_ended_at. Zakończony termin nie przekierowuje już na tryb na żywo.
-- Osobna kolumna, bo live_act_started_at jest współdzielona z zegarem aktu. Ponowne „Zaczynamy” albo „Cofnij” czyści koniec (NULL).
-- Zapis przez istniejące reguły RLS na show_lists (jak przełączanie scen). Kod aplikacji nie działa na tej kolumnie przed migracją.
-- Cofnięcie: SQL na końcu pliku, w komentarzu.

ALTER TABLE public.show_lists ADD COLUMN IF NOT EXISTS live_ended_at timestamptz;

COMMENT ON COLUMN public.show_lists.live_ended_at IS 'Chwila kliknięcia „Zakończ spektakl”; NULL = nie zakończono (lub cofnięto).';

-- Cofnięcie (wklej w SQL Editor; usuwa zapisane zakończenia):
--   ALTER TABLE public.show_lists DROP COLUMN IF EXISTS live_ended_at;
