-- Teatry: każdy teatr widzi tylko swoje dane (wielodostępność, 11.10.2026).
--
-- Model: użytkownik ma „bieżący teatr” (profiles.current_theatre_id) i baza pokazuje mu wyłącznie ten teatr.
-- Niezalogowani (rola anon) widzą tylko teatr demo, wyłącznie do odczytu. Dzięki temu zapytania aplikacji
-- nie muszą filtrować po teatrze, a theatre_id przy dodawaniu ustawia wyzwalacz: z rodzica (scena dziedziczy
-- teatr spektaklu, rekwizyt grupy itd.) albo z bieżącego teatru. Wiersz przypięty do cudzego rodzica dostaje
-- cudzy teatr i odpada na regule zapisu, więc nie da się niczego doczepić do innego teatru.
--
-- Teatry zakłada tylko superadmin (profiles.role = 'admin'). Obecne dane trafiają do „Teatru demo”.
-- Numery etykiet (REK-, GRP-, MSC-) liczone osobno w każdym teatrze.
--
-- Plik wygenerowany ze zrzutu schematu (funkcje wyszukiwania i widok wyszukiwania przepisane 1:1, z filtrem
-- teatru). Sprawdzenie izolacji: supabase/tests/theatres_isolation.sql.

BEGIN;

-- 1. Teatry, członkostwo, bieżący teatr ------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.theatres (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    name text NOT NULL CHECK (length(trim(name)) > 0),
    is_demo boolean NOT NULL DEFAULT false,
    created_at timestamptz NOT NULL DEFAULT now(),
    created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL
);
-- Najwyżej jeden teatr demo: na nim opiera się odczyt dla niezalogowanych.
CREATE UNIQUE INDEX IF NOT EXISTS theatres_single_demo ON public.theatres (is_demo) WHERE is_demo;

CREATE TABLE IF NOT EXISTS public.theatre_members (
    theatre_id uuid NOT NULL REFERENCES public.theatres(id) ON DELETE CASCADE,
    user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    -- admin: kierownik pracowni (zespół, ustawienia teatru, kosz); member: rekwizytor (cała praca w teatrze);
    -- viewer: podgląd (inspicjent, reżyser, zastępstwo): tylko czyta, na serwerze nie zapisuje niczego.
    role text NOT NULL DEFAULT 'member' CHECK (role IN ('admin', 'member', 'viewer')),
    created_at timestamptz NOT NULL DEFAULT now(),
    PRIMARY KEY (theatre_id, user_id)
);
CREATE INDEX IF NOT EXISTS theatre_members_user_idx ON public.theatre_members (user_id);

ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS current_theatre_id uuid REFERENCES public.theatres(id) ON DELETE SET NULL;

-- Liczniki numerów etykiet, osobno na teatr i rodzaj.
CREATE TABLE IF NOT EXISTS public.theatre_counters (
    theatre_id uuid NOT NULL REFERENCES public.theatres(id) ON DELETE CASCADE,
    kind text NOT NULL CHECK (kind IN ('REK', 'GRP', 'MSC')),
    last_value integer NOT NULL DEFAULT 0,
    PRIMARY KEY (theatre_id, kind)
);

-- 2. Funkcje dostępu --------------------------------------------------------------------------------

-- Teatr, który widzi bieżące żądanie. anon: teatr demo. Zalogowany i zatwierdzony: wybrany teatr, jeśli
-- jest w nim członkiem (superadmin: dowolny), inaczej pierwszy teatr, do którego należy. Klucz serwisowy
-- (bez auth.uid i nie anon): NULL, więc skrypty muszą podać theatre_id wprost.
CREATE OR REPLACE FUNCTION public.active_theatre_id() RETURNS uuid
    LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
    SELECT CASE
        WHEN auth.uid() IS NULL THEN
            CASE WHEN coalesce(auth.role(), '') = 'anon'
                THEN (SELECT t.id FROM public.theatres t WHERE t.is_demo LIMIT 1)
            END
        ELSE coalesce(
            (SELECT p.current_theatre_id FROM public.profiles p
              WHERE p.id = auth.uid() AND p.status = 'approved' AND p.current_theatre_id IS NOT NULL
                AND (p.role = 'admin' OR EXISTS (
                    SELECT 1 FROM public.theatre_members m WHERE m.user_id = p.id AND m.theatre_id = p.current_theatre_id))),
            (SELECT m.theatre_id FROM public.theatre_members m JOIN public.profiles p ON p.id = m.user_id
              WHERE m.user_id = auth.uid() AND p.status = 'approved'
              ORDER BY m.created_at LIMIT 1)
        )
    END
$$;

-- Czy bieżące żądanie może zmieniać dane bieżącego teatru: zatwierdzony kierownik albo rekwizytor tego teatru,
-- albo superadmin. Podgląd (viewer) i niezalogowani nigdy: demo i podgląd są tylko do odczytu.
CREATE OR REPLACE FUNCTION public.can_write_active_theatre() RETURNS boolean
    LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
    SELECT auth.uid() IS NOT NULL AND EXISTS (
        SELECT 1 FROM public.profiles p
         WHERE p.id = auth.uid() AND p.status = 'approved'
           AND (p.role = 'admin' OR EXISTS (
                SELECT 1 FROM public.theatre_members m
                 WHERE m.user_id = p.id AND m.theatre_id = public.active_theatre_id() AND m.role IN ('admin', 'member'))))
$$;

-- Kierownik pracowni danego teatru albo superadmin: zarządza zespołem teatru.
CREATE OR REPLACE FUNCTION public.is_theatre_admin(t uuid) RETURNS boolean
    LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
    SELECT public.is_admin() OR EXISTS (
        SELECT 1 FROM public.theatre_members m JOIN public.profiles p ON p.id = m.user_id
         WHERE m.user_id = auth.uid() AND m.theatre_id = t AND m.role = 'admin' AND p.status = 'approved')
$$;

-- Wyzwalacz: theatre_id z rodzica (argumenty: tabela rodzica, kolumna klucza), inaczej z bieżącego teatru.
CREATE OR REPLACE FUNCTION public.set_theatre_id() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
    parent_id uuid;
    parent_theatre uuid;
BEGIN
    IF TG_NARGS = 2 THEN
        EXECUTE format('SELECT ($1).%I::uuid', TG_ARGV[1]) INTO parent_id USING NEW;
        IF parent_id IS NOT NULL THEN
            EXECUTE format('SELECT theatre_id FROM public.%I WHERE id = $1', TG_ARGV[0]) INTO parent_theatre USING parent_id;
            IF parent_theatre IS NOT NULL THEN
                NEW.theatre_id := parent_theatre;
                RETURN NEW;
            END IF;
        END IF;
    END IF;
    IF NEW.theatre_id IS NULL THEN
        NEW.theatre_id := public.active_theatre_id();
    END IF;
    RETURN NEW;
END $$;

-- 3. Teatr demo i dotychczasowe dane ----------------------------------------------------------------

INSERT INTO public.theatres (name, is_demo)
SELECT 'Teatr demo', true
WHERE NOT EXISTS (SELECT 1 FROM public.theatres WHERE is_demo);

-- Dotychczasowi zatwierdzeni użytkownicy należą do teatru demo (superadmin jako kierownik), żeby po migracji
-- widzieli to samo co przed nią.
INSERT INTO public.theatre_members (theatre_id, user_id, role)
SELECT t.id, p.id, CASE WHEN p.role = 'admin' THEN 'admin' ELSE 'member' END
  FROM public.profiles p CROSS JOIN public.theatres t
 WHERE t.is_demo AND p.status = 'approved'
ON CONFLICT DO NOTHING;

