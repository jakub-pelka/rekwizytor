Paleta poleceń otwierana skrótem ⌘K / Ctrl+K albo przyciskiem „Przejdź do…” w menu bocznym.

**Zasada jednego pola.** Na każdym ekranie jest najwyżej jedno pole wyszukiwania i zawsze zaczyna od miejsca, w którym jesteś:
- **Ekran z listą** (Magazyn, Spektakle, Notatki): pole nad listą (`.rk-find`) filtruje w miejscu, bez wyskakującego okna. Wpisanie tekstu przełącza listę w widok płaski z pełną ścieżką pod nazwą. Zakres pokazuje chip („w: Pracownia rekwizytorska”), a usunięcie chipu oznacza szukanie w całym magazynie. Na takim ekranie ⌘K przenosi kursor do tego pola.
- **Pozostałe ekrany**: ⌘K otwiera paletę. Najpierw akcje i miejsca („Dodaj rekwizyt”, „Skanuj”, „Otwórz Wesele”), potem wyniki z całej aplikacji. Gdy ekran ma kontekst (np. spektakl albo pojemnik), paleta startuje z chipem zakresu.
- **Telefon**: lupa w górnym wierszu otwiera pełny ekran wyszukiwania z tym samym chipem zakresu.

Wygląd palety:
- Jedno pole na górze (16 px), opcjonalnie z chipem zakresu, wyniki w grupach: Rekwizyty (z miniaturą, numerem i ścieżką), Spektakle i sceny, Akcje (ze skrótem).
- Dopasowany fragment podkreślony w `kurtyna-text`; wybrany wiersz na `kurtyna-tint`. Strzałki, Enter, Esc; stopka przypomina skróty.
- **Wyszukiwanie opisowe (AI)**: na dole podpowiedź, że można opisać rekwizyt własnymi słowami. Wyniki AI dostają badge „AI” i podpis, dlaczego pasują.
- Puste zapytanie pokazuje ostatnio otwierane i najczęstsze akcje. Brak wyników: kompaktowy pusty stan z propozycją „Szukaj wszędzie”.
- Wejście: wzorzec Kurtyna, jak modal.
