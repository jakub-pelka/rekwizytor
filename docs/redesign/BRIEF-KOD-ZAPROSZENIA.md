# Brief: wejście z zaproszenia kodem od kierownika

Dla projektu w Claude Design, na płótnie „Ekrany Rekwizytora”, strona „Pierwsze wejście”. Ekrany w design systemie „Rekwizytor”. Stan ustaleń: 19.10.2026. Zastępuje część plansz „Zaproszenie-haslo”, „Zaproszenie-stany” i „Zaproszenie-mail”.

## Po co

- **Pomyłka w adresie, mail przekazany dalej:** sam link z maila wpuszcza każdego, kto go dostanie. Kod przekazany osobno (ustnie, SMS-em) wpuszcza tylko osobę, która go zna.
- **Skanery poczty:** firmowa poczta otwiera linki sama i zużywa jednorazowy token („link wygasł” bez klikania). Link w nowym mailu nie ma tokenu, więc nic się nie zużywa.
- **Ekran pierwszego wejścia za bardzo przypomina logowanie** (uwaga Kuby, 18.10): ten sam układ z kurtyną. Osoba z zaproszenia ma widzieć, że zakłada konto w konkretnym teatrze, a nie się loguje.

## Ustalenia

- Kod: 6 cyfr (0–9), pokazywany w dwóch grupach „482 913”. Pole przyjmuje kod z odstępem, myślnikiem i bez nich; na telefonie klawiatura numeryczna.
- Kod jest przypięty do jednego zaproszenia (jeden e-mail, jedna rola). Zaprasza tylko kierownik pracowni (i superadmin).
- Ważny 7 dni. Po 5 złych próbach zaproszenie się blokuje; kierownik generuje nowy kod (stary przestaje działać).
- Kierownik może podejrzeć kod w Zespole, dopóki osoba nie dołączy.
- Mail z zaproszeniem nie zawiera kodu. Mówi, że kod przekaże osoba, która zaprasza. Link prowadzi na /witaj z adresem e-mail.
- Reset hasła i logowanie bez zmian.

## Ekrany do zaprojektowania

### 1. Zespół: po wysłaniu zaproszenia (komputer i telefon)
Okno „Zaproszenie wysłane” z kodem dużo i czytelnie (maszynopis, jak numer inwentarzowy), adresem i rolą, krótką instrukcją („Podaj ten kod osobie, ustnie albo SMS-em. Ważny do …”), akcjami „Kopiuj kod” i „Gotowe”. Zastępuje dzisiejszy sam toast „Wysłano zaproszenie na …”.

### 2. Zespół: osoba oczekująca
Wiersz w zakładce „Oczekujące”: poza „Wyślij ponownie” akcje „Pokaż kod” i „Nowy kod”. Stan „Zablokowane po 5 złych próbach” i „Kod wygasł” przy wierszu, z „Nowy kod” jako drogą dalej. Widok dla rekwizytora: bez kodów.

### 3. Mail z zaproszeniem
Jak plansza „Zaproszenie-mail”, ale bez linku z tokenem: kto zaprasza, do jakiego teatru, z jaką rolą; „Kod do wejścia dostaniesz od {zapraszający}”; przycisk „Wejdź do teatru” (zwykły link na /witaj z adresem).

### 4. /witaj: wejście kodem (komputer i telefon)
Inny układ niż logowanie. Widać od razu: teatr, kto zaprasza, rola i adres e-mail zaproszenia. Krok 1: kod (6 pól albo jedno pole z grupami). Krok 2: imię i nazwisko, hasło (jak dziś). Postęp dwóch kroków widoczny, w motywie biletu, jeśli pasuje.

### 5. /witaj: stany
- Zły kod: „Ten kod się nie zgadza. Zostały 3 próby.”
- Zablokowane: „Za dużo prób. Poproś {zapraszający} o nowy kod.”
- Kod wygasł: „Kod był ważny do … Poproś o nowy.”
- Wejście bez adresu w linku (adres przepisany ręcznie): najpierw pole na e-mail.
- Zaproszenie już wykorzystane: „Masz już konto” (jak dziś).
- Zaproszenie cofnięte przez kierownika.

## Co już jest w systemie

`.rk-field`, `.rk-input`, przyciski „Bilet”, `.rk-modal`, toast z „Cofnij”, maszynopis `inventory-id` na numery, perforacja i pasek etapów w motywie biletu, klasy z plansz Zespołu i Zaproszenia (`zp-*`, `np-*`) w `styles/rk/screens.css`.
