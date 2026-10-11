# Scenariusze UX: komputer w pracowni

Wątek UX (od 9 października 2026): wcielamy się w użytkownika przy konkretnej pracy i poprawiamy to, co tarło. Najpierw komputer (laptop w pracowni), telefon potem. Zmiany funkcjonalne prowadzi drugi wątek, więc cudze zmiany w drzewie bywają celowe.

Zasady: wygląd tylko z `design-system/`, a gdy czegoś brakuje, najpierw dopisujemy to do systemu. Interfejs po polsku. Każdy scenariusz kończy się listą tarć i najmniejszą zmianą, która je usuwa.

## Scenariusze

| # | Scenariusz | Stan |
|---|---|---|
| 1a | Nowy spektakl od zera: dane i akty/sceny | zrobione (9.10), czeka na przeklikanie po zalogowaniu |
| 1b | Wpisywanie rekwizytów do rozpiski (okno, ciągłe dodawanie, dobieranie istniejących) | szybkie wpisywanie zrobione (11.10), czeka na przeklikanie; dobieranie istniejących czeka na decyzje poniżej |
| 2 | Zmiany po próbie: przenoszenie rekwizytu między scenami, usunięcie sceny, dopisanie rekwizytów | zrobione (11.10) na wspólnym ekranie Rozpiska, czeka na przeklikanie z zapisem |
| 3 | Kompletowanie z magazynu: rozpiska zestawiona z magazynem (brakuje, do naprawy, kupić) | do zrobienia |
| 4 | Przyjęcie rzeczy do magazynu: zdjęcie, opis, miejsce, etykiety QR | do zrobienia |
| 5 | Poniedziałek rano: Pulpit i Kalendarz (co gramy, które listy nie są gotowe) | do zrobienia |
| 6 | Przekazanie na papierze: eksport PDF i druk dla inspicjenta albo zastępstwa | do zrobienia |
| 7 | Pierwsze 5 minut nowego teatru: logowanie, pusty pulpit, pierwsze uruchomienie | do zrobienia, ważne dla pilotażu |

Proponowana kolejność: 1b + 2 (ten sam ciąg pracy), potem 7, potem 3–6.

## Zrobione w 1a (9.10)

- Edytor aktów i scen w układzie rozpiski (`ManageScenesForm`), przerwy i przygotowanie poza widokiem, Enter dodaje scenę i zostaje w polu, nazwa zaznacza się przy edycji, „Zapisz i przejdź do spektaklu”.
- Dodawanie spektaklu w dwóch krokach, zapis w tle, od razu akt I ze sceną 1 w edycji. Krok z linkiem do strony teatru ukryty (kod zostaje).
- Formularze danych spektaklu (`CreatePerformanceForm`, `EditPerformanceForm`) w pełnym design systemie: tokeny, `.rk-field`, `.rk-input`, `.rk-select`, `.rk-textarea`, `.rk-poster--lg` (144 px) do podglądu plakatu, usunięte rozmycia i `glassy-*`, kosz z `notify.undo`.
- Menu „Więcej” w spektaklu: edycja alfabetycznie, wydruki z ikonami, „Edytuj terminy” tylko gdy jest termin, „Usuń spektakl…” z „Cofnij”.
- Kosz dostępny z Ustawień (O aplikacji).
- Poprawki numeracji scen: akcje w `app/actions/scenes.ts` przenumerowują sceny razem z rekwizytami (stary kanban potrafił po cichu przenieść rekwizyty do cudzej sceny).

## Zrobione w 1b (11.10)

- Stary ekran „Zarządzaj Rekwizytami” (płaska lista w dwóch kolumnach na zmianę, „Manual List”, „Scan Photo” po angielsku) zastąpiony edytorem `PropsEditor` w układzie rozpiski: przygotowanie, akty i sceny otwarte naraz, pod każdą pole na nazwy.
- Nawyk użytkowników zostaje: wklejona lista (z punktorami albo numeracją) dodaje każdą linię, tylko od razu w scenie. Enter dodaje i zostaje w polu, Enter w pustym polu przechodzi do następnej sceny, Esc kończy.
- Same nazwy; opis, scena, magazyn i obsada w oknie rekwizytu („Opis, scena i magazyn…” w menu wiersza). Usuwanie z „Cofnij”.
- Dawne rekwizyty bez sceny w sekcji „Bez sceny” na górze; przenosi się je na razie przez okno rekwizytu (pole Scena). Szybsze przenoszenie to scenariusz 2.
- Nowy spektakl ma trzeci krok „Rekwizyty” (po scenach „Zapisz i wpisz rekwizyty”, „Pomiń” dalej idzie prosto do spektaklu).
- Okno rekwizytu: „Zapisz i dodaj następny” przy nowym rekwizycie.
- Stary skan zdjęcia przedmiotów usunięty z rozpiski (`components/props/` skasowane). Wczytywanie rozpiski z pliku to POMYSLY 10.
- Poprawki po przeglądzie (11.10): główny przycisk stoi po prawej w nagłówku strony (`.rk-page-header`), obok niego stan zapisu `.rk-sync` (komponent `SaveState`), a przycisk nazywa się „Gotowe” (zapis idzie sam; komunikat tylko, gdy coś się nie zapisało). Podpowiedź klawiszy w polu to `Tooltip` (`.rk-tip`) zamiast stałej linii pod polem. Te same zasady w edytorze scen („Dalej” przy nowym spektaklu).
- Druga runda (11.10): spis sekcji po lewej (`.rk-settings-nav`, układ jak w Ustawieniach, kontener 1184), pole opisu obok nazwy (jedno pole, model dzieli na „jak” i „gdzie”), podpowiedzi istniejących rekwizytów przy nazwie: najpierw z tego spektaklu (kopiuje opis i grupę), potem z magazynu (grupy i rozpisane przedmioty, wiąże `group_id`/`item_id`). Lista podpowiedzi pożycza wiersze palety poleceń (`.rk-cmd__item`) i chip `.rk-find__scope`: **do dopisania do design systemu jako wzorzec „podpowiedzi przy polu”.**
- Trzecia runda (11.10): płynne przewijanie ze spisu (`lib/smooth-scroll.ts`, krzywa `--ease-in-out`, w Próbie czytanej skok); Enter: puste pola → następna scena, sama nazwa → opis, nazwa i opis → dodanie; okno rekwizytu przy edycji startuje w opisie; „Cofnij” po dodaniu (jeden toast na ostatnie dodanie, także wklejoną listę), po zmianie nazwy i po edycji w oknie (przywraca poprzednią wersję wiersza, `revertPerformanceProp`).
- Czwarta runda (11.10): „nie pamiętam nazwy”: podpowiedzi szukają po nazwie, miejscu i opisie (każde słowo musi pasować; nazwa wyżej niż opis), a „Przeglądaj magazyn…” otwiera okno z rzeczami według miejsc i polem zawężania. Kliknięcie poza polem dodawania zamyka je (wpisana nazwa jest dodawana, puste pola znikają).
- **Dalej (C, po pilotażu albo na pilotaż):** opisowe szukanie AI („coś srebrnego do picia”) na `match_items` i embeddingach grup, z badge „AI” i podpisem, dlaczego pasuje. Okno wyboru z magazynu jest do dopisania do design systemu jako wzorzec.
- Wiersz „Obsada” w kolumnie bocznej spektaklu nie prowadzi już do starego ekranu, tylko przełącza na „Wszystkie rekwizyty”.

