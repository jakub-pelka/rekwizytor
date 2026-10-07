Liczba w interfejsie ma trzy formy. Wszystkie są maszynopisem (Courier Prime) z cyframi o stałej szerokości i nie mają kropki, więc nie da się ich pomylić z badge statusu.

| Forma | Klasa | Do czego |
|---|---|---|
| Pigułka | `.rk-count` | pojedyncza liczba przy pozycji menu, zakładce, filtrze |
| Postęp | `.rk-fraction` | zrobione z całości, np. „31/42” na liście zadań |
| Liczność | `.rk-tally` | ile elementów ma sekcja, przy nagłówku: „5 spektakli” |

Warianty pigułki:

- domyślna (szara): ile czegoś jest,
- `--new` (bordo, wypełniona): ile czeka na ciebie, np. nowe wzmianki; to jedyny wypełniony licznik,
- `--live` (ochra): listy zadań w stanie „na żywo”.

W nawigacji ten sam styl ma `.rk-nav-item__n` (warianty `--new`, `--live`). Na aktywnej pozycji menu zwykły licznik dostaje tło `surface` i kolor `kurtyna-text`, a nie wypełnienie.

Zasady:

- **Badge mówi o stanie, licznik o ilości.** Liczba może stać w badge tylko jako część stanu („1 po terminie”). Sama ilość to licznik.
- **Bordo badge (`--brand`) jest tylko dla AI.** „2 nowe” zapisujemy pigułką `--new`.
- **Pigułka ma jedną liczbę.** Postęp „x/y” piszemy tekstem (`.rk-fraction`): bieżący etap `is-current` (kurtyna-text), zamknięty `is-done` (success), a gdzie jest miejsce, dodajemy pasek.
- Powyżej 99 piszemy „99+”. Pigułki z zerem nie pokazujemy, a postęp „0/12” tak, bo mówi, że lista czeka.
- Liczność zawsze z rzeczownikiem w poprawnej odmianie: 1 spektakl, 2–4 spektakle, 5+ spektakli.

**Centrowanie optyczne.** Cyfry Courier Prime siedzą w swojej linii ok. 0,7 px za wysoko, więc pigułka o wysokości 20 px ma `padding-top: 1px` i `line-height: 19px`. Dzięki temu cyfra jest wizualnie na środku, a nie tylko matematycznie. Ta sama poprawka dotyczy numerów AI, numerów na zdjęciach i licznika w wąskim pasku nawigacji. Nie poprawiaj tego ręcznie na ekranach.
