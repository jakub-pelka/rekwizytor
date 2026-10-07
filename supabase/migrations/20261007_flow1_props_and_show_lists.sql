-- Przepływ 1 redesignu: wpis rekwizytu (co / jak / gdzie / skąd), obsady, statusy magazynu
-- i lista zadań na termin z etapami. Wyłącznie zmiany dodające: nic nie jest usuwane ani nadpisywane.
-- Stare scene_checklists zostają do migracji trybu na żywo (przepływ 2).

BEGIN;

-- Rekwizyt w spektaklu ---------------------------------------------------------------

ALTER TABLE public.performance_props
    -- Opis wpisany przez człowieka; źródło prawdy dla prep i place.
    ADD COLUMN IF NOT EXISTS description text,
    -- „Jak” (przygotowanie) i „gdzie” (dokładne miejsce), podział robi model przy zapisie.
    ADD COLUMN IF NOT EXISTS prep text,
    ADD COLUMN IF NOT EXISTS place text,
    ADD COLUMN IF NOT EXISTS structured_at timestamptz,
    -- Miejsce na liście zadań („Stół · lewa kulisa”), dopasowywane do istniejących w spektaklu.
    ADD COLUMN IF NOT EXISTS area text,
    -- Rekwizyt przypisany do aktu bez sceny (spektakl „tylko akty” albo rzecz na cały akt).
    ADD COLUMN IF NOT EXISTS act_number integer,
    -- „Skąd”: grupa w magazynie. Status grupy przenosi się na listę zadań.
    ADD COLUMN IF NOT EXISTS group_id uuid REFERENCES public.groups(id) ON DELETE SET NULL,
    -- „Tylko obsada A”: te same kody co scene_checklists.cast ('first' = A, 'second' = B); NULL = wszystkie obsady.
    ADD COLUMN IF NOT EXISTS cast_only text,
    -- Ręczna korekta etapów listy zadań; NULL = reguła domyślna.
    ADD COLUMN IF NOT EXISTS stages text[];

ALTER TABLE public.performance_props
    DROP CONSTRAINT IF EXISTS performance_props_stages_check;
ALTER TABLE public.performance_props
    ADD CONSTRAINT performance_props_stages_check
    CHECK (stages IS NULL OR stages <@ ARRAY['rehearsal', 'preshow', 'intermission', 'postshow']::text[]);

ALTER TABLE public.performance_props
    DROP CONSTRAINT IF EXISTS performance_props_cast_only_check;
ALTER TABLE public.performance_props
    ADD CONSTRAINT performance_props_cast_only_check
    CHECK (cast_only IS NULL OR cast_only IN ('first', 'second'));

CREATE INDEX IF NOT EXISTS idx_performance_props_group_id ON public.performance_props(group_id);

-- Grupa w magazynie: stan ---------------------------------------------------------------

ALTER TABLE public.groups
    ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'available',
    -- Dopisek do stanu: „odbiór 16:00”, „wraca 17:00”, „ostatnio Szafa C”.
    ADD COLUMN IF NOT EXISTS status_note text;

ALTER TABLE public.groups
    DROP CONSTRAINT IF EXISTS groups_status_check;
ALTER TABLE public.groups
    ADD CONSTRAINT groups_status_check
    CHECK (status IN ('available', 'in_repair', 'loaned', 'missing'));

-- Spektakl -----------------------------------------------------------------------------

ALTER TABLE public.performances
    ADD COLUMN IF NOT EXISTS venue text,
    ADD COLUMN IF NOT EXISTS structure text NOT NULL DEFAULT 'acts_scenes';

ALTER TABLE public.performances
    DROP CONSTRAINT IF EXISTS performances_structure_check;
ALTER TABLE public.performances
    ADD CONSTRAINT performances_structure_check
    CHECK (structure IN ('acts_scenes', 'acts_only'));

-- Lista zadań na termin ---------------------------------------------------------------
-- Jedna lista na termin spektaklu albo próby. Które rekwizyty trafiają do którego etapu,
-- wynika z reguły w aplikacji (albo z performance_props.stages); w bazie trzymamy
-- tylko odhaczenia, więc zmiany w rozpisce od razu widać na listach.

CREATE TABLE IF NOT EXISTS public.show_lists (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    performance_id uuid NOT NULL REFERENCES public.performances(id) ON DELETE CASCADE,
    -- Ten sam typ co scene_checklists.show_date (czas lokalny teatru).
    show_date timestamp without time zone NOT NULL,
    kind text NOT NULL DEFAULT 'show' CHECK (kind IN ('show', 'rehearsal')),
    -- Obsada grająca tego dnia: 'first' (A), 'second' (B), 'other'; NULL = jedna obsada.
    "cast" text,
    created_at timestamptz NOT NULL DEFAULT now(),
    UNIQUE (performance_id, show_date)
);

CREATE INDEX IF NOT EXISTS idx_show_lists_show_date ON public.show_lists(show_date);

CREATE TABLE IF NOT EXISTS public.show_list_checks (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    show_list_id uuid NOT NULL REFERENCES public.show_lists(id) ON DELETE CASCADE,
    performance_prop_id uuid NOT NULL REFERENCES public.performance_props(id) ON DELETE CASCADE,
    stage text NOT NULL CHECK (stage IN ('rehearsal', 'preshow', 'intermission', 'postshow')),
    done_at timestamptz NOT NULL DEFAULT now(),
    done_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
    UNIQUE (show_list_id, performance_prop_id, stage)
);

CREATE INDEX IF NOT EXISTS idx_show_list_checks_list ON public.show_list_checks(show_list_id);

-- RLS: odczyt jak reszta aplikacji (także tryb publiczny tylko do odczytu), zapis dla zatwierdzonych.

ALTER TABLE public.show_lists ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.show_list_checks ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public read access to show_lists" ON public.show_lists;
CREATE POLICY "Public read access to show_lists"
    ON public.show_lists FOR SELECT TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "Approved users can manage show_lists" ON public.show_lists;
CREATE POLICY "Approved users can manage show_lists"
    ON public.show_lists FOR ALL TO authenticated
    USING (public.is_approved()) WITH CHECK (public.is_approved());

DROP POLICY IF EXISTS "Public read access to show_list_checks" ON public.show_list_checks;
CREATE POLICY "Public read access to show_list_checks"
    ON public.show_list_checks FOR SELECT TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "Approved users can manage show_list_checks" ON public.show_list_checks;
CREATE POLICY "Approved users can manage show_list_checks"
    ON public.show_list_checks FOR ALL TO authenticated
    USING (public.is_approved()) WITH CHECK (public.is_approved());

-- Odhaczenia na żywo między telefonami.
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables
        WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'show_list_checks'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.show_list_checks;
    END IF;
END $$;

-- Listy dla terminów, które już są w kalendarzu (z dotychczasowych scene_checklists).
INSERT INTO public.show_lists (performance_id, show_date, kind, "cast")
SELECT DISTINCT ON (performance_id, show_date)
    performance_id,
    show_date,
    CASE WHEN type = 'rehearsal' THEN 'rehearsal' ELSE 'show' END,
    "cast"
FROM public.scene_checklists
ORDER BY performance_id, show_date, created_at
ON CONFLICT (performance_id, show_date) DO NOTHING;

COMMIT;
