# Porządki w repo: audyt (etap 1)

Rola: architekt. Data: 2026-10-22. Branch: `claude/inspiring-villani-d5f40d`.
Nic nie zostało usunięte. Raport czeka na decyzję Kuby.

## Najpierw: trzy sprawy bezpieczeństwa

Repo `jakub-pelka/rekwizytor` na GitHubie jest **publiczne** (sprawdzone przez `gh repo view`).

1. **Prywatny klucz SSH w gicie.** `ollama_data/id_ed25519` to `OPENSSH PRIVATE KEY` (klucz tożsamości Ollamy), dodany w commicie `2d51f8d`. Wpis `ollama_data/` w `.gitignore` nic nie dał, bo plik był już śledzony.
   - Usunięcie pliku **nie** czyści historii. Klucz trzeba uznać za ujawniony.
   - Zalecam: jeśli ten klucz był podpięty do konta na ollama.com, usuń go tam i wygeneruj nowy. Jeśli nie był nigdzie używany, wystarczy usunąć plik.
   - Czyszczenie historii (`git filter-repo`) to osobna decyzja: zmienia historię, wymaga force-pusha i psuje cudze klony. Przy kluczu, który da się po prostu unieważnić, nie polecam.
2. **E-mail i ścieżki w logach W&B.** `wandb/` zawiera 42 pliki metadanych z `kubapelka12@gmail.com`, nazwą komputera `Kubas-MacBook-Air.local` i ścieżkami domowymi. Ryzyko niskie (to Twój adres), ale publiczne.
3. **Eksporty danych są czyste.** W `test_data_export*.json`, `keyword-count-results.json`, `groups.json`, `query_analysis.txt`, `migration_*` nie ma e-maili, telefonów ani kluczy API. Są nazwy grup rekwizytów i spektakli (np. „MISJA: ROZRYWKA! 29.GALA SYLWESTROWA NA BIS”) i wektory embeddingów. To dane jednego teatru, nie osobowe. Skan całego repo i historii pod klucze Gemini, OpenAI i Supabase (`AIza…`, `sk-…`, `sb_secret_…`, JWT) nic nie znalazł. Pliki `.env` nigdy nie trafiły do gita.

## Ważne ustalenia przed tabelą

- **Embeddingi nadal żyją w aplikacji.** `app/actions/unified-search.ts`, `utils/embeddings.ts`, `utils/gemini.ts` i akcje `generate-*-embeddings.ts` używają Gemini. Do usunięcia są **eksperymenty** (PocketBase, W&B, porównywanie modeli), a nie sama wyszukiwarka.
- **`next build` sprawdza typy w każdym `*.ts` w repo** (`tsconfig.json`: `"include": ["**/*.ts", ...]`). Martwe skrypty w `scripts/` i w roocie są więc kompilowane przy każdym wdrożeniu. Usunięcie ich zmniejsza ryzyko, że stary skrypt kiedyś zablokuje build.
- **Brak CI w repo.** Nie ma `.github/`. `vercel.json` ma tylko dwa crony (`/api/cron/refresh`, `/api/cron/keep-alive`), żadnych odwołań do kandydatów.
- **PocketBase w kodzie aplikacji:** `lib/pocketbase/client.ts` i `app/actions/embedding-tests-cleanup.ts`. Akcji nikt nie importuje, więc to martwy kod. Zgodnie z briefem zostawiam to na etap „martwy kod w `app/`”. Do tego czasu zależność `pocketbase` w `package.json` musi zostać.
- **Zależność `wandb` w `package.json` nie jest nigdzie importowana.** Można ją usunąć razem z W&B (zmiana `package.json` i `package-lock.json`).
- `.agent/SECURITY_CHECKLIST.md` i `PUBLICATION_SUMMARY.md` z publikacji repo w styczniu dopisały wpisy do `.gitignore`, ale nie zdjęły plików ze śledzenia (`git rm --cached`). Stąd klucz i `wandb/` w publicznym repo.

## Tabela

Legenda propozycji: **usuń** (z gita i dysku), **zostaw**, **do decyzji**. „Archiwum” proponuję tylko tam, gdzie treść ma wartość historyczną. Historia gita i tak zachowuje wszystko, więc osobnego folderu archiwum nie zakładam bez Twojej zgody.

### Root

