Etykiety drukowane z kodem QR, zawsze czarne na białym, niezależnie od motywu. **Na etykiecie jest tylko to, co się nie zmienia**: numer, nazwa, kod QR i znak. Lokalizacja, stan i spektakl żyją w aplikacji: kod QR otwiera aktualne dane, więc etykieta nie starzeje się przy pierwszym przeniesieniu.

| Etykieta | Rozmiar (gotowe arkusze A4) | Co na niej jest |
|---|---|---|
| Rekwizyt (`.rk-lbl--item`) | 48,5 × 25,4 mm, 44 na arkusz | numer (największy), nazwa do 2 linii, znak, QR 21 mm |
| Mini (`--mini`) | 38,1 × 21,2 mm, 65 na arkusz | numer i QR 16 mm, czytany z bliska; zamiast napisu „Rekwizytor” sam znak, tuż pod numerem; numer i znak tworzą jedną grupę na środku wysokości, z dala od krawędzi |
| Flaga (`--flag`) | 70 × 25,4 mm, 33 na arkusz | owijana wokół nitki: z jednej strony numer i nazwa, z drugiej QR 21 mm |
| Grupa (`--group`) | 105 × 57 mm, 10 na arkusz | rodzaj grupy, nazwa w Boldonse, numer, znak, QR 32 mm |
| Miejsce (`--place`) | 105 × 57 mm, 10 na arkusz | czarny pas „Miejsce w magazynie”, nazwa miejsca maszynopisem, podmiejsce, numer, QR 32 mm |

**Bez wycinania**: rozmiary odpowiadają gotowym arkuszom samoprzylepnym, więc etykiety drukuje się na zwykłej drukarce i odkleja. Format arkusza sprawdź przy zakupie, a w aplikacji wybierz go przy drukowaniu.

**Jak przyczepić**:

- twarde powierzchnie (meble, kielichy, broń): etykieta rekwizytu od spodu albo od wewnątrz, poza wzrokiem widza;
- tkaniny, antyki, małe przedmioty: flaga na nitce, sznurku albo opasce, nic nie klei się do przedmiotu;
- bardzo małe przedmioty: mini albo flaga;
- rzeczy zużywalne (jedzenie, świece, papierosy): etykieta na pudełku, czyli grupie.

- **Przeniesienie** to dwa skany: najpierw rekwizyt albo grupa, potem etykieta miejsca. Etykiet przedmiotów nie drukuje się wtedy ponownie.
- Numery mają prefiks według rodzaju: `REK-` rekwizyt, `GRP-` grupa, `MSC-` miejsce.
- Druk: QR co najmniej 20 mm boku z marginesem 2 mm (wyjątek: mini, 16 mm, do skanowania z bliska), tekst co najmniej 7 pt, tylko czerń (bez szarości, które drukarka termiczna gubi). Przerywana ramka w podglądzie to krawędź etykiety na arkuszu, nie linia cięcia.
- Nazwy dłuższe niż 2 linie skracamy wielokropkiem; pełna nazwa jest w aplikacji.
- Wymiary w CSS liczymy przez zmienną `--mm`, więc ta sama etykieta służy do podglądu i do wydruku.
