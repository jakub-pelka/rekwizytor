# Przyszłe funkcjonalności - Rekwizytor

Ten plik zawiera pomysły i plany funkcjonalności do zaimplementowania w przyszłości.

---

## 🎭 System lokalizacji scenicznych dla rekwizytów

**Data dodania:** 2025-12-03  
**Priorytet:** Średni  
**Złożoność:** Średnia  

### Problem
Obecnie system przewiduje:
- ✅ Miejsce magazynowe rekwizytu (np. "Sala 230")
- ✅ Lista rekwizytów potrzebnych do danej sceny w spektaklu
- ❌ **BRAK:** Konkretne miejsce rekwizytu na scenie podczas spektaklu

### Przykład sytuacji
W spektaklu XYZ potrzebne do sceny 3:
- **Kwiatek (sztuczny krokus)** - powinien być **po prawej stronie sceny na stoliku z rekwizytami**
- **Brzytwa barberska** - powinna być **po lewej stronie w magazynku sceny**
- **Gazeta** - powinna być **po lewej stronie w magazynku sceny**

Dodatkowo:
- **Miejsce przechowywania rekwizytów całego spektaklu** - "Kontener na zapleczu sceny"

### Proponowane rozwiązanie

#### Opcja 1: Rozszerzenie tabeli `performance_items` (ZALECANE ✅)

Dodanie nowych kolumn do tabeli `performance_items`:

```sql
ALTER TABLE performance_items
ADD COLUMN stage_location TEXT,
ADD COLUMN performance_storage_location_id UUID REFERENCES locations(id);

COMMENT ON COLUMN performance_items.stage_location 
  IS 'Konkretne miejsce rekwizytu na scenie podczas spektaklu (np. "po prawej na stoliku")';
  
COMMENT ON COLUMN performance_items.performance_storage_location_id 
  IS 'Miejsce przechowywania wszystkich rekwizytów danego spektaklu (np. kontener)';
```

**Struktura danych po zmianach:**
```
items
  └─ location_id → miejsce w magazynie głównym (np. "Sala 230")

performance_items
  ├─ performance_storage_location_id → miejsce przechowywania rekwizytów spektaklu (np. "Kontener na zapleczu")
  └─ stage_location → konkretne miejsce na scenie (np. "Po prawej na stoliku")
```

**Zalety:**
- Proste rozwiązanie, minimalne zmiany w bazie
- Elastyczność – lokalizacje sceniczne mogą być opisowe
- Każdy rekwizyt ma swoją ścieżkę: magazyn główny → magazyn spektaklu → miejsce na scenie

**Wady:**
- Brak standaryzacji lokalizacji scenicznych (dane tekstowe)

#### Opcja 2: Nowa tabela lokalizacji scenicznych

Rozszerzenie enum `location_type_enum` o typ `stage` i wykorzystanie tabeli `locations`:

```sql
ALTER TYPE location_type_enum ADD VALUE 'stage';
ALTER TYPE location_type_enum ADD VALUE 'performance_storage';

ALTER TABLE performance_items
ADD COLUMN stage_location_id UUID REFERENCES locations(id),
ADD COLUMN performance_storage_location_id UUID REFERENCES locations(id);
```

**Zalety:**
- Pełna kontrola i standaryzacja
- Możliwość filtrowania, raportowania
- Reużywalność lokalizacji między spektaklami

**Wady:**
- Bardziej złożone
- Wymaga zarządzania słownikiem lokalizacji scenicznych
- Może być nadmiarowe dla specyficznych, opisowych lokalizacji

### Implikacje UI/UX

Po implementacji:

1. **Formularz dodawania rekwizytu do spektaklu:**
   - Pole: "Miejsce na scenie" (textarea lub input)
   - Pole: "Magazyn spektaklu" (select z lokalizacji)

2. **Widok checklisty przed spektaklem:**
   - Wyświetlanie: "Gdzie: [magazyn główny] → [magazyn spektaklu] → [miejsce na scenie]"

3. **Live View podczas spektaklu:**
   - Podpowiedź gdzie położyć rekwizyt na scenie

### Oszacowanie czasu implementacji
- Migracja bazy danych: **30 min**
- Aktualizacja typów TypeScript: **15 min**
- Modyfikacja formularza: **1-2h**
- Modyfikacja widoków (checklist, live): **2-3h**
- Testy: **1h**

**Łącznie: ~5-7 godzin pracy**

