-- Wejście z zaproszenia kodem od kierownika (19.10.2026).
--
--  1. theatre_invites: kod 6-cyfrowy zaproszonej osoby (zaszyfrowany + HMAC do sprawdzania), ważność, licznik prób,
--     blokada. Jeden wiersz na oczekujące członkostwo; znika z członkostwem (kaskada) i po complete_invite.
--     RLS włączone BEZ reguł i REVOKE: czyta i pisze wyłącznie klucz serwisowy (service_role). Żadna funkcja
--     SECURITY DEFINER ani widok nie czyta tej tabeli.
--  2. invite_lookup_hits: ślad wywołań lookupInvite/verifyInviteCode (hash IP) do ograniczania prób bez sesji.
--     Ten sam reżim dostępu co wyżej.
--  3. complete_invite: po ustawieniu joined_at usuwa wiersz theatre_invites wołającego.
--
-- Wymaga migracji 20261011_theatres.sql, 20261012_theatre_audit.sql i 20261018_team_managers.sql.

BEGIN;

-- 1. Kody zaproszeń ----------------------------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.theatre_invites (
    theatre_id uuid NOT NULL,
    user_id uuid NOT NULL,
    code_enc text NOT NULL,
    code_mac text NOT NULL,
    expires_at timestamptz NOT NULL,
    attempts int NOT NULL DEFAULT 0,
    locked_at timestamptz,
    created_at timestamptz NOT NULL DEFAULT now(),
    created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
    PRIMARY KEY (theatre_id, user_id),
    FOREIGN KEY (theatre_id, user_id) REFERENCES public.theatre_members(theatre_id, user_id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS theatre_invites_user_idx ON public.theatre_invites (user_id);

ALTER TABLE public.theatre_invites ENABLE ROW LEVEL SECURITY;
-- Celowo żadnych reguł (policy): bez nich anon i authenticated nie widzą i nie zapisują nic, a service_role omija RLS.
REVOKE ALL ON TABLE public.theatre_invites FROM PUBLIC, anon, authenticated;

-- 2. Ślad prób wejścia -------------------------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.invite_lookup_hits (
    id bigserial PRIMARY KEY,
    ip_hash text NOT NULL,
    at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS invite_lookup_hits_ip_idx ON public.invite_lookup_hits (ip_hash, at);

ALTER TABLE public.invite_lookup_hits ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.invite_lookup_hits FROM PUBLIC, anon, authenticated;
REVOKE ALL ON SEQUENCE public.invite_lookup_hits_id_seq FROM PUBLIC, anon, authenticated;

-- 3. Zakończenie zaproszenia (jak w 20261018_team_managers.sql + usunięcie kodu) ---------------------------------

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

    -- Kod wejścia z zaproszenia jest już niepotrzebny (zaproszenie zakończone): znika razem z dołączeniem.
    DELETE FROM public.theatre_invites WHERE user_id = uid;
END $$;
REVOKE ALL ON FUNCTION public.complete_invite(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.complete_invite(text) TO authenticated;

COMMIT;
