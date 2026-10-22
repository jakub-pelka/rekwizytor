# Przegląd kodu w Rekwizytorze

Dla każdego, kto przegląda zmianę: agenta, `/code-review`, agy albo człowieka. Zasady pracy i poziomy ryzyka: `docs/redesign/PLAN-PRACY.md`.

## Co tu jest porażką

Szukaj najpierw tego:

- **Wyciek między teatrami:** dane jednego teatru widać w innym. Brak `theatre_id` w zapytaniu albo w regule RLS, klucz serwisowy bez teatru.
- **Zgubiony zapis:** odhaczenie albo zmiana ginie bez sieci, po odświeżeniu albo przy dwóch osobach naraz.
- **Nieodwracalna akcja:** usuwanie bez „Cofnij” albo bez potwierdzenia.
- **Koszt bez limitu:** wywołanie AI, które omija liczenie kosztu teatru.
- **Zły język:** tekst po angielsku albo technicznym językiem zamiast języka pracowni.
- **Wygląd spoza design systemu:** kolor, odstęp, font albo komponent wpisany na sztywno zamiast z `docs/redesign/design-system/`.

## Jak zgłaszać

- Zacznij od liczby uwag. Gdy nic nie ma, napisz to wprost.
- Każda uwaga ma plik i linię jako dowód, nie domysł z nazwy.
- Oznacz każdą: **Ważne**, **Drobne** albo **Istniejące** (było przed tą zmianą, nie obciąża autora).
- Najwyżej 3 drobne uwagi na przegląd.
- Bez uwag o samym stylu kodu: tym zajmuje się lint.

## Pomijaj

- `types/supabase.ts` (generowany).
- `docs/redesign/ekrany/` i `docs/redesign/design-system/` przy przeglądzie kodu aplikacji (to źródła wyglądu, nie kod).
- `node_modules/`, `.next/`, `ollama_data/`, `wandb/`.

## Zawsze człowiek

Te miejsca przegląda i zatwierdza Kuba, niezależnie od wyniku przeglądu automatycznego:

- `supabase/migrations/` i reguły RLS;
- logowanie, zaproszenia i kody (`app/actions/invite-entry.ts`, `lib/invite-code.ts`, `proxy.ts`);
- liczenie i limit kosztów AI;
- wszystko, co usuwa dane.
