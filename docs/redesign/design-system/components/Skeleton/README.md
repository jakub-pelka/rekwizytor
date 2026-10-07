Szkielet treści w miejscu, w którym zaraz pojawi się lista albo karta. Część interfejsu, a nie osobny wskaźnik.

- Kształty odwzorowują prawdziwy układ (tu: karta rekwizytu), w kolorze `surface-raised`, `radius-sm`.
- **Premiera:** po szkielecie przesuwa się światło jak snop reflektora (1,4 s).
- **Próba czytana:** szkielet „oddycha” skokowo między dwiema jasnościami (1,6 s). Nigdy nie stoi.
- Kontener ma `aria-busy="true"` i opis, co się wczytuje.
- Pokazuj go dopiero po ok. 300 ms czekania, żeby nie mrugał przy szybkich odpowiedziach.
