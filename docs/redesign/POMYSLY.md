# Rekwizytor: pomysły i decyzje do wdrożenia

Zebrane podczas odświeżania marki i projektowania ekranów (4–7 października 2026). Plik jest dla Claude Code: każdy punkt mówi, co zrobić, dlaczego, co już zdecydowano i co zostaje otwarte.

**Źródła prawdy dla wyglądu:**
- Design system „Rekwizytor”: https://claude.ai/artifact/PfAKS3yWrUgcWscG63Swfr (tokeny, `components/bundle.css`, karty komponentów z zasadami).
- Ekrany: https://claude.ai/artifact/VqpuC2MGZTNRHTkGCV542C (Pulpit, Spektakl, Lista zadań, Stany, Na żywo, Magazyn, Porządkowanie, Skan, Lista spektakli; komputer i telefon). Sekcje Na żywo, Magazyn i Lista spektakli są poglądowe: kierunek, a nie dopracowany projekt.
- Księga znaku: https://claude.ai/artifact/8fbx9YGEgeRH4RfJRCvXQq

**Zasada nadrzędna:** nie wymyślamy wyglądu w kodzie. Jeśli czegoś brakuje w design systemie, najpierw dopisujemy to do systemu, potem do kodu.

Priorytety: **P1** przed pilotażem w teatrze, **P2** w trakcie pilotażu, **P3** po pilotażu.

---

## 1. Migracja repo do design systemu (P1)

- **Co:** przegląd repo względem design systemu, potem migracja ekran po ekranie, zaczynając od ekranów pokazywanych w pilotażu.
- **Dlaczego:** obecny kod jest wymieszany (część według starych zasad, część przypadkowa). Bez migracji system i aplikacja szybko się rozjadą.
- **Do sprawdzenia w przeglądzie:**
  - wartości wpisane na sztywno (kolory, odstępy spoza skali 4/8/12/16/24/32/48);
  - własne przyciski i linie;
  - Geist Mono, który zastępujemy Courier Prime;
  - Boldonse użyty gdziekolwiek poza tytułem spektaklu;
  - stare etykiety.
- **Zasady, które kod musi trzymać** (szczegóły w design systemie):
  - linie: trzy poziomy, wszystkie 1 px; 2 px tylko dla stanów;
  - liczniki kontra badge: badge to stan, licznik to ilość, bordowy badge tylko dla AI;
  - rytm odstępów: tabela 7 poziomów w opisie marki;
  - Boldonse w aplikacji wyłącznie dla tytułów spektakli (`.rk-show-title`); nazwy ekranów zawsze Geist 20/28;
  - wpis rekwizytu: co mocno, a jak, gdzie i skąd cicho z ikonami (karta „WpisRekwizytu”);
  - telefon: górny wiersz bez paska (`.rk-mtop`), po przewinięciu przyklejony pasek z tytułem;
  - ruch w dwóch wersjach, pełnej i oszczędnej (`data-motion="lite"`), bo teatry mają słaby sprzęt i stare przeglądarki.

## 2. Etykiety: nowy system i generator (P1)

- **Co:** przepisać `app/api/generate-labels/route.ts` na nowy system etykiet.
- **Decyzje:**
  - Drukujemy tylko dane, które się nie zmieniają: numer, nazwę, QR i znak. **Bez lokalizacji.** Miejsce żyje w aplikacji.
  - Przeniesienie rekwizytu to dwa skany: najpierw przedmiot (lub grupa), potem etykieta miejsca.
  - Prefiksy numerów: `REK-` rekwizyt, `GRP-` grupa, `MSC-` miejsce.
  - Formaty na gotowych arkuszach A4, bez wycinania:

    | Etykieta | Rozmiar | Na arkuszu A4 | Uwagi |
    |---|---|---|---|
    | rekwizyt | 48,5 × 25,4 mm | 44 | — |
    | mini | 38,1 × 21,2 mm | 65 | QR 16 mm, zamiast napisu „Rekwizytor” sam znak, numer i znak wyśrodkowane w pionie |
    | flaga | 70 × 25,4 mm | 33 | środek bez nadruku, owijana wokół nitki |
    | grupa | 105 × 57 mm | 10 | — |
    | miejsce | 105 × 57 mm | 10 | — |

  - QR min. 20 mm (mini 16 mm). Tekst min. 7 pt. Tylko czerń.
  - Wymiary w CSS liczone przez `--mm`, ten sam komponent do podglądu i druku (klasy `.rk-lbl*`).
  - Wybór formatu arkusza przy drukowaniu.
