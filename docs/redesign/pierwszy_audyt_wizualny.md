# Rekwizytor: Pierwszy Audyt Wizualny i Techniczny Redesignu

Data audytu: **7 października 2026**  
Status: **Wstępny audyt wdrożenia po migracji przepływów 1–4 (commit `c7db121`) oraz nowego generatora etykiet**  
Cel wdrożenia: **Pilotaż w teatrach na Śląsku (demo na telefonie i komputerze)**

---

## 1. Podsumowanie audytu (Executive Summary)

Wdrożenie nowego design systemu w commicie `c7db121` przyniosło ogromny postęp — przede wszystkim w warstwie mobilnej, która była priorytetem pod kątem demonstracji na telefonie. Zaimplementowano fundamenty marki, tokeny, fonty, kolejkowanie zmian w trybie offline oraz strukturę głównych ekranów.

Jednocześnie audyt wykazał **4 krytyczne obszary**, w których teoria i makiety rozjechały się z działającą aplikacją:

1. **Podwójna tożsamość aplikacji (Desktop vs Mobile):** Na telefonie działają nowe ekrany, ale na komputerze (`hidden md:block`) ekrany Spektaklu (`/performances/[id]`) oraz Listy Spektakli (`/performances`) wciąż renderują **stary kod sprzed redesignu**.
2. **Błędy runtime modeli AI:** W konfiguracji wpisano nieistniejące nazwy modeli (np. `google/gemini-3.5-flash-lite`, `gpt-6-luna`), co przy braku zmiennych środowiskowych powoduje błąd 404 API podczas zapisu rekwizytu (podział opisu) i skanowania zdjęć. Złamano również regułę: *najstarszym modelem od Google jest Gemini 2.0*.
3. **Brak wsparcia dla skanera QR na iOS Safari:** Skaner aparatu opiera się wyłącznie na `window.BarcodeDetector`, który nie jest domyślnie wspierany na iPhone'ach — rekwizytorzy na iOS zobaczą błąd braku obsługi i zostaną zmuszeni do ręcznego wpisywania kodu.
4. **Brak obsługi dotyku w trybie Porządkowania:** Kanban magazynu używa natywnego HTML5 Drag & Drop, który nie działa na ekranach dotykowych smartfonów.

---

## 2. Rozdwojenie jaźni: Desktop vs Mobile

Zgodnie z `docs/redesign/README.md` priorytetem był telefon, jednak aplikacja na komputerze musi prezentować się spójnie podczas spotkań z dyrekcją i inspicjentami teatru.

### 2.1. Ekran Spektaklu (`app/[locale]/performances/[id]/page.tsx`)
* **Na telefonie:** Działa nowy komponent `PerformancePhone.tsx` (zakładki, rozwijane sceny, wpisy rekwizytów `.rk-entry`, edycja rekwizytu z asystą AI, terminy i notatki).
* **Na komputerze (`hidden md:block`):**
  * W kodzie (od linii 178) znajduje się w 100% **stary kod**: rozmyty plakat ze starymi cieniami, stary `ScheduledShowsList`, stary `PerformanceContent` i stary `PropsChecklist`.
  * **Niezrealizowana makieta:** Projekt z `docs/redesign/ekrany/html/Spektakl.html` w ogóle nie został przeniesiony na desktop. Brakuje:
    * Nagłówka z tytułem w Boldonse (`.pl-show-title`), licznikiem w `.rk-tally` i przyciskami "Drukuj etykiety" oraz "Otwórz listę zadań",
    * Układu dwukolumnowego z sekcjami: Przygotowanie (PRZ), Akt I, Akt II i rozwijanymi scenami (`.sp-scene`),
    * Prawego panelu bocznego: najbliższe terminy, wyjątki obsad (obsada A vs B) oraz notatki ze wzmiankami.

### 2.2. Ekran Listy Spektakli (`app/[locale]/performances/page.tsx`)
* **Na telefonie:** Działa `PerformancesPhone.tsx` z listą spektakli i datą najbliższego grania.
* **Na komputerze (`hidden md:block`):**
  * Wisi stary komponent `PageHeader` ze starym fioletowym akcentem (`iconColor="text-purple-400"`) oraz kafelkowa siatka `PerformancesList` z przyciskami `glassy-primary`.
  * **Niezrealizowana makieta:** Projekt z `docs/redesign/ekrany/html/Spektakle.html` (tabela wierszy `.sl-row`, termin "Dziś 19:00", liczniki rekwizytów, filtr sezonu w zakładkach `.rk-tabs`) nie został zaimplementowany na desktopie.

