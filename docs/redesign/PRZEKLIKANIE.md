# Rekwizytor: lista do przeklikania (integracja, 22.10.2026)

Środowisko: `http://localhost:3001` (gałąź `claude/project-collaboration-5767ae`, katalog z integracją). Wszystkie serwery używają tej samej bazy: **testy z zapisem i usuwaniem rób w „Teatrze próbnym”**, nie w prawdziwym teatrze.

Kolejność: jedna gałąź naraz. Jeśli coś psuje aplikację, napisz które, a wycofam tylko ją.

## 1. Etykiety A4 (w main, `afd9134`)

- [ ] `/pl/labels` z menu bocznego: arkusz grup, bez strzałki powrotu.
- [ ] Format „Rekwizyt”: **40** etykiet w siatce 4×10, bez lokalizacji.
- [ ] „Drukuj”: nie ma dodatkowej ostatniej strony ze stopką „© 2026 Jakub Pełka”.
- [ ] Wydruk jednego arkusza na zwykłej drukarce (skala 100%, bez marginesów), przyłożony do prawdziwego arkusza Avery Zweckform: etykiety trafiają w pola (marginesy są wyliczone, mogą się rozjechać o 1–2 mm).
- [ ] To samo dla „Mini” (65), „Flaga” (70×32, 27) i „Grupa”/„Miejsce” (105×57, 10).
- [ ] QR z etykiety zeskanowany telefonem (po zalogowaniu): przedmiot miga obwódką.

## 2. Stare okna: kosz i import scen (`60a06a4`, `e5919c7`)

- [ ] `/pl/trash`: lista z plakatem i datą.
- [ ] „Przywróć”: spektakl znika z kosza, pojawia się „Cofnij”; „Cofnij” przywraca go do kosza.
- [ ] „Usuń na zawsze” przy testowym spektaklu (`test ux`): okno po polsku, „Anuluj” nic nie zmienia, potwierdzenie usuwa wiersz, po odświeżeniu nie wraca.
- [ ] W Magazynie automatyczna grupa tego spektaklu też zniknęła.
- [ ] Konto bez roli kierownika: komunikat „Usuwać na zawsze może tylko kierownik pracowni”.
- [ ] `/pl/performances/<id>/edit` → „Wczytaj ze zdjęcia rozpiski”: trzy kroki po polsku (zdjęcia, kadr, sprawdzenie). **Nie klikaj „Dodaj do rozpiski” na prawdziwym spektaklu.**
- [ ] Esc w polu nazwy sceny nie zamyka całego okna.

## 3. „Zaczynamy” (`34180d9`, `d1d2ca8`)

Najlepiej na terminie ze spektaklem dziś, w „Teatrze próbnym”.

- [ ] `/pl/lists/<id>`, godzina spektaklu w przyszłości: pod tytułem jest ciche „Zaczynamy”.
- [ ] Klik przechodzi na tryb na żywo; „Start zapisany o …” ma „Cofnij”.
- [ ] „Cofnij” wraca do listy, tryb zostaje wyłączony do godziny z kalendarza.
- [ ] Termin, który już wystartował sam (kilkanaście minut temu): `/pl/lists/<id>/live`, obok „Następna scena” jest „Zaczynamy”; po kliknięciu zegar rusza od 0:00.
- [ ] Po spektaklu (po godzinie spektaklu + 4 h) lista nie przekierowuje już na tryb na żywo, nawet jeśli w trakcie przełączano sceny.
- [ ] Telefon: przycisk jest na dole treści, nad „Zgłoś problem”.

## 4. Limit AI (jeszcze niewłączony do integracji)

Czeka na przegląd. Ma migrację i dotyka kosztów, więc czytasz ją Ty.
