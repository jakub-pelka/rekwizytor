Okno dialogowe na tle przyciemnionej strony: formularz albo potwierdzenie decyzji.

- Tło strony przyciemnione bez rozmycia (`backdrop-blur` jest wycofany).
- Panel `surface`, `radius-lg`, `shadow-overlay`. Wejście: wzorzec Kurtyna (odsłonięcie od góry; w Próbie czytanej przenikanie).
- Nagłówek: tytuł (`title`) i opcjonalny opis. **Bez krzyżyka w rogu**: jedynym przyciskiem zamykającym jest „Anuluj” w stopce.
- Stopka: akcje do prawej, ghost „Anuluj” przed akcją główną. Jedna akcja z pieczątką.
- **Potwierdzenie** (`--confirm`): ikona w kółku `danger-tint`, pytanie z nazwą rzeczy w tytule, w opisie konsekwencje i czy da się cofnąć. Przycisk mówi, co zrobi („Usuń rekwizyt”), nie „OK”.
- Klawisz Esc działa jak „Anuluj” (dla klawiatury i czytników ekranu). Kliknięcie w tło nie zamyka okna, żeby przypadkiem nie stracić wpisanych danych.
