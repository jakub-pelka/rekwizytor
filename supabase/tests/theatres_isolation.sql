-- Test izolacji teatrów (migracja 20261011_theatres.sql). Uruchamiać na lokalnej kopii bazy po migracji,
-- NIGDY na produkcji: wszystko dzieje się w transakcji zakończonej ROLLBACK, ale test zakłada konta.
--
--   psql -v ON_ERROR_STOP=1 -f supabase/tests/theatres_isolation.sql
--
-- Każde sprawdzenie, które się nie zgadza, przerywa test błędem „TEST: …”. Na końcu „Wszystkie testy przeszły”.
-- Zakłada, że w bazie jest teatr demo z co najmniej jednym spektaklem (tak jest po migracji obecnych danych).

BEGIN;

-- Konta testowe: superadmin (członek demo), rekwizytor nowego teatru, konto niezatwierdzone.
ALTER TABLE public.profiles DISABLE TRIGGER protect_profile_fields_trigger;
INSERT INTO auth.users (id, email) VALUES
    ('aaaaaaaa-0000-0000-0000-000000000001', 'test-super@rekwizytor.test'),
    ('aaaaaaaa-0000-0000-0000-000000000002', 'test-nowy@rekwizytor.test'),
    ('aaaaaaaa-0000-0000-0000-000000000003', 'test-pending@rekwizytor.test'),
    ('aaaaaaaa-0000-0000-0000-000000000004', 'test-podglad@rekwizytor.test'),
    ('aaaaaaaa-0000-0000-0000-000000000005', 'test-rekwizytor@rekwizytor.test');
INSERT INTO public.profiles (id, email, full_name) VALUES
    ('aaaaaaaa-0000-0000-0000-000000000001', 'test-super@rekwizytor.test', 'Test Super'),
    ('aaaaaaaa-0000-0000-0000-000000000002', 'test-nowy@rekwizytor.test', 'Test Nowy'),
    ('aaaaaaaa-0000-0000-0000-000000000003', 'test-pending@rekwizytor.test', 'Test Pending'),
    ('aaaaaaaa-0000-0000-0000-000000000004', 'test-podglad@rekwizytor.test', 'Test Podgląd'),
    ('aaaaaaaa-0000-0000-0000-000000000005', 'test-rekwizytor@rekwizytor.test', 'Test Rekwizytor')
ON CONFLICT (id) DO NOTHING;
UPDATE public.profiles SET status = 'approved', role = 'admin' WHERE id = 'aaaaaaaa-0000-0000-0000-000000000001';
UPDATE public.profiles SET status = 'approved', role = 'user' WHERE id = 'aaaaaaaa-0000-0000-0000-000000000002';
UPDATE public.profiles SET status = 'pending', role = 'user' WHERE id = 'aaaaaaaa-0000-0000-0000-000000000003';
UPDATE public.profiles SET status = 'approved', role = 'user' WHERE id IN ('aaaaaaaa-0000-0000-0000-000000000004', 'aaaaaaaa-0000-0000-0000-000000000005');
ALTER TABLE public.profiles ENABLE TRIGGER protect_profile_fields_trigger;

-- Buckety to dane, nie schemat: na świeżej kopii bazy ich nie ma.
INSERT INTO storage.buckets (id, name) VALUES ('posters', 'posters') ON CONFLICT (id) DO NOTHING;

INSERT INTO public.theatres (id, name) VALUES ('bbbbbbbb-0000-0000-0000-000000000001', 'Teatr testowy');
INSERT INTO public.theatre_members (theatre_id, user_id, role) VALUES
    ((SELECT id FROM public.theatres WHERE is_demo), 'aaaaaaaa-0000-0000-0000-000000000001', 'admin'),
    ('bbbbbbbb-0000-0000-0000-000000000001', 'aaaaaaaa-0000-0000-0000-000000000002', 'admin'),
    ('bbbbbbbb-0000-0000-0000-000000000001', 'aaaaaaaa-0000-0000-0000-000000000003', 'member'),
    ('bbbbbbbb-0000-0000-0000-000000000001', 'aaaaaaaa-0000-0000-0000-000000000004', 'viewer'),
    ('bbbbbbbb-0000-0000-0000-000000000001', 'aaaaaaaa-0000-0000-0000-000000000005', 'member');

CREATE TEMP TABLE t_demo AS SELECT id FROM public.performances WHERE theatre_id = (SELECT id FROM public.theatres WHERE is_demo) LIMIT 1;
GRANT SELECT ON t_demo TO anon, authenticated;

-- Pomocnik: udaje żądanie z danym kontem (NULL = niezalogowany). Ustawia oba warianty ustawień JWT, bo
-- starsze obrazy Postgresa Supabase czytają request.jwt.claim.*, a nowsze request.jwt.claims.
CREATE OR REPLACE FUNCTION pg_temp.as_user(uid uuid) RETURNS void LANGUAGE plpgsql AS $$
DECLARE r text := CASE WHEN uid IS NULL THEN 'anon' ELSE 'authenticated' END;
BEGIN
    PERFORM set_config('request.jwt.claims', json_build_object('sub', uid, 'role', r)::text, true);
    PERFORM set_config('request.jwt.claim.sub', coalesce(uid::text, ''), true);
    PERFORM set_config('request.jwt.claim.role', r, true);
    EXECUTE format('SET LOCAL ROLE %I', r);
END $$;