### 2.3. Ekran Ustawień (`app/[locale]/settings/page.tsx`)
* Do starego ekranu doklejono komponent `MotionSetting.tsx`, ale nagłówek strony nadal używa starego `PageHeader` z fioletem (`text-purple-400`), a formularz `SettingsForm.tsx` pochodzi z marca 2026 i nie używa klas ani tokenów design systemu.

---

## 3. Błędy krytyczne w działaniu (Runtime, Modele AI & Sprzęt)

### 3.1. Fikcyjne nazwy modeli AI (OpenRouter)
* **Lokalizacja:** `utils/ai/client.ts` (linie 36–46) oraz `app/actions/save-performance-prop.ts` (linia 9).
* **Stan faktyczny:**
  ```ts
  // utils/ai/client.ts
  vision: ['google/gemini-3.5-flash-lite', 'openai/gpt-6-luna'],
  text: ['google/gemini-3.5-flash-lite', 'openai/gpt-6-luna'],
  
  // app/actions/save-performance-prop.ts
  const SPLIT_MODELS = (process.env.AI_MODEL_SPLIT ?? 'google/gemma-4-31b-it:free,google/gemini-3.5-flash-lite')
  ```
* **Problem:** Modele `google/gemini-3.5-flash-lite`, `google/gemma-4-31b-it:free`, `openai/gpt-6-luna`, `gpt-5.4-mini` nie istnieją w API.
* **Zasada projektu:** *Najstarszym aktualnie obsługiwanym modelem od google jest gemini 2.0*.
* **Konsekwencje:** Przy domyślnej konfiguracji bez manualnie ustawionych zmiennych `AI_MODEL_SPLIT` i `AI_MODEL_VISION`, użytkownik przy próbie zapisu opisu rekwizytu lub skanowania zdjęć otrzyma błąd API 404 (Model not found).
* **Rozwiązanie:** Zastąpienie modeli stabilnymi identyfikatorami: np. `google/gemini-2.0-flash-001` lub `google/gemini-2.5-flash`.

### 3.2. Skaner kodów QR na iPhone'ach (`components/scan/LabelScanner.tsx`)
* **Stan faktyczny:**
  ```ts
  if (!window.BarcodeDetector) { setHint('unsupported'); setManual(true) }
  ```
* **Problem:** Standardowe przeglądarki na iOS (Safari / WebKit) nie posiadają domyślnie włączonego API `window.BarcodeDetector`.
* **Konsekwencje:** Podczas testów w teatrze rekwizytor korzystający z iPhone'a nie będzie mógł zeskanować etykiety QR aparatem wideo. Zobaczy komunikat "unsupported" i zostanie przełączony na pole tekstowe do wpisywania kodu.
* **Rozwiązanie:** Wdrożenie biblioteki fallbackowej w czystym JavaScript/Canvas (np. `jsqr`), uruchamianej w klatkach wideo w razie braku natywnego `BarcodeDetector`.

### 3.3. Porządkowanie magazynu na dotyku (`components/storage/OrganizeBoard.tsx`)
* **Stan faktyczny:** Użyto zdarzeń HTML5 Drag & Drop (`draggable={canEdit}`, `onDragStart`, `onDrop`).
* **Problem:** Standard HTML5 Drag and Drop nie obsługuje zdarzeń dotykowych (touch events) na smartfonach.
* **Konsekwencje:** Na telefonie (głównym urządzeniu pilotażu) rekwizytor nie jest w stanie przeciągać kart między szafami i półkami.
* **Rozwiązanie:** Skorzystanie z obecnej w `package.json` biblioteki `@dnd-kit`, która obsługuje wskaźniki dotykowe (Pointer/TouchSensor).

---

## 4. Rozbieżności ze specyfikacją z `POMYSLY.md`

### 4.1. Poziom szczegółów widoku listy (Sekcja 6 – P2)
* **Założenie:** Trzy poziomy szczegółów wybierane bezpośrednio na liście: „Wszystko” (domyślnie), „Nazwa i miejsce”, „Tylko nazwy”.
* **Stan kodu:** W `ShowListView.tsx` istnieją tylko filtry statusu (`Do zrobienia`, `Zrobione`, `Wszystko`) i grupowanie (`Miejsce`, `Scena`). Brak przełącznika szczegółowości opisów.

### 4.2. Automatyczne uruchamianie Trybu Na Żywo (Sekcja 7 – P1)
* **Założenie:** Tryb na żywo włącza się sam o godzinie spektaklu bez przycisku „Rozpocznij”. Inspicjent przełącza sceny, telefony podążają.
* **Stan kodu:** Na liście zadań (`ShowListView.tsx`) pojawia się jedynie tekst informacyjny *„Na żywo włączy się o {time}”*. Gdy wybije godzina spektaklu, nie ma automatycznego przekierowania ani wyróżnionego paska nawigacyjnego przenoszącego na `/lists/[id]/live`. Użytkownik musi ręcznie wiedzieć, jak przejść do trybu live.

