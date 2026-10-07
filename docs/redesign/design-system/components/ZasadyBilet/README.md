Zasady stosowania twardego cienia „Bilet” (`shadow-stamp*`), żeby motyw został wyrazisty, a nie przytłaczał.

Pieczątka oznacza **fizyczne działanie**: naciśnij, przenieś, wydrukuj. Dlatego dostają ją tylko:

1. **Przyciski `md` i `lg`**: primary, secondary, danger.
2. **Karta rekwizytu zaznaczona albo przeciągana** (`.rk-prop.is-selected`, `.is-dragging`), np. na tablicy Kanban.
3. **Drukowana etykieta** (ramka jak bilet, bez cienia na ekranie).

Zasady:

- **Pieczątki się nie zagnieżdżają.** Gdy kontener ma pieczątkę, wszystkie przyciski w nim są płaskie (`sm` albo `ghost`).
- **Karty, modale, panele i alerty nigdy nie mają twardego cienia.** Mają `shadow-card` albo `shadow-overlay`.
- **Jedna akcja primary na widok.** Kilka równorzędnych akcji to secondary albo grupa przycisków `sm`.
- **W listach i tabelach** (akcja w każdym wierszu) używaj tylko `sm` i `ghost`.
- **Odstęp min. `space-3`** między elementami z pieczątką.