### Dependency
Brak - można implementować niezależnie.

---

## 🔍 Zunifikowana globalna wyszukiwarka (Command Palette)

**Data dodania:** 2025-12-03  
**Priorytet:** Średni  
**Złożoność:** Wysoka  

### Problem
Obecnie:
- ✅ Istnieje AI-powered search dla przedmiotów (`SmartSearchBar`)
- ✅ Poszczególne strony mają własne filtry/wyszukiwanie
- ❌ **BRAK:** Centralnej wyszukiwarki po wszystkich zasobach naraz
- ❌ **BRAK:** Inteligentnego rozpoznawania intencji użytkownika

**Sytuacja użytkownika:**
Użytkownik szuka "Hamlet" - nie pamięta czy to:
- Spektakl?
- Grupa rekwizytów?
- Notatka?
- Konkretny przedmiot?

Musi sprawdzać każdą sekcję osobno.

### Proponowane rozwiązanie

#### „Command Palette" w stylu Notion/Linear/GitHub

Globalna wyszukiwarka dostępna przez:
- Skrót klawiszowy: `Cmd+K` (Mac) / `Ctrl+K` (Windows)
- Ikona lupy w headerze

**Funkcjonalności:**

1. **Wyszukiwanie wielokontekstowe:**
   ```
   Użytkownik wpisuje: "Hamlet"
   
   Wyniki pogrupowane:
   
   📺 SPEKTAKLE (2)
     ✓ Hamlet - William Shakespeare [status: active]
     ✓ Hamlet w Wiedniu [status: archived]
   
   📦 GRUPY (1)
     ✓ Rekwizyty - Hamlet
   
   🏷️ PRZEDMIOTY (3)
     ✓ Czaszka Yoricka (w spektaklu: Hamlet)
     ✓ Korona Królewska (w spektaklu: Hamlet)
     ✓ Sztylet (w spektaklu: Hamlet)
   
   📝 NOTATKI (1)
     ✓ "Uwagi do premiery Hamleta" (utworzona: 2025-11-15)
   
   💡 AI SUGESTIA
     ✓ "Możesz szukać: Rekwizyty do aktu 3 Hamleta"
   ```

2. **Inteligentne rankingowanie wyników:**
   - Analiza częstotliwości użycia przez użytkownika
   - Uwzględnienie ostatnio modyfikowanych zasobów
   - AI scoring bazujący na kontekście wyszukiwania
   - Priorytet dla dokładnych dopasowań

3. **Kontekstowe akcje:**
   - Podgląd na hover (quick preview)
   - Szybkie akcje (np. "Dodaj do spektaklu", "Edytuj", "Zobacz szczegóły")
   - Nawigacja strzałkami + Enter do otwarcia

4. **Historia wyszukiwań:**
   - Ostatnie 10 wyszukiwań użytkownika
   - Szybki dostęp do często wyszukiwanych zasobów

#### Architektura techniczna

**Backend:**
```typescript
// Nowy endpoint: /api/global-search
// Input: query string, user context
// Output: ranked results from all entities

type GlobalSearchResult = {
  category: 'performances' | 'items' | 'groups' | 'locations' | 'notes' | 'users'
  results: Array<{
    id: string
    title: string
    subtitle?: string
    icon?: string
    url: string
    score: number // ranking score
    metadata?: {
      status?: string
      lastModified?: string
      thumbnail?: string
    }
  }>
  aiSuggestion?: string
}
```

**Database:**
Rozważyć wykorzystanie:
- Istniejącego `embedding` w tabeli `items` (już macie vector search!)
- Nowy view: `vw_searchable_entities` łączący wszystkie zasoby
- Full-text search PostgreSQL (tsvector/tsquery)
- Lub hybryda: full-text + vector embeddings

**Frontend:**
```typescript
// Komponent: components/global-search/CommandPalette.tsx
- Modal overlay (React Portal)
- Fuzzy search po tytułach (lokalny fallback)
- Debounced API calls (300ms)
- Keyboard navigation
- Highlighted matches
```

**Kluczowe tabele do przeszukiwania:**
- `performances` → tytuł, notatki
- `items` → nazwa, AI description, notatki (+ embeddings!)
- `groups` → nazwa
- `locations` → nazwa, opis
- `notes` → tytuł, content (JSON)
- `profiles` → nazwa użytkownika (dla admina)

### Przykładowa migracja

