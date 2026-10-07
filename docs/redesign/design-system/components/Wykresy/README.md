Kolory i formy wykresów na pulpicie i w statystykach. Paleta przeszła walidację czytelności dla daltonistów (OKLab, symulacja protanopii i deuteranopii) i kontrastu, osobno w obu motywach. Pełne przykłady: strona „Paleta wykresów”.

- **Pulpit to dom, nie raport**: duże liczby, paski gotowości i stan magazynu. Pełne wykresy są na stronie Statystyki; część można przypiąć do pulpitu.
- **Domyślnie jeden kolor**: skala kurtyny `chart-seq-100…700`. Słupki i linie jednej serii: 600 w jasnym motywie, 500 w ciemnym. 100–300 na tła i heatmapy.
- **Wyróżnienie**: to, o czym jest wykres, w kurtynie, kontekst (poprzedni sezon, pozostałe spektakle) w `chart-context`.
- **Serie**: `chart-1…6` w stałej kolejności (bordo, granat, miedź, morski, śliwka, zieleń), tylko gdy trzeba odróżnić kilka rzeczy. Siódma i kolejne → „Inne”. Kolor należy do serii, filtr go nie zmienia. Przy 2+ seriach zawsze legenda; do 4 serii także podpisy na końcach.
- **Statusy** (`success`, `info`, `warning`, `danger`) tylko dla stanów (na miejscu, w spektaklu, wypożyczone/do naprawy, zaginione), zawsze z ikoną i słowem; nigdy jako zwykła seria.
- **Tekst nigdy w kolorze serii**: kolor niesie znacznik obok (kwadracik, kropka, linia).
- **Kształt**: jedna oś (nigdy dwie skale), słupki do 24 px z zaokrąglonym końcem 4 px, przerwa 2 px między stykającymi się elementami, linie 2 px, kropki 8 px z obwódką w kolorze tła, siatka `chart-grid` 1 px ciągła.
- **Interakcja**: dymek z wartością po najechaniu na każdy element; każdy wykres ma widok tabeli.
- **Druk czarno-biały**: kreskowanie pod 45° i 135° oraz podpisy.
