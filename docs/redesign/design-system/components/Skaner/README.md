Skanowanie aparatem telefonu: kody QR (etykiety) i zdjęcia do rozpoznania przez AI.

- **Aparat** `.rk-cam`: kolory stałe, niezależne od motywu, bo obraz z kamery ma własne barwy. Ramka celownika `.rk-cam__frame` jest biała, a gdy nie widać kodu, ochrowa (`--warn`) z podpowiedzią `.rk-cam__hint`. Na dole latarka i „Wpisz numer”.
- **Arkusz od dołu** `.rk-sheet`: wynik skanu, który wymaga decyzji (nieznany kod, przeniesienie). Uchwyt `.rk-sheet__grip`, jedna akcja główna lg, druga ghost.
- **Zdjęcie do rozpoznania:**
  - Po zrobieniu zdjęcia startują **dwa rozpoznania naraz**: grupy przedmiotów i pojedyncze przedmioty.
  - W tym czasie wybór trybu `.rk-choice`: dwie duże opcje jedna pod drugą, każda z ikoną roli i jednym zdaniem wyjaśnienia.
  - Pod spodem stan obu rozpoznań `.rk-scan-status` („gotowe” albo trzy dzwonki).
  - Odrzucone rozpoznanie idzie do kosza, ale człowiek nie czeka.
- **Edycja wyników:**
  - zdjęcie z ramkami (karta PhotoAI) i lista `.rk-ai__item` z numerami zgodnymi z ramkami;
  - niska pewność to „3?” w ochrze i niezaznaczona pozycja;
  - miejsce zapisu `.rk-scan-place` („Zapisz w: Szafa B › Półka 1”, „Zmień”);
  - na dole „Zapisz 2 grupy” i ghost „Zmień na pojedyncze przedmioty”.
