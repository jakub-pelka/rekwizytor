-- Strażnik profilu (18.10.2026): protect_profile_fields pozwalał zmieniać status i rolę tylko superadminowi
-- (is_admin() po auth.uid()). Serwer aplikacji z kluczem serwisowym nie ma auth.uid(), więc też był blokowany:
-- zaproszenie (addTheatreMember, inviteToTeam) nie zatwierdzało profilu i nowa osoba lądowała na /waiting.
-- Teraz: superadmin albo klucz serwisowy (auth.role() = 'service_role'). Każdy inny, także SQL Editor bez
-- ustawionego użytkownika, dalej nie zmieni statusu ani roli.

BEGIN;

CREATE OR REPLACE FUNCTION public.protect_profile_fields() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, extensions AS $$
BEGIN
    IF NOT public.is_admin() AND coalesce(auth.role(), '') <> 'service_role' THEN
        IF NEW.status IS DISTINCT FROM OLD.status THEN
            RAISE EXCEPTION 'You are not authorized to change status';
        END IF;
        IF NEW.role IS DISTINCT FROM OLD.role THEN
            RAISE EXCEPTION 'You are not authorized to change role';
        END IF;
    END IF;
    RETURN NEW;
END;
$$;

COMMIT;