-- 1. Niezalogowany widzi demo, nie może zapisać ------------------------------------------------------
SELECT pg_temp.as_user(NULL);
DO $$ BEGIN
    IF (SELECT count(*) FROM public.performances) = 0 THEN RAISE EXCEPTION 'TEST: anon nie widzi demo'; END IF;
    IF EXISTS (SELECT 1 FROM public.performances p JOIN public.theatres t ON t.id = p.theatre_id WHERE NOT t.is_demo)
        THEN RAISE EXCEPTION 'TEST: anon widzi spektakl spoza demo'; END IF;
    BEGIN
        INSERT INTO public.performances (title) VALUES ('anon próbuje');
        RAISE EXCEPTION 'TEST: anon zapisał spektakl';
    EXCEPTION WHEN insufficient_privilege OR not_null_violation OR check_violation THEN NULL;
    END;
    IF EXISTS (SELECT 1 FROM public.profiles) THEN RAISE EXCEPTION 'TEST: anon widzi profile'; END IF;
END $$;
RESET ROLE;

-- 2. Nowy teatr: pusto, dodawanie trafia do swojego teatru, numeracja od 0001, te same nazwy co w demo ---
SELECT pg_temp.as_user('aaaaaaaa-0000-0000-0000-000000000002');
DO $$
DECLARE perf uuid; loc uuid; grp record;
BEGIN
    IF public.active_theatre_id() IS DISTINCT FROM 'bbbbbbbb-0000-0000-0000-000000000001' THEN RAISE EXCEPTION 'TEST: zły bieżący teatr'; END IF;
    IF EXISTS (SELECT 1 FROM public.performances) THEN RAISE EXCEPTION 'TEST: nowy teatr widzi cudze spektakle'; END IF;
    IF EXISTS (SELECT 1 FROM public.groups) OR EXISTS (SELECT 1 FROM public.locations) OR EXISTS (SELECT 1 FROM public.notes)
        THEN RAISE EXCEPTION 'TEST: nowy teatr widzi cudzy magazyn albo notatki'; END IF;

    INSERT INTO public.performances (title) VALUES ('Dziady') RETURNING id INTO perf;
    INSERT INTO public.scenes (performance_id, act_number, scene_number, name, type) VALUES (perf, 1, 1, 'Scena 1', 'scene');
    INSERT INTO public.performance_props (performance_id, item_name, scene_number, act_number) VALUES (perf, 'Świeca', 1, 1);
    INSERT INTO public.locations (name) VALUES ('Pracownia') RETURNING id INTO loc;
    INSERT INTO public.groups (name, location_id) VALUES ('Naczynia', loc) RETURNING code, theatre_id INTO grp;
    IF grp.code <> 'GRP-0001' THEN RAISE EXCEPTION 'TEST: numeracja nie od 0001 (%)', grp.code; END IF;
    IF grp.theatre_id <> 'bbbbbbbb-0000-0000-0000-000000000001' THEN RAISE EXCEPTION 'TEST: grupa w złym teatrze'; END IF;
    IF (SELECT theatre_id FROM public.scenes WHERE performance_id = perf) <> 'bbbbbbbb-0000-0000-0000-000000000001'
        THEN RAISE EXCEPTION 'TEST: scena nie dziedziczy teatru'; END IF;

    -- Doczepienie sceny do spektaklu z demo: wiersz dostaje teatr demo i odpada na regule zapisu.
    BEGIN
        INSERT INTO public.scenes (performance_id, act_number, scene_number, name, type)
        VALUES ((SELECT id FROM t_demo), 9, 99, 'włamanie', 'scene');
        RAISE EXCEPTION 'TEST: dało się dodać scenę do cudzego spektaklu';
    EXCEPTION WHEN insufficient_privilege THEN NULL;
    END;
    -- Zmiana i usunięcie cudzego wiersza nie dotyka niczego.
    UPDATE public.performances SET title = 'zmienione' WHERE id = (SELECT id FROM t_demo);
    DELETE FROM public.performances WHERE id = (SELECT id FROM t_demo);

    -- Wybór cudzego teatru jako bieżącego nic nie daje (nie jest członkiem).
    UPDATE public.profiles SET current_theatre_id = (SELECT id FROM public.theatres WHERE is_demo) WHERE id = auth.uid();
    IF public.active_theatre_id() <> 'bbbbbbbb-0000-0000-0000-000000000001' THEN RAISE EXCEPTION 'TEST: przełączenie na cudzy teatr zadziałało'; END IF;

    IF (SELECT count(*) FROM public.theatres) <> 2 THEN RAISE EXCEPTION 'TEST: widzi teatry inne niż swój i demo'; END IF;
    IF EXISTS (SELECT 1 FROM public.profiles WHERE id = 'aaaaaaaa-0000-0000-0000-000000000001')
        THEN RAISE EXCEPTION 'TEST: widzi profil osoby spoza swojego teatru'; END IF;
    IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = 'aaaaaaaa-0000-0000-0000-000000000003')
        THEN RAISE EXCEPTION 'TEST: nie widzi kolegi z teatru'; END IF;
    IF EXISTS (SELECT 1 FROM public.search_global('Wesele')) THEN RAISE EXCEPTION 'TEST: wyszukiwanie zwraca demo'; END IF;
    BEGIN
        PERFORM 1 FROM public.vw_searchable_entities LIMIT 1;
        RAISE EXCEPTION 'TEST: widok wyszukiwania dostępny bezpośrednio';
    EXCEPTION WHEN insufficient_privilege THEN NULL;
    END;
END $$;
RESET ROLE;

DO $$ BEGIN
    IF (SELECT title FROM public.performances WHERE id = (SELECT id FROM t_demo)) = 'zmienione'
        THEN RAISE EXCEPTION 'TEST: zmieniono cudzy spektakl'; END IF;
    IF NOT EXISTS (SELECT 1 FROM public.performances WHERE id = (SELECT id FROM t_demo))
        THEN RAISE EXCEPTION 'TEST: usunięto cudzy spektakl'; END IF;
END $$;

