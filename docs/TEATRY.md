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
- **Ekran zespołu dla kierownika pracowni** (18.10: zrobione w migracji `20261018_team_managers.sql` i na ekranie `/settings/team`): reguły w bazie są gotowe (kierownik zarządza członkami swojego teatru). Część scenariusza „pierwsze uruchomienie”.
- **Inspicjent przełącza sceny w trybie na żywo**, a to zapis: potrzebuje roli rekwizytora, nie podglądu.
- **Skaner w demo** (`/scan`) wymaga teraz logowania, tak jak etykiety.
- **Stare skrypty w `scripts/`** (poza dwoma skryptami demo) zapisują kluczem serwisowym bez teatru i po migracji nie zadziałają, dopóki nie podadzą `theatre_id`. `app/actions/fast-mode.ts` nie jest używany i nie zna standardu ścieżek.

## Maile (ustawienia w panelu Supabase)

Mail z resetem hasła prowadzi na `/pl/auth/confirm` (trasa w `app/[locale]/auth/confirm/route.ts`), która zamienia token na sesję. Domyślny szablon resetu prowadzi na adres z tokenem w hashu, którego serwer nie widzi, więc reset nie zadziałałby do końca. Zaproszenie tej trasy nie używa: przycisk w mailu otwiera zwykły adres `/pl/witaj?email=…` bez tokenu. Ustawienia robi się raz, ręcznie:

1. **Authentication → URL Configuration:** „Site URL” bez zmian (adres produkcyjnej aplikacji, bez ukośnika na końcu). W „Redirect URLs” dopisz adresy dla resetu hasła:
   - produkcja: `<adres aplikacji>/pl/auth/confirm**`,
   - dev: `http://localhost:3000/pl/auth/confirm**` i `http://localhost:3100/pl/auth/confirm**` (dev działa też na porcie 3100).

   Gwiazdki są potrzebne: aplikacja dopisuje do adresu, dokąd przejść po zalogowaniu (`?next=/pl/update-password` przy resecie hasła). Zaproszenia ten wpis nie dotyczy.

   Bez wpisu link resetu wraca na Site URL zamiast do `/pl/auth/confirm`.
2. **Authentication → Sign In / Providers:** wyłącz „Allow new users to sign up” (konta tylko z zaproszenia).
3. **Authentication → Email Templates → Invite user.**
   - Temat: `{{ .Data.inviter_name }} zaprasza cię do {{ .Data.theatre_name }} w Rekwizytorze`.
   - Treść HTML poniżej. Szablon nie zawiera tokenu ani kodu. Przycisk to `{{ .Data.witaj_url }}`: gotowy, zakodowany adres, który liczy serwer. Nie składaj go w szablonie z `{{ .SiteURL }}/witaj?email={{ .Email }}`, bo `+` w adresie zamieniłby się w spację.
   - Zmienne z `data`: `inviter_name`, `theatre_name`, `role_label` (Kierownik pracowni, Rekwizytor, Podgląd), `witaj_url`. Szablon nie używa form z rodzajem.

```html
<div style="font-family: Arial, Helvetica, sans-serif; font-size: 16px; line-height: 1.5; color: #222222; max-width: 560px;">
  <h2 style="font-size: 20px;">{{ .Data.inviter_name }} zaprasza cię do {{ .Data.theatre_name }}</h2>
  <p>Zaproszenie jest do aplikacji Rekwizytor: rekwizyty, spektakle i listy przed spektaklem.</p>
  <p>Twoja rola: {{ .Data.role_label }}.</p>
  <p>Kod do wejścia dostaniesz od zapraszającego, {{ .Data.inviter_name }}, ustnie albo SMS-em. W tym mailu go nie ma, a bez niego nikt nie wejdzie, nawet z tym mailem.</p>
  <p><a href="{{ .Data.witaj_url }}" style="display: inline-block; padding: 12px 20px; background: #222222; color: #ffffff; text-decoration: none; border-radius: 6px;">Wejdź do teatru</a></p>
  <p>Przycisk niczego nie zużywa: możesz kliknąć go teraz albo później, kiedy będziesz mieć kod.</p>
  <p style="font-size: 14px;">Przycisk nie działa? Skopiuj ten adres do przeglądarki:<br>{{ .Data.witaj_url }}</p>
  <p style="font-size: 13px; color: #666666;">Dostajesz tę wiadomość, bo twój adres podano w zaproszeniu: {{ .Email }}. Jeśli to pomyłka, zignoruj mail: bez kodu nic się nie stanie.</p>
</div>
```