UPDATE public.profiles p SET current_theatre_id = t.id
  FROM public.theatres t
 WHERE t.is_demo AND p.status = 'approved' AND p.current_theatre_id IS NULL;

-- 4. theatre_id we wszystkich tabelach teatru -------------------------------------------------------

ALTER TABLE public.performances ADD COLUMN IF NOT EXISTS theatre_id uuid REFERENCES public.theatres(id) ON DELETE CASCADE;
UPDATE public.performances SET theatre_id = (SELECT id FROM public.theatres WHERE is_demo) WHERE theatre_id IS NULL;
ALTER TABLE public.performances ALTER COLUMN theatre_id SET NOT NULL;
ALTER TABLE public.performances ALTER COLUMN theatre_id SET DEFAULT public.active_theatre_id();
CREATE INDEX IF NOT EXISTS performances_theatre_idx ON public.performances (theatre_id);
DROP TRIGGER IF EXISTS a_set_theatre_id ON public.performances;
CREATE TRIGGER a_set_theatre_id BEFORE INSERT ON public.performances FOR EACH ROW EXECUTE FUNCTION public.set_theatre_id();

ALTER TABLE public.locations ADD COLUMN IF NOT EXISTS theatre_id uuid REFERENCES public.theatres(id) ON DELETE CASCADE;
UPDATE public.locations SET theatre_id = (SELECT id FROM public.theatres WHERE is_demo) WHERE theatre_id IS NULL;
ALTER TABLE public.locations ALTER COLUMN theatre_id SET NOT NULL;
ALTER TABLE public.locations ALTER COLUMN theatre_id SET DEFAULT public.active_theatre_id();
CREATE INDEX IF NOT EXISTS locations_theatre_idx ON public.locations (theatre_id);
DROP TRIGGER IF EXISTS a_set_theatre_id ON public.locations;
CREATE TRIGGER a_set_theatre_id BEFORE INSERT ON public.locations FOR EACH ROW EXECUTE FUNCTION public.set_theatre_id('locations', 'belongs_to');

ALTER TABLE public.groups ADD COLUMN IF NOT EXISTS theatre_id uuid REFERENCES public.theatres(id) ON DELETE CASCADE;
UPDATE public.groups SET theatre_id = (SELECT id FROM public.theatres WHERE is_demo) WHERE theatre_id IS NULL;
ALTER TABLE public.groups ALTER COLUMN theatre_id SET NOT NULL;
ALTER TABLE public.groups ALTER COLUMN theatre_id SET DEFAULT public.active_theatre_id();
CREATE INDEX IF NOT EXISTS groups_theatre_idx ON public.groups (theatre_id);
DROP TRIGGER IF EXISTS a_set_theatre_id ON public.groups;
CREATE TRIGGER a_set_theatre_id BEFORE INSERT ON public.groups FOR EACH ROW EXECUTE FUNCTION public.set_theatre_id('locations', 'location_id');

ALTER TABLE public.group_items ADD COLUMN IF NOT EXISTS theatre_id uuid REFERENCES public.theatres(id) ON DELETE CASCADE;
UPDATE public.group_items SET theatre_id = (SELECT id FROM public.theatres WHERE is_demo) WHERE theatre_id IS NULL;
ALTER TABLE public.group_items ALTER COLUMN theatre_id SET NOT NULL;
ALTER TABLE public.group_items ALTER COLUMN theatre_id SET DEFAULT public.active_theatre_id();
CREATE INDEX IF NOT EXISTS group_items_theatre_idx ON public.group_items (theatre_id);
DROP TRIGGER IF EXISTS a_set_theatre_id ON public.group_items;
CREATE TRIGGER a_set_theatre_id BEFORE INSERT ON public.group_items FOR EACH ROW EXECUTE FUNCTION public.set_theatre_id('groups', 'group_id');

ALTER TABLE public.scenes ADD COLUMN IF NOT EXISTS theatre_id uuid REFERENCES public.theatres(id) ON DELETE CASCADE;
UPDATE public.scenes SET theatre_id = (SELECT id FROM public.theatres WHERE is_demo) WHERE theatre_id IS NULL;
ALTER TABLE public.scenes ALTER COLUMN theatre_id SET NOT NULL;
ALTER TABLE public.scenes ALTER COLUMN theatre_id SET DEFAULT public.active_theatre_id();
CREATE INDEX IF NOT EXISTS scenes_theatre_idx ON public.scenes (theatre_id);
DROP TRIGGER IF EXISTS a_set_theatre_id ON public.scenes;
CREATE TRIGGER a_set_theatre_id BEFORE INSERT ON public.scenes FOR EACH ROW EXECUTE FUNCTION public.set_theatre_id('performances', 'performance_id');

ALTER TABLE public.performance_props ADD COLUMN IF NOT EXISTS theatre_id uuid REFERENCES public.theatres(id) ON DELETE CASCADE;
UPDATE public.performance_props SET theatre_id = (SELECT id FROM public.theatres WHERE is_demo) WHERE theatre_id IS NULL;
ALTER TABLE public.performance_props ALTER COLUMN theatre_id SET NOT NULL;
ALTER TABLE public.performance_props ALTER COLUMN theatre_id SET DEFAULT public.active_theatre_id();
CREATE INDEX IF NOT EXISTS performance_props_theatre_idx ON public.performance_props (theatre_id);
DROP TRIGGER IF EXISTS a_set_theatre_id ON public.performance_props;
CREATE TRIGGER a_set_theatre_id BEFORE INSERT ON public.performance_props FOR EACH ROW EXECUTE FUNCTION public.set_theatre_id('performances', 'performance_id');

ALTER TABLE public.notes ADD COLUMN IF NOT EXISTS theatre_id uuid REFERENCES public.theatres(id) ON DELETE CASCADE;
UPDATE public.notes SET theatre_id = (SELECT id FROM public.theatres WHERE is_demo) WHERE theatre_id IS NULL;
ALTER TABLE public.notes ALTER COLUMN theatre_id SET NOT NULL;
ALTER TABLE public.notes ALTER COLUMN theatre_id SET DEFAULT public.active_theatre_id();
CREATE INDEX IF NOT EXISTS notes_theatre_idx ON public.notes (theatre_id);
DROP TRIGGER IF EXISTS a_set_theatre_id ON public.notes;
CREATE TRIGGER a_set_theatre_id BEFORE INSERT ON public.notes FOR EACH ROW EXECUTE FUNCTION public.set_theatre_id('performances', 'performance_id');

ALTER TABLE public.note_mentions ADD COLUMN IF NOT EXISTS theatre_id uuid REFERENCES public.theatres(id) ON DELETE CASCADE;
UPDATE public.note_mentions SET theatre_id = (SELECT id FROM public.theatres WHERE is_demo) WHERE theatre_id IS NULL;
ALTER TABLE public.note_mentions ALTER COLUMN theatre_id SET NOT NULL;
ALTER TABLE public.note_mentions ALTER COLUMN theatre_id SET DEFAULT public.active_theatre_id();
CREATE INDEX IF NOT EXISTS note_mentions_theatre_idx ON public.note_mentions (theatre_id);
DROP TRIGGER IF EXISTS a_set_theatre_id ON public.note_mentions;
CREATE TRIGGER a_set_theatre_id BEFORE INSERT ON public.note_mentions FOR EACH ROW EXECUTE FUNCTION public.set_theatre_id('notes', 'note_id');