-- 3. Konto niezatwierdzone: nic nie widzi i nic nie zapisze, mimo członkostwa -------------------------
SELECT pg_temp.as_user('aaaaaaaa-0000-0000-0000-000000000003');
DO $$ BEGIN
    IF EXISTS (SELECT 1 FROM public.performances) THEN RAISE EXCEPTION 'TEST: niezatwierdzony widzi spektakle'; END IF;
    BEGIN
        INSERT INTO public.performances (title) VALUES ('pending próbuje');
        RAISE EXCEPTION 'TEST: niezatwierdzony zapisał spektakl';
    EXCEPTION WHEN insufficient_privilege OR not_null_violation THEN NULL;
    END;
END $$;
RESET ROLE;

-- 4. Superadmin: widzi bieżący teatr, przełącza się na dowolny, zakłada teatry -----------------------
SELECT pg_temp.as_user('aaaaaaaa-0000-0000-0000-000000000001');
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM public.performances WHERE id = (SELECT id FROM t_demo)) THEN RAISE EXCEPTION 'TEST: superadmin nie widzi demo'; END IF;
    UPDATE public.profiles SET current_theatre_id = 'bbbbbbbb-0000-0000-0000-000000000001' WHERE id = auth.uid();
    IF NOT EXISTS (SELECT 1 FROM public.performances WHERE title = 'Dziady') THEN RAISE EXCEPTION 'TEST: superadmin nie przełączył się'; END IF;
    IF EXISTS (SELECT 1 FROM public.performances WHERE id = (SELECT id FROM t_demo)) THEN RAISE EXCEPTION 'TEST: po przełączeniu widać dwa teatry naraz'; END IF;
    INSERT INTO public.theatres (name) VALUES ('Teatr zakładany przez superadmina');
END $$;
RESET ROLE;

-- 5. Zwykły członek nie zakłada teatrów i nie dopisuje się do cudzych --------------------------------
SELECT pg_temp.as_user('aaaaaaaa-0000-0000-0000-000000000002');
DO $$ BEGIN
    BEGIN
        INSERT INTO public.theatres (name) VALUES ('samowolka');
        RAISE EXCEPTION 'TEST: zwykłe konto założyło teatr';
    EXCEPTION WHEN insufficient_privilege THEN NULL;
    END;
    BEGIN
        INSERT INTO public.theatre_members (theatre_id, user_id) VALUES ((SELECT id FROM public.theatres WHERE is_demo), auth.uid());
        RAISE EXCEPTION 'TEST: dopisał się do cudzego teatru';
    EXCEPTION WHEN insufficient_privilege THEN NULL;
    END;
END $$;
RESET ROLE;

-- 6. Podgląd: widzi swój teatr, nie zapisuje niczego (także odhaczeń) -----------------------------------
SELECT pg_temp.as_user('aaaaaaaa-0000-0000-0000-000000000004');
DO $$
DECLARE n int;
BEGIN
    IF NOT EXISTS (SELECT 1 FROM public.performances WHERE title = 'Dziady') THEN RAISE EXCEPTION 'TEST: podgląd nie widzi swojego teatru'; END IF;
    BEGIN
        INSERT INTO public.performances (title) VALUES ('podgląd próbuje');
        RAISE EXCEPTION 'TEST: podgląd zapisał spektakl';
    EXCEPTION WHEN insufficient_privilege THEN NULL;
    END;
    BEGIN
        INSERT INTO public.show_list_checks (show_list_id, performance_prop_id, stage)
        SELECT l.id, p.id, 'preshow' FROM public.show_lists l, public.performance_props p LIMIT 1;
        IF FOUND THEN RAISE EXCEPTION 'TEST: podgląd zapisał odhaczenie'; END IF;
    EXCEPTION WHEN insufficient_privilege THEN NULL;
    END;
    UPDATE public.performances SET title = 'podgląd zmienił' WHERE title = 'Dziady';
    GET DIAGNOSTICS n = ROW_COUNT;
    IF n > 0 THEN RAISE EXCEPTION 'TEST: podgląd zmienił spektakl'; END IF;
    DELETE FROM public.performance_props;
    GET DIAGNOSTICS n = ROW_COUNT;
    IF n > 0 THEN RAISE EXCEPTION 'TEST: podgląd usunął rekwizyty'; END IF;
    BEGIN
        INSERT INTO storage.objects (bucket_id, name) VALUES ('posters', 'bbbbbbbb-0000-0000-0000-000000000001/plakaty/x/podglad.webp');
        RAISE EXCEPTION 'TEST: podgląd wysłał plik';
    EXCEPTION WHEN insufficient_privilege THEN NULL;
    END;
END $$;
RESET ROLE;

-- 7. Rekwizytor: pracuje, ale spektaklu na stałe nie usunie ani nie zmieni nazwy teatru; pliki tylko do swojego folderu
SELECT pg_temp.as_user('aaaaaaaa-0000-0000-0000-000000000005');
DO $$
DECLARE n int;
BEGIN
    UPDATE public.performances SET deleted_at = now() WHERE title = 'Dziady';
    GET DIAGNOSTICS n = ROW_COUNT;
    IF n <> 1 THEN RAISE EXCEPTION 'TEST: rekwizytor nie przeniósł spektaklu do kosza'; END IF;
    DELETE FROM public.performances WHERE title = 'Dziady';
    GET DIAGNOSTICS n = ROW_COUNT;
    IF n > 0 THEN RAISE EXCEPTION 'TEST: rekwizytor usunął spektakl na stałe'; END IF;
    UPDATE public.theatres SET name = 'zmiana' WHERE id = 'bbbbbbbb-0000-0000-0000-000000000001';
    GET DIAGNOSTICS n = ROW_COUNT;
    IF n > 0 THEN RAISE EXCEPTION 'TEST: rekwizytor zmienił nazwę teatru'; END IF;
    INSERT INTO storage.objects (bucket_id, name) VALUES ('posters', 'bbbbbbbb-0000-0000-0000-000000000001/plakaty/x/ok.webp');
    BEGIN
        INSERT INTO storage.objects (bucket_id, name) VALUES ('posters', (SELECT id FROM public.theatres WHERE is_demo)::text || '/plakaty/x/obcy.webp');
        RAISE EXCEPTION 'TEST: plik trafił do folderu cudzego teatru';
    EXCEPTION WHEN insufficient_privilege THEN NULL;
    END;
    BEGIN
        INSERT INTO storage.objects (bucket_id, name) VALUES ('posters', 'bez-teatru.webp');
        RAISE EXCEPTION 'TEST: plik bez folderu teatru przeszedł';
    EXCEPTION WHEN insufficient_privilege THEN NULL;
    END;
