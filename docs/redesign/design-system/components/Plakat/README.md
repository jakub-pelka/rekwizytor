Plakat spektaklu (`.rk-poster`) w proporcjach 2:3. Jedyny element graficzny przy spektaklu: pomaga rozpoznać tytuł wzrokiem w liście i w nagłówku.

| Rozmiar | Klasa | Gdzie |
|---|---|---|
| 48 px | `.rk-poster` | wiersz listy spektakli (komputer i telefon) |
| 64 px | `.rk-poster` + `width: 64px` | nagłówek spektaklu na telefonie |
| 96 px | `.rk-poster--md` | nagłówek spektaklu na komputerze |
| 144 px | `.rk-poster--lg` | edycja spektaklu, podgląd przy wgrywaniu |

Zasady:
- Plakat to obraz wgrany przez teatr (`<img>` w środku). Bez ramek w kolorze, bez cieni: tylko cienka linia `--border`.
- Gdy plakatu nie ma: `.rk-poster--empty` ze znakiem kurtyny, wyszarzonym. Nie generujemy zastępczych grafik z tytułem.
- Tytuł spektaklu nigdy nie jest częścią plakatu w interfejsie; zawsze stoi obok jako tekst.