4. **Authentication → Email Templates → Reset password** (temat: `Ustaw nowe hasło w Rekwizytorze`):

```html
<h2>Nowe hasło</h2>
<p>Ktoś poprosił o nowe hasło do twojego konta w Rekwizytorze.</p>
<p><a href="{{ .RedirectTo }}&token_hash={{ .TokenHash }}&type=recovery">Ustaw nowe hasło</a></p>
<p>Jeśli to nie ty, zignoruj tę wiadomość: bez kliknięcia w link nic się nie zmieni.</p>
```

   Pozostałe szablony (potwierdzenie rejestracji, zmiana e-maila) nie są używane, dopóki rejestracja jest wyłączona.

5. **Nadawca (SMTP):** domyślna poczta Supabase ma niskie limity i słabą dostarczalność. Do pilotażu własny SMTP z adresem na domenie Rekwizytora (na planszy: `zaproszenia@rekwizytor.app`).

**Wejście kodem** (zaproszenie dla osoby bez konta):

- Kod ma 6 cyfr. Kierownik widzi go w oknie po wysłaniu zaproszenia i w zakładce „Oczekujące” w Ustawieniach → Zespół (superadmin widzi go przy dodawaniu w Ustawieniach → Teatry). Osoba dostaje kod od kierownika osobno, ustnie albo SMS-em, nie w mailu.
- Kod jest ważny 7 dni. Po 5 złych próbach wejście jest zablokowane, aż kierownik zrobi „Nowy kod”. Nowy kod unieważnia stary: ma nowe 7 dni, zerowy licznik i zdjętą blokadę.
- Dwie drogi wejścia: przycisk z maila (`/pl/witaj?email=…`) albo „Mam zaproszenie” pod przyciskiem logowania. Obie idą tym samym przebiegiem: adres, kod, imię i hasło.
- Limit: więcej niż 20 wywołań w ciągu godziny z jednego IP (sprawdzenie adresu i sprawdzenie kodu liczą się razem) daje komunikat „Za dużo prób z tego urządzenia”. Tabela `invite_lookup_hits` trzyma hash IP, nie sam IP, i czyści wpisy starsze niż 24 h.
- Kod w bazie jest zaszyfrowany (AES-256-GCM) i ma kod MAC. Tabela `theatre_invites` nie ma żadnych reguł dla klienta: czyta i pisze ją tylko serwer.
- Zmienna środowiskowa `INVITE_CODE_SECRET` (base64, 32 bajty): wygeneruj `openssl rand -base64 32`, wpisz do `.env.local` i do Vercela. Bez niej zaproszenie się nie wyśle, a serwer zwróci „Brak INVITE_CODE_SECRET”. Nie zmieniaj klucza bez potrzeby: zapisane kody przestaną się zgadzać.

**Nowa ścieżka pierwszego wejścia:**

- `/pl/witaj`: krok 1 to adres (z `?email=…` od razu krok 2). Krok 2 to kod: 6 pól, a wklejony cały kod też działa. Dobry kod zakłada sesję w ciasteczkach. Krok 3 to imię i nazwisko oraz hasło (miernik siły jak w aplikacji). Zapis ustawia hasło i imię, zapisuje dołączenie do teatru (`complete_invite`, który kasuje też wiersz zaproszenia) i przenosi na `/`.
- Jeśli sesja już jest i ma oczekujące członkostwo, od razu krok 2.
- Stany zamiast kroku: kod wygasł, kod zablokowany, zaproszenie cofnięte, „Masz już konto” (adres ma konto z członkostwem albo konto bez zaproszeń, więc zwykłe logowanie).
- Logowanie: pod przyciskiem „Nie masz jeszcze konta? Mam zaproszenie” ten sam przebieg w układzie logowania. Tryb rejestracji (signUp) usunięty. Przy „Masz już konto” pole hasła z zablokowanym adresem i przycisk „Zmień”.
- `/pl/settings/team`: ekran zespołu dla kierownika pracowni (dodawanie, „Pokaż kod”, „Nowy kod”, ponowne wysłanie maila, zmiana roli, usuwanie, historia zespołu).
