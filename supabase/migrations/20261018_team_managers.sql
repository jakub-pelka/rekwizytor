-- Zespół teatru dla kierownika pracowni (18.10.2026): zaproszenia, lista zespołu, strażnik ról.
--
--  1. theatre_members.joined_at: NULL = zaproszenie czeka (osoba nie ustawiła jeszcze imienia i hasła).
--     Istniejące wiersze dostają joined_at = created_at (tylko przy pierwszym uruchomieniu migracji).
--  2. theatre_team(t): lista zespołu teatru z e-mailem i ostatnim logowaniem (dane z auth.users, których klient
--     nie czyta). Zwraca wiersze tylko członkom teatru t i superadminowi.
--  3. complete_invite(imię i nazwisko): zaproszony kończy zaproszenie (imię w profilu, joined_at, wpis „joined”).
--  4. Strażnik theatre_members: teatr zawsze ma kierownika, nikt (poza superadminem) nie zmienia własnej roli
--     ani nie usuwa siebie z zespołu.
--
-- Wymaga migracji 20261011_theatres.sql i 20261012_theatre_audit.sql.

BEGIN;

-- 1. joined_at ---------------------------------------------------------------------------------------------

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                    WHERE table_schema = 'public' AND table_name = 'theatre_members' AND column_name = 'joined_at') THEN
        ALTER TABLE public.theatre_members ADD COLUMN joined_at timestamptz;
        -- Wyłącznie przy dodaniu kolumny: po ponownym uruchomieniu nie wolno „dołączyć” czekających zaproszeń.
        UPDATE public.theatre_members SET joined_at = created_at;
    END IF;
END $$;

-- 2. Dziennik: rodzaj „joined” -------------------------------------------------------------------------------

ALTER TABLE public.theatre_member_events DROP CONSTRAINT IF EXISTS theatre_member_events_action_check;
ALTER TABLE public.theatre_member_events ADD CONSTRAINT theatre_member_events_action_check
    CHECK (action IN ('added', 'role_changed', 'removed', 'migrated', 'joined'));
-- Wyzwalacz dziennika (log_member_change) reaguje na UPDATE OF role i porównuje role, więc ustawienie joined_at
-- nie tworzy fałszywego wpisu „zmiana roli”. Wpis „joined” robi complete_invite.

-- Poprawka wyzwalacza dziennika z 20261012: przy usuwaniu całego teatru kaskada kasuje członków już po usunięciu
-- wiersza teatru, a wpis „removed” ma klucz obcy do theatres, więc usunięcie teatru kończyło się błędem.
-- Teatru nie ma, dziennik teatru i tak znika razem z nim (ON DELETE CASCADE), więc wpisu nie robimy.
CREATE OR REPLACE FUNCTION public.log_theatre_member_change() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
    subject uuid := CASE WHEN TG_OP = 'DELETE' THEN OLD.user_id ELSE NEW.user_id END;
    theatre uuid := CASE WHEN TG_OP = 'DELETE' THEN OLD.theatre_id ELSE NEW.theatre_id END;
    who record;
    actor record;
BEGIN
    IF TG_OP = 'DELETE' AND NOT EXISTS (SELECT 1 FROM public.theatres WHERE id = theatre) THEN
        RETURN NULL;
    END IF;
    SELECT email, full_name INTO who FROM public.profiles WHERE id = subject;
    SELECT email, full_name INTO actor FROM public.profiles WHERE id = auth.uid();

    IF TG_OP = 'INSERT' THEN
        INSERT INTO public.theatre_member_events (theatre_id, user_id, user_email, user_name, actor_id, actor_email, actor_name, action, role)
        VALUES (theatre, subject, who.email, who.full_name, auth.uid(), actor.email, actor.full_name, 'added', NEW.role);
    ELSIF TG_OP = 'UPDATE' THEN
        IF NEW.role IS DISTINCT FROM OLD.role THEN
            INSERT INTO public.theatre_member_events (theatre_id, user_id, user_email, user_name, actor_id, actor_email, actor_name, action, role, previous_role)
            VALUES (theatre, subject, who.email, who.full_name, auth.uid(), actor.email, actor.full_name, 'role_changed', NEW.role, OLD.role);
        END IF;
    ELSE
        INSERT INTO public.theatre_member_events (theatre_id, user_id, user_email, user_name, actor_id, actor_email, actor_name, action, role)
        VALUES (theatre, subject, who.email, who.full_name, auth.uid(), actor.email, actor.full_name, 'removed', OLD.role);
    END IF;
    RETURN NULL;
END $$;

