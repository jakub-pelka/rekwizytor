# Rekwizytor: plan pracy do demo (22.10.2026)

Co robimy, kto to robi i co sprawdza Kuba. Decyzje produktowe są w `PYTANIA.md`. Sposób pracy oparty na „Solving code review at Anthropic” (claude.dev/blog), przyciętym do jednej osoby i jednego repo.

## Zasada

Najrzadsza jest uwaga Kuby, nie praca agentów. Kuba nie czyta każdej linii. Kuba odpowiada za trzy rzeczy:

1. **Kierunek:** czy to w ogóle robimy i czy tak ma działać.
2. **Ryzykowne miejsca:** baza, uprawnienia, logowanie, koszty, usuwanie danych.
3. **Dowody:** czyta wynik sprawdzeń i zrzuty, a nie zapewnienia „działa”.

Każda zmiana ma właściciela: Kubę. Akceptacja agenta nigdy nie zastępuje akceptacji Kuby tam, gdzie jest wymagana.

## Poziomy ryzyka

Poziom wyznacza zmiana, nie to, kto ją pisał.

| Poziom | Co to jest w Rekwizytorze | Co robi Kuba |
|---|---|---|
| Niski | teksty, tłumaczenia, wygląd starych ekranów, dokumentacja, wzorce w design systemie | patrzy na zrzut ekranu, 1–2 min |
| Średni | nowa funkcja w interfejsie bez zmian w bazie | przeklikuje według listy z zadania, ok. 5 min |
| Wysoki | migracje, RLS i izolacja teatrów, logowanie i zaproszenia, limity kosztów AI, usuwanie danych | czyta migrację, sam ją uruchamia w SQL Editor, przeklikuje i sprawdza izolację |

## Co każde zadanie oddaje, zanim trafi do Kuby

Agent pokazuje wynik, a nie pisze „gotowe”.

- **Sprawdzenia:** `npx tsc --noEmit`, `npm run lint`, `npm run build`. Wynik w raporcie. Czerwone nie idzie dalej.
- **Przegląd świeżym okiem:** `/code-review` albo osobny agent bez kontekstu zadania. Każda uwaga: poprawiona albo odrzucona z powodem.
- **Design system:** lista użytych klas `.rk-*` i tokenów. Nic wpisanego na sztywno. Gdy czegoś brakuje w systemie: stop i pytanie.
- **Zrzuty:** komputer, a gdy zadanie dotyczy telefonu, także telefon (jev-browser, tylko odczyt). Kuba zezwala na jev-browser ręcznie, więc wszystkie zrzuty w jednym momencie pod koniec, zapowiedziane linią „Potrzebuję jev-browser: co, po co, adresy”.
- **Język:** teksty po polsku, językiem pracowni. Nowe klucze tylko w `pl.json`.
- **Jak cofnąć:** jedno zdanie. Przy migracji: SQL, który ją odwraca.
- **Lista dla Kuby:** 3–5 kroków do przeklikania, z adresem ekranu.

## Zasady pracy agentów

- **Małe zmiany.** Jedno zadanie to jedna gałąź i jeden commit. Bez pushowania.
- **Bez wspólnych plików naraz.** Zadania w tej samej fali nie dotykają tych samych plików. Wyjątek: `messages/pl.json`. Każde zadanie dopisuje klucze w swojej sekcji, a scalanie robi sesja główna.
- **Najwyżej 3 rundy poprawek.** Potem rozmowa o podejściu, a nie kolejna runda.
- **Stare błędy osobno.** Błąd, który był wcześniej, trafia do notatek jako „istniejący”, a nie do bieżącej zmiany.
- **Migracje uruchamia Kuba.** Agent pisze plik migracji i SQL do cofnięcia, ale nie uruchamia go na bazie.
- **Większe zadania przez `/orchestrator`:** podział na podzadania, Haiku domyślnie, Sonnet gdy trzeba.

## Fale

### Fala 0 · zrobione 22.10
- Commit `ad66d1c` na main (bez pushowania): etap 1 scenariusza 7 i wejście kodem z 18–19.10. Ręczne przejście w fali 3.
- Układ `/witaj`: jak logowanie, kurtyna i logo po lewej (decyzja 22.10). Kod i przepływ z 19.10 zostają.
- **Kuba, przed falą 2:** uruchomić `supabase/migrations/20261019_invite_codes.sql` w SQL Editor (22.10 tabeli `theatre_invites` jeszcze nie ma) i dopisać `INVITE_CODE_SECRET` (`openssl rand -base64 32`) do `.env.local` i do Vercela. Bez tego zaproszenie się nie wyśle.
- Tabeli `scene_tasks` w bazie już nie ma (sprawdzone 22.10), więc zadanie z jej usunięciem odpada. Zostają tylko ewentualne resztki w kodzie (dziś brak odwołań).

