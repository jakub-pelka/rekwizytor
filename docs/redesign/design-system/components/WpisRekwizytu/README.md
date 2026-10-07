Wpis rekwizytu to wiersz listy zadań i rozpiski scen. Ma trzy warstwy, z których tylko pierwsza jest mocna.

| Warstwa | Klasa | Styl |
|---|---|---|
| Co | `.rk-entry__name` | Geist 16/24, 600, `ink` (`.rk-entry--sm`: 14/20 w rozpisce scen) |
| Jak | `.rk-entry__how` | Geist 13/18, `ink-subtle`, ikona listy kontrolnej 14 px |
| Gdzie | `.rk-entry__where` | Geist 13/18, `ink-subtle`, ikona pinezki 14 px |
| Skąd | `.rk-entry__from` | Geist 13/18, `ink-subtle`, ikona szuflady 14 px, opcjonalnie |

Dlaczego tak: przy pierwszych spektaklach człowiek czyta całość, potem pamięta miejsca i przegląda listę tylko po nazwach, żeby nie pominąć pojedynczej rzeczy. Mocna nazwa i ciche szczegóły obsługują oba momenty.

Zasady:

- **Każda cicha linia ma ikonę i ten sam styl.** Jak, gdzie i skąd wyglądają identycznie i różnią się tylko ikoną. Linia z ikoną obok linii bez niej, albo z przedrostkiem tekstowym („Z:”), wygląda jak błąd.
- **Nic nie ucinamy.** „Jak” i „gdzie” zawijają się w całości.
- **Odhaczony wpis zwija się do nazwy.** Szczegóły znikają, nazwa przygasa (`input:checked ~ .rk-entry`).
- **Szczegóły bez koloru.** Kolor zostaje dla stanów (badge, ikona po lewej).
- **Sekcja to miejsce ogólne, wiersz doprecyzowuje.** Pod nagłówkiem „Stół rekwizytów” wiersz mówi „lewa strona, pod chustą”, a nie powtarza „stół”.
- **Jedno pole przy wpisywaniu** (do wdrożenia): użytkownik pisze opis swobodnie, a model dzieli go na „jak” i „gdzie”. Model niczego nie dopisuje ani nie zmienia znaczenia. Źródłem prawdy jest tekst człowieka, a poprawia się go w oryginale. Gdy model nie odpowie, cały opis pokazujemy jako „jak”. Miejsca dopasowujemy do już istniejących w spektaklu, żeby działało grupowanie.
