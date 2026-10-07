# Ruch

Interaktywne porównanie wszystkich wzorców (z regulacją tempa): [Ruch Rekwizytora](https://claude.ai/artifact/87RUMEq5nTChSfvY3w724v).

Ruch w Rekwizytorze ma dwie role: **potwierdza działanie** (wcisnąłem, odhaczyłem, zapisało się) i **niesie markę** (kurtyna, trzy dzwonki, pieczątka, bilety). Nigdy nie jest ozdobą samą w sobie. Teatry pracują na bardzo różnym sprzęcie, więc każdy ruch istnieje w dwóch wersjach.

## Dwa poziomy

| | **Premiera** (pełny) | **Próba czytana** (oszczędny) |
| --- | --- | --- |
| Kiedy | Domyślnie na współczesnym sprzęcie | Słaby komputer, stara przeglądarka, „ogranicz ruch” w systemie albo wybór użytkownika |
| Co się animuje | `transform` i `opacity`, `clip-path` przy wejściu kurtyny | Tylko `opacity` i kolor, **skokowo** (`steps()`): kilka przeskoków na cykl zamiast płynnego ruchu |
| Czasy | `--dur-fast` 80 ms, `--dur-base` 150 ms, `--dur-slow` 250 ms, `--dur-curtain` 420 ms | Kolor 150 ms, przenikanie 120 ms, reszta natychmiast (0 ms) |
| Wskaźniki ładowania | Dzwonki uderzają i wybrzmiewają, bilety się kasują, podpis wystukuje się literami | Dzwonki zapalają się skokowo, bieżący bilet miga, podpis podmienia się od razu. **Wskaźnik nigdy nie stoi**: stojący wygląda jak zawieszona aplikacja |
| Biblioteki | framer-motion dozwolony w miejscach opisanych niżej | Bez framer-motion, bez canvas i WebGL; czysty CSS |

Poziom ustawia atrybut `data-motion="full"` albo `data-motion="lite"` na `<html>`. Wszystkie czasy biorą się z tokenów `--dur-*` i `--ease-*` w `bundle.css`, więc przełączenie poziomu zmienia całą aplikację naraz.

## Jak wybieramy poziom

1. **Ustawienie użytkownika ma pierwszeństwo.** W Ustawieniach: „Animacje: pełne / oszczędne / automatycznie” (domyślnie automatycznie). Wybór zapisuje się na urządzeniu.
2. **„Ogranicz ruch” w systemie** (`prefers-reduced-motion`) zawsze daje Próbę czytaną, nawet na mocnym sprzęcie. To wymóg dostępności.
3. **Automatycznie Próba czytana**, gdy zachodzi którekolwiek:
   - 2 lub mniej rdzeni procesora,
   - 2 GB pamięci lub mniej (tam, gdzie przeglądarka to zgłasza),
   - włączony tryb oszczędzania danych,
   - przeglądarka nie obsługuje funkcji, na których opiera się pełny ruch (np. `clip-path`),
   - w pierwszych sekundach po uruchomieniu animacje wyraźnie się tną (spadek klatek). Wtedy przełączamy raz, na stałe dla tego urządzenia, i pokazujemy dyskretny toast: „Włączono oszczędny tryb animacji. Zmienisz to w Ustawieniach.”
4. **W razie wątpliwości wybieramy Próbę czytaną.** Aplikacja bez animacji działa w pełni; aplikacja, która się tnie, wygląda na zepsutą.

## Wzorce ruchu marki

| Wzorzec | Gdzie | Premiera | Próba czytana |
| --- | --- | --- | --- |
| **Kurtyna** | Wejście modala, panelu bocznego, nowej strony | Odsłonięcie od góry (`--ease-curtain`, 420 ms) | Przenikanie 120 ms |
| **Trzy dzwonki** | Ładowanie bez znanego końca: obszary, przyciski | Kropki zapalają się po kolei jak trzy dzwonki przed spektaklem: krótkie uderzenie, ledwie widoczne drgnięcie i powolne wybrzmiewanie jasności (cykl 2 s) | Ten sam rytm skokowo, bez drżenia i fali |
| **Bilety** | Pasek postępu, gdy znamy liczbę elementów (zdjęcia, sceny, import). Rolka biletów z perforacją | Gotowy element „kasuje” bilet: bordo i lekkie przysiadnięcie (260 ms), bieżący pulsuje | Bilet wypełnia się od razu, bieżący miga skokowo |
| **Podpis maszynopisem** | Pod każdym ładowaniem dłuższym niż ok. 1 s | Teatralny czasownik wystukiwany literami, zmiana co ok. 2,6 s | Napis podmienia się od razu, w tym samym rytmie |
| **Pieczątka** | Przyciski `md`/`lg` | Hover unosi o 1 px, kliknięcie dociska do cienia (80 ms) | Zmiana natychmiast, bez przejścia |
| **Odhaczenie** | Lista zadań, zatwierdzenie | Ptaszek „wbity” jak pieczątka (250 ms) | Ptaszek pojawia się od razu |

Animacje interfejsu kończą się w 250 ms. Tylko Kurtyna trwa dłużej, bo otwiera nowy kontekst.

### Ładowanie: zasady

- **Bez znanego końca:** Trzy dzwonki. W przycisku dzwonki zastępują etykietę (szerokość przycisku się nie zmienia), w obszarze stoją nad podpisem.
- **Znany postęp:** Bilety, jeden bilet na element, maks. ok. 20 biletów. Przy większej liczbie jeden bilet oznacza grupę elementów, a licznik zawsze podaje dokładną liczbę. Obok zawsze licznik „7 z 12”.
- Gdzie który: Trzy dzwonki w przycisku i w obszarze (akcja, wynik o nieznanym kształcie), Trzy światła dla całej strony, Bilety przy znanym postępie, szkielet przy treści o znanym układzie. Gdy po zapisie następuje przejście strony, przycisk zostaje w stanie dzwonków, a światła u góry przejmują czekanie po ok. 300 ms; bez animowanego przejścia między nimi.
- **Pasek bez znanego końca** (przejścia między stronami, odświeżanie w tle): **Trzy światła**. Trzy odcinki paska zapalają się po kolei jak lampki przy trzech dzwonkach (Premiera: płynnie, cykl 1,5 s; Próba czytana: skokowo). Pokazujemy go dopiero po ok. 300 ms.
- **Ładowanie treści:** skeleton jako część interfejsu (szare paski w miejscu przyszłej treści). W Premierze przesuwa się po nim światło, w Próbie czytanej skeleton wolno „oddycha” w dwóch stanach.
- **Podpis maszynopisem:** czasownik w tonie teatru („Przeglądam magazyn…”, „Ustawiam światła…”, „Sprawdzam obsadę…”), 10–15 zwrotów w puli. Gdy znamy prawdziwy krok, podpis mówi prawdę („Zdjęcie 8: rozpoznaję przedmioty…”) zamiast zabawnego zwrotu. Po 2 s dochodzi licznik sekund, po ok. 10 s zdanie „To trwa dłużej niż zwykle.”

## Ruch w identyfikacji (prezentacje, strona, wideo)

- **Otwarcie kurtyny** to motyw przewodni: pasy draperii podpinają się na boki, falbana zostaje u góry jak lambrekin, spod spodu wyłania się logo albo ekran aplikacji. Falbana nie jest samodzielną dekoracją interfejsu.
- **Znak** może się odsłonić: łuki startują nisko, a kurtyna podnosi się do swojej pozycji. Premiera: 1,1 s z łagodnym hamowaniem. Próba czytana: trzy skoki, jak trzy dzwonki. Raz, na początku (intro, ekran startowy), nigdy w pętli ani jako wskaźnik ładowania.
- **Wersja statyczna zawsze istnieje:** każdy animowany materiał ma klatkę końcową do PDF, druku i słabego sprzętu. Prezentacja dla dyrekcji musi działać bez animacji, z rzutnika i z laptopa sprzed 10 lat.

## Rób i nie rób

| Rób | Nie rób |
| --- | --- |
| Animuj `transform` i `opacity`. | Nie animuj `width`, `height`, `top`, `left`, cieni ani rozmycia. |
| Każdy ruch zaprojektuj od razu w obu poziomach; Próba czytana jest odchudzona, nie zamrożona. | Nie dodawaj animacji, która nie ma wersji oszczędnej. |
| Ładowanie pokazuj Trzema dzwonkami, Biletami albo skeletonem, zawsze z podpisem po ok. 1 s. | Nie zostawiaj wskaźnika stojącego, nawet w Próbie czytanej. Nie używaj pętli poza ładowaniem. |
| Pełny ruch tylko tam, gdzie coś się zmienia (wejście, potwierdzenie). | Nie animuj elementów przy każdym przewinięciu strony. |
| Testuj na najsłabszym sprzęcie z pilotażu i w trybie oszczędnym. | Nie używaj efektów canvas i WebGL (np. obecnego LightRays) w aplikacji. |
| Gdy przeglądarka czegoś nie obsługuje, pokaż stan końcowy bez animacji. | Nie zostawiaj elementu niewidocznego, jeśli animacja się nie uruchomi. |
