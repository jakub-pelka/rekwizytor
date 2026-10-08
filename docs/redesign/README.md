# Rekwizytor: przekazanie redesignu (październik 2026)

Ten folder zbiera wszystko, co powstało przy odświeżaniu marki, design systemu i ekranów (4–7 października 2026). Jest napisany dla Claude Code: zacznij od tego pliku, potem sięgaj do reszty według potrzeby.

## Po co to jest

Celem najbliższych tygodni jest **pilotaż w jednym–dwóch teatrach na Śląsku**. Teatrom nie pokazujemy prezentacji ani makiet, tylko działającą aplikację na telefonie i krótkie nagranie ekranu. Dlatego priorytetem jest przeniesienie na nowy design system czterech przepływów, które trafią do demo (sekcja „Migracja pod demo”). Reszta aplikacji może przejść na nowy wygląd później.

**Zasada nadrzędna:** nie wymyślamy wyglądu w kodzie. Jeśli czegoś brakuje w design systemie, najpierw zapisujemy to w systemie, potem w kodzie.

## Aktualizacja 8 października: Kalendarz, Spektakle z plakatem, Ustawienia

Ta sekcja ma pierwszeństwo przed starszymi fragmentami tego pliku, jeśli coś się kłóci. Odpowiada też na punkt audytu o starych ekranach Spektaklu i Listy spektakli na komputerze.

### Decyzje

1. **Nowe menu.**
   - Komputer: Pulpit · Spektakle · Kalendarz · *Magazyn:* Magazyn · Etykiety QR · *Zespół:* Notatki.
   - Telefon (pasek dolny): Pulpit · Magazyn · Skanuj · Spektakle · Kalendarz.
   - „Listy zadań” znikają z menu (lista należy do terminu, wchodzi się do niej z Kalendarza). „Rekwizyty” i „Grupy” łączą się w „Magazyn” (konsolidację prowadzi Kuba osobno).
   - Gość w trybie demo widzi ten sam sidebar co zalogowany, po polsku, tylko bez akcji edycji.
2. **Spektakle** to lista produkcji z plakatem (karta „Plakat”, `.rk-poster`).
   - Plakat z istniejącego pola obrazka spektaklu; gdy go nie ma, `.rk-poster--empty` ze znakiem kurtyny.
   - Sekcje „Grane w tym sezonie” i „W przygotowaniu”, filtr sceny (chipy) i sezonu (select). W wierszu: plakat 48 px, tytuł, metryka, najbliższy termin, stan, strzałka.
   - Zastępuje stary widok listy na komputerze.
3. **Nagłówek spektaklu**: plakat 96 px (`.rk-poster--md`) obok tytułu na komputerze, 64 px na telefonie. Reszta ekranu Spektakl bez zmian względem `ekrany/png/Spektakl.png`.
4. **Kalendarz** to terminy: spektakle i próby (karta „Kalendarz”).
   - Widoki: **Lista** (domyślna, z osią czasu `.rk-tl`) i **Miesiąc** (`.rk-month`, tylko komputer). Filtr: Wszystko / Spektakle / Próby. Nawigacja: poprzedni / następny tydzień albo miesiąc i „Dziś”.
   - Oś czasu: dziś (wypełnione kółko, etykieta „Dziś”), najbliższy dzień z terminami (obrys, „Najbliższy”), kreska „teraz” z godziną tylko w dniu dzisiejszym (odświeżana co minutę), podział „Dalej w tym tygodniu” / „W przyszłym tygodniu”, dalsze dni szare z przerywaną osią, minione terminy przygaszone.
   - Wiersz terminu prowadzi do jego listy zadań (obecne ekrany list zadań zostają, zmienia się tylko wejście). Po prawej stan listy (`31/42`). Próby bez rekwizytów nie mają listy.
   - Dane: terminy spektakli już są. Próby wymagają rozróżnienia rodzaju terminu (spektakl / próba). **Zanim zmienisz bazę, sprawdź obecny model i zaproponuj Kubie minimalną zmianę.**
