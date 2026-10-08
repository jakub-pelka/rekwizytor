-- Kalendarz (README, aktualizacja 8.10; POMYSLY 17): termin to spektakl albo próba. Rodzaj już jest
-- (show_lists.kind: 'show' | 'rehearsal'); próby potrzebują opisu, sali i informacji, czy mają listę rekwizytów.
-- Wyłącznie zmiany dodające.

BEGIN;

ALTER TABLE public.show_lists
    -- „próba czytana”, „próba sytuacyjna”; dla spektaklu zwykle puste.
    ADD COLUMN IF NOT EXISTS title text,
    -- Sala inna niż scena spektaklu, np. „Sala prób 230”; puste = scena ze spektaklu.
    ADD COLUMN IF NOT EXISTS venue text,
    -- Krótki opis pod tytułem: „reżyser, obsada”, „akt I”, „szkolny”.
    ADD COLUMN IF NOT EXISTS note text,
    -- Próba bez rekwizytów nie ma listy zadań ani licznika w kalendarzu.
    ADD COLUMN IF NOT EXISTS with_props boolean NOT NULL DEFAULT true;

-- Na jeden termin spektaklu może przypaść kilka prób tego samego dnia o różnych godzinach,
-- więc unikalność (spektakl, data i godzina) zostaje bez zmian.

COMMIT;
