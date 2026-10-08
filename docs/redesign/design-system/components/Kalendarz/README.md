Kalendarz pokazuje **terminy**: spektakle i próby z datą i godziną. Spektakl jako produkcja (plakat, obsada, rekwizyty) ma osobny ekran „Spektakle”; tutaj nie mieszamy jednego z drugim.

Dwa widoki tych samych danych, przełączane `.rk-tabs`:
- **Lista z osią czasu** (`.rk-tl`, na telefonie `.rk-tl--compact`): domyślna. Po lewej data (dzień tygodnia i numer) i oś; w wierszu terminu (`.rk-agenda__row`) godzina, znacznik rodzaju, tytuł i opis, po prawej stan listy zadań (`.rk-fraction`).
  - **dziś** (`.is-today`): wypełnione kółko bordo z poświatą, data w bordo, etykieta „Dziś”;
  - **najbliższy dzień z terminami** (`.is-next`): obrys bordo, etykieta „Najbliższy”. Gdy dziś nie ma terminów, wyróżnienie przechodzi na ten dzień;
  - **kreska „teraz”** (`.rk-tl__now`): pozioma linia bordo z godziną, tylko w dniu dzisiejszym, między minionymi a nadchodzącymi terminami;
  - **podział** (`.rk-tl__sep`, np. „Dalej w tym tygodniu”, „W przyszłym tygodniu”), a za nim oś przerywana i szare kółka (`.is-later`);
  - dni bez etykiety dostają `.rk-tl__day--plain`, żeby data i kółko stały na wysokości pierwszego terminu.
- **Miesiąc** (`.rk-month`): przegląd sezonu na komputerze. Najwyżej dwa terminy w komórce, reszta jako „+N więcej”.

Rodzaj terminu:
- spektakl: znacznik wypełniony bordo (`.rk-agenda__kind`), w miesiącu `.rk-month__ev--show`;
- próba: obrys (`--rehearsal`), w miesiącu `.rk-month__ev--rehearsal`.

Zasady:
- Każdy termin z rekwizytami ma swoją listę zadań; wiersz prowadzi prosto do niej. Dlatego w menu nie ma osobnej pozycji „Listy zadań”.
- Minione terminy są przygaszone (`.is-past`), nie znikają.
- Dziś: kółko z numerem dnia w kolorze kurtyny; w liście znacznik „dziś” przy nagłówku dnia.