| Ścieżka | Co to jest | Czy używane (dowód) | Propozycja |
|---|---|---|---|
| `migration_chunk_aa`…`ae` (5 plików, ~1,3 MB) | `UPDATE groups SET embedding_identity = '[…]'`: jednorazowa migracja wektorów pocięta na kawałki | Brak odwołań w całym repo | usuń |
| `migration_vectors.sql` (1,3 MB) | To samo w jednym pliku | Tylko jako wynik `scripts/generate-migration-sql.ts` i wejście `scripts/execute-migration-from-file.ts` (oba martwe) oraz wzmianki w `.agent/` | usuń |
| `.supabase_temp_migration.sql` | Mapy lokacji: kolumny `map_image_url`, `pins_data`, bucket `location-maps` | Brak odwołań. Ta sama treść jest w `supabase/migrations/20250102_room_mapping.sql` | usuń |
| `test_data_export.json` (1,9 MB) | Eksport 10 przebiegów testów embeddingów z lokalnego PocketBase (styczeń 2026) | Wynik `scripts/export_to_json.py`. Już w `.gitignore` (`test_data_export*.json`), ale śledzony | usuń |
| `test_data_export_compact.json` (1,1 MB) | Skrócona wersja powyższego | jw. | usuń |
| `keyword-count-results.json` | Wynik eksperymentu z liczbą słów kluczowych | Zapisywany przez `scripts/test-keyword-granular.ts` (martwy) | usuń |
| `query_analysis.txt` | Raport porównania zapytań z testu embeddingów | Zapisywany przez `scripts/analyze_test_queries.py` (martwy) | usuń |
| `groups.json` | Lista id i nazw grup | Czytany tylko przez `scripts/generate-migration-sql.ts` (martwy) | usuń |
| `check-models.ts` | Wypisuje dostępne modele Gemini | Brak odwołań. Kompilowany przy buildzie | usuń |
| `test-embedding.ts` | Ręczny test `generateEmbedding` | Brak odwołań. Kompilowany przy buildzie | usuń |
| `get_open_issues.py` | Pusty szkic skryptu (same komentarze) | Brak odwołań | usuń |
| `PROJECT_SUMMARY.md` | Opis funkcji sprzed redesignu (dark mode `#1a1a1a`, Framer Motion) | Link w `README.md:74` | do decyzji: treść nieaktualna wobec redesignu. Proponuję usunąć i zdjąć link z README |
| `EMBEDDING_TESTS_SETUP.md` | Quick start PocketBase w Dockerze | W `.gitignore`, a mimo to śledzony. Linkuje do nieistniejącego `TESTING.md` | usuń |
| `docker-compose.yml` | Kontener PocketBase do testów embeddingów | Używany tylko przez `scripts/test-env-*.sh` (martwe) | usuń |
| `.dockerignore` | Wykluczenia dla Dockera | Bez `docker-compose.yml` i bez `Dockerfile` niepotrzebny | usuń |
| `sonar-project.properties` | Konfiguracja SonarCloud | Brak CI. Odwołuje się do nieistniejącego `middleware.ts` | do decyzji: czy SonarCloud jest jeszcze podpięty do repo? Jeśli nie, usuń |
| `README.md` | Opis projektu | Linkuje do `PROJECT_SUMMARY.md`, `POCKETBASE_MIGRATION.md`, `EMBEDDING_TESTING.md`, odznaki SonarCloud | zostaw, poprawić linki po usunięciach |

### `wandb/` i `ollama_data/`

| Ścieżka | Co to jest | Czy używane (dowód) | Propozycja |
|---|---|---|---|
| `wandb/` (414 plików, 1,6 MB) | Logi przebiegów Weights & Biases ze skryptów `export_to_wandb.py` i `test_ai_insights.py` | W `.gitignore`, ale śledzony. Kod aplikacji go nie czyta. Zawiera Twój e-mail | usuń |
| `ollama_data/id_ed25519` | **Prywatny klucz SSH** | Nic go nie czyta. W `.gitignore`, ale śledzony | usuń + unieważnij klucz (patrz wyżej) |
| `ollama_data/id_ed25519.pub` | Klucz publiczny do powyższego | jw. | usuń |
| zależność `wandb` w `package.json` | Pakiet npm W&B | Brak importów w całym repo | usuń |
| zależność `pocketbase` w `package.json` | Klient PocketBase | Importowany w `lib/pocketbase/client.ts` | zostaw do etapu „martwy kod w `app/`” |

### `scripts/` (59 plików)

**Zostaw (4):**

