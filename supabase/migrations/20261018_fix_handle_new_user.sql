-- Profil nowego konta (18.10.2026): handle_new_user wpisywał profiles.avatar_url, której w bazie już nie ma
-- (kolumna zniknęła poza migracjami), więc każde nowe konto, także z zaproszenia, kończyło się błędem
-- „column avatar_url of relation profiles does not exist”. Awatary wrócą osobno (bucket avatars, docs/TEATRY.md).

BEGIN;

CREATE OR REPLACE FUNCTION public.handle_new_user() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, extensions AS $$
BEGIN
    INSERT INTO public.profiles (id, full_name, email)
    VALUES (NEW.id, NEW.raw_user_meta_data->>'full_name', NEW.email);
    RETURN NEW;
END;
$$;

COMMIT;
