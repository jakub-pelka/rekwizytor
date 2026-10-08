-- Ustawienia (README, aktualizacja 8.10; karta Ustawienia). Wyłącznie zmiany dodające.
--
-- 1. Preferencje osoby, zapisywane na koncie, żeby telefon i komputer działały tak samo (POMYSLY 6, 18).
-- 2. Ustawienia teatru (na razie nazwa) w prostej tabeli klucz-wartość; zmienia je tylko administrator.

BEGIN;

ALTER TABLE public.profiles
    -- Szczegóły wpisu na liście zadań: 'all' (wszystko), 'where' (nazwa i miejsce), 'names' (same nazwy).
    ADD COLUMN IF NOT EXISTS list_detail text NOT NULL DEFAULT 'all',
    -- Akty na telefonie: false = rozwinięte (jak teraz), true = zwinięte i otwierane dotknięciem.
    ADD COLUMN IF NOT EXISTS acts_collapsed boolean NOT NULL DEFAULT false,
    -- Odhaczone wpisy zwijają się do samej nazwy.
    ADD COLUMN IF NOT EXISTS collapse_done boolean NOT NULL DEFAULT true;

ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_list_detail_check;
ALTER TABLE public.profiles
    ADD CONSTRAINT profiles_list_detail_check CHECK (list_detail IN ('all', 'where', 'names'));

-- Administrator (funkcja SECURITY DEFINER, żeby polityki nie zapętlały się na profiles; jak is_approved()).
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM public.profiles
        WHERE id = auth.uid() AND status = 'approved' AND role = 'admin'
    );
END;
$$;

CREATE TABLE IF NOT EXISTS public.app_settings (
    key text PRIMARY KEY,
    value text,
    updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;

-- Nazwa teatru pojawia się na pulpicie, także w trybie bez logowania.
DROP POLICY IF EXISTS "Public read access to app_settings" ON public.app_settings;
CREATE POLICY "Public read access to app_settings"
    ON public.app_settings FOR SELECT TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "Admins manage app_settings" ON public.app_settings;
CREATE POLICY "Admins manage app_settings"
    ON public.app_settings FOR ALL TO authenticated
    USING (public.is_admin()) WITH CHECK (public.is_admin());

COMMIT;