```sql
-- Widok z wszystkimi przeszukiwalnymi zasobami
CREATE MATERIALIZED VIEW vw_searchable_entities AS
SELECT 
  'performance' AS entity_type,
  id,
  title AS name,
  notes AS description,
  NULL::vector AS embedding,
  updated_at
FROM performances
WHERE deleted_at IS NULL

UNION ALL

SELECT 
  'item' AS entity_type,
  id,
  name,
  COALESCE(ai_description, notes) AS description,
  embedding,
  updated_at
FROM items
WHERE deleted_at IS NULL

UNION ALL

SELECT 
  'group' AS entity_type,
  id,
  name,
  NULL AS description,
  NULL::vector AS embedding,
  created_at AS updated_at
FROM groups
WHERE deleted_at IS NULL

UNION ALL

SELECT 
  'location' AS entity_type,
  id,
  name,
  description,
  NULL::vector AS embedding,
  created_at AS updated_at
FROM locations
WHERE deleted_at IS NULL

UNION ALL

SELECT 
  'note' AS entity_type,
  id,
  title AS name,
  content::text AS description,
  NULL::vector AS embedding,
  updated_at
FROM notes;

-- Index dla szybkiego full-text search
CREATE INDEX idx_searchable_entities_fts 
ON vw_searchable_entities 
USING gin(to_tsvector('polish', name || ' ' || COALESCE(description, '')));

-- Index dla vector search (jeśli będzie)
CREATE INDEX idx_searchable_entities_embedding 
ON vw_searchable_entities 
USING ivfflat (embedding vector_cosine_ops);

-- Refresh co X minut
CREATE UNIQUE INDEX ON vw_searchable_entities (entity_type, id);
```

### UX Flow

1. Użytkownik naciska `Cmd+K`
2. Modal się otwiera z pustym inputem
3. Pokazuje "Ostatnie" / "Często używane" (opcjonalnie)
4. Użytkownik wpisuje query
5. Po 300ms debounce → API call
6. Wyniki pojawiają się w real-time, pogrupowane
7. Użytkownik:
   - Klika wynik → przekierowanie
   - Lub strzałki + Enter → przekierowanie
   - Lub Escape → zamknięcie

### Integracja z AI

Wykorzystanie istniejących możliwości:
- **Vector embeddings** (już macie dla items!)
- **AI suggestions** (stylem jak w `SmartSearchBar`)
- Rozpoznawanie intencji:
  - "szukam czegoś czerwonego" → wektorowe wyszukiwanie
  - "Hamlet" → exact match + full-text
  - "gdzie jest czaszka?" → AI suggestion + location hints

#### 🧠 Inteligentny routing zapytań (Smart Query Classification)

**Problem:** Nie każde zapytanie wymaga AI - wysyłanie wszystkiego do AI to:
- 💰 Niepotrzebne koszty (tokeny)
- ⏱️ Wolniejsze odpowiedzi
- 🔋 Marnowanie zasobów

**Rozwiązanie:** Klasyfikator decydujący o metodzie wyszukiwania

**Algorytm decyzyjny:**

```typescript
function classifyQuery(query: string): SearchStrategy {
  // Poziom 1: Heurystyki (instant, 0 kosztów)
  
  // Proste zapytanie (1-2 słowa, bez znaków specjalnych)
  if (isSimpleQuery(query)) {
    return 'full-text-search' // PostgreSQL full-text
  }
  
  // Zapytanie z operatorami logicznymi
  if (hasLogicalOperators(query)) { // AND, OR, NOT
    return 'advanced-full-text'
  }
  
  // Poziom 2: Analiza semantyczna (lekka, ~100 tokenów)
  
  // Zapytanie opisowe (>5 słów) lub zawiera przymiotniki
  if (isDescriptive(query)) {
    return 'vector-search' // Tylko embeddings, bez LLM
  }
  
  // Zapytanie z pytaniem lub kontekstem
  if (isQuestionBased(query) || hasComplexContext(query)) {
    return 'ai-enhanced' // Full AI (embeddings + LLM)
  }
  
  // Poziom 3: Fallback na podstawie wyników
  
  // Jeśli full-text zwróci 0 wyników → upgrade do vector search
  if (fullTextResults.length === 0) {
    return 'vector-search-fallback'
  }
  
  // Default: full-text (najszybsze)
  return 'full-text-search'
}

// Przykładowe klasyfikacje:
// "Hamlet" → full-text-search ✅ (szybkie, 0 AI)
// "czerwony kwiatek" → full-text-search ✅ (2 słowa, proste)
// "szukam czegoś czerwonego do sceny romantycznej" → vector-search ⚡ (tylko embeddings)
// "gdzie mogę znaleźć rekwizyt podobny do czaszki ale mniejszy?" → ai-enhanced 🤖 (full AI)
```