5. **Ustawienia** (karta „Ustawienia”, `.rk-setting`): jedna kolumna sekcji, na komputerze spis sekcji po lewej, bez kart i kolorowych ikon, wszystko po polsku.
   - Konto: imię i nazwisko, e-mail, hasło, wyloguj na wszystkich urządzeniach.
   - Wygląd i działanie: motyw (ciemny / jasny / jak w systemie), animacje, język, format 24-godzinny.
   - Listy rekwizytów: szczegóły wpisu (Wszystko / Bez opisu / Same nazwy), akty na telefonie (rozwinięte / zwinięte), zwijanie odhaczonych wpisów. To preferencje każdej osoby, zapisywane per użytkownik.
   - Teatr (tylko administrator): nazwa teatru, zespół i zaproszenia, eksport danych, zużycie rozpoznawania ze zdjęć (obecne statystyki AI jako „Szczegóły”).
   - O aplikacji: wersja, polityka prywatności, regulamin wersji testowej. Na końcu „Wyloguj się”.

### Kolejność pracy

1. Nawigacja: sidebar i pasek dolny (wszystkie ekrany w `ekrany/png` mają już nowe menu).
2. Spektakle i nagłówek spektaklu na komputerze.
3. Kalendarz: lista z osią czasu (telefon i komputer).
4. Ustawienia.
5. Kalendarz: widok miesiąca.

Po każdym kroku zrzut ekranu dla Kuby i czekanie na uwagi, jak wcześniej.

### Nowe i zmienione pliki

- `ekrany/png`: `Spektakle`, `Spektakle-telefon`, `Spektakl`, `Spektakl-telefon`, `Kalendarz`, `Kalendarz-miesiac`, `Kalendarz-telefon`, `Ustawienia`, `Ustawienia-telefon` (pozostałe ekrany odświeżone tylko o nowe menu).
- `design-system/components`: nowe karty `Plakat`, `Kalendarz`, `Ustawienia`; zmienione `Sidebar`, `MobileNav`, `Licznik`; nowe klasy na końcu `bundle.css` (`.rk-poster`, `.rk-agenda`, `.rk-tl`, `.rk-month`, `.rk-setting`, `.rk-settings-nav`).

## Co jest w folderze

```
docs/redesign/
  README.md            ten plik: kontekst, kolejność pracy, zasady
  POMYSLY.md           pełna lista zadań i decyzji (16 sekcji, priorytety P1–P3)
  design-system/       design system „Rekwizytor”
    README.md            opis marki: język, kolor, typografia, odstępy, logo, ikony, wpisy
    01-ruch.md           animacje: wersja pełna i oszczędna
    02-rob-i-nie-rob.md  ściąga do każdego nowego ekranu
    tokens.json          tokeny (źródło prawdy dla kolorów, odstępów, promieni, cieni)
    components/          bundle.css (wszystkie klasy .rk-*) + karta każdego komponentu
                         (preview.html z podglądem, README.md z zasadami użycia)
    fonts/, assets/      Boldonse, logo i znak (SVG), ikony aplikacji
  ekrany/
    png/                 zrzuty wszystkich ekranów (motyw ciemny) – patrz tu najpierw
    html/                te same ekrany jako HTML z klasami design systemu (do podejrzenia
                         struktury i klas; rk-theme.css zawiera tokeny jako zmienne CSS)
    boards.json          tytuły i wymiary ekranów
  patches/             2 commity z nowym znakiem i ujednoliconymi nazwami (do zastosowania)
```

Ekrany i design system są też opublikowane online (wersje nadrzędne, gdyby coś się rozjechało):

- Design system: https://claude.ai/artifact/PfAKS3yWrUgcWscG63Swfr
- Ekrany: https://claude.ai/artifact/VqpuC2MGZTNRHTkGCV542C
- Księga znaku: https://claude.ai/artifact/8fbx9YGEgeRH4RfJRCvXQq

## Kolejność pracy

### Krok 0: zastosuj patche z nowym znakiem

W `patches/` są dwa commity zrobione na `origin/main` (18dae62):

1. `0001` nowy znak: logo w `public/brand`, favicon, apple-icon, manifest PWA, logo w sidebarze i na ekranach logowania.
2. `0002` ujednolicenie nazw w `messages/pl.json`: „lista zadań” i „na żywo” zamiast „Live View” / „lista kontrolna”.

Uwaga, stan lokalnego repo w chwili przekazania:

