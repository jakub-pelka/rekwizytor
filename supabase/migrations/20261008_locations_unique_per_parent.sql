-- Nazwa miejsca ma być unikalna w obrębie jednego rodzica, a nie w całej tabeli: w każdej szafie może być
-- „Półka 1” (POMYSLY 13: Szafa B › Półka 1, Szafa A › Półka 1). Pomieszczenia (bez rodzica) nadal mają unikalne nazwy.
-- Wyłącznie rozluźnia ograniczenie, istniejące dane pozostają poprawne.

BEGIN;

ALTER TABLE public.locations DROP CONSTRAINT IF EXISTS locations_name_key;

CREATE UNIQUE INDEX IF NOT EXISTS locations_name_per_parent_key
    ON public.locations (COALESCE(belongs_to, '00000000-0000-0000-0000-000000000000'::uuid), lower(name))
    WHERE deleted_at IS NULL;

COMMIT;
