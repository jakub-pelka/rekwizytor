# Brief: pierwsze wejście (scenariusz 7)

Dla projektu w Claude Design. Ekrany mają powstać w design systemie „Rekwizytor” (tokeny, `components/bundle.css`, karty komponentów) i trafić na płótno „Ekrany Rekwizytora”. Kod wdroży je potem z płótna. Stan kodu na 18.10.2026.

## Kto wchodzi

- **Kierownik pracowni nowego teatru.** Komputer w pracowni. Konto zakłada mu superadmin (zaproszenie mailem). Jedna, dwie osoby w pilotażu.
- **Osoba zaproszona do istniejącego teatru.** Rekwizytor, inspicjent, czasem zastępstwo. Najczęściej telefon, w kulisach, w biegu. Teatr ma już spektakle i magazyn.

## Co dziś jest, a czego nie ma

- Jest: zaproszenie mailem → `/auth/confirm` → `/update-password` (stary wygląd, samo hasło). Potem Pulpit.
- Jest: Pulpit „pierwsze uruchomienie” (ekran „Pierwsze-uruchomienie”), gdy teatr nie ma spektaklu i ma pusty magazyn. Lista „Pierwsze kroki 0/3” nie zapisuje postępu.
- Nie ma: kroku „imię i nazwisko” (`profiles.full_name`), wprowadzenia dla osoby w istniejącym teatrze, ekranu zespołu dla kierownika (dziś zaprasza tylko superadmin), kreatora z POMYSLY 9.

## Ekrany do zaprojektowania

### 1. Ustawienie hasła i imię (pierwsze wejście z zaproszenia)

- Wspólny dla obu ścieżek. Komputer i telefon.
- Pola: imię i nazwisko (obowiązkowe, „widoczne dla zespołu przy odhaczeniach i notatkach”), hasło.
- Widać, do jakiego teatru i z jaką rolą ktoś został zaproszony (nazwa teatru, „Rekwizytor” / „Kierownik pracowni” / „Podgląd”).
- Stan: link wygasł (`?link=expired`), z drogą „poproś o nowe zaproszenie”.

### 2. Kreator nowego teatru (kierownik, komputer)

Według POMYSLY 9: pełny ekran bez menu, po lewej postęp w motywie biletu, po prawej jedno pytanie naraz. Każdy krok da się pominąć, postęp zapisuje się na bieżąco, pominięte trafiają do „Dokończ konfigurację” na Pulpicie. Finał: kurtyna podnosi się raz.

Kroki do zaprojektowania (kolejność do potwierdzenia, patrz „Decyzje”):
1. Teatr: nazwa (już jest w bazie), sceny, sezon.
2. Ty: imię (jeśli nie było w ekranie 1).
3. Pierwszy spektakl: tytuł, scena, terminy, „Akty i sceny” albo „Tylko akty”.
4. Rozpiska: z pliku albo ręcznie (może odesłać do istniejącego ekranu Rozpiska).
5. Magazyn: zdjęcie półki albo spis z arkusza (istniejące wejścia).
6. Zespół: zaproszenia z rolą.
7. Etykiety: format arkusza i pierwszy wydruk.

### 3. Wejście osoby do istniejącego teatru (telefon)

Według POMYSLY 9: „w minutę”. Imię, rola, zgoda na aparat, krótkie pokazanie listy zadań i skanu. Bez kreatora teatru. Kończy się na liście zadań najbliższego terminu albo na Pulpicie.

### 4. Zespół dla kierownika (komputer)

Nie jest częścią POMYSLY 9, ale bez niego ścieżka 2 się urywa: kierownik musi móc dodać osobę (e-mail + rola), zmienić rolę, usunąć, zobaczyć „Historię zespołu”. Reguły w bazie są gotowe. Dziś to samo robi superadmin na `/settings/theatres`, co można potraktować jako punkt wyjścia.

### 5. „Dokończ konfigurację” na Pulpicie

Zamiana dzisiejszej listy „Pierwsze kroki 0/3” na listę z prawdziwym postępem (odhaczone kroki, pominięte do dokończenia).

## Decyzje przed projektem

1. **Kolejność:** Pulpit dziś proponuje rekwizyty → spektakl → zespół, POMYSLY 9 spektakl przed magazynem. Co ma być pierwsze?
2. **Sceny teatru:** dziś to tylko napisy zebrane ze spektakli (`lib/venues.ts`). Czy kreator ma zakładać listę scen (zmiana w bazie)?
3. **Sezon:** dziś liczony z daty (`seasonOf`). Ustawiać w kreatorze czy zostawić?
4. **Rola a funkcja:** POMYSLY 9 mówi „imię i rola”. Rola to dziś uprawnienia (kierownik / rekwizytor / podgląd). Czy pytać osobno o funkcję (rekwizytor, inspicjent, garderoba)? Wymaga zmiany w bazie.
5. **Kostiumy:** karta „Zespół” na Pulpicie obiecuje „garderoba kostiumy”, których aplikacja nie ma. Usunąć z tekstu czy to plan?
6. **Kreator obowiązkowy czy z Pulpitu:** pełny ekran przy pierwszym wejściu, czy wejście z karty na Pulpicie?

## Co już jest w systemie i można użyć

EmptyState (pełny, z kurtyną), PageHeader, `.rk-field` / `.rk-input` / `.rk-select`, przyciski z cieniem „Bilet”, perforacja i pasek etapów w motywie biletu, `.st-steps` (lista kroków na Pulpicie), `.rk-sync` (stan zapisu), kurtyna w górze (ruch znaku tylko na start).
