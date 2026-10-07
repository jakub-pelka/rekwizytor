Główny widok magazynu: lista rekwizytów z sortowaniem, zaznaczaniem i akcjami zbiorczymi.

- Wiersz 52 px: checkbox, miniatura 36 px z nazwą i numerem `inventory-id`, lokalizacja, spektakl, jeden badge statusu, menu „…”.
- Sortowanie w nagłówku: aktywna kolumna ma `aria-sort` i strzałkę w `kurtyna-text`, pozostałe przygaszoną ikonę.
- Zaznaczenie wiersza: tło `kurtyna-tint`. Po zaznaczeniu nad tabelą pojawia się pasek akcji zbiorczych (liczba + `sm` secondary/ghost). Checkbox w nagłówku ma stan pośredni, gdy zaznaczona jest część.
- Akcje w wierszach tylko `ghost`/`sm` (zasada pieczątek). Kliknięcie wiersza otwiera kartę rekwizytu.
- Na telefonie tabela zamienia się w listę kart rekwizytu (PropCard).