ALTER TABLE public.show_lists ADD COLUMN IF NOT EXISTS theatre_id uuid REFERENCES public.theatres(id) ON DELETE CASCADE;
UPDATE public.show_lists SET theatre_id = (SELECT id FROM public.theatres WHERE is_demo) WHERE theatre_id IS NULL;
ALTER TABLE public.show_lists ALTER COLUMN theatre_id SET NOT NULL;
ALTER TABLE public.show_lists ALTER COLUMN theatre_id SET DEFAULT public.active_theatre_id();
CREATE INDEX IF NOT EXISTS show_lists_theatre_idx ON public.show_lists (theatre_id);
DROP TRIGGER IF EXISTS a_set_theatre_id ON public.show_lists;
CREATE TRIGGER a_set_theatre_id BEFORE INSERT ON public.show_lists FOR EACH ROW EXECUTE FUNCTION public.set_theatre_id('performances', 'performance_id');

ALTER TABLE public.show_list_checks ADD COLUMN IF NOT EXISTS theatre_id uuid REFERENCES public.theatres(id) ON DELETE CASCADE;
UPDATE public.show_list_checks SET theatre_id = (SELECT id FROM public.theatres WHERE is_demo) WHERE theatre_id IS NULL;
ALTER TABLE public.show_list_checks ALTER COLUMN theatre_id SET NOT NULL;
ALTER TABLE public.show_list_checks ALTER COLUMN theatre_id SET DEFAULT public.active_theatre_id();
CREATE INDEX IF NOT EXISTS show_list_checks_theatre_idx ON public.show_list_checks (theatre_id);
DROP TRIGGER IF EXISTS a_set_theatre_id ON public.show_list_checks;
CREATE TRIGGER a_set_theatre_id BEFORE INSERT ON public.show_list_checks FOR EACH ROW EXECUTE FUNCTION public.set_theatre_id('show_lists', 'show_list_id');

ALTER TABLE public.show_list_reports ADD COLUMN IF NOT EXISTS theatre_id uuid REFERENCES public.theatres(id) ON DELETE CASCADE;
UPDATE public.show_list_reports SET theatre_id = (SELECT id FROM public.theatres WHERE is_demo) WHERE theatre_id IS NULL;
ALTER TABLE public.show_list_reports ALTER COLUMN theatre_id SET NOT NULL;
ALTER TABLE public.show_list_reports ALTER COLUMN theatre_id SET DEFAULT public.active_theatre_id();
CREATE INDEX IF NOT EXISTS show_list_reports_theatre_idx ON public.show_list_reports (theatre_id);
DROP TRIGGER IF EXISTS a_set_theatre_id ON public.show_list_reports;
CREATE TRIGGER a_set_theatre_id BEFORE INSERT ON public.show_list_reports FOR EACH ROW EXECUTE FUNCTION public.set_theatre_id('show_lists', 'show_list_id');

ALTER TABLE public.scene_checklists ADD COLUMN IF NOT EXISTS theatre_id uuid REFERENCES public.theatres(id) ON DELETE CASCADE;
UPDATE public.scene_checklists SET theatre_id = (SELECT id FROM public.theatres WHERE is_demo) WHERE theatre_id IS NULL;
ALTER TABLE public.scene_checklists ALTER COLUMN theatre_id SET NOT NULL;
ALTER TABLE public.scene_checklists ALTER COLUMN theatre_id SET DEFAULT public.active_theatre_id();
CREATE INDEX IF NOT EXISTS scene_checklists_theatre_idx ON public.scene_checklists (theatre_id);
DROP TRIGGER IF EXISTS a_set_theatre_id ON public.scene_checklists;
CREATE TRIGGER a_set_theatre_id BEFORE INSERT ON public.scene_checklists FOR EACH ROW EXECUTE FUNCTION public.set_theatre_id('performances', 'performance_id');

ALTER TABLE public.scene_checklist_items ADD COLUMN IF NOT EXISTS theatre_id uuid REFERENCES public.theatres(id) ON DELETE CASCADE;
UPDATE public.scene_checklist_items SET theatre_id = (SELECT id FROM public.theatres WHERE is_demo) WHERE theatre_id IS NULL;
ALTER TABLE public.scene_checklist_items ALTER COLUMN theatre_id SET NOT NULL;
ALTER TABLE public.scene_checklist_items ALTER COLUMN theatre_id SET DEFAULT public.active_theatre_id();
CREATE INDEX IF NOT EXISTS scene_checklist_items_theatre_idx ON public.scene_checklist_items (theatre_id);
DROP TRIGGER IF EXISTS a_set_theatre_id ON public.scene_checklist_items;
CREATE TRIGGER a_set_theatre_id BEFORE INSERT ON public.scene_checklist_items FOR EACH ROW EXECUTE FUNCTION public.set_theatre_id('scene_checklists', 'scene_checklist_id');

ALTER TABLE public.qr_codes ADD COLUMN IF NOT EXISTS theatre_id uuid REFERENCES public.theatres(id) ON DELETE CASCADE;
UPDATE public.qr_codes SET theatre_id = (SELECT id FROM public.theatres WHERE is_demo) WHERE theatre_id IS NULL;
ALTER TABLE public.qr_codes ALTER COLUMN theatre_id SET NOT NULL;
ALTER TABLE public.qr_codes ALTER COLUMN theatre_id SET DEFAULT public.active_theatre_id();
CREATE INDEX IF NOT EXISTS qr_codes_theatre_idx ON public.qr_codes (theatre_id);
DROP TRIGGER IF EXISTS a_set_theatre_id ON public.qr_codes;
CREATE TRIGGER a_set_theatre_id BEFORE INSERT ON public.qr_codes FOR EACH ROW EXECUTE FUNCTION public.set_theatre_id();

ALTER TABLE public.ai_usage_logs ADD COLUMN IF NOT EXISTS theatre_id uuid REFERENCES public.theatres(id) ON DELETE CASCADE;
UPDATE public.ai_usage_logs SET theatre_id = (SELECT id FROM public.theatres WHERE is_demo) WHERE theatre_id IS NULL;
ALTER TABLE public.ai_usage_logs ALTER COLUMN theatre_id SET DEFAULT public.active_theatre_id();
CREATE INDEX IF NOT EXISTS ai_usage_logs_theatre_idx ON public.ai_usage_logs (theatre_id);
DROP TRIGGER IF EXISTS a_set_theatre_id ON public.ai_usage_logs;
CREATE TRIGGER a_set_theatre_id BEFORE INSERT ON public.ai_usage_logs FOR EACH ROW EXECUTE FUNCTION public.set_theatre_id();

-- 5. Reguły dostępu (RLS) ----------------------------------------------------------------------------
-- Stare reguły znikają w całości: część z nich (USING true) dawała zapis także niezatwierdzonym kontom,
-- a odczyt dla anon obejmował wszystkie dane.

DO $$
DECLARE r record;
BEGIN
    FOR r IN SELECT policyname, tablename FROM pg_policies
              WHERE schemaname = 'public' AND tablename = ANY (ARRAY['performances', 'locations', 'groups', 'group_items', 'scenes', 'performance_props', 'notes', 'note_mentions', 'show_lists', 'show_list_checks', 'show_list_reports', 'scene_checklists', 'scene_checklist_items', 'qr_codes', 'ai_usage_logs'])
    LOOP
        EXECUTE format('DROP POLICY %I ON public.%I', r.policyname, r.tablename);
    END LOOP;
END $$;