END $$;
RESET ROLE;

-- 8. Kierownik: usuwa spektakl z kosza na stałe; nazwy teatru nie zmienia (to robi tylko superadmin) -------
SELECT pg_temp.as_user('aaaaaaaa-0000-0000-0000-000000000002');
DO $$
DECLARE n int;
BEGIN
    DELETE FROM public.performances WHERE title = 'Dziady';
    GET DIAGNOSTICS n = ROW_COUNT;
    IF n <> 1 THEN RAISE EXCEPTION 'TEST: kierownik nie usunął spektaklu z kosza'; END IF;
    UPDATE public.theatres SET name = 'Teatr testowy 2' WHERE id = 'bbbbbbbb-0000-0000-0000-000000000001';
    GET DIAGNOSTICS n = ROW_COUNT;
    IF n > 0 THEN RAISE EXCEPTION 'TEST: kierownik zmienił nazwę teatru'; END IF;
    UPDATE public.theatres SET name = 'przejęte' WHERE is_demo;
    GET DIAGNOSTICS n = ROW_COUNT;
    IF n > 0 THEN RAISE EXCEPTION 'TEST: kierownik zmienił cudzy teatr'; END IF;
    -- Zespołem swojego teatru kierownik zarządza: zmienia rolę rekwizytora na podgląd i z powrotem.
    UPDATE public.theatre_members SET role = 'viewer' WHERE user_id = 'aaaaaaaa-0000-0000-0000-000000000005';
    GET DIAGNOSTICS n = ROW_COUNT;
    IF n <> 1 THEN RAISE EXCEPTION 'TEST: kierownik nie zmienił roli w swoim zespole'; END IF;
    UPDATE public.theatre_members SET role = 'member' WHERE user_id = 'aaaaaaaa-0000-0000-0000-000000000005';
END $$;
RESET ROLE;

-- 9. Niezalogowany nie wysyła plików -----------------------------------------------------------------
SELECT pg_temp.as_user(NULL);
DO $$ BEGIN
    BEGIN
        INSERT INTO storage.objects (bucket_id, name) VALUES ('posters', (SELECT id FROM public.theatres WHERE is_demo)::text || '/plakaty/x/anon.webp');
        RAISE EXCEPTION 'TEST: anon wysłał plik';
    EXCEPTION WHEN insufficient_privilege THEN NULL;
    END;
END $$;
RESET ROLE;

-- 10. Dziennik zespołu: kto kogo dodał, zmienił, usunął; nikt z aplikacji go nie edytuje ----------------
SELECT pg_temp.as_user('aaaaaaaa-0000-0000-0000-000000000002');
DO $$
DECLARE n int; ev record;
BEGIN
    -- Kierownik (konto 2) dodaje osobę, zmienia jej rolę i usuwa. Do tego ma konto 3 jako gotowy cel.
    INSERT INTO public.theatre_members (theatre_id, user_id, role)
    VALUES ('bbbbbbbb-0000-0000-0000-000000000001', 'aaaaaaaa-0000-0000-0000-000000000001', 'viewer');
    IF (SELECT invited_by FROM public.theatre_members WHERE user_id = 'aaaaaaaa-0000-0000-0000-000000000001'
         AND theatre_id = 'bbbbbbbb-0000-0000-0000-000000000001') IS DISTINCT FROM 'aaaaaaaa-0000-0000-0000-000000000002'
        THEN RAISE EXCEPTION 'TEST: członkostwo nie zapamiętało, kto dodał'; END IF;
    UPDATE public.theatre_members SET role = 'member'
     WHERE user_id = 'aaaaaaaa-0000-0000-0000-000000000001' AND theatre_id = 'bbbbbbbb-0000-0000-0000-000000000001';
    DELETE FROM public.theatre_members
     WHERE user_id = 'aaaaaaaa-0000-0000-0000-000000000001' AND theatre_id = 'bbbbbbbb-0000-0000-0000-000000000001';

    FOR ev IN SELECT action, role, previous_role, actor_id, actor_email, user_email
                FROM public.theatre_member_events
               WHERE theatre_id = 'bbbbbbbb-0000-0000-0000-000000000001' AND user_id = 'aaaaaaaa-0000-0000-0000-000000000001'
               ORDER BY id
    LOOP
        IF ev.actor_id IS DISTINCT FROM 'aaaaaaaa-0000-0000-0000-000000000002' OR ev.actor_email <> 'test-nowy@rekwizytor.test'
            THEN RAISE EXCEPTION 'TEST: wpis dziennika bez autora zmiany (%)', ev.action; END IF;
    END LOOP;
    IF (SELECT string_agg(action, ',' ORDER BY id) FROM public.theatre_member_events
         WHERE theatre_id = 'bbbbbbbb-0000-0000-0000-000000000001' AND user_id = 'aaaaaaaa-0000-0000-0000-000000000001') <> 'added,role_changed,removed'
        THEN RAISE EXCEPTION 'TEST: zły ciąg zdarzeń w dzienniku'; END IF;
    IF (SELECT user_email FROM public.theatre_member_events WHERE action = 'removed'
         AND theatre_id = 'bbbbbbbb-0000-0000-0000-000000000001' AND user_id = 'aaaaaaaa-0000-0000-0000-000000000001') IS NULL
        THEN RAISE EXCEPTION 'TEST: dziennik nie zachował e-maila usuniętej osoby'; END IF;

    -- Dziennika nie da się zapisać ani zmienić z aplikacji.
    BEGIN
        INSERT INTO public.theatre_member_events (theatre_id, action) VALUES ('bbbbbbbb-0000-0000-0000-000000000001', 'added');
        RAISE EXCEPTION 'TEST: kierownik dopisał wpis do dziennika';
    EXCEPTION WHEN insufficient_privilege THEN NULL;
    END;
    BEGIN
        DELETE FROM public.theatre_member_events;
        RAISE EXCEPTION 'TEST: kierownik skasował dziennik';
    EXCEPTION WHEN insufficient_privilege THEN NULL;
    END;
    BEGIN
        UPDATE public.theatre_member_events SET actor_id = NULL;
        RAISE EXCEPTION 'TEST: kierownik zmienił dziennik';
    EXCEPTION WHEN insufficient_privilege THEN NULL;
    END;
    IF EXISTS (SELECT 1 FROM public.theatre_member_events WHERE theatre_id = (SELECT id FROM public.theatres WHERE is_demo))
        THEN RAISE EXCEPTION 'TEST: kierownik widzi dziennik cudzego teatru'; END IF;
