Rekwizytor to narzędzie dla teatru do ewidencji rekwizytów, przypisywania ich do scen i prowadzenia list zadań w trakcie spektaklu. Marka ma być **spokojna, rzetelna i teatralna bez przebieranek**. Charakter dają jej bordo kurtyny, maszynopis egzemplarza reżyserskiego i znak: kurtyna idąca w górę po trzecim dzwonku. Efekty „szkła”, poświaty i gradienty nie należą do marki.

## Język i ton

- Pisz po polsku, w drugiej osobie, bez zbędnej uprzejmości: „Rób zdjęcia rekwizytów, aby szybko dodać je do magazynu.” „Nie pamiętasz hasła?”
- **Wielkie litery tylko na początku zdania i w nazwach własnych.** Pisz „Zarządzaj strukturą”, „Tryb ciemny”, „Dodaj rekwizyt do sceny”. Angielski Title Case („Zarządzaj Strukturą”) w polszczyźnie razi.
- Przyciski to czasowniki w trybie rozkazującym, bez kropki: „Dodaj rekwizyt”, „Drukuj etykiety”, „Zatwierdź”.
- Używaj słownictwa teatru: spektakl, scena, akt, obsada, rekwizyt, magazyn, lista zadań. Unikaj słów technicznych („rekord”, „item”, „encja”).
- Stany puste piszemy zdaniem, które mówi, co zrobić dalej: „Brak notatek dla tego spektaklu. Dodaj pierwszą z poziomu sceny.”
- O AI mów konkretnie, co zrobiło („Rozpoznano 6 przedmiotów na zdjęciu”). Nie pisz „magicznie” ani „inteligentnie”.
- **Lista zadań** to obiekt: co trzeba przygotować na spektakl. **Na żywo** to jej stan, gdy spektakl trwa (znacznik „NA ŻYWO”). Stan „na żywo” włącza się sam o godzinie spektaklu, więc nie ma przycisku „Rozpocznij spektakl”. Nie pisz „Live View” ani „lista kontrolna”.
- Bez emoji w interfejsie i materiałach.

## Kolor

Dwa motywy: **Kulisy** (`dark`, domyślny, do pracy w półmroku za sceną) i **Biuro** (`light`, do administracji, wydruków i prezentacji dla dyrekcji). Każdy kolor stosuj przez token, nigdy przez wartość wpisaną ręcznie.