| Ścieżka | Co to jest | Dowód |
|---|---|---|
| `scripts/sync-design-system.mjs` | Synchronizacja design systemu | `npm run ds:sync`, generuje `styles/rk/*`, `components/rk/*` |
| `scripts/seed-demo-wesele.mjs` | Dane demo „Wesele” do redesignu | Zmieniony 2026-10-14, część redesignu |
| `scripts/seed-demo-wesele-storage.mjs` | Zdjęcia do demo „Wesele” | jw., wywołuje poprzedni |
| `scripts/export-from-supabase.ts` | Eksport danych z Supabase | do decyzji: służył migracji do PocketBase (`npm run export:supabase`). Jeśli nie potrzebujesz eksportu, usuń |

**Usuń: eksperymenty PocketBase / W&B / porównywanie embeddingów (33).** Wszystkie zmienione ostatnio w styczniu 2026. Części używają wpisy w `package.json`, które też do usunięcia: `import:pocketbase`, `test:compare`, `test:clean-db`, `test:create-tables`, `test:start`, `test:stop`, `test:clean`, `test:setup`, `test:seed`, `test:reset`, `test:init`.

`add-columns-direct.sh`, `analyze_test_queries.py`, `check-small-runs.ts`, `check_embedding_coverage.py`, `clean-pocketbase.ts`, `cleanup-orphaned-results.mjs`, `compare-embeddings.ts`, `create-pocketbase-tables.sh`, `create-pocketbase-tables.ts`, `debug-pocketbase.ts`, `debug-tests-queue.ts`, `delete-small-runs.ts`, `export_full_data.py`, `export_full_data_clean.py`, `export_to_json.py`, `export_to_wandb.py`, `fix-groups-schema.ts`, `generate_comparison_report.py`, `import-to-pocketbase.ts`, `pocketbase-helper.ts`, `recreate-groups.ts`, `test-env-clean.sh`, `test-env-start.sh`, `test-env-stop.sh`, `test-pb-connection.ts`, `test_ai_insights.py`, `update-intent-test-data-schema.ts`, `test-critical-queries.ts`, `test-embedding-boost.ts`, `test-embedding-logic.ts`, `test-enrichment.ts`, `test-keyword-count.ts`, `test-keyword-granular.ts`.

**Usuń: jednorazowe testy wyszukiwania i diagnostyka (10).** Bez odwołań, ostatnia zmiana styczeń 2026: `test-mv-search.ts`, `test-new-enrichment.ts`, `test-single-migration.ts`, `test-user-case.ts`, `test-verb-search.ts`, `debug-embeddings.ts`, `diagnose-embeddings.ts`, `search-quality-analysis.ts`, `check-embeddings.js`, `debug-db.js`.

**Do decyzji: jednorazowe migracje danych (12).** Bez odwołań. Każda zrobiła już swoje na produkcji, ale mogą służyć za wzór przy podobnej migracji. Historia gita je zachowa.

| Ścieżka | Co robił |
|---|---|
| `generate-migration-sql.ts`, `execute-migration-from-file.ts` | Generowanie i wykonanie `migration_vectors.sql` |
| `migrate-multi-vector.ts`, `migrate-embeddings-to-multimodel.js`, `run-embedding-migration.js` | Migracje struktury embeddingów |
| `backfill-short-ids.ts` | Uzupełnienie krótkich id (grudzień 2025) |
| `backfill-intermission-scenes.ts`, `add-preparation-scenes.ts`, `migrate-legacy-scenes-to-prep.ts` | Migracje scen (luty 2026) |
| `fix-profile.ts` | Naprawa jednego profilu (`inspector@theater.com`) |
| `fetch-db-names.js`, `check-checklist-items.js` | Podgląd danych w bazie |

Moja rekomendacja: usuń wszystkie 12. Pilotaż w teatrach i tak przyniesie nowe migracje w `supabase/migrations/`.

### `docs/`

