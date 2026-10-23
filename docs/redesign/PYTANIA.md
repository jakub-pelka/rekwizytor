# Rekwizytor: decyzje o zamyśle aplikacji (22.10.2026)

Odpowiedzi Kuby na pytania zebrane z `POMYSLY.md`, `README.md`, `SCENARIUSZE-UX.md`, `BRIEF-PIERWSZE-WEJSCIE.md` i `docs/TEATRY.md` oraz na pytania, które wcześniej nie padły. Ten plik ma pierwszeństwo przed „Otwarte” w tamtych plikach, jeśli coś się kłóci.

## A. Pilotaż

1. **Etykiety:** arkusze A4 na zwykłej drukarce, domyślny format „rekwizyt” (48,5 × 25,4 mm, 44 na arkuszu). Etykieciarka później.
2. **Ekran `/witaj`:** ten sam układ co logowanie. Lewa strona z kurtyną i logo bez zmian. Prawa: mail, kto zaprosił, do jakiego teatru i pole na kod. Po kodzie osoba przechodzi do rejestracji (imię, hasło).
   - **Kod nie idzie mailem.** Kierownik przekazuje go własnym kanałem (SMS, Messenger, osobny mail). Dwie ścieżki są celowo rozdzielone: gdy zaproszenie pójdzie na zły adres albo z literówką, nie przepadają naraz link i kod, a ręczne przekazanie wymusza sprawdzoną drogę.
3. **Uprawnienia:** kierownik i rekwizytor zmieniają rozpiskę i magazyn. Podgląd tylko czyta.
4. **Inspicjent:** osobna rola „Inspicjent”, na razie tylko podgląd (śledzi spektakl, nic nie zmienia). Przełączanie scen przez inspicjenta nie jest potrzebne na pilotaż.
5. **Dane:** pilotaż na tej samej bazie, osobny teatr. Regulamin wersji testowej i zgoda na wysyłanie zdjęć do AI gotowe przed startem.
6. **Sukces pilotażu:** teatr po demo chce dalej korzystać. Liczy się to, co widać w demo, a nie domknięcie wszystkich funkcji.

## B. Magazyn i rzeczy

7. **Wpis a przedmiot:** wpis w rozpisce mówi, jaki przedmiot jest w scenie. Przedmiot to jedna fizyczna rzecz i może grać w wielu scenach. Ten sam przedmiot w kilku scenach to osobne wpisy wskazujące tę samą rzecz.
8. **Ta sama rzecz w dwóch terminach:**
   - ten sam tytuł (Wesele 15:00 i Wesele 17:00): bez ostrzeżenia, rekwizytorzy to wiedzą;
   - różne tytuły blisko siebie, np. do 2 h (Wesele 15:00, Chłopi 17:00): łagodna informacja, bo to rzadkie i może być pomyłką;
   - różne tytuły w tym samym czasie albo zaraz po sobie (Wesele 15:00, Chłopi 15:20): wyraźne ostrzeżenie, bo to pomyłka przy wpisie albo problem logistyczny do rozwiązania przed spektaklami.
9. **Rzeczy zużywalne:** dodatkowe oznaczenie przedmiotów, które zużywają się naturalnie (jedzenie, papierosy, krew). Można je wprowadzić jako status. Na pilotaż tylko oznaczenie, bez liczenia, ile trzeba dokupić (nie wiemy jeszcze, ile się zużywa na spektakl).
10. **Wypożyczenie:** zwykła notatka wystarczy.
11. **Wyjazd:** miejsce „W trasie” na czas wyjazdu, powrót skanem.
12. **Archiwum spektakli:** zdjęty spektakl trafia do archiwum. Spektakle wracają nawet po latach, a rzeczy bywają zmieniane, więc potrzebne jest „przywróć do bieżącego sezonu”: kopia rozpiski, którą można edytować bez zmiany zapisu archiwalnego.

## C. Spektakl i lista zadań

13. **Preferencje aktora:** wyjątek przypięty do pary rola i obsada. Bez bazy aktorów.
14. **Próby:** termin próby może obejmować wybrane akty i tylko potrzebne rekwizyty. Przykład: notatnik można udawać, ciężką gitarę trzeba przynieść, żeby aktor wiedział, jak się z nią zachowywać. Nie każemy oznaczać z góry, co jest potrzebne na próbę (na to nie ma czasu, może później, gdy teatr przekona się do systemu). Zamiast tego: gdy na liście odhaczono mniej niż ok. 60% przedmiotów, Pulpit pyta, czy to był spektakl czy próba, i proponuje zapisać taką rozpiskę na próby. Tak wyjdzie, kto używa zwykłej listy na próbach. Po pilotażu.
15. **Start trybu na żywo:** włącza się sam o godzinie spektaklu. Na wypadek opóźnienia jest cichy przycisk „Zaczynamy”. Na czas pilotażu przycisk widzą wszyscy, nie tylko inspicjent.
16. **Dwie osoby odhaczają to samo bez sieci:** wygrywa „odhaczone”, w historii obie osoby. Rzadkie, bo odpowiedzialność dzieli się między ludzi.
17. **Zwrot po spektaklu:** etap można pominąć. Rano Pulpit pokazuje „Niezwrócone po wczoraj”.

## D. Pierwsze wejście

18. **Kolejność konfiguracji:** najpierw spektakl i rozpiska, potem magazyn.
19. **Sceny teatru:** lista w bazie. Zwykle dwie (mała i duża), można dodać do 6.
20. **Sezon:** liczony z daty.
21. **Funkcja osoby:** nie pytamy (rola wystarczy).
22. **Kreator nowego teatru:** uruchamiany z Pulpitu, po pilotażu.

## E. Zakres produktu

23. **Kostiumy:** usunąć z tekstu na Pulpicie. Pomysł zostaje na przyszłość.
24. **Angielski:** zamrożony. Na czas pilotażu tylko polski.
25. **Powiadomienia:** brak na pilotaż.
26. **Telefon w pilotażu:** lista zadań, tryb na żywo i skan. Reszta na komputerze.
27. **Koszt AI:** limit 3 $ na teatr, z powiadomieniem na Pulpicie przy 70%, żeby nie było zaskoczenia.

## F. Drobne

28. **Podpowiedzi przy polu nazwy:** dopisać jako wzorzec do design systemu.
29. **Tabela `scene_tasks`:** usunąć osobną migracją, po sprawdzeniu, czy są w niej dane.
30. **Konto testowe** `rekwizytorka.test@example.com`: zostaje na razie, przyda się do testów.

## Wciąż otwarte

Nic. Wszystkie pytania z 22.10 mają odpowiedź.