**Implementacja:**

```typescript
// app/actions/global-search.ts

type SearchStrategy = 
  | 'full-text-search'      // PostgreSQL FTS (najszybsze, 0 AI)
  | 'vector-search'         // Embeddings (szybkie, tanie AI)
  | 'ai-enhanced'          // Full AI (wolne, drogie)
  | 'hybrid'               // Połączenie FTS + vector

async function globalSearch(query: string) {
  const strategy = classifyQuery(query)
  
  switch (strategy) {
    case 'full-text-search':
      // Tylko PostgreSQL, 0 kosztów AI
      return await searchFullText(query)
      
    case 'vector-search':
      // Generate embedding dla query (mały koszt)
      const embedding = await generateEmbedding(query)
      // Wyszukiwanie wektorowe w bazie
      return await searchByVector(embedding)
      
    case 'ai-enhanced':
      // Full AI: embedding + LLM suggestions
      const [embedding, aiContext] = await Promise.all([
        generateEmbedding(query),
        getAIContext(query) // LLM rozumie intencję
      ])
      return await searchWithAI(embedding, aiContext)
      
    case 'hybrid':
      // Połączenie FTS + vector, merge wyników
      const [ftsResults, vectorResults] = await Promise.all([
        searchFullText(query),
        searchByVector(await generateEmbedding(query))
      ])
      return mergeAndRank(ftsResults, vectorResults)
  }
}
```

#### 💡 Heurystyki klasyfikacji zapytań

```typescript
function isSimpleQuery(query: string): boolean {
  const words = query.trim().split(/\s+/)
  const hasSpecialChars = /[?!:,.]/.test(query)
  return words.length <= 2 && !hasSpecialChars
}

function isDescriptive(query: string): boolean {
  const descriptiveWords = [
    'czerwony', 'duży', 'mały', 'stary', 'nowy', 'vintage',
    'podobny', 'taki jak', 'w stylu', 'przypominający'
  ]
  return descriptiveWords.some(word => query.toLowerCase().includes(word))
}

function isQuestionBased(query: string): boolean {
  const questionWords = ['gdzie', 'kiedy', 'jak', 'co', 'dlaczego', 'który']
  return questionWords.some(word => query.toLowerCase().startsWith(word))
}

function hasComplexContext(query: string): boolean {
  const words = query.trim().split(/\s+/)
  return words.length > 7 // Długie zapytanie = prawdopodobnie kontekst
}
```

#### 📊 Dozowanie AI - przykłady

| Zapytanie | Strategia | Koszt AI | Czas | Powód |
|-----------|-----------|----------|------|-------|
| `"Hamlet"` | **FTS** | 0 tokenów | ~50ms | Proste, exact match |
| `"brzytwa barberska"` | **FTS** | 0 tokenów | ~50ms | 2 słowa, konkretne |
| `"czerwony rekwizyt"` | **FTS** | 0 tokenów | ~50ms | Proste, 2 cechy |
| `"coś czerwonego i małego"` | **Vector** | ~50 tokenów | ~200ms | Opisowe, embeddings wystarczą |
| `"gdzie mogę znaleźć rekwizyt do sceny 3?"` | **AI Enhanced** | ~300 tokenów | ~1s | Pytanie + kontekst |
| `"szukam czegoś vintage w stylu lat 90 na scenę romantyczną"` | **AI Enhanced** | ~400 tokenów | ~1.5s | Złożony opis + kontekst |

**Oszczędności:**
- 70-80% zapytań → Full-text (0 kosztów AI) ✅
- 15-20% zapytań → Vector only (~50 tokenów)
- 5-10% zapytań → Full AI (~300-500 tokenów)

**Przed optymalizacją:** 1000 wyszukiwań/dzień × 300 tokenów = 300k tokenów/dzień  
**Po optymalizacji:** (800 × 0) + (150 × 50) + (50 × 400) = 27.5k tokenów/dzień  
**Redukcja kosztów: ~91%** 🎉

#### 🔄 Fallback i upgrade strategii