### 4.3. Wyszukiwanie jedno pole na ekran (Sekcja 15 – P1)
* **Założenie:** Na każdym ekranie jedno pole wyszukiwania; lupa na telefonie otwiera wyszukiwanie z chipem bieżącego zakresu (np. `w: Pracownia rekwizytorska ×`).
* **Stan kodu:**
  * W `StorageView.tsx` pole z chipem na desktopie działa dobrze.
  * Na telefonie ikona lupy w `MobileTop.tsx` otwiera globalną paletę poleceń `CommandPalette` zamiast wyszukiwarki kontekstowej magazynu.

### 4.4. Menu mobilne z konta (`components/layout/MobileMenu.tsx`)
* **Stan kodu:** Komponent `MobileMenu.tsx` (otwierany przez `AccountMenuButton.tsx`) to relikt poprzedniej wersji:
  * Zawiera twardo zakodowane kolory Tailwind (`bg-[#1a1a1a]`, `text-neutral-400`, `bg-neutral-800`),
  * Nie korzysta ze stylów `.rk-modal` / `.rk-sheet`,
  * Zawiera zdublowaną pozycję "Szukaj" (mimo że lupa jest już w górnym pasku),
  * Nie zawiera przełącznika teatrów dla użytkowników z dostępem do wielu instytucji (Sekcja 11).

---

## 5. Nowy generator etykiet (`/labels` — prace w toku)

Zmiany wprowadzone w `app/[locale]/labels/page.tsx`, `components/labels/Label.tsx` oraz `components/labels/LabelSheet.tsx`:
* **Pozytywne decyzje:**
  * Wierne odwzorowanie 5 formatów arkuszy A4 Lyreco (44, 65, 33, 10 na arkusz).
  * Usunięcie lokalizacji z etykiety (miejsce żyje w aplikacji; przeniesienie to 2 skany).
  * Zastosowanie jednostki `--mm` i czystego druku CSS `@media print` zamiast zawodnego serwerowego renderowania PDF przez biblioteki Node.
* **Uwagi do dokończenia:**
  1. Sprawdzić dane w bazie: czy wszystkie rekordy `groups`, `group_items` i `locations` mają uzupełnioną kolumnę `code` (`GRP-`, `REK-`, `MSC-`). Generator poprawnie filtruje pozycje bez kodu i wyświetla ostrzeżenie, ale baza demo powinna mieć 100% pokrycia.
  2. Usunąć stare endpointy backendowe (`app/api/generate-labels/route.ts` i `app/api/generate-performance-labels/route.ts`) po ostatecznym przepięciu przycisków.

---

## 6. Plan działań naprawczych (Rekomendowana kolejność)

| Priorytet | Zadanie | Cel |
|---|---|---|
| **P0 (Krytyczne)** | Poprawa identyfikatorów modeli AI w `utils/ai/client.ts` i `save-performance-prop.ts` na `google/gemini-2.0-flash-001` | Odblokowanie działania podziału opisu i skanu AI bez błędów 404 |
| **P0 (Krytyczne)** | Dodanie programowego dekodera QR (fallback JS) w `LabelScanner.tsx` | Umożliwienie skanowania etykiet aparatem na iPhone'ach (iOS Safari) |
| **P1** | Zastąpienie starego desktopowego layoutu w `app/[locale]/performances/[id]/page.tsx` nowym widokiem z `Spektakl.html` | Spójność widoku spektaklu na komputerze |
| **P1** | Zastąpienie starego desktopowego layoutu w `app/[locale]/performances/page.tsx` nowym widokiem z `Spektakle.html` | Spójność listy spektakli na komputerze |
| **P1** | Dokończenie i zacommitowanie nowego systemu etykiet A4 (`/labels`) | Zastąpienie starego generatora PDF |
| **P1** | Przystosowanie przeciągania w `OrganizeBoard.tsx` do dotyku (`@dnd-kit`) | Działające porządkowanie magazynu na smartfonie |
| **P2** | Dodanie przełącznika szczegółowości na liście zadań (`ShowListView.tsx`) | Zgodność z Sekcją 6 `POMYSLY.md` |
| **P2** | Odświeżenie `MobileMenu.tsx` na design system `.rk-*` | Usunięcie starych kolorów `#1a1a1a` i szarości Tailwinda |
