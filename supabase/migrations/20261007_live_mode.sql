-- Przepływ 2 redesignu: tryb na żywo listy zadań (karta NaZywo, POMYSLY 7).
-- Lista sama przechodzi w stan „na żywo” o godzinie spektaklu; sceny przełącza inspicjent,
-- a telefony rekwizytorów podążają za nim przez realtime. Wyłącznie zmiany dodające.

BEGIN;

-- Bieżąca scena i zegar aktu na liście terminu.
ALTER TABLE public.show_lists
    ADD COLUMN IF NOT EXISTS live_scene_number integer,
    ADD COLUMN IF NOT EXISTS live_act_started_at timestamptz,
    ADD COLUMN IF NOT EXISTS live_updated_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL;

-- „Kto bierze” (postać albo osoba), pokazywane pod nazwą w trybie na żywo.
ALTER TABLE public.performance_props
    ADD COLUMN IF NOT EXISTS handler text;

-- Potwierdzenie podania w trakcie spektaklu to osobny etap odhaczenia: 'live'.
ALTER TABLE public.show_list_checks DROP CONSTRAINT IF EXISTS show_list_checks_stage_check;
ALTER TABLE public.show_list_checks
    ADD CONSTRAINT show_list_checks_stage_check
    CHECK (stage IN ('rehearsal', 'preshow', 'intermission', 'postshow', 'live'));

-- Zgłoszenia z kulis („Zgłoś problem”).
CREATE TABLE IF NOT EXISTS public.show_list_reports (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    show_list_id uuid NOT NULL REFERENCES public.show_lists(id) ON DELETE CASCADE,
    performance_prop_id uuid REFERENCES public.performance_props(id) ON DELETE SET NULL,
    scene_number integer,
    message text NOT NULL,
    created_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
    created_at timestamptz NOT NULL DEFAULT now(),
    resolved_at timestamptz
);

CREATE INDEX IF NOT EXISTS idx_show_list_reports_list ON public.show_list_reports(show_list_id);

ALTER TABLE public.show_list_reports ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public read access to show_list_reports" ON public.show_list_reports;
CREATE POLICY "Public read access to show_list_reports"
    ON public.show_list_reports FOR SELECT TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "Approved users can manage show_list_reports" ON public.show_list_reports;
CREATE POLICY "Approved users can manage show_list_reports"
    ON public.show_list_reports FOR ALL TO authenticated
    USING (public.is_approved()) WITH CHECK (public.is_approved());

-- Przełączanie scen i zgłoszenia na żywo między urządzeniami.
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'show_lists') THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.show_lists;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'show_list_reports') THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.show_list_reports;
    END IF;
END $$;

COMMIT;
