Dodawanie rekwizytów ze zdjęcia: miejsce na zdjęcie i wyniki rozpoznania do zatwierdzenia.

- **Miejsce na zdjęcie**: przerywana ramka `border-strong`, ikona aparatu w kółku `kurtyna-tint`, zdanie co zrobić i limity. Po najechaniu plikiem (`is-over`) ramka i tło w kolorach kurtyny. Na telefonie przycisk „Zrób zdjęcie” otwiera aparat.
- **Wyniki**: po lewej zdjęcie z ramkami wokół rozpoznanych przedmiotów, ponumerowanymi tak samo jak lista po prawej. Ramki i numery mają stałe kolory niezależne od motywu i obwódkę, żeby były czytelne na każdym zdjęciu: propozycja AI biała przerywana, zaznaczona bordo ciągła, niska pewność ochra przerywana z „?” przy numerze (a na liście słowo „sprawdź”). Numer na liście (`.rk-ai__n`) ma ten sam stan co ramka: neutralny, `--selected` (bordo) albo `--low` (ochra, „3?”). Pełne zasady: sekcja „Linie” i karta „Linie”, część „Oznaczenia na zdjęciach”.
- Każda propozycja ma checkbox i edytowalną nazwę; pewne są zaznaczone, niepewne nie. Przycisk główny podaje liczbę („Dodaj 2 rekwizyty”).
- Podczas analizy: pasek z biletów (jeden bilet na zdjęcie) i podpis z bieżącym krokiem.
- AI proponuje, człowiek zatwierdza: nic nie trafia do magazynu bez kliknięcia.