END $$;
RESET ROLE;

-- Rekwizytor i podgląd dziennika nie czytają.
SELECT pg_temp.as_user('aaaaaaaa-0000-0000-0000-000000000005');
DO $$ BEGIN
    IF EXISTS (SELECT 1 FROM public.theatre_member_events) THEN RAISE EXCEPTION 'TEST: rekwizytor czyta dziennik zespołu'; END IF;
END $$;
RESET ROLE;
SELECT pg_temp.as_user('aaaaaaaa-0000-0000-0000-000000000001');
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM public.theatre_member_events) THEN RAISE EXCEPTION 'TEST: superadmin nie czyta dziennika'; END IF;
END $$;
RESET ROLE;

-- 11. Zespół (migracja 20261018_team_managers.sql): lista, strażnik ról, kończenie zaproszenia ---------------
-- Dwie osoby czekają na zaproszenie (joined_at = NULL): rekwizytor (5) i konto 3.
UPDATE public.theatre_members SET joined_at = now() WHERE joined_at IS NULL;
UPDATE public.theatre_members SET joined_at = NULL
 WHERE theatre_id = 'bbbbbbbb-0000-0000-0000-000000000001' AND user_id IN ('aaaaaaaa-0000-0000-0000-000000000003', 'aaaaaaaa-0000-0000-0000-000000000005');

-- Kierownik teatru testowego widzi swój zespół, cudzego nie.
SELECT pg_temp.as_user('aaaaaaaa-0000-0000-0000-000000000002');
DO $$ BEGIN
    IF (SELECT count(*) FROM public.theatre_team('bbbbbbbb-0000-0000-0000-000000000001')) <> 4
        THEN RAISE EXCEPTION 'TEST: kierownik nie widzi całego zespołu swojego teatru'; END IF;
    IF NOT EXISTS (SELECT 1 FROM public.theatre_team('bbbbbbbb-0000-0000-0000-000000000001')
                    WHERE email = 'test-rekwizytor@rekwizytor.test' AND joined_at IS NULL AND role = 'member')
        THEN RAISE EXCEPTION 'TEST: lista zespołu bez e-maila albo bez stanu zaproszenia'; END IF;
    IF EXISTS (SELECT 1 FROM public.theatre_team((SELECT id FROM public.theatres WHERE is_demo)))
        THEN RAISE EXCEPTION 'TEST: kierownik widzi zespół cudzego teatru'; END IF;
END $$;
RESET ROLE;

-- Superadmin widzi zespół dowolnego teatru; niezalogowany nic.
SELECT pg_temp.as_user('aaaaaaaa-0000-0000-0000-000000000001');
DO $$ BEGIN
    IF (SELECT count(*) FROM public.theatre_team('bbbbbbbb-0000-0000-0000-000000000001')) <> 4
        THEN RAISE EXCEPTION 'TEST: superadmin nie widzi zespołu teatru'; END IF;
END $$;
RESET ROLE;
SELECT pg_temp.as_user(NULL);
DO $$ BEGIN
    BEGIN
        PERFORM * FROM public.theatre_team('bbbbbbbb-0000-0000-0000-000000000001');
        RAISE EXCEPTION 'TEST: anon wywołał theatre_team';
    EXCEPTION WHEN insufficient_privilege THEN NULL;
    END;
END $$;
RESET ROLE;

-- Rekwizytor nie zmienia ról ani nie usuwa członków (reguła members_write), ale zespół widzi.
SELECT pg_temp.as_user('aaaaaaaa-0000-0000-0000-000000000005');
DO $$
DECLARE n int;
BEGIN
    IF (SELECT count(*) FROM public.theatre_team('bbbbbbbb-0000-0000-0000-000000000001')) <> 4
        THEN RAISE EXCEPTION 'TEST: rekwizytor nie widzi zespołu'; END IF;
    UPDATE public.theatre_members SET role = 'admin' WHERE user_id = 'aaaaaaaa-0000-0000-0000-000000000005';
    GET DIAGNOSTICS n = ROW_COUNT;
    IF n > 0 THEN RAISE EXCEPTION 'TEST: rekwizytor awansował siebie'; END IF;
    UPDATE public.theatre_members SET role = 'viewer' WHERE user_id = 'aaaaaaaa-0000-0000-0000-000000000004';
    GET DIAGNOSTICS n = ROW_COUNT;
    IF n > 0 THEN RAISE EXCEPTION 'TEST: rekwizytor zmienił cudzą rolę'; END IF;
    DELETE FROM public.theatre_members WHERE user_id = 'aaaaaaaa-0000-0000-0000-000000000004';
    GET DIAGNOSTICS n = ROW_COUNT;
    IF n > 0 THEN RAISE EXCEPTION 'TEST: rekwizytor usunął członka zespołu'; END IF;