-- 3. Lista zespołu -----------------------------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.theatre_team(t uuid)
RETURNS TABLE (user_id uuid, full_name text, email text, role text, invited_at timestamptz, joined_at timestamptz,
               invited_by_name text, last_sign_in_at timestamptz)
    LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, auth AS $$
    SELECT m.user_id,
           p.full_name,
           coalesce(u.email::text, p.email),
           m.role,
           m.invited_at,
           m.joined_at,
           coalesce(nullif(trim(ip.full_name), ''), ip.email),
           u.last_sign_in_at
      FROM public.theatre_members m
      LEFT JOIN public.profiles p ON p.id = m.user_id
      LEFT JOIN auth.users u ON u.id = m.user_id
      LEFT JOIN public.profiles ip ON ip.id = m.invited_by
     WHERE m.theatre_id = t
       AND (public.is_admin() OR EXISTS (
            SELECT 1 FROM public.theatre_members me WHERE me.theatre_id = t AND me.user_id = auth.uid()))
     ORDER BY m.invited_at, m.created_at
$$;
REVOKE ALL ON FUNCTION public.theatre_team(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.theatre_team(uuid) TO authenticated;

-- 4. Zakończenie zaproszenia -------------------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.complete_invite(p_full_name text) RETURNS void
    LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
    uid uuid := auth.uid();
    nm text := trim(coalesce(p_full_name, ''));
    me record;
    mem record;
BEGIN
    IF uid IS NULL THEN
        RAISE EXCEPTION 'Zaloguj się.' USING ERRCODE = 'P0001';
    END IF;
    IF length(nm) = 0 OR length(nm) > 120 THEN
        RAISE EXCEPTION 'Wpisz imię i nazwisko.' USING ERRCODE = 'P0001';
    END IF;

    UPDATE public.profiles SET full_name = nm WHERE id = uid;

    SELECT email, full_name INTO me FROM public.profiles WHERE id = uid;
    FOR mem IN
        UPDATE public.theatre_members SET joined_at = now()
         WHERE user_id = uid AND joined_at IS NULL
        RETURNING theatre_id, role
    LOOP
        INSERT INTO public.theatre_member_events (theatre_id, user_id, user_email, user_name, actor_id, actor_email, actor_name, action, role)
        VALUES (mem.theatre_id, uid, me.email, me.full_name, uid, me.email, me.full_name, 'joined', mem.role);
    END LOOP;
END $$;
REVOKE ALL ON FUNCTION public.complete_invite(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.complete_invite(text) TO authenticated;

-- 5. Strażnik ról ------------------------------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.guard_theatre_members() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
    changes_role boolean := TG_OP = 'DELETE' OR NEW.role IS DISTINCT FROM OLD.role;
BEGIN
    IF NOT changes_role THEN
        RETURN NEW;
    END IF;

    -- Usuwanie całego teatru: ON DELETE CASCADE z theatres kasuje członków w zapytaniu, które wykonuje się już
    -- po usunięciu wiersza teatru (zdarzenie RI jest AFTER, a wywołanie jest w tej samej transakcji z nowszym
    -- numerem polecenia), więc teatru nie ma w theatres i nie blokujemy. Zwykłe usunięcie członka lub zmiana roli
    -- zawsze zostawiają teatr na miejscu.
    IF TG_OP = 'DELETE' AND NOT EXISTS (SELECT 1 FROM public.theatres WHERE id = OLD.theatre_id) THEN
        RETURN OLD;
    END IF;

    -- Własna rola i własne członkostwo: tylko superadmin. auth.uid() NULL (klucz serwisowy, SQL Editor) omija
    -- wyłącznie tę regułę.
    IF auth.uid() IS NOT NULL AND auth.uid() = OLD.user_id AND NOT public.is_admin() THEN
        IF TG_OP = 'DELETE' THEN
            RAISE EXCEPTION 'Nie usuniesz siebie z zespołu.' USING ERRCODE = 'P0001';
        END IF;
        RAISE EXCEPTION 'Swojej roli nie zmienisz sam.' USING ERRCODE = 'P0001';
    END IF;

    -- Ostatni kierownik: po zmianie w teatrze zostaje co najmniej jeden wiersz z rolą admin. Blokada doradcza
    -- na teatr, żeby dwie równoległe zmiany nie odebrały roli obu ostatnim kierownikom naraz.
    IF OLD.role = 'admin' AND (TG_OP = 'DELETE' OR NEW.role <> 'admin') THEN
        PERFORM pg_advisory_xact_lock(hashtextextended('theatre_members:' || OLD.theatre_id::text, 0));
        IF NOT EXISTS (SELECT 1 FROM public.theatre_members
                        WHERE theatre_id = OLD.theatre_id AND role = 'admin' AND user_id <> OLD.user_id) THEN
            RAISE EXCEPTION 'Teatr musi mieć co najmniej jednego kierownika.' USING ERRCODE = 'P0001';
        END IF;
    END IF;

    IF TG_OP = 'DELETE' THEN RETURN OLD; END IF;
    RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS guard_members ON public.theatre_members;
CREATE TRIGGER guard_members BEFORE UPDATE OF role OR DELETE ON public.theatre_members
    FOR EACH ROW EXECUTE FUNCTION public.guard_theatre_members();

COMMIT;
