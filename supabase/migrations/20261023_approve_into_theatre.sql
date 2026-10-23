-- RK-01: zatwierdzenie konta dodaje osobę do teatru (fala 2.1, 23.10.2026).
-- Dotąd zatwierdzenie zmieniało tylko profiles.status, więc osoba nie trafiała do żadnego teatru (theatre_members)
-- i po zalogowaniu widziała „nie dodano do żadnego teatru”. Zatwierdzić mógł też każdy zatwierdzony użytkownik,
-- a kierownik teatru bez roli superadmina dostawał błąd z bazy (protect_profile_fields).
-- Teraz zatwierdza i odrzuca wyłącznie kierownik pracowni bieżącego teatru (albo superadmin), jedną funkcją, w jednej transakcji:
--   approve_pending_user(p_user, p_role): status 'approved', członkostwo w teatrze wołającego z podaną rolą,
--                                         current_theatre_id tylko gdy był pusty;
--   reject_pending_user(p_user):          status 'rejected'.
-- Wymaga migracji 20261011_theatres.sql (teatry, active_theatre_id, is_theatre_admin) i 20261018_team_managers.sql (joined_at).
-- Wyzwalacze audytu na theatre_members (a_set_inviter, log_member_change) zostają bez zmian: wpis do dziennika powstaje sam.
-- Cofnięcie: SQL na końcu pliku, w komentarzu.

BEGIN;

-- 1. Strażnik profilu. Status zmieniał tylko superadmin albo klucz serwisowy; funkcje poniżej są jedynym wyjątkiem.
--    Wybrane rozwiązanie: zmienna sesji rk.deciding_profile, ustawiana przez funkcje poniżej tylko na czas jednej
--    transakcji (set_config z is_local = true) i tylko na id profilu, o którym właśnie decydują. Wyzwalacz przepuszcza
--    wyłącznie przejście 'pending' → 'approved' albo 'rejected' tego jednego profilu. Zmiana roli (profiles.role)
--    i każda inna zmiana statusu nadal są zablokowane. Zmiennej nie ustawi klient aplikacji (PostgREST nie wystawia
--    set_config), a kto ma bezpośredni dostęp do SQL, ten i tak omija wyzwalacz. Poza tym wyjątkiem treść jest ta sama
--    co w 20261018_fix_profile_guard.sql.
CREATE OR REPLACE FUNCTION public.protect_profile_fields() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, extensions AS $$
BEGIN
    IF NOT public.is_admin() AND coalesce(auth.role(), '') <> 'service_role' THEN
        IF NEW.status IS DISTINCT FROM OLD.status
           AND NOT (OLD.status = 'pending' AND NEW.status IN ('approved', 'rejected')
                    AND coalesce(current_setting('rk.deciding_profile', true), '') = OLD.id::text) THEN
            RAISE EXCEPTION 'You are not authorized to change status';
        END IF;
        IF NEW.role IS DISTINCT FROM OLD.role THEN
            RAISE EXCEPTION 'You are not authorized to change role';
        END IF;
    END IF;
    RETURN NEW;
END;
$$;

-- 2. Wspólne warunki obu funkcji. Zwraca teatr wołającego. Nie jest dla klienta: tylko dla funkcji poniżej.
CREATE OR REPLACE FUNCTION public.pending_user_theatre(p_user uuid) RETURNS uuid
    LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE
    t uuid;
BEGIN
    IF auth.uid() IS NULL THEN
        RAISE EXCEPTION 'Zaloguj się.' USING ERRCODE = 'P0001';
    END IF;
    t := public.active_theatre_id();
    IF t IS NULL THEN
        RAISE EXCEPTION 'Nie wybrano teatru.' USING ERRCODE = 'P0001';
    END IF;
    IF NOT public.is_theatre_admin(t) THEN
        RAISE EXCEPTION 'Zatwierdzać może tylko kierownik pracowni.' USING ERRCODE = 'P0001';
    END IF;
    IF p_user = auth.uid() THEN
        RAISE EXCEPTION 'Nie możesz zatwierdzić ani odrzucić własnego konta.' USING ERRCODE = 'P0001';
    END IF;
    RETURN t;