END $$;
RESET ROLE;

-- Kierownik jest jedyny: nie zmieni własnej roli, nie usunie siebie.
SELECT pg_temp.as_user('aaaaaaaa-0000-0000-0000-000000000002');
DO $$ BEGIN
    BEGIN
        UPDATE public.theatre_members SET role = 'member' WHERE user_id = auth.uid();
        RAISE EXCEPTION 'TEST: kierownik zmienił własną rolę';
    EXCEPTION WHEN SQLSTATE 'P0001' THEN
        IF SQLERRM <> 'Swojej roli nie zmienisz sam.' THEN RAISE EXCEPTION 'TEST: zły komunikat zmiany własnej roli (%)', SQLERRM; END IF;
    END;
    BEGIN
        DELETE FROM public.theatre_members WHERE user_id = auth.uid();
        RAISE EXCEPTION 'TEST: kierownik usunął siebie';
    EXCEPTION WHEN SQLSTATE 'P0001' THEN
        IF SQLERRM <> 'Nie usuniesz siebie z zespołu.' THEN RAISE EXCEPTION 'TEST: zły komunikat usunięcia siebie (%)', SQLERRM; END IF;
    END;
END $$;
RESET ROLE;

-- Ostatniego kierownika nie odbierze nikt: ani superadmin, ani klucz serwisowy (auth.uid() NULL).
SELECT pg_temp.as_user('aaaaaaaa-0000-0000-0000-000000000001');
DO $$ BEGIN
    BEGIN
        UPDATE public.theatre_members SET role = 'member'
         WHERE theatre_id = 'bbbbbbbb-0000-0000-0000-000000000001' AND user_id = 'aaaaaaaa-0000-0000-0000-000000000002';
        RAISE EXCEPTION 'TEST: zdjęto rolę ostatniemu kierownikowi';
    EXCEPTION WHEN SQLSTATE 'P0001' THEN
        IF SQLERRM <> 'Teatr musi mieć co najmniej jednego kierownika.' THEN RAISE EXCEPTION 'TEST: zły komunikat ostatniego kierownika (%)', SQLERRM; END IF;
    END;
    BEGIN
        DELETE FROM public.theatre_members
         WHERE theatre_id = 'bbbbbbbb-0000-0000-0000-000000000001' AND user_id = 'aaaaaaaa-0000-0000-0000-000000000002';
        RAISE EXCEPTION 'TEST: usunięto ostatniego kierownika';
    EXCEPTION WHEN SQLSTATE 'P0001' THEN NULL;
    END;
END $$;
RESET ROLE;
SELECT set_config('request.jwt.claims', '', true), set_config('request.jwt.claim.sub', '', true);
DO $$ BEGIN
    IF auth.uid() IS NOT NULL THEN RAISE EXCEPTION 'TEST: auth.uid() powinno być NULL dla klucza serwisowego'; END IF;
    BEGIN
        DELETE FROM public.theatre_members
         WHERE theatre_id = 'bbbbbbbb-0000-0000-0000-000000000001' AND user_id = 'aaaaaaaa-0000-0000-0000-000000000002';
        RAISE EXCEPTION 'TEST: klucz serwisowy usunął ostatniego kierownika';
    EXCEPTION WHEN SQLSTATE 'P0001' THEN NULL;
    END;
END $$;

-- Gdy jest drugi kierownik, zmiana roli pierwszego przechodzi (kierownik awansuje, superadmin odbiera).
SELECT pg_temp.as_user('aaaaaaaa-0000-0000-0000-000000000002');
UPDATE public.theatre_members SET role = 'admin' WHERE user_id = 'aaaaaaaa-0000-0000-0000-000000000004';
RESET ROLE;
SELECT pg_temp.as_user('aaaaaaaa-0000-0000-0000-000000000001');
UPDATE public.theatre_members SET role = 'member'
 WHERE theatre_id = 'bbbbbbbb-0000-0000-0000-000000000001' AND user_id = 'aaaaaaaa-0000-0000-0000-000000000002';
RESET ROLE;
UPDATE public.theatre_members SET role = 'admin'
 WHERE theatre_id = 'bbbbbbbb-0000-0000-0000-000000000001' AND user_id = 'aaaaaaaa-0000-0000-0000-000000000002';

-- Usunięcie całego teatru kaskadą nie jest blokowane regułą ostatniego kierownika.
SELECT pg_temp.as_user('aaaaaaaa-0000-0000-0000-000000000001');
INSERT INTO public.theatres (id, name) VALUES ('cccccccc-0000-0000-0000-000000000001', 'Teatr do usunięcia');
INSERT INTO public.theatre_members (theatre_id, user_id, role) VALUES ('cccccccc-0000-0000-0000-000000000001', 'aaaaaaaa-0000-0000-0000-000000000004', 'admin');
DELETE FROM public.theatres WHERE id = 'cccccccc-0000-0000-0000-000000000001';
DO $$ BEGIN
    IF EXISTS (SELECT 1 FROM public.theatre_members WHERE theatre_id = 'cccccccc-0000-0000-0000-000000000001')
        THEN RAISE EXCEPTION 'TEST: kaskada nie usunęła członków teatru'; END IF;
END $$;
RESET ROLE;

-- Kody zaproszeń (migracja 20261019_invite_codes.sql): dwa oczekujące zaproszenia, założone jak robi to serwer
-- (klucz serwisowy, tu: właściciel bazy).
INSERT INTO public.theatre_invites (theatre_id, user_id, code_enc, code_mac, expires_at, created_by) VALUES
    ('bbbbbbbb-0000-0000-0000-000000000001', 'aaaaaaaa-0000-0000-0000-000000000003', 'enc3', 'mac3', now() + interval '7 days', 'aaaaaaaa-0000-0000-0000-000000000002'),
    ('bbbbbbbb-0000-0000-0000-000000000001', 'aaaaaaaa-0000-0000-0000-000000000005', 'enc5', 'mac5', now() + interval '7 days', 'aaaaaaaa-0000-0000-0000-000000000002');