ALTER TABLE public.performances ENABLE ROW LEVEL SECURITY;
CREATE POLICY theatre_read ON public.performances FOR SELECT TO anon, authenticated USING (theatre_id = (SELECT public.active_theatre_id()));
CREATE POLICY theatre_insert ON public.performances FOR INSERT TO authenticated WITH CHECK (theatre_id = (SELECT public.active_theatre_id()) AND (SELECT public.can_write_active_theatre()));
CREATE POLICY theatre_update ON public.performances FOR UPDATE TO authenticated USING (theatre_id = (SELECT public.active_theatre_id()) AND (SELECT public.can_write_active_theatre())) WITH CHECK (theatre_id = (SELECT public.active_theatre_id()) AND (SELECT public.can_write_active_theatre()));
CREATE POLICY theatre_delete ON public.performances FOR DELETE TO authenticated USING (theatre_id = (SELECT public.active_theatre_id()) AND (SELECT public.can_write_active_theatre()));

ALTER TABLE public.locations ENABLE ROW LEVEL SECURITY;
CREATE POLICY theatre_read ON public.locations FOR SELECT TO anon, authenticated USING (theatre_id = (SELECT public.active_theatre_id()));
CREATE POLICY theatre_insert ON public.locations FOR INSERT TO authenticated WITH CHECK (theatre_id = (SELECT public.active_theatre_id()) AND (SELECT public.can_write_active_theatre()));
CREATE POLICY theatre_update ON public.locations FOR UPDATE TO authenticated USING (theatre_id = (SELECT public.active_theatre_id()) AND (SELECT public.can_write_active_theatre())) WITH CHECK (theatre_id = (SELECT public.active_theatre_id()) AND (SELECT public.can_write_active_theatre()));
CREATE POLICY theatre_delete ON public.locations FOR DELETE TO authenticated USING (theatre_id = (SELECT public.active_theatre_id()) AND (SELECT public.can_write_active_theatre()));

ALTER TABLE public.groups ENABLE ROW LEVEL SECURITY;
CREATE POLICY theatre_read ON public.groups FOR SELECT TO anon, authenticated USING (theatre_id = (SELECT public.active_theatre_id()));
CREATE POLICY theatre_insert ON public.groups FOR INSERT TO authenticated WITH CHECK (theatre_id = (SELECT public.active_theatre_id()) AND (SELECT public.can_write_active_theatre()));
CREATE POLICY theatre_update ON public.groups FOR UPDATE TO authenticated USING (theatre_id = (SELECT public.active_theatre_id()) AND (SELECT public.can_write_active_theatre())) WITH CHECK (theatre_id = (SELECT public.active_theatre_id()) AND (SELECT public.can_write_active_theatre()));
CREATE POLICY theatre_delete ON public.groups FOR DELETE TO authenticated USING (theatre_id = (SELECT public.active_theatre_id()) AND (SELECT public.can_write_active_theatre()));

ALTER TABLE public.group_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY theatre_read ON public.group_items FOR SELECT TO anon, authenticated USING (theatre_id = (SELECT public.active_theatre_id()));
CREATE POLICY theatre_insert ON public.group_items FOR INSERT TO authenticated WITH CHECK (theatre_id = (SELECT public.active_theatre_id()) AND (SELECT public.can_write_active_theatre()));
CREATE POLICY theatre_update ON public.group_items FOR UPDATE TO authenticated USING (theatre_id = (SELECT public.active_theatre_id()) AND (SELECT public.can_write_active_theatre())) WITH CHECK (theatre_id = (SELECT public.active_theatre_id()) AND (SELECT public.can_write_active_theatre()));
CREATE POLICY theatre_delete ON public.group_items FOR DELETE TO authenticated USING (theatre_id = (SELECT public.active_theatre_id()) AND (SELECT public.can_write_active_theatre()));

ALTER TABLE public.scenes ENABLE ROW LEVEL SECURITY;
CREATE POLICY theatre_read ON public.scenes FOR SELECT TO anon, authenticated USING (theatre_id = (SELECT public.active_theatre_id()));
CREATE POLICY theatre_insert ON public.scenes FOR INSERT TO authenticated WITH CHECK (theatre_id = (SELECT public.active_theatre_id()) AND (SELECT public.can_write_active_theatre()));
CREATE POLICY theatre_update ON public.scenes FOR UPDATE TO authenticated USING (theatre_id = (SELECT public.active_theatre_id()) AND (SELECT public.can_write_active_theatre())) WITH CHECK (theatre_id = (SELECT public.active_theatre_id()) AND (SELECT public.can_write_active_theatre()));
CREATE POLICY theatre_delete ON public.scenes FOR DELETE TO authenticated USING (theatre_id = (SELECT public.active_theatre_id()) AND (SELECT public.can_write_active_theatre()));

ALTER TABLE public.performance_props ENABLE ROW LEVEL SECURITY;
CREATE POLICY theatre_read ON public.performance_props FOR SELECT TO anon, authenticated USING (theatre_id = (SELECT public.active_theatre_id()));
CREATE POLICY theatre_insert ON public.performance_props FOR INSERT TO authenticated WITH CHECK (theatre_id = (SELECT public.active_theatre_id()) AND (SELECT public.can_write_active_theatre()));
CREATE POLICY theatre_update ON public.performance_props FOR UPDATE TO authenticated USING (theatre_id = (SELECT public.active_theatre_id()) AND (SELECT public.can_write_active_theatre())) WITH CHECK (theatre_id = (SELECT public.active_theatre_id()) AND (SELECT public.can_write_active_theatre()));
CREATE POLICY theatre_delete ON public.performance_props FOR DELETE TO authenticated USING (theatre_id = (SELECT public.active_theatre_id()) AND (SELECT public.can_write_active_theatre()));

ALTER TABLE public.notes ENABLE ROW LEVEL SECURITY;
CREATE POLICY theatre_read ON public.notes FOR SELECT TO anon, authenticated USING (theatre_id = (SELECT public.active_theatre_id()));
CREATE POLICY theatre_insert ON public.notes FOR INSERT TO authenticated WITH CHECK (theatre_id = (SELECT public.active_theatre_id()) AND (SELECT public.can_write_active_theatre()));
CREATE POLICY theatre_update ON public.notes FOR UPDATE TO authenticated USING (theatre_id = (SELECT public.active_theatre_id()) AND (SELECT public.can_write_active_theatre())) WITH CHECK (theatre_id = (SELECT public.active_theatre_id()) AND (SELECT public.can_write_active_theatre()));
CREATE POLICY theatre_delete ON public.notes FOR DELETE TO authenticated USING (theatre_id = (SELECT public.active_theatre_id()) AND (SELECT public.can_write_active_theatre()));

ALTER TABLE public.note_mentions ENABLE ROW LEVEL SECURITY;
CREATE POLICY theatre_read ON public.note_mentions FOR SELECT TO anon, authenticated USING (theatre_id = (SELECT public.active_theatre_id()));
CREATE POLICY theatre_insert ON public.note_mentions FOR INSERT TO authenticated WITH CHECK (theatre_id = (SELECT public.active_theatre_id()) AND (SELECT public.can_write_active_theatre()));
CREATE POLICY theatre_update ON public.note_mentions FOR UPDATE TO authenticated USING (theatre_id = (SELECT public.active_theatre_id()) AND (SELECT public.can_write_active_theatre())) WITH CHECK (theatre_id = (SELECT public.active_theatre_id()) AND (SELECT public.can_write_active_theatre()));
CREATE POLICY theatre_delete ON public.note_mentions FOR DELETE TO authenticated USING (theatre_id = (SELECT public.active_theatre_id()) AND (SELECT public.can_write_active_theatre()));