- Powierzchnie układaj warstwowo: `bg` (strona), na nim `surface` (karty, sidebar, tabele), na nim `surface-raised` (pola, hover, zakładki). Używaj jednej skali szarości, bez mieszania `gray`, `neutral` i `zinc`. Szarości w obu motywach są lekko ciepłe (w stronę bordo), żeby Kulisy i Biuro wyglądały jak jedna aplikacja.
- Tekst: `ink` (podstawowy), `ink-muted` (opisy, metadane), `ink-subtle` (placeholdery). Każdy ma co najmniej 4,5:1 na `bg` i `surface` w obu motywach.
- **Kurtyna** (`kurtyna`, #A0232F) to kolor marki. Stosuj ją jako wypełnienie przycisku primary, znak i akcenty. Tekst na niej to zawsze `on-kurtyna`.
- **Nigdy nie używaj `kurtyna` jako koloru tekstu na ciemnym tle** (2,6:1). Bordo w roli tekstu, linku albo aktywnej pozycji menu to `kurtyna-text`, a zaznaczenie i wyniki AI to `kurtyna-tint`.
- `kurtyna-deep` i `kurtyna-night` są do dużych płaszczyzn w materiałach marketingowych: okładek, ekranu logowania, nagłówków PDF. W gęstym UI ich nie stosuj.
- Statusy: `success` (na miejscu), `warning` (wypożyczony, do naprawy), `danger` (zaginiony, błąd), `info` (w spektaklu), każdy z tłem `*-tint`. **Status zawsze ma też słowo albo ikonę**, nigdy sam kolor. `danger` jest celowo przesunięty ku pomarańczowi, żeby błąd nie wyglądał jak kolor marki. Barwy są przygaszone i ocieplone (szałwia, ochra, cegła, przygaszony błękit), żeby nie konkurowały z kurtyną. `warning` i `danger` mają zbliżoną jasność: zawsze różnią się ikoną (trójkąt kontra krzyżyk w kółku) i słowem.
- **Badge to stan, licznik to ilość.** Badge ma kropkę i słowo („Wypożyczony”, „1 po terminie”). Same liczby to liczniki w maszynopisie bez kropki: pigułka przy menu i zakładkach, postęp „31/42”, liczność „5 spektakli” przy nagłówku. Szczegóły: karta „Licznik”.
- Akcenty AI to bordo marki (`kurtyna-tint` + `kurtyna-text`). Nie używaj fioletu ani niebieskiego.

## Typografia

- **Boldonse** (`display-xl`, `display-lg`, `display-sm`) w aplikacji służy **wyłącznie tytułom spektakli** (`.rk-show-title`), najwyżej jeden na widok: na ekranie spektaklu, liście zadań i w głównej karcie pulpitu. Nazwy ekranów, także tam, gdzie nie ma spektaklu (pulpit, magazyn, lista spektakli, pierwsze uruchomienie), mają styl `title` (Geist 20/28). Duże litery znaczą zawsze „ten spektakl”. Poza aplikacją Boldonse jest na okładkach i w materiałach marketingowych. Nigdy w modalach, tabelach, przyciskach ani pustych stanach.
- **Długie tytuły spektakli** (do wdrożenia w kodzie): tytuł jako kotwica ma najwyżej 2 linie (`line-clamp: 2`, `text-wrap: balance`, bez dzielenia wyrazów). Rozmiar schodzi stopniami według długości: do ok. 14 znaków `display-xl`, do ok. 28 `display-lg`, dłuższe `display-sm`. Gdy tytuł i tak się nie mieści, ucinamy go wielokropkiem, a pełna nazwa jest w podpowiedzi i na ekranie spektaklu. Na telefonie te same progi o stopień niżej.
- **Geist** to cały interfejs: `title`, `heading`, `body-lg`, `body` (domyślny 14/20), `label`, `caption`.
- **Courier Prime**, czyli maszynopis, ma trzy zastosowania: `inventory-id` (numery inwentarzowe, kody, numery scen, wersaliki), `script` (didaskalia, nazwy scen, nadtytuły nad nagłówkiem strony) i `tagline` (hasło „Narzędzie dla teatru”). Działa jak papierowa metka, więc nie składaj nim akapitów.
- Courier Prime zastępuje używany dziś w aplikacji Geist Mono wszędzie tam, gdzie chodzi o numery i kody.

## Odstępy, zaokrąglenia, cienie

- Siatka 4 px: `space-1` … `space-12`. Padding kart to `space-6` na desktopie i `space-4` na mobile. Odstępy między częściami ekranu wynikają z tabeli rytmu niżej.
- **Rytm odstępów.** Odstęp wynika z relacji, a nie z elementów: im luźniejszy związek, tym większy odstęp, a każdy poziom jest wyraźnie większy od poprzedniego.

| Poziom | Relacja | Komputer | Telefon |
|---|---|---|---|
| 1 | wewnątrz elementu (tytuł i opis w wierszu) | 2–4 | 2–4 |
| 2 | elementy w grupie (przyciski, etykieta i pole) | 8–12 | 8 |
| 3 | wiersz ↔ wiersz listy (12 + 12); wiersze zagnieżdżone 12 | 24 | 24 |
| 4 | nagłówek sekcji ↔ treść (linia pod nagłówkiem: 12) | 16 | 16 |
| 5 | grupy jednej listy (akty, miejsca na liście zadań) | 32 | 24 |
| 6 | osobne tematy (sekcje strony), kolumna ↔ kolumna | 48 | 32 |
| 7 | nagłówek strony ↔ treść, górny odstęp treści | 32 | 24 |

- Wartości 2 i 6 px wolno stosować tylko wewnątrz małych komponentów (pigułka, chip, podpowiedź, klawisz) i tam, gdzie odstęp wynika z geometrii (ikona w polu, środek kółka w stepperze). Odstępy między elementami układu zawsze są ze skali.
- Zaokrąglenia: `radius-sm` (przyciski, badge, miniatury), `radius-md` (domyślny: pola, karty, menu), `radius-lg` (modale, karty ze zdjęciem), `radius-full` (pigułki, awatary). Nie stosuj innych wartości.
- Cienie: `shadow-card` na kartach, `shadow-overlay` na modalach, menu i palecie ⌘K. W motywie Kulisy głębię buduje przede wszystkim kolor powierzchni, nie cień.
- **Twardy cień „Bilet”** (`shadow-stamp*`) oznacza fizyczne działanie: naciśnij, przenieś, wydrukuj. Dostają go tylko przyciski `md`/`lg` (primary, secondary, danger) i karta rekwizytu zaznaczona lub przeciągana. Pieczątki się nie zagnieżdżają: w kontenerze z pieczątką przyciski są płaskie (`sm`, `ghost`). Karty, modale i alerty mają wyłącznie cienie miękkie. Szczegóły i przykłady: karta „ZasadyBilet” (grupa Zasady) oraz sekcja „Rób i nie rób”.
- Bez `backdrop-blur`, gradientów na przyciskach i animowanych poświat. Ruch ma dwa poziomy, pełny (Premiera) i oszczędny (Próba czytana), i każda animacja musi mieć oba: zasady w sekcji „Ruch”.

## Linie

Gdy sekcja nie ma ramki, porządkują ją linie, więc każda linia ma ustaloną rolę. Hierarchię daje kolor, a nie grubość: wszystkie linie mają 1 px.

| Linia | Token | Gdzie |
|---|---|---|
| Podział | `border` | między wierszami listy i tabeli, nad stopką karty, krawędź karty, panelu i sidebaru |
| Sekcja | `border-section` | pod nagłówkiem sekcji, która nie ma ramki (`.rk-section-head`) |
| Kontrolka | `border-strong` | tylko ramki pól, checkboxów, przełączników i przycisków outline; nigdy jako separator |

- **2 px tylko dla stanów:** fokus, aktywna zakładka, perforacja biletu, strefa upuszczania (przerywana) i oznaczenia na zdjęciach. Innych grubości, np. 1,5 px, nie stosuj.
- **Długość.** Podział biegnie przez całą szerokość listy, a gdy wiersz zaczyna się awatarem albo ikoną, startuje od początku tekstu (`.rk-rows--media`). Linia sekcji ma szerokość kolumny tej sekcji, nigdy całego ekranu. Linia pionowa (`.rk-vrules`, np. liczby obok siebie) ma wysokość treści.
- **Odstęp.** Nad linią i pod nią jest tyle samo miejsca: `space-3` w listach, w stopce karty tyle, ile wynosi odstęp między grupami w tej karcie.
- **Bez podwójnych linii.** Krawędź karty nie stoi tuż obok podziału, nie ma linii pod ostatnim elementem, a pod nagłówkiem sekcji z linią pierwszy wiersz nie dostaje własnej.
- **Najwyżej dwa poziomy linii w jednym miejscu.** Trzeci poziom buduj odstępem, nie kolejną kreską.
- **Oznaczenia na zdjęciach** (ramki wokół rozpoznanych przedmiotów) mają stałe kolory niezależne od motywu, 2 px i obwódkę dla czytelności na każdym tle: biała przerywana to propozycja AI, biała ciągła zatwierdzony, ochra z „?” niska pewność, bordo zaznaczony. Numer nad rogiem ramki odpowiada kolejności na liście.
- **Perforacja** (kropkowana linia z wcięciami) to wyłącznie motyw biletu: pasek etapów, wskaźnik ładowania, etykieta. Nie jest zwykłym separatorem.

Przykłady: karta „Linie” w grupie Zasady.

## Stany i dostępność

- Fokus klawiatury to jeden styl dla wszystkich kontrolek: obrys 2 px w kolorze `focus` z odstępem 2 px. Ma co najmniej 3:1 na każdej powierzchni w obu motywach.
- Ramki kontrolek to `border-strong` (3:1). Pozostałe linie: sekcja „Linie”.
- Disabled to 50% krycia, bez zmiany koloru.
- Lista zadań w trakcie spektaklu (stan „na żywo”, kulisy, telefon) używaj przycisków `lg` (48 px) i tekstu `body-lg`.

## Logo

Znak to **kurtyna idąca w górę**: otwór sceny w bordowej ramie, a nad nim trzy łuki lambrekinu, które unoszą się w prawo. Trzy łuki to trzy dzwonki przed spektaklem. Pełne zasady, konstrukcja i przykłady są w księdze znaku („Księga znaku Rekwizytora”). Najważniejsze:

- **Konstrukcja**: kafelek z promieniem 22,5% boku, rama 10%, otwór 80% z promieniem 12,5% (współśrodkowy). Linia łuków biegnie od 54% wysokości po lewej do 42% po prawej, a trzy półkola mają szerokość ⅓ otworu. Znak to dwa kształty bez nakładania, więc nie ma prześwitów na krawędziach.
- **Kolor**: rama `kurtyna` (#A0232F), otwór `scena` (#1A1616). Oba są stałe i nie zmieniają się z motywem. `scena` służy tylko znakowi i ikonom aplikacji.
- **Jednokolorowo**: rama i łuki są wypełnione, a otwór wycięty. Wersja bordo służy do druku jednym kolorem, biała do teł w kolorze kurtyny i na zdjęciach, czarna do etykiet QR i druku czarno-białego.
- **Logo z napisem** to zawsze jeden plik: poziome (`rekwizytor-logo-light/dark.svg`), poziome z hasłem i pionowe z hasłem. Środek znaku leży na środku wielkiej litery R, a nie razem z ogonkiem „y”. Znak ma wysokość 1,26 wielkiej litery, odstęp do napisu to 28% boku znaku.
- **W interfejsie**: rozwinięty sidebar pokazuje logo poziome (znak 28 px), zwinięty sidebar sam znak 32 px, nagłówek mobilny 28 px, logowanie logo pionowe.
- **Ikony aplikacji**: tam, gdzie znamy kształt ikony (iOS, macOS, favicon, PWA „any”), używamy znaku z ramą. Na Androidzie, w Google Play i w PWA „maskable” ikona to zbliżenie bez ramy z pasem podłogi, bo launcher sam wybiera maskę.
- **Ruch**: kurtyna podnosi się raz, na start. W trybie pełnym ruch jest płynny, w oszczędnym idzie w trzech skokach. Nigdy w pętli ani jako wskaźnik ładowania.
- Pole ochronne to 25% boku znaku. Minimalny rozmiar: 16 px albo 5 mm. Nie zmieniaj grubości ramy, liczby łuków, kierunku skosu ani koloru otworu. Nie dodawaj poświaty, cienia (także „Bilet”), gradientu ani obrysu. Nie kładź bordowego znaku na bordowym tle.

## Wykresy

- Pulpit to dom: duże liczby, gotowość najbliższego spektaklu, stan magazynu. Pełne wykresy na stronie Statystyki.
- Domyślnie jeden kolor (skala kurtyny `chart-seq-*`); wyróżnienie = kurtyna na tle `chart-context`; serie `chart-1…6` w stałej kolejności, najwyżej 6. Statusy tylko dla stanów, z ikoną i słowem. Szczegóły: karta „Wykresy”.

## Ikony

- Używaj [lucide](https://lucide.dev) (już w projekcie: `lucide-react`): obrys 2 px, rozmiar 16 px w przyciskach, 18 px w menu i 20 px w alertach. Kolor ikony dziedziczy kolor tekstu.
- Pojęcia teatralne i kategorie rekwizytów mają własne ikony w tej samej gramatyce (siatka 24, kreska 2, zaokrąglone końce): karty „IkonyTeatru” i „IkonyRekwizytow” w grupie Ikony, ścieżki w `icons/rekwizytor-icons.json`.
- Nawigacja: Pulpit = `scena-wykres`, Spektakle = `scena-kotary`, Rekwizyty = `metka`, Notatki = `notebook-pen` (Lucide). Czynności ogólne (szukaj, ustawienia, listy, grupy) zostają przy Lucide.
- Nie używaj emoji jako ikon. Ikona nigdy nie występuje sama tam, gdzie niesie status, tylko razem ze słowem.

## Wpisy rekwizytów

- **Co, jak, gdzie.** Wpis na liście ma trzy warstwy i tylko pierwsza jest mocna: nazwa przedmiotu (Geist 16/24, 600), pod nią przygotowanie („jak”, ikona listy kontrolnej), dokładne miejsce („gdzie”, ikona pinezki) i opcjonalnie miejsce w magazynie („skąd”, ikona szuflady), wszystkie w tym samym stylu i kolorze `ink-subtle`. Przy pierwszych spektaklach człowiek czyta całość, potem pamięta miejsca i zerka tylko na nazwy, żeby nic nie pominąć. Hierarchia ma obsłużyć oba momenty.
- **Nic nie ucinamy.** Opisy w rozpiskach bywają długie („gazeta z okładką magazynu, na kanapie pod przykryciem, po prawej”), więc „jak” i „gdzie” zawijają się w całości.
- **Odhaczone zwija się do nazwy.** Po zaznaczeniu znikają szczegóły, a nazwa przygasa. Lista robi się krótsza z każdym zrobionym przedmiotem.
- **Jedno pole przy wpisywaniu.** Użytkownik pisze opis swobodnie, a model dzieli go na „jak” i „gdzie” (do wdrożenia). Źródłem prawdy jest tekst człowieka; gdy podziału nie ma, pokazujemy ten tekst jako „jak”. Szczegóły: karta „WpisRekwizytu”.

## Etykiety drukowane

- Etykiety są zawsze czarne na białym, niezależnie od motywu. **Drukujemy tylko to, co się nie zmienia**: numer, nazwę, kod QR i znak. Lokalizacja i stan żyją w aplikacji, a kod QR otwiera aktualne dane.
- Rodzaje: **rekwizyt** (48,5 × 25,4 mm, numer największy), **mini** dla bardzo małych przedmiotów, **flaga** owijana wokół nitki, gdy na przedmiocie nie można nic przykleić, **grupa** (kufer, pudło; 105 × 57 mm, nazwa w Boldonse) i **miejsce** (półka, szafa; 105 × 57 mm, czarny pas). Rozmiary odpowiadają gotowym arkuszom samoprzylepnym A4, więc nic się nie wycina. Przeniesienie to dwa skany: przedmiot, potem miejsce. Kod QR ma minimum 20 mm boku (mini 16 mm). Szczegóły: karta „InventoryLabel”.

## Gdzie co jest

- **Opis marki** (ta strona): język, kolor, typografia, odstępy, logo, ikony.
- **Sekcja „Ruch”**: dwa poziomy animacji, wzorce ruchu i zasady ładowania. Interaktywne porównanie w osobnej stronie „Ruch Rekwizytora” (link w sekcji).
- **Sekcja „Rób i nie rób”**: ściąga w tabelach do każdego nowego ekranu, slajdu i wydruku.
- **Komponenty** w grupach: Akcje · Formularze · Status · Ładowanie · Układ · Nawigacja · Dane · Rekwizyty · Ikony · Zasady. Każda karta ma podgląd w obu motywach i zasady użycia.
- **Zasoby**: logo i znak (SVG) oraz ikona aplikacji w grupie Logos.

