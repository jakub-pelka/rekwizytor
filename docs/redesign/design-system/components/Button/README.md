Przycisk akcji w stylu „Bilet”: płaski kolor, ramka i twardy, przesunięty cień bez rozmycia, jak pieczątka na bilecie albo metka.

Cztery warianty (`primary`, `secondary`, `ghost`, `danger`), trzy rozmiary. Zastępuje 11 wariantów z `button-variants.ts`: znikają gradienty i warianty `glassy-*`.

- **primary**: wypełnienie `kurtyna`, ramka `kurtyna-night`, tekst `on-kurtyna`, cień `shadow-stamp` (ciemne bordo, jak grubość tego samego materiału). Jedna główna akcja na widok.
- **secondary**: tło `surface`, ramka `ink`, cień `shadow-stamp-ink`. Akcje pomocnicze: drukuj, eksportuj.
- **ghost**: bez tła, ramki i cienia, `ink-muted`. Anuluj, zamknij, akcje w wierszach.
- **danger**: obrys `danger`, cień `shadow-stamp-danger`. Tylko akcje nieodwracalne, zawsze z potwierdzeniem.

Ruch: hover unosi przycisk o 1 px (`-1px, -1px`) i wydłuża cień (`shadow-stamp-lift`), wciśnięcie dociska go do cienia (`3px, 3px`, cień znika). Czas 80 ms.

Rozmiary: `sm` 32 px **zawsze płaski** (paski narzędzi, tabele, filtry, bez cienia i ruchu), `md` 40 px (domyślny), `lg` 48 px (lista zadań na żywo, mobile). Zaokrąglenie `radius-sm`.

- **Ile przycisków obok siebie** (pasek akcji nagłówka widoku, od 8.10; liczą się wszystkie, także „Więcej”):
  - 1 akcja: sam `primary`.
  - 2 akcje: `primary` i jeden `secondary` (z pieczątką).
  - 3 akcje: `primary`, `secondary` (z pieczątką) i `ghost` (bez pieczątki).
  - 4 i więcej: `primary` i `secondary` „Więcej ▾” z menu (`ActionMenu` z `text`), w którym lądują pozostałe akcje. Nie dawaj ikony „⋯” jako ghost obok innych przycisków, a „Etykiety”, „Edytuj” i „Eksportuj” nie stoją wtedy osobno.
  - Zawsze jeden `primary`, zawsze pierwszy z prawej (ostatni w rzędzie). Na komputerze nie pokazujemy akcji, które mają sens tylko na telefonie (skanowanie).
- Między przyciskami z cieniem zostaw co najmniej `space-3`, żeby cień nie wchodził na sąsiada.
- W gęstych widokach (tabele, listy z akcją w każdym wierszu) używaj `sm` albo `ghost`, nie `md` z cieniem.
- Przycisk z samą ikoną (`--icon`) zawsze ma `aria-label`.

Konsument dostarcza: etykietę (czasownik w trybie rozkazującym, bez kropki), opcjonalnie ikonę lucide 16 px przed tekstem.

- **W trakcie zapisu** przycisk pokazuje Trzy dzwonki zamiast etykiety, zachowuje szerokość i dostaje `aria-label` („Zapisywanie”). Nie zamieniaj etykiety na „Zapisywanie…”.
