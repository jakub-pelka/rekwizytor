# Teatry (wielodostępność)

Od migracji `supabase/migrations/20261011_theatres.sql` jedna baza obsługuje wiele teatrów, a każdy widzi tylko swoje dane.

## Jak to działa

- **Bieżący teatr.** Każde konto ma `profiles.current_theatre_id`. Baza (reguły RLS) pokazuje i pozwala zmieniać wyłącznie wiersze bieżącego teatru, więc zapytania w aplikacji nie filtrują po teatrze.
- **`theatre_id` ustawia baza.** Wyzwalacz `a_set_theatre_id` bierze teatr z rodzica (scena od spektaklu, rekwizyt od grupy, odhaczenie od listy zadań). Wiersz bez rodzica dostaje bieżący teatr. Wiersza nie da się doczepić do rodzica z innego teatru.
- **Niezalogowani** widzą tylko „Teatr demo” (`theatres.is_demo`) i nic w nim nie zapiszą.
- **Konto niezatwierdzone** nie widzi niczego, nawet jeśli należy do teatru.
- **Zatwierdzone konto bez teatru** trafia na ekran `/no-theatre`.
- **Superadmin** (`profiles.role = 'admin'`) zakłada teatry i dodaje do nich ludzi w Ustawieniach → Teatry (`/settings/theatres`). Może przejść do dowolnego teatru.
- **Role w teatrze** (`theatre_members.role`):

  | Co | Superadmin | Kierownik (`admin`) | Rekwizytor (`member`) | Podgląd (`viewer`) |
  |---|:-:|:-:|:-:|:-:|
  | Zakłada teatry | ✓ | | | |
  | Nazwa teatru | ✓ | | | |
  | Zespół teatru (dodaje, zmienia role, usuwa) | ✓ | ✓ | | |
  | Trwale usuwa spektakl z Kosza | ✓ | ✓ | | |
  | Spektakle, rozpiska, magazyn, etykiety, notatki, listy zadań | ✓ | ✓ | ✓ | |
  | Ogląda wszystko w swoim teatrze | ✓ | ✓ | ✓ | ✓ |

  Podgląd na serwerze nie zapisuje niczego. Odhaczanie na listach i w trybie na żywo działa u niego (i u niezalogowanych w demo) tylko na ekranie, z informacją „Podgląd: zmiany zostają tylko na tym ekranie”, bez błędów zapisu. Interfejs bierze prawo zapisu z `lib/access.ts` (ta sama funkcja `can_write_active_theatre`, której używa baza), więc przyciski edycji są ukryte, a ekrany edycji wracają do widoku.
- **Przełącznik teatru** jest w menu konta (na dole menu bocznego). Widać go tylko przy dostępie do więcej niż jednego teatru.
- **Numery etykiet** (REK-, GRP-, MSC-) są liczone osobno w każdym teatrze (`theatre_counters`). Nowy teatr zaczyna od 0001.
- **Dziennik zespołu** (migracja `20261012_theatre_audit.sql`): `theatre_members.invited_by` i `invited_at` mówią, kto i kiedy dodał osobę, a `theatre_member_events` to dziennik tylko do dopisywania: kto kogo dodał, zmienił mu rolę albo usunął. Wpisy robi wyzwalacz w bazie (każda droga zmiany jest zapisana), zawierają kopie e-maili i imion, więc przetrwają usunięcie konta. Czytają je superadmin i kierownik danego teatru (Ustawienia → Teatry → „Historia zespołu”); nikt z aplikacji nie może ich zapisać, zmienić ani skasować. Obecni członkowie są w dzienniku jako `migrated` (autor nieznany).
- **Konta tylko z zaproszenia.** Nikt nie „prosi o dostęp”: konto powstaje, gdy superadmin albo kierownik doda adres e-mail do teatru. Wymaga wyłączenia samodzielnej rejestracji w Supabase (Authentication → Sign In / Providers → „Allow new users to sign up”: off).
- **Pliki**: `<teatr>/<rodzaj>/<id rzeczy>/<losowe>.<rozszerzenie>`, rodzaje `plakaty`, `rekwizyty`, `miejsca`; miniatura z dopiskiem `-mini`. Awatary: `osoby/<id konta>/…` (bucket `avatars` powstanie razem z awatarami). Zapisywać, podmieniać i usuwać można tylko pliki bieżącego teatru, z prawem zapisu. Ścieżki buduje `lib/storage-paths.ts`. Stare pliki zostają do odczytu.
- **Etykiety QR** (`/g/…`, `/scan/…`) działają tylko po zalogowaniu: niezalogowany trafia na logowanie i po nim wraca do zeskanowanej rzeczy, w swoim teatrze.
- **Wyszukiwanie** (`search_global*`) filtruje po bieżącym teatrze. Widok `vw_searchable_entities` nie jest dostępny bezpośrednio dla klienta.

## Wdrożenie na produkcję

Kod działa przed migracją i po niej, więc kolejność wdrożenia nie jest krytyczna. Migrację puszcza się jednak raz i ręcznie:

1. Zrób kopię danych: `supabase db dump --linked --data-only -f backup-przed-teatrami.sql` (i sprawdź, że plik nie jest pusty).
2. Sprawdź migrację na lokalnej kopii (niżej). Test musi zakończyć się komunikatem „Wszystkie testy przeszły”.
3. Puść migrację: `supabase db push` albo wklej plik w SQL Editor w panelu Supabase. Całość idzie w jednej transakcji: błąd w połowie nie zostawi bazy w pół drogi.
4. Uruchom `npx supabase gen types typescript --linked > types/supabase.ts` i porównaj z plikiem w repo. Powinno wyjść bez zmian, bo typy w repo są już wygenerowane z bazy po migracji.
5. Zaloguj się. Powinieneś widzieć wszystko jak wcześniej (dane są w „Teatrze demo”, a dotychczasowi zatwierdzeni użytkownicy należą do niego).
6. W `/settings/theatres` załóż pierwszy prawdziwy teatr i dodaj kierownika pracowni.

