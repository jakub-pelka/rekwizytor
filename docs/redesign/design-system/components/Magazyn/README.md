Magazyn jako pliki i foldery. Trzy role zamiast sztywnych poziomów:

| Rola | Ikona | Etykieta | Co to jest |
|---|---|---|---|
| Pojemnik (`.rk-inv-ico--box`) | pudełko w ramce | `MSC-` | fizyczne miejsce: szafa, półka, kufer, pudło; zagnieżdżane do 3 poziomów |
| Grupa przedmiotów (`.rk-inv-ico--group`) | warstwy, bordo | `GRP-` | podobne rzeczy razem, przybliżona liczba; można rozpisać na przedmioty |
| Przedmiot (`.rk-inv-ico`) | metka | `REK-` | jedna sztuka |

Najwyżej jest zawsze pomieszczenie (albo „Nieprzypisane”).

- **Pomieszczenia rozróżniamy automatycznie** (od 8.10). Na liście pomieszczeń każdy kafelek ma ikonę wynikającą z nazwy (rekwizytornia: korona, pracownia: młotek, garderoba: koszula, scena: maski, strych: domek, korytarz: drzwi, sala: fotel, schowek: klucz, magazyn: hala, szafa i regał: archiwum; bez dopasowania: pudełko) i kolor z kolejności założenia, wzięty z palety awatarów bez bordo (bordo to kolor marki i status „alarm”). Ikona jest biała, bez obramowania. Nikt tego nie wybiera, bo chodzi o to, żeby oko znajdowało pomieszczenie samo, a nie o ozdobę. Reguły: `lib/room-style.ts`, kafelek: `components/storage/RoomTile.tsx`.

- **Poziomy pośrednie są opcjonalne.** Rzecz może leżeć w pomieszczeniu, w szafie, na półce albo w pudle na półce. Ścieżka pokazuje tylko istniejące poziomy.
- **Widok przeglądania:**
  - bezpośrednie pojemniki bieżącego poziomu to sekcje (nagłówek z linią, rodzaj i numer maszynopisem, „Otwórz”);
  - poziom niżej (np. półki w szafie) to podtytuły `.rk-inv-shelf`;
  - jeszcze głębiej pojemnik jest wierszem z wejściem albo rozwija się wcięciem o jeden poziom (`.rk-inv-items`), nigdy więcej;
  - rzeczy bez pojemnika mają sekcję „Luzem w pomieszczeniu”.
- **Wiersz** (`.rk-inv-row`): ikona roli, nazwa, numer i opis („ogólna · ok. 30 szt.”, „2 rozpisane”), spektakle, stan zbiorczy jako badge, strzałka.
- **Nawigacja:** okruszki `.rk-inv-crumbs`, pasek skoku `.rk-inv-jump` (chipy z liczbą), legenda ról `.rk-inv-legend`. Na telefonie pasek skoku się przewija, a chipy się nie łamią.
- **Wyszukiwanie** w miejscu: pole `.rk-find` z chipem zakresu. Wyniki w widoku płaskim, z pełną ścieżką (`.rk-inv-path`) i podkreślonym dopasowaniem (`.rk-inv-hit`).
