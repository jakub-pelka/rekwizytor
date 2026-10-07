# Rób i nie rób

Krótka ściąga do każdego nowego ekranu, slajdu i wydruku. Po lewej to, co robimy; po prawej to, czego unikamy.

## Kolor

| Rób | Nie rób |
| --- | --- |
| Używaj tokenów (`surface`, `ink`, `kurtyna`), nigdy wartości wpisanych ręcznie. | Nie mieszaj `gray`, `neutral` i `zinc` z Tailwinda. |
| Bordo jako tekst lub link: `kurtyna-text`. | Nie pisz tekstu kolorem `kurtyna` na ciemnym tle (2,6:1, nieczytelne). |
| Tekst na bordowym wypełnieniu: `on-kurtyna`. | Nie używaj bordo do sygnalizowania błędu. Błąd to `danger` (cegła). |
| Akcenty AI w kolorach marki: `kurtyna-tint` + `kurtyna-text`. | Nie dodawaj fioletu, niebieskich poświat ani gradientów „AI”. |
| `kurtyna-deep` i `kurtyna-night` na duże płaszczyzny w materiałach i okładkach. | Nie stosuj ich w gęstym UI (tabele, formularze). |

## Statusy

| Rób | Nie rób |
| --- | --- |
| Zawsze łącz kolor z ikoną i słowem: „Zaginiony” + krzyżyk w kółku. | Nie przekazuj statusu samym kolorem ani samą kropką. |
| `warning` z trójkątem, `danger` z krzyżykiem w kółku. | Nie używaj tej samej ikony dla ostrzeżenia i błędu. |
| Jeden badge statusu na rekwizyt. | Nie układaj trzech kolorowych badge'y obok siebie na jednej karcie. |
| Neutralne metadane (lokalizacja, liczba) jako badge `--plain`. | Nie koloruj metadanych na zielono czy niebiesko „dla ożywienia”. |

## Cień „Bilet”

| Rób | Nie rób |
| --- | --- |
| Pieczątka tylko tam, gdzie jest fizyczne działanie: przycisk `md`/`lg`, zaznaczona lub przeciągana karta rekwizytu. | Nie dawaj twardego cienia kartom, modalom, alertom ani zdjęciom. |
| Jedna akcja primary z pieczątką na widok. | Nie stawiaj trzech pieczątek obok siebie. Reszta to secondary albo ghost. |
| W zaznaczonej karcie przyciski są płaskie: `sm` lub `ghost`. | Nie zagnieżdżaj pieczątki w pieczątce. |
| W tabelach i listach akcje w wierszach jako `sm` lub `ghost`. | Nie wstawiaj przycisku `md` z cieniem w każdym wierszu. |
| Zostaw min. `space-3` między elementami z pieczątką. | Nie dosuwaj ich tak, by cień wchodził na sąsiada. |

## Typografia

| Rób | Nie rób |
| --- | --- |
| Boldonse tylko w tytule strony, tytule spektaklu, okładce i materiałach marketingowych. | Nie używaj Boldonse w modalach, tabelach, przyciskach ani akapitach. |
| W kartach i listach tytuł spektaklu maks. 2 linie z wielokropkiem. | Nie pozwalaj długim tytułom w Boldonse rozpychać karty. |
| Courier Prime dla numerów inwentarzowych, kodów, nazw scen, nadtytułów. | Nie składaj maszynopisem całych akapitów ani etykiet przycisków. |
| Geist `body` (14/20) jako domyślny tekst interfejsu. | Nie zmniejszaj tekstu poniżej 12 px (`caption`). |

## Język

| Rób | Nie rób |
| --- | --- |
| Wielka litera tylko na początku zdania: „Dodaj rekwizyt do sceny”. | Nie pisz angielskim Title Case: „Dodaj Rekwizyt Do Sceny”. |
| Przyciski jako czasowniki w trybie rozkazującym, bez kropki: „Drukuj etykiety”. | Nie pisz „OK”, „Kliknij tutaj”, „Wyślij formularz”. |
| Słownictwo teatru: spektakl, scena, akt, obsada, magazyn. | Nie pisz „rekord”, „item”, „encja”, „obiekt”. |
| Komunikat błędu mówi, jak naprawić: „Numer musi mieć 4 cyfry, np. REK-0142.” | Nie pisz samego „Błędne dane” albo „Coś poszło nie tak”. |
| O AI konkretnie: „Rozpoznano 6 przedmiotów na zdjęciu.” | Nie pisz „magicznie”, „inteligentnie”, nie dodawaj ✨ ani innych emoji. |

## Logo i znak

| Rób | Nie rób |
| --- | --- |
| Używaj gotowych plików: znak, logo poziome, poziome z hasłem, pionowe. | Nie składaj nazwy fontem obok znaku i nie rysuj znaku od nowa. |
| Znak dwukolorowy (`kurtyna` + `scena`) w obu motywach. | Nie zmieniaj koloru otworu ani nie odwracaj kolorów. |
| Na tle w kolorze kurtyny i na zdjęciach: wersja biała. | Nie kładź bordowego znaku na bordowym tle. |
| Zachowaj ramę 10%, trzy łuki i skos w prawo. | Nie zmieniaj grubości ramy, liczby łuków ani kierunku skosu. |
| Pole ochronne 25% boku znaku, minimum 16 px. | Nie dodawaj poświaty, cienia (także „Bilet”), gradientu, obrysu; nie obracaj. |
| Motyw kurtyny (pasy draperii, falbana) w znaku, okładkach i nagłówkach materiałów. | Nie używaj falbany jako samodzielnej dekoracji w interfejsie (obramowania, separatory, tła kart). |

## Powierzchnie i efekty

| Rób | Nie rób |
| --- | --- |
| Głębia przez warstwy: `bg` → `surface` → `surface-raised`. | Nie używaj `backdrop-blur` ani przezroczystego „szkła”. |
| Miękkie cienie tylko `shadow-card` (karty) i `shadow-overlay` (modale, menu). | Nie dodawaj animowanych poświat (LightRays) ani gradientów na przyciskach. |
| Zaokrąglenia z czterech tokenów: `radius-sm`, `radius-md`, `radius-lg`, `radius-full`. | Nie wprowadzaj `rounded-2xl`/`3xl` ani wartości spoza skali. |
| Wyróżniaj tłem `kurtyna-tint` całego elementu. | Nie rób kart z kolorowym lewym paskiem. |
