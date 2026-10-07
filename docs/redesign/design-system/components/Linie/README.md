Linie porządkują ekran tam, gdzie nie ma ramek. Wszystkie mają 1 px, a ich rolę rozróżnia kolor.

| Linia | Token | Gdzie |
|---|---|---|
| Podział | `border` | między wierszami listy i tabeli, nad stopką karty, krawędź karty, panelu i sidebaru |
| Sekcja | `border-section` | pod nagłówkiem sekcji bez ramki |
| Kontrolka | `border-strong` | ramki pól, checkboxów, przełączników i przycisków outline |

Klasy:

- `.rk-section-head`: nagłówek sekcji z linią sekcji pod spodem (`space-3` odstępu).
- `.rk-rows`: lista z podziałami między wierszami (`space-3` nad i pod linią, bez linii pod ostatnim). Dodaj `.rk-rows--media`, gdy wiersz zaczyna się awatarem albo ikoną 32 px: linia startuje wtedy od tekstu.
- `.rk-vrules`: elementy obok siebie oddzielone pionową linią na wysokość treści.

Zasady:

- **2 px tylko dla stanów:** fokus, aktywna zakładka, perforacja biletu, strefa upuszczania, oznaczenia na zdjęciach. Nie stosuj innych grubości.
- **Bez podwójnych linii.** Krawędź karty albo jej nagłówek nie stoi tuż obok kolejnego podziału.
- **Najwyżej dwa poziomy linii w jednym miejscu.** Trzeci poziom buduj odstępem.
- **Perforacja** to tylko motyw biletu (pasek etapów, wskaźnik ładowania, etykieta), nie zwykły separator.

## Oznaczenia na zdjęciach

Zdjęcie ma własne barwy, więc oznaczenia nie zależą od motywu: mają stałe kolory, 2 px i obwódkę 1 px (ciemną, a przy zaznaczeniu białą), żeby były czytelne na jasnym i ciemnym tle. To jedyne miejsce, gdzie linie nie biorą koloru z tokenów.

| Stan | Ramka | Numer |
|---|---|---|
| Propozycja AI | biała, przerywana 6/4 (`.rk-mark`) | biały na ciemnym |
| Zatwierdzony | biała, ciągła (`--ok`) | biały na ciemnym |
| Niska pewność | ochra #E9BC5A, przerywana (`--low`) | „3?” ciemny na ochrze, na liście słowo „sprawdź” |
| Zaznaczony | bordo #A0232F, ciągła, biała obwódka (`--selected`) | biały na bordo |

- Numer (`.rk-mark__n`, maszynopis 11 px) stoi nad lewym górnym rogiem ramki, a przy krawędzi zdjęcia wchodzi do środka (`--inside`). Kolejność jak na liście: od lewej do prawej, z góry na dół.
- Na zdjęciu są tylko numery, nazwy są na liście obok.
- Odrzucony przedmiot traci ramkę. Wnętrze ramki jest puste, po najechaniu rozjaśnia się o 12%. Minimalny rozmiar ramki to 24 × 24 px.