Dynamiczne dostosowywanie strategii w zależności od wyników:

```typescript
async function searchWithFallback(query: string) {
  let strategy = classifyQuery(query)
  let results = await executeSearch(query, strategy)
  
  // Jeśli FTS zwraca 0 wyników → upgrade do vector
  if (results.length === 0 && strategy === 'full-text-search') {
    console.log('FTS returned 0 results, upgrading to vector search')
    strategy = 'vector-search'
    results = await executeSearch(query, strategy)
  }
  
  // Jeśli nadal 0 wyników → full AI
  if (results.length === 0 && strategy === 'vector-search') {
    console.log('Vector search returned 0 results, upgrading to AI')
    strategy = 'ai-enhanced'
    results = await executeSearch(query, strategy)
  }
  
  return {
    results,
    strategy, // Zwracamy użytą strategię dla analytics
    metadata: {
      upgraded: strategy !== classifyQuery(query)
    }
  }
}
```

#### 📈 Monitoring i analytics

Śledzenie skuteczności strategii:

```typescript
// Logowanie dla analytics
await logSearchQuery({
  query,
  strategy,
  resultCount: results.length,
  responseTime: Date.now() - startTime,
  aiTokensUsed: strategy === 'ai-enhanced' ? estimatedTokens : 0,
  upgraded: wasUpgraded
})

// Dashboard analytics:
// - % zapytań per strategia
// - Średni czas odpowiedzi
// - Koszty AI per strategia
// - Skuteczność (czy użytkownik kliknął wynik?)
```

**Metryki do monitorowania:**
- **Precision:** Czy użytkownik kliknął w wynik z top-3?
- **Strategy distribution:** Ile % zapytań w każdej strategii?
- **Upgrade rate:** Jak często fallback był potrzebny?
- **Cost per search:** Średni koszt AI na wyszukiwanie



### Oszacowanie czasu implementacji

1. **Backend (API + baza):** 6-9h
   - Widok `vw_searchable_entities`: 1h
   - Endpoint `/api/global-search`: 2-3h
   - **Smart query classification:** 2-3h (NOWE)
   - AI scoring logic: 1-2h

2. **Frontend (Command Palette):** 6-8h
   - Komponent modal: 2h
   - Keyboard navigation: 2h
   - Grupowanie wyników: 1h
   - Styling + animacje: 2h
   - Quick preview: 1h

3. **Testy + optymalizacja:** 3-4h
   - Performance testing
   - **Query classification testing** (NOWE)
   - Edge cases
   - Mobile experience
   - **Analytics/monitoring setup** (NOWE)

**Łącznie: ~15-21 godzin pracy** (poprzednio: ~12-17h)

### Inspiracje

- **Notion** - Command Menu (`Cmd+K`)
- **GitHub** - Search (`/` key)
- **Linear** - Command Palette
- **Raycast** - Universal search

### Dependency

- Wymaga: Istniejący system embeddings dla items (✅ już jest!)
- Opcjonalnie: Rozszerzenie embeddings na inne obiekty

### Przyszłe rozszerzenia

Po implementacji bazowej wersji:
- 📊 Analytics: co użytkownicy najczęściej szukają
- 🎯 Personalizacja: ranking bazowany na historii
- 🔗 Akcje: "Dodaj do spektaklu" bezpośrednio z search
- 🌐 Obsługa wielu języków w wyszukiwaniu

---

## 🎨 Portal Współpracy Zewnętrznej (Guest Designer Mode)

**Data dodania:** 2026-01-17  
**Priorytet:** Średni  
**Złożoność:** Średnia/Wysoka  

### Problem
Reżyserzy i scenografowie często nie wiedzą, co dokładnie znajduje się w magazynie rekwizytorni przed rozpoczęciem pracy nad spektaklem. Tworzą listy "w ciemno", co zmusza rekwizytora do ręcznego sprawdzania dostępności każdorazowo. Brak jest też bezpiecznego narzędzia, które pozwalałoby im przejrzeć zasoby bez ryzyka przypadkowej edycji bazy lub wglądu w dane innych spektakli.

### Proponowane rozwiązanie
Wprowadzenie dedykowanego typu konta ("Gość/Projektant") z uprawnieniami "Read-Only" do globalnego magazynu oraz modułem tworzenia "Listy Zapotrzebowania".