| Ścieżka | Co to jest | Czy używane (dowód) | Propozycja |
|---|---|---|---|
| `docs/POCKETBASE_ENV.md` | Zmienne PocketBase | Tylko wzmianka w `.agent/MARKDOWN_CLEANUP_PLAN.md` | usuń |
| `docs/POCKETBASE_MIGRATION.md` | Migracja Supabase → PocketBase | Link w `README.md:75` | usuń + zdjąć link |
| `docs/EMBEDDING_TESTING.md` | Środowisko testowe PocketBase | Link w `README.md:76` | usuń + zdjąć link |
| `docs/TESTING_ARCHITECTURE.md` | Architektura testów embeddingów | Tylko `.agent/` | usuń |
| `docs/ANALYSIS_TOOLS.md` | Narzędzia analizy wyników embeddingów | Tylko `.agent/` | usuń |
| `docs/WANDB_EXPORT.md`, `docs/WANDB_SETUP.md` | Konfiguracja W&B | Tylko `.agent/` | usuń |
| `docs/INTENT_LOGGING.md` | Logowanie klasyfikacji intencji, „wyłączone w trakcie rozwoju” | Tylko `.agent/` | do decyzji: sprawdzę w etapie 2, czy kod intencji jeszcze istnieje. Jeśli nie, usuń |
| `docs/ENV_VARIABLES.md` | Przewodnik po zmiennych środowiskowych | Link w `README.md:77` | zostaw (do odświeżenia w osobnym zadaniu) |
| `docs/PERFORMANCE_REFRESH_CRON.md` | Cron odświeżania terminów | Odpowiada `vercel.json` (`/api/cron/refresh`) | zostaw |
| `docs/TEATRY.md` | Wielodostępność | Linkowany z kodu i migracji | zostaw |
| `docs/email_templates.md` | Szablony maili Supabase w starym stylu (dark mode) | Tylko `.agent/` | do decyzji: zostaw do czasu nowych szablonów z redesignu albo usuń |
| `docs/redesign/` | Redesign | Poza zakresem | nie ruszam |

### `.agent/`

| Ścieżka | Co to jest | Czy używane (dowód) | Propozycja |
|---|---|---|---|
| `SONARCLOUD_CHECKLIST.md`, `sonarcloud-quick-reference.md`, `sonarcloud-setup-guide.md`, `sonarcloud-vs-codacy.md` | Konfiguracja SonarCloud (styczeń 2026) | Tylko wzajemne odwołania | usuń (razem z decyzją o `sonar-project.properties`) |
| `CONTINUE_REFACTOR_PROMPT.md`, `QUICK_START.md`, `README_REFACTOR.md`, `EXAMPLES.md` | Prompty refaktoringu SonarCloud „po resecie API 18:00” (marzec 2026) | Tylko wzajemne odwołania | usuń |
| `code-quality-analysis.md` | Analiza jakości kodu (styczeń 2026) | Brak | usuń |
| `MARKDOWN_CLEANUP_PLAN.md` | Stary plan porządków w Markdownie | Brak | usuń (zastępuje go ten raport) |
| `PUBLICATION_SUMMARY.md`, `SECURITY_CHECKLIST.md` | Publikacja repo (styczeń 2026) | Brak | usuń |
| `ai-integration-plan.md` | Plan AI z listopada 2024, „do implementacji” | Brak | usuń (plan nieaktualny, wyszukiwarka już działa) |
| `MANUAL_STEPS_REQUIRED.md` | Kroki ręczne dla trybu tylko do odczytu | Migracja jest w repo: `supabase/migrations/20260320_enable_public_read_only.sql` | do decyzji: usuń, jeśli migracja jest na produkcji (nie sprawdzałem bazy) |
| `time_tracking.csv` | Jeden wpis czasu pracy z 2026-03-20 | Brak | do decyzji |
| `future-features.md` (751 linii) | Backlog pomysłów, zmieniony 2026-10-07 | Żywy dokument | zostaw. Według Twoich globalnych zasad backlog to `02_future_features.md` w roocie (Triada), ale tego pliku nie ma w repo. Przeniesienie to osobna decyzja |
| `.agent/raporty/` | Raporty zespołu | Nowy | zostaw |

## Co jeszcze dopiszę do `.gitignore` w etapie 2

Już są: `wandb/`, `ollama_data/`, `test_data_export*.json`, `EMBEDDING_TESTS_SETUP.md`, `pocketbase_data/`.
Dopiszę: `migration_chunk_*`, `migration_vectors.sql`, `.supabase_temp_*`, `keyword-count-results.json`, `query_analysis.txt`. Usunę martwy blok „learning & notes”, jeśli usuniemy `EMBEDDING_TESTS_SETUP.md`.

## Plan etapu 2 (po decyzji)

