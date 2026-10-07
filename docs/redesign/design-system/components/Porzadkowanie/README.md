Tryb do reorganizacji magazynu (kanban), wejście przyciskiem „Porządkuj” na ekranie Magazynu.

- **Nic nie przeskakuje.** Kolumny stoją w tej samej kolejności co sekcje magazynu („Nieprzypisane” na końcu), karty w tej samej kolejności co wiersze. Karta (`.rk-inv-card`) wygląda jak wiersz listy: uchwyt, ikona roli, nazwa, numer, opis, stan.
- **Przenoszona karta**: `.is-lifted`, czyli twardy cień „Bilet” (`shadow-stamp-ink-lift`), obramowanie `ink` i obrót -1,5°. To fizyczna czynność, więc pieczątka jest tu na miejscu. Miejsce upuszczenia (`.rk-inv-drop`) ma przerywaną linię 2 px w `kurtyna-text`.
- **Zapis w tle**: zmiany widać od razu, w rogu stoi „Zapisano · 12:40” (`.rk-sync`), zapis buforowany jak w obecnym kodzie. „Gotowe” wraca do widoku magazynu.
- Nowe miejsce: kafel `.rk-inv-newcol` na końcu.