-- complete_invite: ustawia imię i joined_at tylko dla wołającego, zapisuje wpis „joined”.
CREATE TEMP TABLE t_role_events AS
SELECT count(*)::int AS n FROM public.theatre_member_events WHERE action = 'role_changed' AND user_id = 'aaaaaaaa-0000-0000-0000-000000000005';
GRANT SELECT ON t_role_events TO authenticated;
SELECT pg_temp.as_user('aaaaaaaa-0000-0000-0000-000000000005');
DO $$ BEGIN
    BEGIN
        PERFORM public.complete_invite('   ');
        RAISE EXCEPTION 'TEST: complete_invite przyjęło puste imię';
    EXCEPTION WHEN SQLSTATE 'P0001' THEN
        IF SQLERRM <> 'Wpisz imię i nazwisko.' THEN RAISE EXCEPTION 'TEST: zły komunikat pustego imienia (%)', SQLERRM; END IF;
    END;
    BEGIN
        PERFORM public.complete_invite(repeat('x', 121));
        RAISE EXCEPTION 'TEST: complete_invite przyjęło za długie imię';
    EXCEPTION WHEN SQLSTATE 'P0001' THEN NULL;
    END;
    PERFORM public.complete_invite('  Nowa Osoba  ');
END $$;
RESET ROLE;
DO $$ BEGIN
    IF (SELECT full_name FROM public.profiles WHERE id = 'aaaaaaaa-0000-0000-0000-000000000005') <> 'Nowa Osoba'
        THEN RAISE EXCEPTION 'TEST: complete_invite nie zapisało imienia'; END IF;
    IF (SELECT joined_at FROM public.theatre_members WHERE user_id = 'aaaaaaaa-0000-0000-0000-000000000005') IS NULL
        THEN RAISE EXCEPTION 'TEST: complete_invite nie ustawiło joined_at'; END IF;
    IF (SELECT joined_at FROM public.theatre_members WHERE user_id = 'aaaaaaaa-0000-0000-0000-000000000003') IS NOT NULL
        THEN RAISE EXCEPTION 'TEST: complete_invite dołączyło cudze zaproszenie'; END IF;
    IF (SELECT full_name FROM public.profiles WHERE id = 'aaaaaaaa-0000-0000-0000-000000000003') <> 'Test Pending'
        THEN RAISE EXCEPTION 'TEST: complete_invite zmieniło cudzy profil'; END IF;
    IF (SELECT count(*) FROM public.theatre_member_events WHERE action = 'joined' AND user_id = 'aaaaaaaa-0000-0000-0000-000000000005') <> 1
        THEN RAISE EXCEPTION 'TEST: brak jednego wpisu joined w dzienniku'; END IF;
    IF EXISTS (SELECT 1 FROM public.theatre_member_events WHERE action = 'joined' AND user_id = 'aaaaaaaa-0000-0000-0000-000000000003')
        THEN RAISE EXCEPTION 'TEST: wpis joined dla cudzego zaproszenia'; END IF;
    -- Ustawienie joined_at nie jest „zmianą roli”.
    IF (SELECT count(*) FROM public.theatre_member_events WHERE action = 'role_changed' AND user_id = 'aaaaaaaa-0000-0000-0000-000000000005')
        <> (SELECT n FROM t_role_events)
        THEN RAISE EXCEPTION 'TEST: fałszywy wpis zmiany roli po complete_invite'; END IF;
END $$;
-- complete_invite usuwa kod tylko wołającego; cudzy wiersz theatre_invites zostaje.
DO $$ BEGIN
    IF EXISTS (SELECT 1 FROM public.theatre_invites WHERE user_id = 'aaaaaaaa-0000-0000-0000-000000000005')
        THEN RAISE EXCEPTION 'TEST: complete_invite nie usunęło kodu wołającego'; END IF;
    IF NOT EXISTS (SELECT 1 FROM public.theatre_invites WHERE user_id = 'aaaaaaaa-0000-0000-0000-000000000003')
        THEN RAISE EXCEPTION 'TEST: complete_invite usunęło cudzy kod zaproszenia'; END IF;
END $$;
-- Niezalogowany nie kończy zaproszeń.
SELECT pg_temp.as_user(NULL);
DO $$ BEGIN
    BEGIN
        PERFORM public.complete_invite('Anon');
        RAISE EXCEPTION 'TEST: anon wywołał complete_invite';
    EXCEPTION WHEN insufficient_privilege THEN NULL;
    END;
END $$;
RESET ROLE;

-- Kody zaproszeń: klient (anon i authenticated, także członek i kierownik teatru) nie ma dostępu do theatre_invites
-- ani invite_lookup_hits; czyta i pisze tylko klucz serwisowy. Wiersze są (założone wyżej), więc brak widoczności
-- nie wynika z pustej tabeli.
CREATE OR REPLACE FUNCTION pg_temp.expect_denied(label text, stmt text) RETURNS void LANGUAGE plpgsql AS $$
BEGIN
    BEGIN
        EXECUTE stmt;
    EXCEPTION WHEN insufficient_privilege THEN
        RETURN;
    END;
    RAISE EXCEPTION 'TEST: % nie zostało odrzucone', label;
END $$;
GRANT EXECUTE ON FUNCTION pg_temp.expect_denied(text, text) TO PUBLIC;
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM public.theatre_invites WHERE user_id = 'aaaaaaaa-0000-0000-0000-000000000003')
        THEN RAISE EXCEPTION 'TEST: brak wiersza theatre_invites do sprawdzenia dostępu'; END IF;