Jedna grupa na commit:
1. `ollama_data/` (klucz) – osobno, żeby łatwo go było znaleźć.
2. `wandb/` + zależność `wandb`.
3. Pliki danych i migracji w roocie.
4. Skrypty PocketBase/W&B + wpisy w `package.json` + `docker-compose.yml`, `.dockerignore`, `EMBEDDING_TESTS_SETUP.md`.
5. Pozostałe skrypty jednorazowe (według decyzji).
6. Dokumentacja w `docs/` + poprawki linków w `README.md`.
7. `.agent/` (według decyzji).
8. `.gitignore`.

Potem `npm run build`, `npm run lint`, `npm test` i raport wyników.

## Co zrobiono, czego nie, co niepewne

- **Zrobiono:** przegląd odwołań (`git grep` po całym repo bez `wandb/` i lockfile), `package.json`, `vercel.json`, `docker-compose.yml`, `tsconfig.json`, skan sekretów i danych osobowych w plikach i historii.
- **Nie zrobiono:** nie sprawdzałem bazy produkcyjnej (np. czy migracja z `MANUAL_STEPS_REQUIRED.md` jest zastosowana) ani ustawień SonarCloud i Ollamy na kontach zewnętrznych.
- **Niepewne:** czy klucz z `ollama_data/` był gdziekolwiek zarejestrowany. Plik `docs/zespol/ZESPOL.md` nie istnieje w tym worktree. Czytałem go z worktree `zmiany-po-updacie-d96f2f`, gdzie nie jest jeszcze zacommitowany.

---

# Etap 2: wykonanie (2026-10-22)

Decyzje Kuby: jednorazowe migracje usuwamy, historii gita nie przepisujemy, bez gitleaks.
Siatka bezpieczeństwa: lokalny tag `przed-porzadkami` (`c6e8b77`). Nic nie zostało wypchnięte.

## Commity

| Commit | Co |
|---|---|
| `434db90` | `ollama_data/` zdjęte ze śledzenia (zostaje na dysku) |
| `3a5db91` | `wandb/` zdjęte ze śledzenia, zależność npm `wandb` usunięta |
| `5396a46` | Pliki danych i migracji z roota |
| `408d0a8` | 33 skrypty PocketBase/W&B, `docker-compose.yml`, `.dockerignore`, `EMBEDDING_TESTS_SETUP.md`, 11 wpisów `test:*` w `package.json` |
| `43ef008` | 22 jednorazowe skrypty (testy wyszukiwania, diagnostyka, migracje danych) |
| `35e8df6` | 7 plików `docs/` (PocketBase, W&B, testy embeddingów) i martwe linki w README |
| `4bc7ce6` | 9 starych plików `.agent/` |
| `2a47e8f` | `.gitignore`: klucze prywatne, dane eksperymentów, lokalne pliki Claude |
| `d4116aa` | `supabase/.temp/` (pamięć podręczna Supabase CLI) zdjęte ze śledzenia i dodane do `.gitignore` |

## Wyniki

- `npm run build`: **przechodzi**.
- `npm run lint`: 240 błędów i 173 ostrzeżenia. Przed porządkami: 286 i 184 (sprawdzone na tagu). Nowych błędów brak, ubyły te ze skasowanych skryptów.
- `npm test`: Jest nie znajduje żadnych testów. Tak samo było przed porządkami, w repo nie ma plików testowych.

## Zostało do decyzji (nietknięte)

- `sonar-project.properties` i 4 pliki `.agent/sonarcloud-*.md`, sekcja SonarCloud w README.
- `PROJECT_SUMMARY.md` i link w README.
- `.agent/MANUAL_STEPS_REQUIRED.md`, `.agent/time_tracking.csv`.
- `docs/email_templates.md`, `docs/INTENT_LOGGING.md` (endpoint `/api/test-intent-classifier` nadal jest w buildzie).
- `scripts/export-from-supabase.ts` i wpis `export:supabase`.
- Klucz Ollamy w historii gita: plik zdjęty, historia zostaje (decyzja Kuby). Sprawdzić konto ollama.com.

## Zauważone przy okazji

- Wzorzec `app/*/admin/` w `.gitignore` pasuje do śledzonych plików `app/actions/admin/approve-user.ts` i `app/api/admin/delete-user/route.ts`. Pliki są śledzone, więc działa, ale nowy plik w tych folderach nie trafi do gita bez `git add -f`. Do poprawy razem z etapem martwego kodu w `app/`.
- `supabase/.temp/pooler-url` w historii zawiera adres puli połączeń bez hasła. Niegroźne.