**Główne funkcjonalności:**
1. **Tryb Przeglądu (Inventory Sandbox):**
   - Pełny dostęp do wyszukiwarki (w tym Smart Search) i filtrowania zasobów.
   - Brak możliwości edycji istniejących przedmiotów, usuwania czy modyfikowania struktury grup.
2. **Kreator Listy Zapotrzebowania:**
   - Projektant wybiera przedmioty z bazy, które pasują do jego wizji.
   - Możliwość dopisywania pozycji "zewnętrznych", których nie znalazł w magazynie (automatycznie oznaczane jako "Do kupienia / Do wykonania").
3. **Inteligentny Raport dla Rekwizytora:**
   - Zakończona lista jest przesyłana do rekwizytora w formie gotowego zestawienia.
   - **Logistyka magazynowa:** System automatycznie grupuje przedmioty według ich **lokalizacji** (np. najpierw wszystkie rzeczy z "Sali 2", potem z "Magazynu Głównego"). Dzięki temu rekwizytor może zebrać wszystko za jednym razem, nie krążąc kilka razy po tych samych pomieszczeniach.
   - Jasny podział na: "Mamy (Magazyn)", "Mamy podobne (Sugestie AI)", "Brak (Konieczny zakup)".
4. **Pełna Izolacja:**
   - Brak wglądu w listę innych użytkowników, systemy administracyjne oraz – co najważniejsze – w inne spektakle i ich wewnętrzne notatki.

### Oszacowanie czasu
- Implementacja ról i uprawnień (RBAC): 4-5h
- UI Modułu Zapotrzebowania (Drafting list): 6-8h
- Logika grupowania po lokalizacjach i generowanie raportu: 4h
- Testy bezpieczeństwa i izolacji danych: 2h

**Łącznie: ~16-19 godzin pracy**

---

## 📱 Szybkie Dodawanie Zdjęć (Mobile Upload via QR)

**Data dodania:** 2026-01-23  
**Priorytet:** Średni  
**Złożoność:** Średnia  

### Problem
Dodawanie zdjęć przedmiotów lub dokumentacji wymaga często zrobienia zdjęcia telefonem, przesłania go na komputer (przez chmurę, maila, kabel) i dopiero wtedy dodania do systemu. Proces ten jest uciążliwy i zniechęca do dodawania zdjęć "na bieżąco", co może skutokwać brakami w dokumentacji wizualnej.

### Proponowane rozwiązanie
Wprowadzenie mechanizmu Hybrid Upload we wszystkich miejscach, gdzie system prosi o dodanie zdjęcia (dodawanie rekwizytu, edycja, gallery upload).

**Workflow:**
1. **Desktop:** Użytkownik klika "Dodaj zdjęcie".
2. **Popup:** Oprócz standardowego "Wybierz z dysku", wyświetla się unikalny **Kod QR** (ważny np. 5-10 minut).
3. **Mobile:** Użytkownik skanuje kod QR telefonem (nie wymaga instalacji aplikacji, otwiera się lekka strona webowa PWA lub dedykowany upload page).
4. **Mobile:** Strona pozwala na natychmiastowe zrobienie zdjęcia aparatem lub wybór z galerii telefonu i kliknięcie "Wyślij".
5. **Desktop:** Dzięki połączeniu WebSocket/Realtime, zdjęcie natychmiast pojawia się w otwartym popupie na komputerze.
6. **Desktop:** Dalsza edycja (kadrowanie, opisywanie, przypisywanie do kategorii) odbywa się już wygodnie na dużym ekranie.

**Zalety:**
- Wykorzystuje najlepsze cechy obu urządzeń: mobilność aparatu w telefonie i wygodę edycji na komputerze.
- Brak konieczności instalowania dedykowanej aplikacji mobilnej (wystarczy przeglądarka).
- Znaczne przyspieszenie procesu digitalizacji zasobów.

### Oszacowanie czasu
- Backend (tymczasowy storage, auth tokeny dla QR, WebSocket do synchronizacji): **4-6h**
- Frontend Mobile (lekki uploader RWD): **3-4h**
- Integracja Frontend Desktop (wyświetlanie QR, nasłuchiwanie na upload): **2-3h**
- Testy i obsługa błędów: **2h**

**Łącznie: ~11-15 godzin pracy**

---


## 🔍 Pipeline rozpoznawania v2: detekcja → wycinki → embedding obrazu → LLM

**Data dodania:** 2026-10-03  
**Priorytet:** Średni  
**Złożoność:** Średnia  

