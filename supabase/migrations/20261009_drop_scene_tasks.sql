-- Koniec zadań scen (README, aktualizacja 8.10 (2)): czynność przy scenie zapisujemy jako wpis rekwizytu z samym opisem,
-- więc osobna tabela jest zbędna. Dane testowe (2 wiersze) usunięto 9.10; interfejs i eksport PDF już z niej nie korzystają.
-- Wgrywać jako ostatnią z migracji 8.10 i dopiero po sprawdzeniu, że ekran spektaklu i lista zadań działają.

BEGIN;

DROP TABLE IF EXISTS public.scene_tasks;

COMMIT;
