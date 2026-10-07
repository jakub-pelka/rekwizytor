Tryb na żywo listy zadań: włącza się sam o godzinie spektaklu, nie ma przycisku startu. Sceny przełącza inspicjent, a telefony rekwizytorów podążają za nim.

- **Pasek stanu** `.rk-live-strip`: ochra (`warning-tint`) znaczy „na żywo”: kropka, „NA ŻYWO”, spektakl i akt, zegar od początku aktu. Na komputerze zaokrąglony (`--wide`).
- **Bieżąca scena** `.rk-live-scene`: numer maszynopisem w ochrze, nazwa Geist 24/32.
- **Telefon rekwizytora:**
  - wiersze `.rk-live-item` z polem 32 px i nazwą 18/26, czyli większe niż na zwykłej liście;
  - pod nazwą kto bierze (ikona osoby) i gdzie leży (pinezka);
  - zapowiedź następnej sceny `.rk-live-next` w przerywanej ramce;
  - na dole jeden przycisk „Zgłoś problem” (`danger`, lg) w pasku `.rk-live-bottom`;
  - bez dolnego menu.
- **Komputer inspicjenta:**
  - oś aktu `.rk-live-tl` (zrobione przekreślone, bieżąca w ochrze z licznikiem „teraz”);
  - rekwizyty bieżącej sceny z potwierdzeniem (`.rk-live-ok`) albo oczekiwaniem (`.rk-live-wait`), kto i kiedy;
  - zgłoszenia z kulis jako alert `warning`;
  - przycisk „Następna scena” obsługiwany spacją.
- Zawsze duże pola dotyku (min. 44 px) i mało elementów naraz.
