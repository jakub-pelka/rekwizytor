# Rekwizytor: tickety

Kopia dla agentów. Źródło stanu: Claude Doc „Tickety Rekwizytora” (https://claude.ai/artifact/Gvn7HaXnbGV5wjtEX7VhV7). To jedyna lista poprawek i zadań: inne pliki mogą wskazać numer RK-, ale zgłoszenie żyje tylko tutaj. Stan na 23.10.2026.

Ryzyko i zasady przeglądu: `docs/redesign/PLAN-PRACY.md`, `REVIEW.md`.

| Nr | Problem | Ryzyko | Status | Gdzie / kto | Uwagi |
|---|---|---|---|---|---|
| RK-01 | Zatwierdzenie konta nie dodaje do teatru: osoba widzi „nie dodano do żadnego teatru” | wysokie | Do zrobienia | `app/actions/admin/approve-user.ts`, Sonnet 5.5 przez agy, przegląd Opus 5.5 | Przy zatwierdzeniu wybór roli i dodanie do bieżącego teatru. Dziś każdy zatwierdzony może zatwierdzić kogokolwiek, z każdego teatru. Komunikaty po angielsku. |
| RK-02 | Tryb na żywo: nie da się go zatrzymać, gdy zniknie komunikat ani po ostatniej scenie | średnie | Do zrobienia | `components/lists/useLiveStart.ts`, `LiveView.tsx` | Stałe „Cofnij start” i „Zakończ spektakl” na ostatniej scenie. Sprawdzić, czy wystarczy bez migracji. |
| RK-03 | Zaproszenia kodem nie działają bez tabeli i sekretu | wysokie | Czeka na Kubę | Kuba: SQL Editor, `.env.local`, Vercel | Uruchomić `20261019_invite_codes.sql`, dopisać `INVITE_CODE_SECRET`. Blokuje falę 2. |
| RK-04 | Integracja czeka na przeklikanie i scalenie do main | — | Czeka na Kubę | Kuba, `localhost:3001`, gałąź `claude/project-collaboration-5767ae` | Po OK commit do main, push tylko na prośbę. |
| RK-05 | Limit AI 3 $ na teatr: migracja uruchomiona 23.10, kod w integracji (`a9c12d2`) | wysokie | Gotowe | przeklikane przez Kubę 23.10 | Ostrzeżenie od 70% na Pulpicie i odrzucenie skanu po przekroczeniu działają. Znane zachowanie: ostatni skan mieszczący się w limicie może go przekroczyć o koszt jednego wywołania. |
| RK-06 | Etykiety: marginesy wyliczone, niesprawdzone na papierze | średnie | Czeka na Kubę | Kuba, wydruk z produkcji na Avery | Z localhosta QR prowadzi na localhost. |
| RK-07 | Kolizje: logika gotowa, ale bez dat bez strefy i bez ekranu | średnie | W agy | gałęzie `claude/kolizje-*-test` | Wersja Sonnet 5.5 + poprawki z przeglądu Argona (daty bez strefy przez `theatreNaiveToInstant`), potem podpięcie pod rozpiskę. |
| RK-08 | `/witaj` ma wyglądać jak logowanie (kurtyna i logo po lewej) | niskie | Do zrobienia | fala 2 | Kod zaproszeń i przepływ z 19.10 zostają. |
| RK-09 | Rola Inspicjent: tylko podgląd | wysokie | Do zrobienia | fala 2 | Migracja i RLS, przegląd Opus 5.5, Kuba czyta. |
| RK-10 | Lista scen teatru, do 6 | wysokie | Do zrobienia | fala 2 | Migracja, filtr scen na liście spektakli. |
| RK-11 | Generator etykiet: wygląd w nowym design systemie | średnie | Do zrobienia | osobne zadanie | Formaty arkuszy już są, chodzi o ekran edytora. |
| RK-12 | Konto `pracownik@testowy.com` czeka na zatwierdzenie i teatr | — | Czeka na Kubę | Kuba w aplikacji, po RK-01 | Bezpośredni zapis w bazie zablokowany zabezpieczeniem. |
| RK-13 | Stare gałęzie i katalogi robocze po sesjach | niskie | Do zrobienia | sesja główna | `etykiety-a4-b37142`, `stare-okna-aceecd`, `zaczynamy-96f389`, `limit-ai-9f3aec`, testy kolizji. |
| RK-14 | Nie da się usunąć zapisanego terminu spektaklu, tym bardziej gdy wszedł już w tryb na żywo | wysokie | Do zrobienia | ekran listy zadań terminu, akcja usuwania | Zgłosił Kuba 23.10. Usuwanie danych: z potwierdzeniem i Cofnij. Kto może usuwać (kierownik?) do ustalenia. |
| RK-15 | Nie da się edytować daty i godziny zapisanego terminu; pomyłka wymaga usunięcia terminu, a tego też nie można zrobić | średnie | Do zrobienia | edycja terminu w kalendarzu i na liście | Zgłosił Kuba 23.10. Zmiana godziny w trakcie trybu na żywo musi uważać na zapisany start (RK-02). |
| RK-16 | Zegar w trybie na żywo: pokazywać opóźnienie względem godziny spektaklu zamiast czasu od startu | niskie | Czeka na Kubę | `components/lists/LiveView.tsx` | Pomysł Kuby 23.10: dla teatru przydatniejsze jest opóźnienie. Pytanie: czy zegar scen zostaje obok? |
| RK-17 | Sprawdzenie wszystkiego na telefonie (kulisy, bez sieci): po przejściu przez wszystkie fale | — | Czeka na Kubę | Kuba, fala 3 | Odłożone na koniec (Kuba, 23.10). |