- lokalny `main` jest jeden commit za `origin/main`;
- są niezacommitowane zmiany m.in. w `app/[locale]/login/page.tsx`, `components/Sidebar.tsx` i `messages/pl.json`, czyli w plikach, których dotykają patche.

Najpierw zapytaj Kubę, co zrobić z niezacommitowanymi zmianami (zacommitować czy odłożyć), potem `git pull`, a dopiero wtedy `git am --3way patches/*.patch`. Konflikty rozwiązuj ręcznie, nie nadpisuj jego zmian.

### Krok 1: przegląd repo względem design systemu

Zanim cokolwiek przepiszesz, zrób listę rozjazdów (szczegóły w `POMYSLY.md`, sekcja 1):

- kolory i odstępy wpisane na sztywno (skala odstępów: 4/8/12/16/24/32/48);
- własne przyciski, linie, karty zamiast klas `.rk-*`;
- Geist Mono (zastępujemy Courier Prime);
- Boldonse użyty gdziekolwiek poza tytułem spektaklu;
- komponenty, które istnieją w repo, a w systemie nie (i odwrotnie).

Wynik przeglądu pokaż Kubie przed migracją.

### Krok 2: tokeny i fonty w aplikacji

- Tokeny z `design-system/tokens.json` przenieś do `app/globals.css` i `tailwind.config.ts`. Gotowe zmienne CSS dla obu motywów są w `ekrany/html/rk-theme.css` (blok `.rk-th` i `.rk-th[data-theme="light"]`).
- Fonty: Geist i Courier Prime (Google Fonts), Boldonse z `design-system/fonts/`.
- Klasy komponentów: `design-system/components/bundle.css`. Zdecyduj z Kubą, czy importujemy bundle wprost, czy przepisujemy klasy na komponenty React z Tailwind. Wygląd ma być identyczny z kartami.

### Krok 3: migracja pod demo (P1)

Cztery przepływy, w tej kolejności:

| Przepływ | Ekrany (`ekrany/png/`) | Karty w design systemie | Zadania w `POMYSLY.md` |
|---|---|---|---|
| **1. Spektakl i lista zadań** | `Spektakl`, `Spektakl-telefon`, `Lista`, `Lista-telefon`, `Spektakle`, `Spektakle-telefon` | WpisRekwizytu, PageHeader, MobileNav, Licznik, Tabs | 4, 5, 6, 11 |
| **2. Na żywo** | `Na-zywo`, `Na-zywo-telefon` | NaZywo, Licznik, StatusBanner | 7, 8 |
| **3. Magazyn z wyszukiwaniem** | `Magazyn`, `Magazyn-telefon`, `Magazyn-szukaj`, `Karta-telefon` | Magazyn, Porzadkowanie, CommandPalette, Sidebar | 13, 15 |
| **4. Skan zdjęcia** | `Skan` | Skaner, PhotoAI | 14 |

Przy każdym przepływie: najpierw telefon (tam odbywa się demo), potem komputer. Po każdym przepływie pokaż Kubie zrzut i poczekaj na uwagi.

W repo są elementy, które warto zachować i przenieść na nowy wygląd zamiast pisać od nowa: `GroupKanbanManager` (buforowany zapis), `LocationJumpBar`, skanery `vision-group` i `vision-props`. `StructureEditor` nie jest używany.

### Krok 4: konto demo

Konto z wymyślonym spektaklem (na ekranach: „Wesele”, dwa akty, sceny, około 40 rekwizytów z pełnymi opisami, magazyn z pojemnikami i grupami, kilka etykiet). Ma wyglądać jak prawdziwa praca pracowni, bo z tego konta powstanie nagranie dla teatrów. Nie używaj nazw ani danych prawdziwych teatrów.

### Krok 5: przed pierwszymi danymi teatru

Zanim jakikolwiek teatr wpisze prawdziwe dane:

- plik `LICENSE` z zastrzeżeniem praw (kod nie jest open source) i ta sama informacja w stopce aplikacji;
- strona z polityką prywatności i regulaminem wersji testowej (treść przygotuje Kuba, w kodzie tylko miejsce i linki);
- Gemini: płatny tier albo Vertex AI z regionem EU, żeby dane i zdjęcia teatrów nie trafiały do trenowania modeli;
- Supabase w regionie EU; minimum danych osobowych (imię i e-mail);
- eksport danych teatru (CSV/Excel) i wydruk listy jako plan awaryjny.