END $$;
INSERT INTO public.invite_lookup_hits (ip_hash) VALUES ('hash-testowy');

-- Kierownik teatru (konto 2), rekwizytor (konto 5), podgląd (konto 4), niezalogowany.
SELECT pg_temp.as_user('aaaaaaaa-0000-0000-0000-000000000002');
SELECT pg_temp.expect_denied('SELECT theatre_invites (kierownik)', 'SELECT count(*) FROM public.theatre_invites');
SELECT pg_temp.expect_denied('INSERT theatre_invites (kierownik)', $q$INSERT INTO public.theatre_invites (theatre_id, user_id, code_enc, code_mac, expires_at)
    VALUES ('bbbbbbbb-0000-0000-0000-000000000001', 'aaaaaaaa-0000-0000-0000-000000000004', 'x', 'x', now())$q$);
SELECT pg_temp.expect_denied('UPDATE theatre_invites (kierownik)', $q$UPDATE public.theatre_invites SET attempts = 0, locked_at = NULL, expires_at = now() + interval '30 days'$q$);
SELECT pg_temp.expect_denied('DELETE theatre_invites (kierownik)', 'DELETE FROM public.theatre_invites');
SELECT pg_temp.expect_denied('SELECT invite_lookup_hits (kierownik)', 'SELECT count(*) FROM public.invite_lookup_hits');
SELECT pg_temp.expect_denied('INSERT invite_lookup_hits (kierownik)', $q$INSERT INTO public.invite_lookup_hits (ip_hash) VALUES ('x')$q$);
SELECT pg_temp.expect_denied('UPDATE invite_lookup_hits (kierownik)', $q$UPDATE public.invite_lookup_hits SET ip_hash = 'y'$q$);
RESET ROLE;

SELECT pg_temp.as_user('aaaaaaaa-0000-0000-0000-000000000003');
SELECT pg_temp.expect_denied('SELECT theatre_invites (zaproszony, własny wiersz)', 'SELECT code_enc FROM public.theatre_invites');
SELECT pg_temp.expect_denied('UPDATE theatre_invites (zaproszony, własny wiersz)', $q$UPDATE public.theatre_invites SET attempts = 0, locked_at = NULL$q$);
RESET ROLE;

SELECT pg_temp.as_user('aaaaaaaa-0000-0000-0000-000000000005');
SELECT pg_temp.expect_denied('SELECT theatre_invites (członek)', 'SELECT count(*) FROM public.theatre_invites');
SELECT pg_temp.expect_denied('INSERT theatre_invites (członek)', $q$INSERT INTO public.theatre_invites (theatre_id, user_id, code_enc, code_mac, expires_at)
    VALUES ('bbbbbbbb-0000-0000-0000-000000000001', 'aaaaaaaa-0000-0000-0000-000000000005', 'x', 'x', now())$q$);
SELECT pg_temp.expect_denied('SELECT invite_lookup_hits (członek)', 'SELECT count(*) FROM public.invite_lookup_hits');
RESET ROLE;

SELECT pg_temp.as_user(NULL);
SELECT pg_temp.expect_denied('SELECT theatre_invites (anon)', 'SELECT count(*) FROM public.theatre_invites');
SELECT pg_temp.expect_denied('INSERT theatre_invites (anon)', $q$INSERT INTO public.theatre_invites (theatre_id, user_id, code_enc, code_mac, expires_at)
    VALUES ('bbbbbbbb-0000-0000-0000-000000000001', 'aaaaaaaa-0000-0000-0000-000000000004', 'x', 'x', now())$q$);
SELECT pg_temp.expect_denied('SELECT invite_lookup_hits (anon)', 'SELECT count(*) FROM public.invite_lookup_hits');
SELECT pg_temp.expect_denied('INSERT invite_lookup_hits (anon)', $q$INSERT INTO public.invite_lookup_hits (ip_hash) VALUES ('x')$q$);
RESET ROLE;

-- Usunięcie członkostwa usuwa jego kod (kaskada złożonego klucza obcego), cudzych kodów nie rusza.
INSERT INTO public.theatre_invites (theatre_id, user_id, code_enc, code_mac, expires_at) VALUES
    ('bbbbbbbb-0000-0000-0000-000000000001', 'aaaaaaaa-0000-0000-0000-000000000004', 'enc4', 'mac4', now() + interval '7 days');
DELETE FROM public.theatre_members
 WHERE theatre_id = 'bbbbbbbb-0000-0000-0000-000000000001' AND user_id = 'aaaaaaaa-0000-0000-0000-000000000003';
DO $$ BEGIN
    IF EXISTS (SELECT 1 FROM public.theatre_invites WHERE user_id = 'aaaaaaaa-0000-0000-0000-000000000003')
        THEN RAISE EXCEPTION 'TEST: usunięcie członkostwa nie usunęło kodu zaproszenia'; END IF;
    IF NOT EXISTS (SELECT 1 FROM public.theatre_invites WHERE user_id = 'aaaaaaaa-0000-0000-0000-000000000004')
        THEN RAISE EXCEPTION 'TEST: usunięcie członkostwa usunęło cudzy kod zaproszenia'; END IF;
    -- Kod nie istnieje bez członkostwa.
    BEGIN
        INSERT INTO public.theatre_invites (theatre_id, user_id, code_enc, code_mac, expires_at)
        VALUES ('bbbbbbbb-0000-0000-0000-000000000001', 'aaaaaaaa-0000-0000-0000-000000000003', 'x', 'x', now());
        RAISE EXCEPTION 'TEST: kod zaproszenia bez członkostwa został przyjęty';
    EXCEPTION WHEN foreign_key_violation THEN NULL;
    END;
END $$;

DO $$ BEGIN RAISE NOTICE 'Wszystkie testy przeszły'; END $$;
ROLLBACK;