- **Otwarte:** jaką drukarkę ma teatr (zwykła biurowa czy etykieciarka) i które arkusze już kupują. Arkusze wszystkich formatów są w Lyreco. Koszt materiału jest pomijalny; realnym kosztem jest ok. 16 h pracy przy oklejaniu.

## 3. Rekwizyty zależne od obsady (P1)

- **Co:** rekwizyty przypisane do roli, wspólne dla wszystkich obsad, plus wyjątki per obsada (np. Czepiec w obsadzie A ma fajkę, w B nie).
- **Gdzie widać:**
  - na rozpisce oznaczenie „Tylko obsada A”;
  - na liście zadań komunikat „Dziś gra obsada B”, a lista jest już dopasowana: pominięte pozycje są wyszarzone z dopiskiem „Dziś pomijamy”;
  - w Spektaklu sekcja „Wyjątki obsad”.
- **Przypadek z życia:** aktor nie pali, więc gra z atrapą papierosów. To samo dotyczy preferencji i ograniczeń aktorów; warto przewidzieć je w modelu danych.
- **Otwarte:** model danych dla preferencji aktora. Czy to wyjątek przypięty do osoby, czy do pary rola i obsada?

## 4. Podział spektaklu: akty i sceny albo tylko akty (P1)

- **Co:** ustawienie spektaklu. Akt jest obowiązkowy, scena opcjonalna.
- **Skutki:**
  - rekwizyt przypisany do aktu ma puste pole sceny i na liście stoi bezpośrednio pod nagłówkiem aktu;
  - numeracja typu „I.3” tylko przy scenach;
  - etapy listy zadań nazywamy „Przed II aktem”, nie „Przed sceną II.3”.
- **Zmiana trybu w trakcie:** sceny zostają w danych, tylko się je ukrywa.

## 5. Opis rekwizytu jednym polem, model układa strukturę (P1)

- **Co:** jedno pole na swobodny opis, np. „gazeta z okładką z magazynu militarnego, na kanapie pod przykryciem, po prawej stronie”. Model (Gemini, już w projekcie) dzieli go na „jak” (przygotowanie) i „gdzie” (dokładne miejsce).
- **Dlaczego:** ludzie nie trzymają struktury pól, a opisy w rozpiskach są długie.
- **Zasady:**
  - źródłem prawdy jest tekst człowieka; model niczego nie dopisuje ani nie zmienia znaczenia;
  - poprawia się oryginalny tekst, a podział przelicza się przy zapisie;
  - gdy model nie odpowie, cały opis pokazujemy jako „jak”;
  - miejsca dopasowujemy do już istniejących w spektaklu, żeby działało sortowanie i grupowanie po miejscu;
  - delikatna informacja „uporządkowano automatycznie” tylko w edycji, nie przy każdym wierszu.
- **Wygląd:** karta „WpisRekwizytu”, czyli nazwa mocno, a jak, gdzie i skąd cicho, każda linia z ikoną. Bez ucinania tekstu. Odhaczony wpis zwija się do nazwy.

## 6. Ustawienia widoku listy dla osoby (P2)

Ustawienia osoby, a nie spektaklu, zapisywane na koncie, żeby telefon i komputer działały tak samo:

- **Poziom szczegółów:** „Wszystko” (domyślnie), „Nazwa i miejsce”, „Tylko nazwy”.
  - Nowa osoba przy pierwszych spektaklach czyta całość, doświadczona przegląda same nazwy.
  - Przełącznik jest bezpośrednio na liście, nie w ustawieniach.
  - Odhaczone pozycje zawsze zwinięte do nazwy.
- **Akty na telefonie:** rozwinięte (jak teraz) albo zwinięte i otwierane dotknięciem. Do rozważenia: pamiętanie, które akty ktoś ostatnio otworzył w danym spektaklu.
- Oba ustawienia trzymamy w jednej grupie „Widok listy”.

## 7. Tryb na żywo i listy etapowe (P1)

- **Etapy listy zadań:** Próba, Przed spektaklem, Przed II aktem (w przerwie), Po spektaklu (zwrot do magazynu, żeby nic nie zginęło). Pasek etapów w motywie biletu z perforacją jest już w projektach.
- **Tryb na żywo włącza się sam o godzinie spektaklu.** Nie ma przycisku „Rozpocznij spektakl”.
- **Otwarte:**
  - spektakl, który zaczyna się z opóźnieniem;
  - próba generalna albo dzień bez spektaklu w kalendarzu: jak włączyć tryb bez przycisku?
- **Ekrany poglądowe są na płótnie** (karta „NaZywo” w design systemie):
  - telefon rekwizytora: ochrowy pasek „NA ŻYWO”, bieżąca scena, „Do podania” z większymi polami i informacją, kto bierze i gdzie leży, następna scena, jeden przycisk „Zgłoś problem”, bez dolnego menu;
  - komputer inspicjenta: oś aktu, potwierdzenia rekwizytów (kto, kiedy), zgłoszenia z kulis, „Następna scena” spacją.
- Sceny przełącza inspicjent, a telefony rekwizytorów podążają za nim.

## 8. Praca bez sieci (P1)

- W kulisach i magazynach sieć często znika. Aplikacja działa dalej, zmiany czekają w kolejce na urządzeniu.
- Pasek „Brak sieci. Odhaczaj dalej, zapiszemy, gdy połączenie wróci.”
- Licznik czekających zmian.
- Po powrocie sieci komunikat „Wszystko zapisane”, który znika po 3 s.
- Nieudany zapis to komunikat z „Ponów”, który zostaje do zamknięcia.

## 9. Ścieżka pierwszego uruchomienia (P2)

Dwie ścieżki.

**Nowy teatr** (komputer, kierownik pracowni), krok po kroku:

1. Teatr: nazwa, sceny, sezon.
2. Ty: imię i rola.
3. Pierwszy spektakl: tytuł, scena, terminy, podział na „Akty i sceny” albo „Tylko akty”, opcjonalnie obsady.
4. Rozpiska: wczytanie z pliku z rozpoznaniem przez model albo ręcznie.
5. Magazyn: zdjęcie półki albo spis z arkusza.
6. Zespół: zaproszenia z rolą.
7. Etykiety: format arkusza i pierwszy wydruk.

**Zaproszona osoba** (telefon, w minutę): imię, rola, zgoda na aparat, krótkie pokazanie listy zadań i skanu.

**Zasady:**

- Pełny ekran bez menu, po lewej postęp w motywie biletu, po prawej jedno pytanie naraz.
- Każdy krok da się pominąć, a postęp zapisuje się na bieżąco. Pominięte kroki trafiają do listy „Dokończ konfigurację” na pulpicie.
- Puste stany zostają jako siatka bezpieczeństwa (są w projektach, sekcja „Stany”).
- Finał: kurtyna podnosi się raz (ruch znaku tylko na start), potem pulpit z pierwszym spektaklem.

## 10. Import danych (P2)

- **„Wczytaj spis z arkusza”** (CSV, XLSX): teatry często mają stary spis w Excelu. Po imporcie od razu numery i etykiety.
- **„Wczytaj rozpiskę z pliku”:** model rozpoznaje akty, sceny i rekwizyty z dokumentu. Człowiek zatwierdza.