ALTER TABLE public.show_lists ENABLE ROW LEVEL SECURITY;
CREATE POLICY theatre_read ON public.show_lists FOR SELECT TO anon, authenticated USING (theatre_id = (SELECT public.active_theatre_id()));
CREATE POLICY theatre_insert ON public.show_lists FOR INSERT TO authenticated WITH CHECK (theatre_id = (SELECT public.active_theatre_id()) AND (SELECT public.can_write_active_theatre()));
CREATE POLICY theatre_update ON public.show_lists FOR UPDATE TO authenticated USING (theatre_id = (SELECT public.active_theatre_id()) AND (SELECT public.can_write_active_theatre())) WITH CHECK (theatre_id = (SELECT public.active_theatre_id()) AND (SELECT public.can_write_active_theatre()));
CREATE POLICY theatre_delete ON public.show_lists FOR DELETE TO authenticated USING (theatre_id = (SELECT public.active_theatre_id()) AND (SELECT public.can_write_active_theatre()));

ALTER TABLE public.show_list_checks ENABLE ROW LEVEL SECURITY;
CREATE POLICY theatre_read ON public.show_list_checks FOR SELECT TO anon, authenticated USING (theatre_id = (SELECT public.active_theatre_id()));
CREATE POLICY theatre_insert ON public.show_list_checks FOR INSERT TO authenticated WITH CHECK (theatre_id = (SELECT public.active_theatre_id()) AND (SELECT public.can_write_active_theatre()));
CREATE POLICY theatre_update ON public.show_list_checks FOR UPDATE TO authenticated USING (theatre_id = (SELECT public.active_theatre_id()) AND (SELECT public.can_write_active_theatre())) WITH CHECK (theatre_id = (SELECT public.active_theatre_id()) AND (SELECT public.can_write_active_theatre()));
CREATE POLICY theatre_delete ON public.show_list_checks FOR DELETE TO authenticated USING (theatre_id = (SELECT public.active_theatre_id()) AND (SELECT public.can_write_active_theatre()));

ALTER TABLE public.show_list_reports ENABLE ROW LEVEL SECURITY;
CREATE POLICY theatre_read ON public.show_list_reports FOR SELECT TO anon, authenticated USING (theatre_id = (SELECT public.active_theatre_id()));
CREATE POLICY theatre_insert ON public.show_list_reports FOR INSERT TO authenticated WITH CHECK (theatre_id = (SELECT public.active_theatre_id()) AND (SELECT public.can_write_active_theatre()));
CREATE POLICY theatre_update ON public.show_list_reports FOR UPDATE TO authenticated USING (theatre_id = (SELECT public.active_theatre_id()) AND (SELECT public.can_write_active_theatre())) WITH CHECK (theatre_id = (SELECT public.active_theatre_id()) AND (SELECT public.can_write_active_theatre()));
CREATE POLICY theatre_delete ON public.show_list_reports FOR DELETE TO authenticated USING (theatre_id = (SELECT public.active_theatre_id()) AND (SELECT public.can_write_active_theatre()));

ALTER TABLE public.scene_checklists ENABLE ROW LEVEL SECURITY;
CREATE POLICY theatre_read ON public.scene_checklists FOR SELECT TO anon, authenticated USING (theatre_id = (SELECT public.active_theatre_id()));
CREATE POLICY theatre_insert ON public.scene_checklists FOR INSERT TO authenticated WITH CHECK (theatre_id = (SELECT public.active_theatre_id()) AND (SELECT public.can_write_active_theatre()));
CREATE POLICY theatre_update ON public.scene_checklists FOR UPDATE TO authenticated USING (theatre_id = (SELECT public.active_theatre_id()) AND (SELECT public.can_write_active_theatre())) WITH CHECK (theatre_id = (SELECT public.active_theatre_id()) AND (SELECT public.can_write_active_theatre()));
CREATE POLICY theatre_delete ON public.scene_checklists FOR DELETE TO authenticated USING (theatre_id = (SELECT public.active_theatre_id()) AND (SELECT public.can_write_active_theatre()));

ALTER TABLE public.scene_checklist_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY theatre_read ON public.scene_checklist_items FOR SELECT TO anon, authenticated USING (theatre_id = (SELECT public.active_theatre_id()));
CREATE POLICY theatre_insert ON public.scene_checklist_items FOR INSERT TO authenticated WITH CHECK (theatre_id = (SELECT public.active_theatre_id()) AND (SELECT public.can_write_active_theatre()));
CREATE POLICY theatre_update ON public.scene_checklist_items FOR UPDATE TO authenticated USING (theatre_id = (SELECT public.active_theatre_id()) AND (SELECT public.can_write_active_theatre())) WITH CHECK (theatre_id = (SELECT public.active_theatre_id()) AND (SELECT public.can_write_active_theatre()));
CREATE POLICY theatre_delete ON public.scene_checklist_items FOR DELETE TO authenticated USING (theatre_id = (SELECT public.active_theatre_id()) AND (SELECT public.can_write_active_theatre()));

ALTER TABLE public.qr_codes ENABLE ROW LEVEL SECURITY;
CREATE POLICY theatre_read ON public.qr_codes FOR SELECT TO anon, authenticated USING ((active = true AND access_level = 'public') OR theatre_id = (SELECT public.active_theatre_id()));
CREATE POLICY theatre_insert ON public.qr_codes FOR INSERT TO authenticated WITH CHECK (theatre_id = (SELECT public.active_theatre_id()) AND (SELECT public.can_write_active_theatre()));
CREATE POLICY theatre_update ON public.qr_codes FOR UPDATE TO authenticated USING (theatre_id = (SELECT public.active_theatre_id()) AND (SELECT public.can_write_active_theatre())) WITH CHECK (theatre_id = (SELECT public.active_theatre_id()) AND (SELECT public.can_write_active_theatre()));
CREATE POLICY theatre_delete ON public.qr_codes FOR DELETE TO authenticated USING (theatre_id = (SELECT public.active_theatre_id()) AND (SELECT public.can_write_active_theatre()));

ALTER TABLE public.ai_usage_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY theatre_read ON public.ai_usage_logs FOR SELECT TO anon, authenticated USING (theatre_id = (SELECT public.active_theatre_id()));
CREATE POLICY theatre_insert ON public.ai_usage_logs FOR INSERT TO authenticated WITH CHECK (true);

-- Trwałe usunięcie spektaklu (z Kosza) tylko dla kierownika pracowni; zwykłe „Usuń” to przeniesienie do kosza (UPDATE).
DROP POLICY theatre_delete ON public.performances;
CREATE POLICY theatre_delete ON public.performances FOR DELETE TO authenticated USING (
    theatre_id = (SELECT public.active_theatre_id()) AND (SELECT public.is_theatre_admin(public.active_theatre_id())));

-- Teatry i członkostwo
ALTER TABLE public.theatres ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.theatre_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.theatre_counters ENABLE ROW LEVEL SECURITY;

CREATE POLICY theatres_read ON public.theatres FOR SELECT TO anon, authenticated USING (
    is_demo OR public.is_admin()
    OR EXISTS (SELECT 1 FROM public.theatre_members m WHERE m.theatre_id = theatres.id AND m.user_id = auth.uid()));
CREATE POLICY theatres_write ON public.theatres FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());
-- Nazwę teatru zmienia tylko superadmin (ustalenie z 11.10): kierownik pracowni zarządza zespołem, nie teatrem.

-- Członkostwo: własne wiersze, wiersze kolegów z tych samych teatrów (funkcja omija RLS, żeby reguła nie
-- odwoływała się do samej siebie), superadmin wszystko.
CREATE OR REPLACE FUNCTION public.my_theatre_ids() RETURNS SETOF uuid
    LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
    SELECT theatre_id FROM public.theatre_members WHERE user_id = auth.uid()
$$;
CREATE POLICY members_read ON public.theatre_members FOR SELECT TO authenticated USING (
    public.is_admin() OR theatre_id IN (SELECT public.my_theatre_ids()));