## Najważniejsze zasady wyglądu (skrót)

Pełne zasady: `design-system/README.md` i `design-system/02-rob-i-nie-rob.md`.

- **Typografia:** Boldonse w aplikacji wyłącznie dla tytułów spektakli (`.rk-show-title`, wariant `--sm`). Nazwy ekranów: Geist 20/28. Dane techniczne (ID, daty, liczniki): Courier Prime.
- **Rytm odstępów** (komputer / telefon): w komponencie 2–4; elementy obok siebie 8–12 / 8; wiersze listy 24; nagłówek sekcji i treść 16; grupy jednej listy 32 / 24; tematy i kolumny 48 / 32; nagłówek strony i treść 32 / 24. Wartości 2 i 6 px tylko wewnątrz małych komponentów.
- **Linie:** trzy poziomy, wszystkie 1 px; 2 px tylko dla stanów.
- **Licznik a badge:** badge to stan, licznik to ilość. Bordowy badge tylko dla AI. Liczby w licznikach są optycznie wyśrodkowane (gotowe w `.rk-count`).
- **Wpis rekwizytu (`.rk-entry`):** „co” mocno; „jak”, „gdzie” i „skąd” cicho, każde z ikoną. Odhaczone wpisy zwijają się do samej nazwy.
- **Telefon, górny wiersz (`.rk-mtop`):** bez paska w stylu Material. Powrót „‹ Spektakle” działa jako całość (strzałka i napis to jeden obszar dotyku). Po przewinięciu przyklejony pasek z tytułem. Pulpit: znak i data; inne zakładki: sam znak.
- **Wyszukiwanie:** jedno pole na ekran (`.rk-find` z chipem zakresu `.rk-find__scope`). W sidebarze nie ma drugiego pola, jest przycisk „Przejdź do… ⌘K” otwierający paletę poleceń.
- **Na żywo** startuje automatycznie według godziny spektaklu. Nie ma przycisku „Rozpocznij”.
- **Puste stany:** grafika „kurtyna w górze” dla stanu „wszystko zrobione”; na telefonie bez karty.
- **Ruch:** każda animacja w dwóch wersjach, pełnej i oszczędnej (`data-motion="lite"`), bo teatry mają słaby sprzęt i stare przeglądarki.

## Model magazynu (skrót, pełny opis w `POMYSLY.md` sekcja 13)

```
Pomieszczenie  (najwyższy poziom; albo „Nieprzypisane”)
  └ Pojemnik    szafa / półka / kufer / pudło, ID MSC-, zagnieżdżenie do 3 poziomów, opcjonalny
      └ Grupa przedmiotów  GRP-, zbiorczo („ok. 30 szt.”), można rozpisać na przedmioty
      └ Przedmiot          REK-
```

Poziomy pośrednie są pomijalne, ale dostępne: kask może leżeć wprost na półce, a świece w pudle na tej samej półce. Półka to osobny pojemnik. Ikony: pudełko w ramce (pojemnik), warstwy w bordo (grupa), metka (przedmiot). Kanban w porządkowaniu musi pokazywać elementy w tej samej kolejności co lista (stary kanban miał tu rozjazd).

## Co zostaje otwarte

- Ścieżka pierwszego uruchomienia (nowy teatr i zaproszona osoba): kierunek w `POMYSLY.md` sekcja 9, projekt później.
- Jasny motyw i bardzo długie tytuły spektakli: dopracowanie w trakcie budowy, gdy coś wyjdzie.
- Ekrany Na żywo, Magazyn i Lista spektakli są poglądowe: kierunek, nie piksel w piksel. Przy wątpliwościach pytaj Kubę.

## Uwagi do plików ekranów

- `ekrany/html/` to eksport poglądowy, nie kod do skopiowania. Służy do podejrzenia struktury i klas.
- Awatary na zrzutach są przykładowe.
- Teksty na ekranach (nazwy, opisy) są dobrym wzorem tonu: krótko, językiem pracowni, bez żargonu IT.