## 11. Drobne decyzje interfejsu (P1)

- **Cofanie na telefonie:** strzałka i napis „‹ Spektakle” to jeden link z jednym polem dotyku, min. 44 px wysokości, od krawędzi ekranu do końca napisu. Ludzie odruchowo klikają w napis.
- **Górny wiersz na telefonie:**
  - Pulpit: znak i data;
  - pozostałe ekrany główne: sam znak i akcja;
  - ekrany podrzędne: cofanie z nazwą i najwyżej dwie ikony.
- **Przełącznik teatru** nie stoi na górze menu. Zmiana teatru jest w menu konta na dole i tylko u osób z dostępem do kilku teatrów.
- **Sezon** to filtr na liście spektakli („Sezon 2026/27”, archiwum poprzednich). Ekran listy spektakli jest jeszcze do zaprojektowania.
- **Długie tytuły spektakli** jako kotwica:
  - najwyżej 2 linie (`line-clamp: 2`, `text-wrap: balance`, bez dzielenia wyrazów);
  - rozmiar maleje z długością: do ok. 14 znaków 48 px, do ok. 28 znaków 32 px, dłuższe mniejsze;
  - gdy i tak się nie mieści, wielokropek, a pełny tytuł w podpowiedzi;
  - progi do sprawdzenia na prawdziwych tytułach z repertuaru.
- **Zakładka „Przegląd”** na ekranie spektaklu (komputer), a nie „Rozpiska scen”, bo poza scenami są tam też terminy i wyjątki obsad. Na telefonie zostaje „Sceny”.
- **Liczniki** mają optyczne centrowanie cyfr Courier Prime (1 px w dół): `padding-top: 1px; line-height: 19px`. Jest to w design systemie, nie poprawiać ręcznie.

## 12. Komunikacja zespołu przy spektaklu (P3)

- **Co:** „tablica spektaklu”, czyli miejsce na ustalenia i zmiany zamiast prywatnych grup na Facebooku, których dziś używają ekipy.
- W projektach są już zalążki: notatki ze wzmiankami (@Anna) na pulpicie.
- Po pilotażu, gdy zobaczymy, jak zespół naprawdę się komunikuje.

## 13. Magazyn jak pliki i foldery (P1)

**Stan repo (6.10.2026):**
- Tabela `items` została usunięta (`20260108_remove_items_table.sql`). Najmniejszą jednostką jest grupa (`groups`), przypisana do miejsca (`locations`, z zagnieżdżaniem przez `belongs_to`).
- Rekwizyty w spektaklu (`performance_props`) to wolny tekst, bez powiązania z magazynem.

**Model docelowy: trzy role zamiast sztywnych poziomów**

| Rola | Przykłady | Etykieta | Uwagi |
|---|---|---|---|
| Pomieszczenie | pracownia, magazyn dekoracji | — | zawsze na górze; „Nieprzypisane”, gdy nie wiadomo, gdzie coś jest |
| Pojemnik | szafa, półka, kufer, pudło | `MSC-` | fizyczny; zagnieżdżany, najwyżej 3 poziomy (np. szafa › półka › pudło); **półka to osobny pojemnik** ze skanowalną etykietą; przeniesienie pojemnika przenosi zawartość (kufer jedzie ze spektaklem) |
| Rzecz: przedmiot | — | `REK-` | jedna sztuka |
| Rzecz: grupa przedmiotów | — | `GRP-` | logiczna; opis zbiorczy i przybliżona liczba; leży w jednym miejscu |