CREATE POLICY members_write ON public.theatre_members FOR ALL TO authenticated
    USING (public.is_theatre_admin(theatre_id)) WITH CHECK (public.is_theatre_admin(theatre_id));
-- theatre_counters: bez reguł dla klientów; zmienia je tylko next_storage_code (SECURITY DEFINER).

-- Profile: zamiast „widzą wszyscy” (także anon, razem z adresami e-mail): własny profil, osoby z tych samych
-- teatrów i superadmin (te dwie reguły zostają z poprzedniego schematu).
DROP POLICY IF EXISTS "Public profiles are viewable by everyone." ON public.profiles;
DROP POLICY IF EXISTS "Public read access to profiles" ON public.profiles;
DROP POLICY IF EXISTS "Approved users can view all profiles" ON public.profiles;
-- Ta reguła pozwalała każdemu zatwierdzonemu kontu zmieniać cudze profile (imię, e-mail, bieżący teatr).
-- Zostają „Users can update own basic profile” i „Admins can update all profiles”.
DROP POLICY IF EXISTS "Approved users can update profile status" ON public.profiles;
CREATE POLICY profiles_same_theatre ON public.profiles FOR SELECT TO authenticated USING (
    EXISTS (SELECT 1 FROM public.theatre_members b WHERE b.user_id = profiles.id AND b.theatre_id IN (SELECT public.my_theatre_ids())));

-- 6. Unikalność w obrębie teatru ----------------------------------------------------------------------

ALTER TABLE public.groups DROP CONSTRAINT IF EXISTS groups_name_key;
CREATE UNIQUE INDEX IF NOT EXISTS groups_name_per_theatre ON public.groups (theatre_id, name);

DROP INDEX IF EXISTS public.locations_name_per_parent_key;
CREATE UNIQUE INDEX locations_name_per_parent_key ON public.locations
    (theatre_id, COALESCE(belongs_to, '00000000-0000-0000-0000-000000000000'::uuid), lower(name)) WHERE deleted_at IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS groups_code_per_theatre ON public.groups (theatre_id, code) WHERE code IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS group_items_code_per_theatre ON public.group_items (theatre_id, code) WHERE code IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS locations_code_per_theatre ON public.locations (theatre_id, code) WHERE code IS NOT NULL;

-- 7. Numery etykiet osobno w teatrze ----------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.next_storage_code(t uuid, k text) RETURNS text
    LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
    INSERT INTO public.theatre_counters AS c (theatre_id, kind, last_value) VALUES (t, k, 1)
    ON CONFLICT (theatre_id, kind) DO UPDATE SET last_value = c.last_value + 1
    RETURNING k || '-' || lpad(last_value::text, 4, '0')
$$;
REVOKE ALL ON FUNCTION public.next_storage_code(uuid, text) FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.assign_storage_code() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
    IF NEW.code IS NULL AND NEW.theatre_id IS NOT NULL THEN
        IF TG_TABLE_NAME = 'groups' THEN
            NEW.code := public.next_storage_code(NEW.theatre_id, 'GRP');
        ELSIF TG_TABLE_NAME = 'group_items' THEN
            NEW.code := public.next_storage_code(NEW.theatre_id, 'REK');
        ELSIF TG_TABLE_NAME = 'locations' AND NEW.belongs_to IS NOT NULL THEN
            NEW.code := public.next_storage_code(NEW.theatre_id, 'MSC');
        END IF;
    END IF;
    RETURN NEW;
END $$;

-- Liczniki teatru demo startują od najwyższego wydanego numeru, żeby nowe etykiety nie powtórzyły starych.
INSERT INTO public.theatre_counters (theatre_id, kind, last_value)
SELECT theatre_id, kind, max(n) FROM (
    SELECT theatre_id, 'GRP' AS kind, substring(code FROM '^GRP-(\d+)$')::int AS n FROM public.groups
    UNION ALL SELECT theatre_id, 'REK', substring(code FROM '^REK-(\d+)$')::int FROM public.group_items
    UNION ALL SELECT theatre_id, 'MSC', substring(code FROM '^MSC-(\d+)$')::int FROM public.locations
) x WHERE n IS NOT NULL
GROUP BY theatre_id, kind
ON CONFLICT (theatre_id, kind) DO UPDATE SET last_value = GREATEST(public.theatre_counters.last_value, EXCLUDED.last_value);

-- 8. Pliki ----------------------------------------------------------------------------------------------
-- Standard ścieżek (docs/TEATRY.md): <teatr>/<rodzaj>/<id rzeczy>/<losowe>.webp, np. <teatr>/plakaty/<spektakl>/….
-- Awatary: osoby/<id konta>/…. Buckety zostają publiczne do odczytu (adresy w <img>); zapisywać, podmieniać
-- i usuwać można tylko pliki swojego bieżącego teatru, i tylko z prawem zapisu (nie podgląd, nie anon).
-- Stare pliki (bez teatru w ścieżce) zostają do odczytu, ale nikt poza kluczem serwisowym ich nie zmieni.

DO $$
DECLARE r record;
BEGIN
    FOR r IN SELECT policyname FROM pg_policies
              WHERE schemaname = 'storage' AND tablename = 'objects'
                AND (coalesce(qual, '') || coalesce(with_check, '')) ~ '(posters|item-images|items|location-maps)'
    LOOP
        EXECUTE format('DROP POLICY %I ON storage.objects', r.policyname);
    END LOOP;
END $$;

-- Bucket „avatars” powstanie razem z awatarami ze zdjęcia; reguła dla niego jest gotowa już teraz.

CREATE POLICY rk_files_read ON storage.objects FOR SELECT
    USING (bucket_id IN ('posters', 'item-images', 'items', 'location-maps', 'avatars'));
CREATE POLICY rk_files_insert ON storage.objects FOR INSERT TO authenticated WITH CHECK (
    bucket_id IN ('posters', 'item-images', 'items', 'location-maps')
    AND (storage.foldername(name))[1] = (SELECT public.active_theatre_id())::text
    AND (SELECT public.can_write_active_theatre()));
CREATE POLICY rk_files_update ON storage.objects FOR UPDATE TO authenticated
    USING (bucket_id IN ('posters', 'item-images', 'items', 'location-maps')
        AND (storage.foldername(name))[1] = (SELECT public.active_theatre_id())::text
        AND (SELECT public.can_write_active_theatre()))
    WITH CHECK ((storage.foldername(name))[1] = (SELECT public.active_theatre_id())::text);
CREATE POLICY rk_files_delete ON storage.objects FOR DELETE TO authenticated USING (
    bucket_id IN ('posters', 'item-images', 'items', 'location-maps')
    AND (storage.foldername(name))[1] = (SELECT public.active_theatre_id())::text
    AND (SELECT public.can_write_active_theatre()));
-- Awatar zmienia tylko jego właściciel.
CREATE POLICY rk_avatars_write ON storage.objects FOR ALL TO authenticated
    USING (bucket_id = 'avatars' AND (storage.foldername(name))[1] = 'osoby' AND (storage.foldername(name))[2] = auth.uid()::text)
    WITH CHECK (bucket_id = 'avatars' AND (storage.foldername(name))[1] = 'osoby' AND (storage.foldername(name))[2] = auth.uid()::text);

-- 9. Wyszukiwanie ---------------------------------------------------------------------------------------
-- Widok wyszukiwania dostaje theatre_id. Funkcje na nim działają jako SECURITY DEFINER (omijają RLS),
-- więc filtrują po bieżącym teatrze same. Klient nie czyta widoku bezpośrednio.