## Test izolacji na lokalnej kopii

`supabase/tests/theatres_isolation.sql` sprawdza między innymi:

- anon widzi tylko demo;
- nowy teatr jest pusty i numeruje etykiety od 0001;
- nie da się dodać sceny do cudzego spektaklu ani zmienić czy usunąć cudzego wiersza;
- nie da się przełączyć na cudzy teatr;
- profile są widoczne tylko w obrębie teatru;
- wyszukiwanie nie zwraca cudzych wyników;
- konto niezatwierdzone nie widzi niczego;
- superadmin przełącza się między teatrami;
- zwykłe konto nie zakłada teatrów.

Test uruchamia się na lokalnej bazie z obrazu `public.ecr.aws/supabase/postgres:17.6.1.052`. Kolejność:

1. Załaduj zrzut schematu (`supabase db dump --linked --schema public`), wcześniej doinstalowując rozszerzenia `vector` (w schemacie `extensions`) i `pg_trgm`.
2. Dodaj przykładowe dane, puść migrację, a potem test.

Nigdy nie uruchamiaj testu na produkcji.

## Co ta migracja przy okazji naprawia

- **Zapis bez zatwierdzenia.** Reguły `USING (true)` pozwalały zapisywać i usuwać dane także niezatwierdzonym kontom.
- **Dane dla niezalogowanych.** Niezalogowani czytali wszystkie dane, łącznie z profilami i adresami e-mail.
- **Cudze profile.** Reguła „Approved users can update profile status” pozwalała zmieniać cudze profile.
- **Widok wyszukiwania.** `vw_searchable_entities` był dostępny dla każdego klienta z pominięciem RLS.
- **Unikalność nazw.** Nazwy grup i pomieszczeń były unikalne w całej aplikacji. Teraz są unikalne w teatrze.

## Otwarte (po migracji)

- **Zatwierdzanie kont** (`/admin/users`, lista w Ustawieniach) nie dodaje do teatru. Ludzi do teatru dodaje się w Ustawieniach → Teatry, co też zatwierdza konto.
- **Ekran zespołu dla kierownika pracowni**: reguły w bazie są gotowe (kierownik zarządza członkami swojego teatru), brakuje ekranu. Część scenariusza „pierwsze uruchomienie”.
- **Inspicjent przełącza sceny w trybie na żywo**, a to zapis: potrzebuje roli rekwizytora, nie podglądu.
- **Skaner w demo** (`/scan`) wymaga teraz logowania, tak jak etykiety.
- **Stare skrypty w `scripts/`** (poza dwoma skryptami demo) zapisują kluczem serwisowym bez teatru i po migracji nie zadziałają, dopóki nie podadzą `theatre_id`. `app/actions/fast-mode.ts` nie jest używany i nie zna standardu ścieżek.

## Maile (ustawienia w panelu Supabase)

Mail z zaproszeniem i z resetem hasła musi prowadzić na `/pl/auth/confirm` (trasa w `app/[locale]/auth/confirm/route.ts`), która zamienia token na sesję. Domyślny szablon prowadzi na adres z tokenem w hashu, którego serwer nie widzi, więc zaproszenie nie zadziałałoby do końca. Ustawienia robi się raz, ręcznie:

1. **Authentication → URL Configuration:** „Site URL” to adres produkcyjnej aplikacji (bez ukośnika na końcu). Na dev dopisz `http://localhost:3000` w „Redirect URLs”.
2. **Authentication → Sign In / Providers:** wyłącz „Allow new users to sign up” (konta tylko z zaproszenia).
3. **Authentication → Email Templates → Invite user** (temat: `Zaproszenie do Rekwizytora`):

   ```html
   <h2>Zaproszenie do Rekwizytora</h2>
   <p>Cześć! Kierownik pracowni dodał Cię do zespołu w aplikacji Rekwizytor.</p>
   <p><a href="{{ .SiteURL }}/pl/auth/confirm?token_hash={{ .TokenHash }}&type=invite&next=/pl/update-password">Ustaw hasło i wejdź</a></p>
   <p>Link działa jeden raz i wygasa po kilku godzinach. Jeśli nie spodziewałeś się tej wiadomości, zignoruj ją: bez kliknięcia nic się nie stanie.</p>
   ```

4. **Authentication → Email Templates → Reset password** (temat: `Ustaw nowe hasło w Rekwizytorze`):

   ```html
   <h2>Nowe hasło</h2>
   <p>Poprosiłeś o zmianę hasła w Rekwizytorze.</p>
   <p><a href="{{ .SiteURL }}/pl/auth/confirm?token_hash={{ .TokenHash }}&type=recovery&next=/pl/update-password">Ustaw nowe hasło</a></p>
   <p>Jeśli to nie Ty, zignoruj tę wiadomość.</p>
   ```

Pozostałe szablony (potwierdzenie rejestracji, zmiana e-maila) nie są używane, dopóki rejestracja jest wyłączona.

Do dopracowania w ekranach pierwszego wejścia: po kliknięciu w zaproszenie osoba trafia na ustawianie hasła (`/update-password`, dziś w starym wyglądzie i bez kroku „imię”), a link wygasły kończy na logowaniu z `?link=expired` (komunikat jeszcze nie jest tam wyświetlany).