- **Każdy poziom pośredni jest opcjonalny, ale dostępny, gdy jest potrzebny.** Rzecz może leżeć w pomieszczeniu, w szafie, na półce albo w pudle na półce. Przykład: kask leży bezpośrednio na półce, bo nie mieści się do pudła, a świece na tej samej półce są w pudle. Ścieżka pokazuje tylko istniejące poziomy.
- W repo: `locations` (zagnieżdżanie przez `belongs_to`) dostaje typy pojemników (szafa, półka, kufer, pudło), z kontrolą cykli i limitem głębokości. Grupy zostają, a przedmioty wracają jako opcjonalne.
- **Widok przeglądania** (ekran „Magazyn” na płótnie):
  - jesteś w jakimś poziomie, a jego bezpośrednie pojemniki to sekcje z linią;
  - poziom niżej (np. półki w szafie) to podtytuły z numerem MSC-;
  - jeszcze głębiej pojemnik jest wierszem z wejściem albo rozwija się wcięciem o jeden poziom;
  - rzeczy luzem w pomieszczeniu mają sekcję „Luzem w pomieszczeniu”;
  - trzy ikony: pojemnik (pudełko w ramce), grupa (warstwy, bordo), przedmiot (metka).
- **Telefon:** wejście w głąb (np. Szafa B), okruszki „Magazyn › Pracownia › Szafa B” i półki jako sekcje.
- **Widok płaski** (wyszukiwanie): każda rzecz z pełną ścieżką pod nazwą.
- Grupa to folder, przedmiot to plik.
- **Przedmioty są opcjonalne.** Grupa może być „ogólna”: zawartość opisana zbiorczo („naczynia, ok. 30 szt.”), bez rozpisywania sztuk. W każdej chwili można ją rozpisać na przedmioty („Rozpisz na przedmioty”), np. tylko te, które grają w spektaklach.
- **Etykiety:** grupa zawsze ma `GRP-`, przedmiot dostaje `REK-` dopiero po rozpisaniu.
- **Spektakl a magazyn:** wpis w rozpisce wskazuje grupę albo przedmiot (opcjonalnie, z wolnym tekstem jako zapasem). Bez tego statusy „Do naprawy”, „Wypożyczony” czy „Zaginiony” nie przenoszą się na listę zadań.

**Widok:**
- Okruszki: Magazyn › Szafa B › Półka 3 › Kufer „Naczynia”.
- Lista miesza foldery (grupy) i pliki (przedmioty).
- Przenoszenie: przeciągnij albo dwa skany.

**Do zachowania z repo:**
- `LocationJumpBar` z przyklejonymi nagłówkami miejsc.
- Kanban `GroupKanbanManager` jako tryb „Porządkowanie” (przeciąganie grup między miejscami, buforowany zapis). **Naprawić:** stary kanban pokazywał elementy w innym układzie niż lista. Kolumny muszą stać w tej samej kolejności co sekcje magazynu („Nieprzypisane” na końcu), grupy w tej samej kolejności co w sekcji, a karta ma wyglądać jak wiersz listy (ikona, nazwa, numer, opis, stan). Po kliknięciu „Gotowe” nic nie może przeskoczyć.
- Okruszki i zagnieżdżanie miejsc z nieużywanego `StructureEditor` (do odświeżenia, z kontrolą cykli).
- Deep link `?highlight=` (przewinięcie i mignięcie obwódką), np. po skanie QR.

## 14. Skan zdjęcia: grupy i przedmioty równolegle (P1)