DROP MATERIALIZED VIEW IF EXISTS public.vw_searchable_entities;
CREATE MATERIALIZED VIEW "public"."vw_searchable_entities" AS
 SELECT 'performance'::"text" AS "entity_type",
    "performances"."id",
    "performances"."theatre_id",
    "performances"."title" AS "name",
    "performances"."notes" AS "description",
    "performances"."embedding" AS "embedding_identity",
    NULL::"extensions"."vector"(768) AS "embedding_physical",
    NULL::"extensions"."vector"(768) AS "embedding_context",
    "performances"."updated_at",
    ('/performances/'::"text" || "performances"."id") AS "url",
    "performances"."image_url",
    "jsonb_build_object"('color', "performances"."color", 'status', "performances"."status", 'next_show', ( SELECT "min"("scene_checklists"."show_date") AS "min"
           FROM "public"."scene_checklists"
          WHERE (("scene_checklists"."performance_id" = "performances"."id") AND ("scene_checklists"."show_date" > "now"())))) AS "metadata"
   FROM "public"."performances"
  WHERE ("performances"."deleted_at" IS NULL)
UNION ALL
 SELECT 'group'::"text" AS "entity_type",
    "groups"."id",
    "groups"."theatre_id",
    "groups"."name",
    NULL::"text" AS "description",
    "groups"."embedding_identity",
    "groups"."embedding_physical",
    "groups"."embedding_context",
    "groups"."created_at" AS "updated_at",
    ('/groups?viewGroup='::"text" || "groups"."id") AS "url",
    NULL::"text" AS "image_url",
    "jsonb_build_object"('icon', "groups"."icon", 'color', "groups"."color", 'location_name', ( SELECT "locations"."name"
           FROM "public"."locations"
          WHERE ("locations"."id" = "groups"."location_id"))) AS "metadata"
   FROM "public"."groups"
  WHERE ("groups"."deleted_at" IS NULL)
UNION ALL
 SELECT 'location'::"text" AS "entity_type",
    "locations"."id",
    "locations"."theatre_id",
    "locations"."name",
    "locations"."description",
    "locations"."embedding" AS "embedding_identity",
    NULL::"extensions"."vector"(768) AS "embedding_physical",
    NULL::"extensions"."vector"(768) AS "embedding_context",
    "locations"."created_at" AS "updated_at",
    ('/items?locationId='::"text" || "locations"."id") AS "url",
    NULL::"text" AS "image_url",
    "jsonb_build_object"('type', "locations"."type") AS "metadata"
   FROM "public"."locations"
  WHERE ("locations"."deleted_at" IS NULL)
UNION ALL
 SELECT 'note'::"text" AS "entity_type",
    "notes"."id",
    "notes"."theatre_id",
    "notes"."title" AS "name",
    ("notes"."content")::"text" AS "description",
    "notes"."embedding" AS "embedding_identity",
    NULL::"extensions"."vector"(768) AS "embedding_physical",
    NULL::"extensions"."vector"(768) AS "embedding_context",
    "notes"."updated_at",
    ('/notes/'::"text" || "notes"."id") AS "url",
    NULL::"text" AS "image_url",
    NULL::"jsonb" AS "metadata"
   FROM "public"."notes"
  WITH NO DATA;
ALTER MATERIALIZED VIEW public.vw_searchable_entities OWNER TO postgres;
CREATE INDEX "idx_searchable_entities_context" ON "public"."vw_searchable_entities" USING "hnsw" ("embedding_context" "extensions"."vector_cosine_ops");
CREATE INDEX "idx_searchable_entities_fts" ON "public"."vw_searchable_entities" USING "gin" ((("setweight"("to_tsvector"('"simple"'::"regconfig", "name"), 'A'::"char") || "setweight"("to_tsvector"('"simple"'::"regconfig", COALESCE("description", ''::"text")), 'B'::"char"))));
CREATE INDEX "idx_searchable_entities_identity" ON "public"."vw_searchable_entities" USING "hnsw" ("embedding_identity" "extensions"."vector_cosine_ops");
CREATE INDEX "idx_searchable_entities_physical" ON "public"."vw_searchable_entities" USING "hnsw" ("embedding_physical" "extensions"."vector_cosine_ops");
CREATE INDEX "idx_searchable_entities_trgm" ON "public"."vw_searchable_entities" USING "gin" ("name" "public"."gin_trgm_ops");
CREATE UNIQUE INDEX "idx_searchable_entities_unique" ON "public"."vw_searchable_entities" USING "btree" ("entity_type", "id");
CREATE INDEX idx_searchable_entities_theatre ON public.vw_searchable_entities (theatre_id);
REVOKE ALL ON public.vw_searchable_entities FROM anon, authenticated;
REFRESH MATERIALIZED VIEW public.vw_searchable_entities;

CREATE OR REPLACE FUNCTION "public"."search_global"("query_text" "text", "match_threshold" double precision DEFAULT 0.5, "match_count" integer DEFAULT 20, "fuzzy_threshold" double precision DEFAULT 0.3) RETURNS TABLE("entity_type" "text", "id" "uuid", "name" "text", "description" "text", "url" "text", "image_url" "text", "metadata" "jsonb", "score" double precision, "match_type" "text")
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  search_query tsquery;
BEGIN
  IF query_text IS NULL OR trim(query_text) = '' THEN
    RETURN;
  END IF;

  -- Build tsquery with prefix matching
  BEGIN
    search_query := to_tsquery('simple', 
      replace(
        plainto_tsquery('simple', query_text)::text, 
        '''', 
        ''':*'
      )
    );
  EXCEPTION WHEN OTHERS THEN
    search_query := websearch_to_tsquery('simple', query_text);
  END;
  
  IF search_query IS NULL THEN
     search_query := websearch_to_tsquery('simple', query_text);
  END IF;

  RETURN QUERY
  -- Full-text search results with weighted ranking
  SELECT 
    v.entity_type,
    v.id,
    v.name,
    v.description,
    v.url,
    v.image_url,
    v.metadata,
    ts_rank(
      setweight(to_tsvector('simple', v.name), 'A') || 
      setweight(to_tsvector('simple', COALESCE(v.description, '')), 'B'),
      search_query
    )::float as score,
    'fts'::text as match_type
  FROM (SELECT * FROM vw_searchable_entities WHERE theatre_id = public.active_theatre_id()) v
  WHERE (
    setweight(to_tsvector('simple', v.name), 'A') || 
    setweight(to_tsvector('simple', COALESCE(v.description, '')), 'B')
  ) @@ search_query
  
  UNION
  
  -- Fuzzy matching for typos (trigram similarity)
  SELECT 
    v.entity_type,
    v.id,
    v.name,
    v.description,
    v.url,
    v.image_url,
    v.metadata,
    similarity(v.name, query_text)::float as score,
    'fuzzy'::text as match_type
  FROM (SELECT * FROM vw_searchable_entities WHERE theatre_id = public.active_theatre_id()) v
  WHERE similarity(v.name, query_text) > fuzzy_threshold
    AND NOT EXISTS (
      -- Exclude if already found by FTS
      SELECT 1 FROM (SELECT * FROM vw_searchable_entities WHERE theatre_id = public.active_theatre_id()) fts
      WHERE fts.id = v.id 
        AND fts.entity_type = v.entity_type
        AND (
          setweight(to_tsvector('simple', fts.name), 'A') || 
          setweight(to_tsvector('simple', COALESCE(fts.description, '')), 'B')
        ) @@ search_query
    )
  
  ORDER BY score DESC
  LIMIT match_count;
END;
$$;

CREATE OR REPLACE FUNCTION "public"."search_global_hybrid"("query_text" "text", "query_embedding" "extensions"."vector", "match_threshold" double precision DEFAULT 0.4, "match_count" integer DEFAULT 20, "fuzzy_threshold" double precision DEFAULT 0.3) RETURNS TABLE("entity_type" "text", "id" "uuid", "name" "text", "description" "text", "url" "text", "image_url" "text", "metadata" "jsonb", "score" double precision, "match_type" "text")
    LANGUAGE "plpgsql"
    AS $$