## Zrobione w 2 (11.10): jeden ekran „Rozpiska”

- Akty, sceny i rekwizyty edytuje się na jednym ekranie (`BreakdownEditor`, adres `/performances/[id]/props`); osobny edytor scen (`ManageScenesForm`) usunięty, `/scenes` przekierowuje. Nowy spektakl ma dwa kroki: Dane spektaklu → Rozpiska (spektakl zapisuje się przed przejściem, plakat w tle).
- Przeciąganie za uchwyt: rekwizyt w obrębie sceny i do innej sceny / całego aktu / „Bez sceny”; scena w obrębie aktu i do innego aktu (razem z rekwizytami). Pusty cel pokazuje `.rk-inv-drop`.
- Menu: rekwizyt „Przenieś do…” (okno z listą scen, dla klawiatury), scena „Przenieś do aktu…”, „Usuń scenę…” (nasze okno potwierdzenia, „Cofnij” przywraca scenę na miejsce z rekwizytami), akt „Przesuń wyżej/niżej”, „Usuń akt…” (potwierdzenie). Pod aktem „Dodaj scenę” (ciągłe wpisywanie), na końcu „Dodaj akt”.
- Serwer: rekwizyty wskazują scenę jej id (`PropTarget`), bo numery scen zmieniają się przy przestawianiu; nowe akcje `movePerformanceProp`, `swapActs`, `restoreScene`.
- Znane: upuszczenie na górną krawędź sceny stawia element za nią (zachowanie dnd-kit); uchwyty rekwizytów nachodzą na pionową linię listy (do sprawdzenia z design systemem).

## Decyzje do podjęcia (1b)

Dobieranie istniejącego rekwizytu przy „Dodaj rekwizyt” (dziś zawsze powstaje nowy):

1. Wygląd listy podpowiedzi pod polem nazwy. Design system takiej listy nie ma. Pożyczyć wiersze z palety poleceń czy najpierw dopisać wzorzec do systemu?
2. Ten sam rekwizyt w kilku scenach: osobne wpisy (jak dziś) czy jeden rekwizyt przypięty do kilku scen (zmiana modelu danych, temat dla drugiego wątku)?
3. Zakres podpowiedzi: ten spektakl i magazyn, czy także inne spektakle?

Pytanie dodatkowe: czy po Enterze w oknie rekwizytu ma się otwierać następne puste okno, tak jak przy scenach?

## Do sprawdzenia i znane niedorobki

- **Przeklikać po zalogowaniu** (nie było przeglądarki): zapis spektaklu w tle, Enter w polach pierwszego kroku, Enter przy ostatniej scenie, „Dodaj akt” z wpisaną nazwą, przeciąganie i „Przenieś do aktu”, usuwanie sceny i aktu, „Usuń spektakl” i „Cofnij”.
- Odświeżenie strony w drugim kroku dodawania spektaklu pokazuje pusty formularz pierwszego kroku (spektakl jest już zapisany i widać go na liście).
- Okno „Wczytaj ze zdjęcia rozpiski” (`SceneImportWizard`) wciąż po angielsku i w starym wyglądzie („Import Scenes with AI”).
- Strona kosza (`/trash`) w starym wyglądzie.
- Nowy spektakl pokazuje sekcję „Przygotowanie” z wierszem o tej samej nazwie: drobne powtórzenie.
- Rekwizyty przypisane do scen po dawnym przeciąganiu w kanbanie mogą być w złych scenach: warto sprawdzić prawdziwe spektakle.
- Zasady z edytora scen do przeniesienia na inne tablice (`GroupKanbanManager`, porządkowanie magazynu, lista rekwizytów): ciągłe wpisywanie, zaznaczanie tekstu przy edycji, „Zapisz i…” zamiast „Gotowe” ze strzałką w lewo, nazwy pozycji menu z czasownikiem, jedna główna akcja bez dublowania w menu.

## Notatki z przeglądu (uzupełniać)

_Tu dopisujemy niedorobki graficzne i inne tarcia, które wychodzą przy kolejnych scenariuszach._