END $$;
REVOKE ALL ON FUNCTION public.pending_user_theatre(uuid) FROM PUBLIC, anon, authenticated;

-- 3. Zatwierdzenie: status, członkostwo w teatrze wołającego, bieżący teatr (tylko gdy pusty).
--    UPDATE z warunkiem status = 'pending' jest atomowy: gdy dwóch kierowników zatwierdza naraz, drugi dostaje komunikat.
CREATE OR REPLACE FUNCTION public.approve_pending_user(p_user uuid, p_role text) RETURNS void
    LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
    t uuid;
BEGIN
    IF p_role IS NULL OR p_role NOT IN ('admin', 'member', 'viewer') THEN
        RAISE EXCEPTION 'Wybierz rolę: kierownik pracowni, rekwizytor albo podgląd.' USING ERRCODE = 'P0001';
    END IF;
    t := public.pending_user_theatre(p_user);

    PERFORM set_config('rk.deciding_profile', p_user::text, true);
    UPDATE public.profiles
       SET status = 'approved',
           current_theatre_id = coalesce(current_theatre_id, t)
     WHERE id = p_user AND status = 'pending';
    -- FOUND sprawdzamy od razu: PERFORM też je ustawia. Wyjątek cofa transakcję razem ze zmienną.
    IF NOT FOUND THEN
        RAISE EXCEPTION 'To konto nie czeka już na zatwierdzenie.' USING ERRCODE = 'P0001';
    END IF;
    PERFORM set_config('rk.deciding_profile', '', true);

    INSERT INTO public.theatre_members (theatre_id, user_id, role, joined_at)
    VALUES (t, p_user, p_role, now())
    ON CONFLICT (theatre_id, user_id) DO NOTHING;
END $$;
REVOKE ALL ON FUNCTION public.approve_pending_user(uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.approve_pending_user(uuid, text) TO authenticated;

-- 4. Odrzucenie: te same warunki, status 'rejected'.
CREATE OR REPLACE FUNCTION public.reject_pending_user(p_user uuid) RETURNS void
    LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
    PERFORM public.pending_user_theatre(p_user);

    PERFORM set_config('rk.deciding_profile', p_user::text, true);
    UPDATE public.profiles SET status = 'rejected' WHERE id = p_user AND status = 'pending';
    IF NOT FOUND THEN
        RAISE EXCEPTION 'To konto nie czeka już na zatwierdzenie.' USING ERRCODE = 'P0001';
    END IF;
    PERFORM set_config('rk.deciding_profile', '', true);
END $$;
REVOKE ALL ON FUNCTION public.reject_pending_user(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.reject_pending_user(uuid) TO authenticated;

COMMIT;

-- Cofnięcie (wklej w SQL Editor; nie cofa już zatwierdzonych kont ani dodanych członkostw):
--   BEGIN;
--   DROP FUNCTION IF EXISTS public.reject_pending_user(uuid);
--   DROP FUNCTION IF EXISTS public.approve_pending_user(uuid, text);
--   DROP FUNCTION IF EXISTS public.pending_user_theatre(uuid);
--   CREATE OR REPLACE FUNCTION public.protect_profile_fields() RETURNS trigger
--       LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, extensions AS $$
--   BEGIN
--       IF NOT public.is_admin() AND coalesce(auth.role(), '') <> 'service_role' THEN
--           IF NEW.status IS DISTINCT FROM OLD.status THEN
--               RAISE EXCEPTION 'You are not authorized to change status';
--           END IF;
--           IF NEW.role IS DISTINCT FROM OLD.role THEN
--               RAISE EXCEPTION 'You are not authorized to change role';
--           END IF;
--       END IF;
--       RETURN NEW;
--   END;
--   $$;
--   COMMIT;