### Problem
Obecne rozpoznawanie (vision-props, fast-mode) prosi model o „wymyślenie nazw wszystkiego na zdjęciu”:
- nazwy są niepowtarzalne między wywołaniami i trzeba je ręcznie dopasowywać do katalogu,
- każdy rekwizyt dostaje zdjęcie całej półki zamiast własnego kadru,
- odpowiedź parsowana regexem zamiast schematu JSON.

### Proponowane rozwiązanie (wszystko przez OpenRouter, działa na Vercelu)
1. **Detekcja przez VLM z groundingiem:** `qwen/qwen3-vl-*` zwraca `{"bbox_2d":[x1,y1,x2,y2],"label"}` w skali 0–1000. Jedno wywołanie = nazwa PL + ramka.
2. **Wycinki:** `sharp` w funkcji lub `<canvas>` w przeglądarce → każdy rekwizyt ma własne zdjęcie.
3. **Embedding obrazu wycinka:** OpenRouter `/embeddings` z multimodal input (`google/gemini-embedding-2-preview`, `voyageai/voyage-multimodal-3.5`, `nvidia/llama-nemotron-embed-vl-1b-v2:free`). Na start: deduplikacja; później wyszukiwanie „który to z moich rekwizytów”.
4. **LLM (opcjonalnie):** mocniejszy model tylko do nazwy/opisu wycinka, jeśli Qwen słabo nazywa po polsku.

Uwagi:
- Lokalne modele (ONNX, transformers.js) na Vercelu odpadają: brak GPU, limity rozmiaru.
- Limit body funkcji Vercel ~4.5 MB → zmniejszać zdjęcia w przeglądarce (1600–2000 px).
- Fallback modeli w OpenRouter (`models: [...]`) chroni przed awarią jednego dostawcy.
- Plan B, jeśli ramki z VLM za słabe: Roboflow / Replicate / fal.ai (Grounding DINO, SAM), Moondream Cloud `detect`.
- **Pierwszy krok:** skrypt `scripts/` porównujący 2–3 modele na 10–20 prawdziwych zdjęciach półek (ramki, czas, koszt).

### Oszacowanie czasu
- Skrypt ewaluacyjny: **2-3h**
- Detekcja + wycinki + UI potwierdzania: **6-8h**
- Embeddingi obrazów + deduplikacja: **3-4h**

**Łącznie: ~11-15 godzin pracy**

---

## 🧭 Migracja embeddingów tekstowych z Gemini

**Data dodania:** 2026-10-03  
**Priorytet:** Średni  
**Złożoność:** Średnia  

### Problem
Klucz Gemini unieważniony, a `text-embedding-004` jest wycofywany. Wektory w bazie (768 wym.) są z Gemini, więc wyszukiwanie hybrydowe nie działa i spada do FTS (`executeClassicSearch` w `unified-search.ts`).

### Proponowane rozwiązanie
Wybrać nowy model (np. przez OpenRouter `/embeddings`), przeliczyć wektory wszystkich encji (istnieje `admin/migrate-embeddings`), zaktualizować wymiar kolumn i funkcje RPC `search_global_hybrid_mv`.

### Oszacowanie czasu
**4-6h** (w tym przeliczenie i testy jakości na istniejącym systemie testów embeddingów)

---

## 🗺️ Mapowanie: AI zwraca geometrię (JSON), kod generuje SVG

**Data dodania:** 2026-10-03  
**Priorytet:** Niski  
**Złożoność:** Średnia  

### Problem
`mapping-ai.ts` każe modelowi pisać surowy SVG z siatką 10px, co jest kruche w każdym modelu.

### Proponowane rozwiązanie
Model zwraca `{walls:[...], shelves:[{x,y,w,h}], doors:[...]}` przez schemat JSON, a SVG renderuje deterministyczny kod (snap do siatki po stronie kodu).

### Oszacowanie czasu
**4-5h**

---

## 📋 Szablon dla kolejnych pomysłów

```markdown
## 🔖 Nazwa funkcjonalności

**Data dodania:** YYYY-MM-DD  
**Priorytet:** Niski/Średni/Wysoki  
**Złożoność:** Niska/Średnia/Wysoka  

### Problem
[Opis problemu/potrzeby]

### Proponowane rozwiązanie
[Opis rozwiązania]

### Oszacowanie czasu
[Ile czasu zajmie implementacja]
```
