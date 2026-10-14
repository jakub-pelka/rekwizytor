-- Dziennik zespołu teatru (12.10.2026): kto komu pozwolił wejść, kto zmienił rolę, kto kogo usunął.
--
-- Konta powstają tylko z zaproszenia na konkretny e-mail, więc przy problemie z kontem trzeba wiedzieć, kto
-- zaprosił. Dwa miejsca:
--  1. theatre_members.invited_by / invited_at: kto i kiedy dodał osobę (bieżący stan);
--  2. theatre_member_events: dziennik zdarzeń, tylko do dopisywania. Zawiera kopie e-maili i imion, bo konta
--     i członkostwa można usunąć, a dziennik ma przetrwać. Klienci aplikacji go nie zapisują ani nie zmieniają:
--     wpisy robi wyzwalacz na theatre_members, więc dotyczy każdej drogi zmiany (aplikacja, SQL Editor).
--
-- Wymaga migracji 20261011_theatres.sql.

BEGIN;

ALTER TABLE public.theatre_members
    ADD COLUMN IF NOT EXISTS invited_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS invited_at timestamptz;
UPDATE public.theatre_members SET invited_at = created_at WHERE invited_at IS NULL;
ALTER TABLE public.theatre_members ALTER COLUMN invited_at SET DEFAULT now();

CREATE TABLE IF NOT EXISTS public.theatre_member_events (
    id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    theatre_id uuid NOT NULL REFERENCES public.theatres(id) ON DELETE CASCADE,
    -- Kopie, bez kluczy obcych: konto albo członkostwo można usunąć, wpis w dzienniku zostaje.
    user_id uuid,
    user_email text,
    user_name text,
    actor_id uuid,
    actor_email text,
    actor_name text,
    action text NOT NULL CHECK (action IN ('added', 'role_changed', 'removed', 'migrated')),
    role text,
    previous_role text,
    created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS theatre_member_events_theatre_idx ON public.theatre_member_events (theatre_id, created_at DESC);

-- Kto dodaje: zalogowane konto z bieżącego żądania (null przy kluczu serwisowym albo ręcznie w SQL).
CREATE OR REPLACE FUNCTION public.theatre_members_set_inviter() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
    IF NEW.invited_by IS NULL THEN NEW.invited_by := auth.uid(); END IF;
    IF NEW.invited_at IS NULL THEN NEW.invited_at := now(); END IF;
    RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS a_set_inviter ON public.theatre_members;
CREATE TRIGGER a_set_inviter BEFORE INSERT ON public.theatre_members
    FOR EACH ROW EXECUTE FUNCTION public.theatre_members_set_inviter();

CREATE OR REPLACE FUNCTION public.log_theatre_member_change() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
    subject uuid := CASE WHEN TG_OP = 'DELETE' THEN OLD.user_id ELSE NEW.user_id END;
    theatre uuid := CASE WHEN TG_OP = 'DELETE' THEN OLD.theatre_id ELSE NEW.theatre_id END;
    who record;
    actor record;
BEGIN
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

DROP TRIGGER IF EXISTS log_member_change ON public.theatre_members;
CREATE TRIGGER log_member_change AFTER INSERT OR UPDATE OF role OR DELETE ON public.theatre_members
    FOR EACH ROW EXECUTE FUNCTION public.log_theatre_member_change();

-- Obecni członkowie wchodzą do dziennika jako „migrated” (nie wiadomo, kto ich dodał: to stan sprzed dziennika).
INSERT INTO public.theatre_member_events (theatre_id, user_id, user_email, user_name, action, role, created_at)
SELECT m.theatre_id, m.user_id, p.email, p.full_name, 'migrated', m.role, m.created_at
  FROM public.theatre_members m JOIN public.profiles p ON p.id = m.user_id
 WHERE NOT EXISTS (SELECT 1 FROM public.theatre_member_events e WHERE e.theatre_id = m.theatre_id AND e.user_id = m.user_id);

-- Dziennik: czytają superadmin i kierownik danego teatru. Nikt z aplikacji nie zapisuje, nie zmienia ani nie kasuje.
ALTER TABLE public.theatre_member_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY events_read ON public.theatre_member_events FOR SELECT TO authenticated
    USING (public.is_admin() OR public.is_theatre_admin(theatre_id));
REVOKE INSERT, UPDATE, DELETE, TRUNCATE ON public.theatre_member_events FROM anon, authenticated;

COMMIT;