DECLARE
  search_query tsquery;
BEGIN
  IF query_text IS NULL OR trim(query_text) = '' THEN
    RETURN;
  END IF;

  -- Build tsquery with prefix matching
  BEGIN
    search_query := to_tsquery('simple', 
      replace(
        plainto_tsquery('simple', query_text)::text, 
        '''', 
        ''':*'
      )
    );
  EXCEPTION WHEN OTHERS THEN
    search_query := websearch_to_tsquery('simple', query_text);
  END;
  
  IF search_query IS NULL THEN
     search_query := websearch_to_tsquery('simple', query_text);
  END IF;

  RETURN QUERY
  WITH 
  -- 1. FTS results (highest priority)
  fts_results AS (
    SELECT 
      v.entity_type,
      v.id,
      v.name,
      v.description,
      v.url,
      v.image_url,
      v.metadata,
      ts_rank(
        setweight(to_tsvector('simple', v.name), 'A') || 
        setweight(to_tsvector('simple', COALESCE(v.description, '')), 'B'),
        search_query
      )::float as score,
      'fts'::text as match_type
    FROM (SELECT * FROM vw_searchable_entities WHERE theatre_id = public.active_theatre_id()) v
    WHERE (
      setweight(to_tsvector('simple', v.name), 'A') || 
      setweight(to_tsvector('simple', COALESCE(v.description, '')), 'B')
    ) @@ search_query
  ),
  
  -- 2. Fuzzy results (medium priority) - exclude FTS matches
  fuzzy_results AS (
    SELECT 
      v.entity_type,
      v.id,
      v.name,
      v.description,
      v.url,
      v.image_url,
      v.metadata,
      similarity(v.name, query_text)::float as score,
      'fuzzy'::text as match_type
    FROM (SELECT * FROM vw_searchable_entities WHERE theatre_id = public.active_theatre_id()) v
    WHERE similarity(v.name, query_text) > fuzzy_threshold
      AND NOT EXISTS (
        SELECT 1 FROM fts_results f 
        WHERE f.entity_type = v.entity_type AND f.id = v.id
      )
  ),
  
  -- 3. Vector results (lowest priority) - exclude FTS and Fuzzy matches
  vector_results AS (
    SELECT 
      v.entity_type,
      v.id,
      v.name,
      v.description,
      v.url,
      v.image_url,
      v.metadata,
      (1 - (v.embedding <=> query_embedding))::float as score,
      'vector'::text as match_type
    FROM (SELECT * FROM vw_searchable_entities WHERE theatre_id = public.active_theatre_id()) v
    WHERE v.embedding IS NOT NULL 
      AND 1 - (v.embedding <=> query_embedding) > match_threshold
      AND NOT EXISTS (
        SELECT 1 FROM fts_results f 
        WHERE f.entity_type = v.entity_type AND f.id = v.id
      )
      AND NOT EXISTS (
        SELECT 1 FROM fuzzy_results fz 
        WHERE fz.entity_type = v.entity_type AND fz.id = v.id
      )
  ),
  
  -- Combine all results
  combined_results AS (
    SELECT * FROM fts_results
    UNION ALL
    SELECT * FROM fuzzy_results
    UNION ALL
    SELECT * FROM vector_results
  )
  
  -- Final select with explicit column references
  SELECT 
    combined_results.entity_type,
    combined_results.id,
    combined_results.name,
    combined_results.description,
    combined_results.url,
    combined_results.image_url,
    combined_results.metadata,
    combined_results.score,
    combined_results.match_type
  FROM combined_results
  ORDER BY 
    CASE combined_results.match_type
      WHEN 'fts' THEN 1
      WHEN 'fuzzy' THEN 2
      WHEN 'vector' THEN 3
    END,
    combined_results.score DESC
  LIMIT match_count;
END;
$$;

CREATE OR REPLACE FUNCTION "public"."search_global_hybrid_mv"("query_text" "text", "query_embedding" "extensions"."vector", "weight_identity" double precision DEFAULT 0.5, "weight_physical" double precision DEFAULT 0.3, "weight_context" double precision DEFAULT 0.2, "match_threshold" double precision DEFAULT 0.4, "match_count" integer DEFAULT 20, "fuzzy_threshold" double precision DEFAULT 0.3) RETURNS TABLE("entity_type" "text", "id" "uuid", "name" "text", "description" "text", "url" "text", "image_url" "text", "metadata" "jsonb", "score" double precision, "match_type" "text")
    LANGUAGE "plpgsql"
    AS $$
DECLARE
  search_query tsquery;
BEGIN
  IF query_text IS NULL OR trim(query_text) = '' THEN
    RETURN;
  END IF;

  BEGIN
    search_query := to_tsquery('simple', replace(plainto_tsquery('simple', query_text)::text, '''', ''':*'));
  EXCEPTION WHEN OTHERS THEN
    search_query := websearch_to_tsquery('simple', query_text);
  END;
  
  IF search_query IS NULL THEN
     search_query := websearch_to_tsquery('simple', query_text);
  END IF;

  RETURN QUERY
  SELECT 
    v.entity_type, v.id, v.name, v.description, v.url, v.image_url, v.metadata,
    ts_rank(setweight(to_tsvector('simple', v.name), 'A') || setweight(to_tsvector('simple', COALESCE(v.description, '')), 'B'), search_query)::float as score,
    'fts'::text as match_type
  FROM (SELECT * FROM vw_searchable_entities WHERE theatre_id = public.active_theatre_id()) v
  WHERE (setweight(to_tsvector('simple', v.name), 'A') || setweight(to_tsvector('simple', COALESCE(v.description, '')), 'B')) @@ search_query
  
  UNION ALL
  
  SELECT 
    v.entity_type, v.id, v.name, v.description, v.url, v.image_url, v.metadata,
    (COALESCE((1 - (v.embedding_identity <=> query_embedding)), 0) * weight_identity +
     COALESCE((1 - (v.embedding_physical <=> query_embedding)), 0) * weight_physical +
     COALESCE((1 - (v.embedding_context <=> query_embedding)), 0) * weight_context)::float as score,
    'vector'::text as match_type
  FROM (SELECT * FROM vw_searchable_entities WHERE theatre_id = public.active_theatre_id()) v
  WHERE (v.embedding_identity IS NOT NULL OR v.embedding_physical IS NOT NULL OR v.embedding_context IS NOT NULL)
    AND (COALESCE((1 - (v.embedding_identity <=> query_embedding)), 0) * weight_identity +
         COALESCE((1 - (v.embedding_physical <=> query_embedding)), 0) * weight_physical +
         COALESCE((1 - (v.embedding_context <=> query_embedding)), 0) * weight_context) > match_threshold
  
  UNION ALL
  
  SELECT 
    v.entity_type, v.id, v.name, v.description, v.url, v.image_url, v.metadata,
    similarity(v.name, query_text)::float as score,
    'fuzzy'::text as match_type
  FROM (SELECT * FROM vw_searchable_entities WHERE theatre_id = public.active_theatre_id()) v
  WHERE similarity(v.name, query_text) > fuzzy_threshold
  
  ORDER BY score DESC
  LIMIT match_count * 3;
END;
$$;

-- search_global_direct czyta tabele wprost: wystarczy, że działa z prawami wywołującego (RLS zrobi resztę).
ALTER FUNCTION public.search_global_direct(text, double precision, integer, double precision) SECURITY INVOKER;

COMMIT;
