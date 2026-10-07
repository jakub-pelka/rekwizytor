Nawigacja na telefonie: górny wiersz i dolne menu.

- **Górny wiersz bez paska** (`.rk-mtop`, 48 px): po lewej „‹ Spektakle” (cofanie z nazwą miejsca, do którego wracasz), po prawej najwyżej dwie ikony akcji. Bez tła i bez ramki. Kotwicą ekranu jest tytuł w treści (Boldonse), a nie nazwa ekranu w pasku, tak jak na komputerze. Treść zaczyna się 8 px pod wierszem, bo przyciski 44 px mają własny luz.
- **Cofa całe „‹ Spektakle”, nie tylko strzałka.** Strzałka i napis to jeden link z jednym polem dotyku (min. 44 px wysokości, od lewej krawędzi ekranu do końca napisu). Ludzie odruchowo klikają w napis albo trafiają obok strzałki, więc każde z tych dotknięć ma cofać.
- **Po przewinięciu** (`.rk-mtop--stuck`): gdy duży tytuł zniknie z ekranu, wiersz przykleja się u góry, dostaje tło `surface` i ramkę `border`, a na środku pokazuje sam tytuł (Geist 600, 15 px). Cofanie zostaje jako sama strzałka. Tytuł pojawia się płynnie (`dur-base`), a w oszczędnym trybie ruchu bez animacji.
- **Pulpit** nie ma cofania: po lewej znak i data maszynopisem (`.rk-mtop__brand`), po prawej wyszukiwanie i konto.
- **Pozostałe ekrany główne** (Rekwizyty, Spektakle, Listy) też nie mają cofania: po lewej sam znak, po prawej akcja ekranu (np. skan etykiety), a tytuł jest w treści.
- Nie używaj pełnego paska z tytułem i podtytułem (`.rk-mhead`, styl Material). Zostaje w CSS tylko dla zgodności.
- **Dolne menu**: 4 sekcje i środkowy przycisk „Skanuj” (aparat: zdjęcie rekwizytu albo kod QR). „Skanuj” to jedyny przycisk z pieczątką w pasku: najczęstsza fizyczna czynność w kulisach.
- Aktywna sekcja: ikona w pigułce `kurtyna-tint`, etykieta `kurtyna-text`, `aria-current="page"`. Etykiety zawsze widoczne.
- Pasek uwzględnia dolny margines bezpieczny telefonu (`safe-area-inset-bottom`), a górny wiersz górny (`safe-area-inset-top`).
- Pola dotyku 44 px.