### Fala 1 · agenci równolegle · od razu

| Zadanie | Ryzyko | Co sprawdza Kuba |
|---|---|---|
| Etykiety A4: generator w nowym systemie, format „rekwizyt” 44 na arkuszu, bez lokalizacji | średni | wydruk próbny jednego arkusza, czy QR się skanuje |
| Stare okna: import scen (`SceneImportWizard`) i kosz (`/trash`) po polsku i w design systemie, tekst o kostiumach z Pulpitu | niski | zrzuty |
| Przycisk „Zaczynamy” przy opóźnieniu, w pilotażu dla wszystkich | średni | przeklikanie listy zadań terminu |
| `REVIEW.md`: lista „co tu jest porażką” z końca tego pliku | niski | przeczytać, 2 min |
| Limit AI: 3 $ na teatr, informacja na Pulpicie przy 70% | wysoki | migracja, test przekroczenia na teatrze próbnym |

### Fala 2 · agy (Sonnet 5.5) pisze, Argon sprawdza, Kuba przeklikuje

Zadania to tickety z `TICKETY.md`. Podział na trzy tury, po trzy zadania bez wspólnych plików (23.10).

| Tura | Zadania | Ryzyko |
|---|---|---|
| 2.1 | RK-01 zatwierdzenie dodaje do teatru · RK-02 „Zakończ spektakl” · RK-08 `/witaj` jak logowanie | wysokie, średnie, niskie |
| 2.2 | RK-14 usuwanie terminu · RK-15 edycja daty terminu · RK-07 kolizje na ekranie rozpiski | wysokie, średnie, średnie |
| 2.3 | RK-09 rola Inspicjent · RK-10 sceny teatru do 6 · RK-11 wygląd generatora etykiet | wysokie, wysokie, średnie |

RK-16 (zegar jako opóźnienie) czeka na decyzję Kuby. Telefon (RK-17) po wszystkich falach.

### Fala 3 · Kuba z sesją główną
- **Scenariusz 7 ręcznie:** całe pierwsze wejście na koncie testowym.
- **Przeklikanie scenariuszy 1 i 2** z zapisem w bazie (lista w `SCENARIUSZE-UX.md`, „Do sprawdzenia”).
- **Bez sieci:** test na telefonie w kulisach.
- **Stan rzeczy, okno „Co z tym?”:** najpierw szkic w design systemie, potem kod.
- **Regulamin wersji testowej i zgoda na AI:** szkic od agenta, treść zatwierdza Kuba.
- **Przegląd i porządki w bazie (ryzyko: wysokie):** w bazie jest wiele tabel i danych z testów. Agent robi **tylko odczyt**: lista tabel, kolumn, polityk RLS i wierszy testowych, z podziałem na „używane przez kod”, „sieroty” i „śmieci z testów” (np. konta i teatry testowe, zostaje „Teatr próbny” i konto `rekwizytorka.test@example.com`). Kuba czyta raport i sam uruchamia czyszczenie w SQL Editor. Przed usunięciem kopia (zrzut) i SQL do cofnięcia. Zrobić przed zaproszeniem pierwszego prawdziwego teatru.

### Fala 4 · przed demo
- Przegląd Pulpitu i Kalendarza (scenariusz 5), tylko odczyt.
- Scenariusz nagrania demo na telefonie: lista zadań, tryb na żywo, skan.
- Nagranie: Kuba.

### Po pilotażu
Kreator nowego teatru, archiwum z przywracaniem do sezonu, pytanie o próbę przy 60% odhaczeń, liczenie rzeczy zużywalnych, powiadomienia, angielski.

## Co uznajemy za porażkę w tym repo

Do przeniesienia do `REVIEW.md`, żeby każdy przegląd szukał tego samego:

- dane jednego teatru widać w innym (RLS, `theatre_id`);
- odhaczenie albo zapis ginie bez sieci;
- tekst po angielsku albo językiem technicznym;
- wygląd spoza design systemu (kolory, odstępy, fonty na sztywno);
- akcja nieodwracalna bez „Cofnij” albo bez potwierdzenia;
- koszt AI bez limitu.