- Ekrany: płótno, sekcja „Skan”; karta „Skaner” w design systemie.
- Po zrobieniu zdjęcia startują **dwa rozpoznania naraz**: grupy (kategorie, jak w `vision-group.ts`) i pojedyncze przedmioty (jak w `vision-props.ts`).
- W tym czasie aplikacja pyta „Jak to zapisać?” i pokazuje dwa duże przyciski jeden pod drugim, każdy z jednym zdaniem wyjaśnienia (`.rk-choice`): „Jako grupy przedmiotów” (podobne rzeczy razem, przybliżona liczba, szybko) i „Jako pojedyncze przedmioty” (każda rzecz z numerem REK-, dla rzeczy grających w spektaklach). Pod spodem widać stan obu rozpoznań (`.rk-scan-status`). Zanim człowiek odpowie, wynik zwykle już jest. Jedno rozpoznanie idzie do kosza, ale proces wydaje się dużo szybszy.
- Potem dopiero ekran edycji wyników: zdjęcie z oznaczeniami (ramki i numery według karty PhotoAI), lista z numerami, poprawianie nazw, usuwanie i dodawanie, miejsce zapisu („Zapisz w: Szafa B › Półka 1”, „Zmień”) i możliwość zmiany trybu („Zmień na pojedyncze przedmioty”) bez ponownego zdjęcia.
- **Poprawki względem repo:**
  - zapisywać opis z AI (dziś ginie);
  - zmniejszać zdjęcie także w skanie grup (dziś leci w pełnym rozmiarze);
  - jeden wspólny komponent skanu zamiast dwóch kopii.

## 15. Wyszukiwanie: jedno pole na ekran (P1)

- **Problem w repo:** dwa pola wyszukiwania naraz (ogólne w menu i na liście), do tego ogólne otwiera okno. Nie wiadomo, którego użyć.
- **Zasada:** na każdym ekranie jest najwyżej jedno pole wyszukiwania i zawsze zaczyna od miejsca, w którym jesteś (szczegóły w karcie „CommandPalette”).
  - **Ekran z listą** (Magazyn, Spektakle, Notatki): pole nad listą `.rk-find` z chipem zakresu („w: Pracownia rekwizytorska ×”). Wpisywanie filtruje w miejscu, bez okna, i przełącza listę w widok płaski z pełną ścieżką i podkreślonym dopasowaniem. Usunięcie chipu oznacza cały magazyn. Pod wynikami: „N kolejnych wyników poza tym miejscem · Szukaj w całym magazynie”.
  - **Menu boczne:** zamiast pola przycisk „Przejdź do… ⌘K” wyglądający jak pozycja menu. Otwiera paletę poleceń (akcje, przejścia, potem wyniki z całej aplikacji). Na ekranie z listą ⌘K tylko przenosi kursor do pola nad listą.
  - **Telefon:** lupa w górnym wierszu otwiera pełny ekran wyszukiwania z chipem zakresu.
- Ekran przykładowy: płótno, „Magazyn · wyszukiwanie w miejscu”.

## 16. Pozostałe zadania techniczne (P2)

- Wysyłanie zdjęć z kadrowaniem.
- Komponenty React dla ikon nawigacji, ikon rekwizytów i awatarów z design systemu (ścieżki w `icons/rekwizytor-icons.json`).
- Aparat ze skanerem i arkusz wysuwany z dołu są już w design systemie (karta „Skaner”: `.rk-cam`, `.rk-sheet`).

## 17. Kalendarz zamiast „Listy zadań” w menu (P1)

- **Co:** jedno miejsce z terminami (spektakle i próby), z którego wchodzi się do listy zadań danego terminu. Szczegóły w `README.md`, sekcja „Aktualizacja 8 października”.
- **Dlaczego:** lista zadań zawsze należy do konkretnego terminu; osobna pozycja w menu dublowała wejście. Rekwizytor myśli „co jest dziś i co zaraz”, więc lista z osią czasu i kreską „teraz”.
- **Otwarte:** rozróżnienie próba / spektakl w danych; czy próby mogą mieć własną, krótszą listę rekwizytów (np. tylko akt I).

## 18. Ustawienia osobiste i teatru (P2)

- **Co:** ustawienia w jednej kolumnie, z nowymi preferencjami listy (szczegóły wpisu, zwijanie aktów i odhaczonych) i sekcją Teatr dla administratora.
- **Dlaczego:** nowe osoby potrzebują pełnych opisów, doświadczone tylko nazw; jedna aplikacja ma obsłużyć obie grupy bez osobnych trybów.

## 19. Problemy z rzeczami i zamienniki (P1 część, P2 reszta)

- **Stan rzeczy dziś:** status grupy (`groups.status`: na miejscu, do naprawy, wypożyczone, zaginione) da się ustawić tylko z menu „…” w górnym pasku karty grupy, a ten pasek jest tylko na telefonie. Przedmiot w rozpisanej grupie ma listę wyboru (komputer i telefon). Notatki do stanu (`status_note`, np. „odbiór 16:00”) nie da się wpisać nigdzie. Pulpit pokazuje problemy („Blokuje gotowość”, kafelek Magazyn), ale nie ma ich jak ustawić ani zamknąć.
- **Zgłoszenie:** ustawianie stanu tam, gdzie problem widać (wiersz na Pulpicie, plakietka stanu w rozpisce) i w karcie grupy także na komputerze; stan + krótka notatka + opcjonalnie „do kiedy”.
- **Zamknięcie, okno „Co z tym?”:** (1) wróciło / znalazło się / naprawione: na miejscu, notatka czyszczona; (2) kupiono nowe: nowa rzecz zajmuje miejsce starej, rekwizyty w spektaklach przechodzą na nią, stara zostaje w historii; (3) zamiennik z magazynu: rekwizyty tego spektaklu (albo wszystkich) wskazują inną rzecz, oryginał zachowuje swój problem; (4) rezygnujemy: rekwizyt zdjęty z rozpiski albo „pomijamy”.
- **Zamiennik po zdjęciu albo opisie (pomysł Kuby, 11.10):** przy problemie „znajdź podobne”, żeby znaleźć w magazynie coś, co może zastąpić brakującą rzecz. Embeddingi grup i wyszukiwanie hybrydowe po nich są; stara funkcja `match_items` odwołuje się do usuniętej tabeli `items` i jest martwa.
- **Kolejność:** pilotaż: ustawianie stanu, notatka, okno z opcjami 1, 3 (ręczny wybór) i 4. Później: zamiennik po zdjęciu, „kupiono nowe” z przenoszeniem rekwizytów, historia zmian stanu.

## 20. Siła hasła: jedna reguła, twarda długość (P1)

- **Źródło:** test zespołu modeli (reviewer Sonnet + drugi przegląd agy) na `lib/password-strength.ts`, 21 października 2026. Oba przeglądy zgodne co do punktów 1–3.
- **Co:**
  1. Minimalna długość 8 znaków jako **warunek konieczny**, a nie jeden z czterech punktów. Dziś `A1` i osiem spacji przechodzą próg `MIN_PASSWORD_STRENGTH = 2`, a długie hasło z samych małych liter jest odrzucane. Komunikat `meterEmpty` obiecuje „co najmniej 8 znaków”.
  2. Jedna funkcja w `lib/password-strength.ts` dla wszystkich miejsc: `app/[locale]/login/page.tsx` (linie 29–39 i 48) ma własną kopię z progiem `< 2`, a `components/auth/ChangePasswordForm.tsx:35` używa liczby `2` zamiast stałej `MIN_PASSWORD_STRENGTH`.
  3. Polskie litery: `/[A-Z]/` nie łapie `Ą Ć Ę Ł Ń Ó Ś Ź Ż`, a `/[^A-Za-z0-9]/` liczy wszystkie polskie litery jako „znak specjalny”. Użyć flagi `/u` z `\p{Lu}` i `\p{L}`.
  4. Spacje same nie liczą się jako znak specjalny.
  5. Testy funkcji: pusty ciąg, `A1`, osiem spacji, długie małe litery, polskie litery.
- **Do sprawdzenia:** czy Supabase Auth ma po stronie serwera własną minimalną długość (panel poza repo). Zdecyduje, czy sama walidacja po stronie aplikacji wystarcza.
- **Kto:** plan architekta, implementacja `implementator`, drugi przegląd agy (dotyczy uprawnień i bezpieczeństwa).
- **Raporty z testu:** w rozmowie, nie zapisane w `.agent/raporty/`.
