# 📚 Przykłady z projektu Rekwizytor

## S3358: Nested Ternaries (46 wystąpień w 12 plikach)

### Lista plików do naprawy:
```
components/performances/SceneDetailModal.tsx:69
components/performances/SceneKanbanBoard.tsx:289, 324
components/live/LiveChecklistItem.tsx:61
components/ui/Stepper.tsx:40, 41, 44
components/notes/NotesList.tsx:179
components/ui/FeatureTour.tsx:193, 194, 251, 252
utils/group-embedding-enrichment.ts:39
components/ai-stats/StatsDashboard.tsx:253-259 (7 wystąpień)
+ więcej...
```

### Typowe wzorce w projekcie:

**Pattern 1: Status/State mapping (najczęstszy)**
```typescript
// Typowe w Stepper.tsx, LiveChecklistItem.tsx
const className = isCompleted ? 'completed' : isActive ? 'active' : isPending ? 'pending' : 'idle'
```
→ **Strategia:** Ekstrahuj do funkcji `getClassName()` z if/else lub lookup object

**Pattern 2: JSX conditionals**
```typescript
// Typowe w FeatureTour.tsx, SceneKanbanBoard.tsx
<div className={isFirst ? 'first' : isLast ? 'last' : isMiddle ? 'middle' : 'default'}>
```
→ **Strategia:** Ekstrahuj przed `return` do zmiennej lub funkcji helper

**Pattern 3: Value transformations**
```typescript
// Typowe w StatsDashboard.tsx, NotesList.tsx
const value = data?.value ? data.value : defaultValue ? defaultValue : fallback
```
→ **Strategia:** Użyj nullish coalescing `??` lub explicit if/else

---

## S3776: Cognitive Complexity (13 funkcji)

### ⚠️ Ekstremalne przypadki (priority):

**StatsDashboard.tsx** - 3 funkcje ze złożonością 56-58! (linie 245, 285, 333)
- Prawdopodobnie duże map/reduce/filter z nested conditions
- **Strategia:** Rozbij na mniejsze funkcje, ekstrahuj transformacje danych

**unified-search.ts:48** - złożoność 26
- Prawdopodobnie złożona logika wyszukiwania z multiple if/switch
- **Strategia:** Ekstrahuj filtering/scoring do oddzielnych funkcji

**ScheduleShowDialog.tsx:36** - złożoność 25
- Prawdopodobnie walidacja formularza lub złożona logika schedulowania
- **Strategia:** Ekstrahuj validation rules do oddzielnych funkcji

### Lista wszystkich funkcji do naprawy:
```
1. components/ai-stats/StatsDashboard.tsx:245 (complexity 57) ⚠️ CRITICAL
2. components/ai-stats/StatsDashboard.tsx:285 (complexity 56) ⚠️ CRITICAL
3. components/ai-stats/StatsDashboard.tsx:333 (complexity 58) ⚠️ CRITICAL
4. app/actions/unified-search.ts:48 (complexity 26) ⚠️ HIGH
5. components/performances/ScheduleShowDialog.tsx:36 (complexity 25) ⚠️ HIGH
6. components/ui/KanbanBoard.tsx:136 (complexity 21)
7. components/performances/SceneKanbanBoard.tsx:255 (complexity 20)
8. app/[locale]/page.tsx:39 (complexity 20)
9. app/actions/fast-mode.ts:10 (complexity 18)
10. components/ui/FeatureTour.tsx:23 (complexity 18)
11. components/mapping/SvgMapEditor.tsx:356 (complexity 17)
12. components/dashboard/NearestPerformanceCard.tsx:28 (complexity 16)
13. components/ui/FeatureTour.tsx:39 (complexity 16)
```

### Typowe źródła wysokiej złożoności w projekcie:

1. **Nested map/filter/reduce** (StatsDashboard.tsx)
   ```typescript
   // Anti-pattern:
   const result = data.map(item => {
     if (item.type === 'A') {
       return item.values.filter(v => v > 10).map(v => v * 2)
     } else if (item.type === 'B') {
       return item.values.filter(v => v < 10).map(v => v / 2)
     }
     return []
   }).flat()
   ```
   → **Strategia:** Ekstrahuj `processTypeA()`, `processTypeB()`

2. **Validation chains** (ScheduleShowDialog.tsx)
   ```typescript
   // Anti-pattern:
   const validate = () => {
     if (!title) {
       if (!description) {
         // ...
       }
     }
     if (date) {
       if (time) {
         // ...
       }
     }
   }
   ```
   → **Strategia:** Early returns + ekstrahowane validation functions

3. **Switch z nested conditions** (unified-search.ts, fast-mode.ts)
   ```typescript
   // Anti-pattern:
   switch (type) {
     case 'A':
       if (condition1) {
         if (condition2) {
           // ...
         }
       }
       break
     case 'B':
       // ...
   }
   ```
   → **Strategia:** Ekstrahuj każdy case do oddzielnej funkcji

---

## Wskazówki specyficzne dla projektu

### StatsDashboard.tsx (najgorszy case)
Linie 245, 285, 333 - prawdopodobnie funkcje typu:
- `aggregateStats()` - mapowanie/grupowanie danych AI usage
- `formatChartData()` - transformacja dla chart library
- `calculateMetrics()` - obliczenia metrics z nested conditions

**Podejście:**
1. Odczytaj pełną funkcję
2. Zidentyfikuj logiczne bloki (np. "prepare data", "filter invalid", "calculate", "format output")
3. Ekstrahuj KAŻDY blok do osobnej funkcji z jasną nazwą
4. Główna funkcja powinna być "orkiestratorem" - wywołuje helpers w kolejności

**Przykład refaktoringu:**
```typescript
// Przed (complexity 57):
function aggregateStats(logs: Log[]) {
  const result = logs.map(log => {
    if (log.type === 'embedding') {
      if (log.status === 'success') {
        const tokens = log.tokens_input + log.tokens_output
        if (tokens > 1000) {
          return { ...log, category: 'large', cost: tokens * 0.01 }
        } else {
          return { ...log, category: 'small', cost: tokens * 0.005 }
        }
      } else {
        return { ...log, category: 'failed', cost: 0 }
      }
    } else if (log.type === 'search') {
      // ... 50 więcej linii podobnej logiki
    }
    return null
  }).filter(Boolean)

  return result.reduce((acc, item) => {
    // ... kolejne 30 linii
  }, {})
}

// Po (complexity <15):
function aggregateStats(logs: Log[]) {
  const categorized = categorizeLogs(logs)
  const withCosts = calculateCosts(categorized)
  return aggregateByCategory(withCosts)
}

function categorizeLogs(logs: Log[]) {
  return logs.map(log => ({
    ...log,
    category: determineCategory(log)
  }))
}

function determineCategory(log: Log): string {
  if (log.type === 'embedding') {
    return categorizeEmbedding(log)
  }
  if (log.type === 'search') {
    return categorizeSearch(log)
  }
  return 'unknown'
}

function categorizeEmbedding(log: Log): string {
  if (log.status !== 'success') return 'failed'
  const tokens = log.tokens_input + log.tokens_output
  return tokens > 1000 ? 'large' : 'small'
}

// etc...
```

### unified-search.ts (complexity 26)
Prawdopodobnie funkcja `search()` z:
- Multiple source filtering (groups, items, locations, performances)
- Scoring/ranking logic
- Result deduplication

**Podejście:**
- Ekstrahuj `searchGroups()`, `searchItems()`, `searchLocations()`, etc.
- Ekstrahuj `scoreResult()`, `deduplicateResults()`
- Główna funkcja: orchestrate + merge results

### ScheduleShowDialog.tsx (complexity 25)
Prawdopodobnie `handleSubmit()` lub `validateForm()` z:
- Field validation
- Date/time logic
- Conflict checking

**Podejście:**
- Ekstrahuj `validateTitle()`, `validateDate()`, `validateTime()`
- Ekstrahuj `checkConflicts()`
- Użyj early returns dla każdej validation

---

## 🎯 Priorytety wykonania

### Kolejność zalecana:

1. **START: Nested ternaries (S3358)** - prostsze, dadzą Ci momentum
   - Zacznij od `Stepper.tsx`, `LiveChecklistItem.tsx` (proste przypadki)
   - Potem `FeatureTour.tsx`, `SceneKanbanBoard.tsx` (JSX cases)
   - Na końcu `StatsDashboard.tsx` (complex cases)

2. **POTEM: Cognitive complexity (S3776)** - trudniejsze
   - Zacznij od małych (complexity 16-20): `NearestPerformanceCard`, `FeatureTour`
   - Średnie (21-26): `KanbanBoard`, `SceneKanbanBoard`, `unified-search`
   - **Na KOŃCU:** StatsDashboard.tsx (57-58) - to będzie hardest, zostaw na koniec gdy już nabierzesz wprawy

### Dlaczego ta kolejność?
- Nested ternaries są bardziej mechaniczne i dadzą Ci ~40% postępu szybko
- Małe cognitive complexity dadzą Ci feeling jak robić większe
- StatsDashboard na końcu - jak już zrozumiesz kod projektu i nabierzesz pewności

---

## ✅ Checklist weryfikacji po każdym pliku

Po naprawie **każdego pliku**:
```bash
# 1. Sprawdź TypeScript
npm run type-check  # lub tsc --noEmit

# 2. Jeśli są błędy, napraw przed przejściem dalej
# 3. Zapisz postęp co 5-10 plików (git stash)
```

Po naprawie **wszystkich plików**:
```bash
# 1. Full build
npm run build

# 2. Git diff review
git diff --stat
git diff components/ai-stats/StatsDashboard.tsx  # sprawdź najgorsze case'y

# 3. Commit jeśli wszystko OK
```

---

**Powodzenia! Te 3 funkcje w StatsDashboard.tsx to będzie wyzwanie, ale rozbite na helpers będą dużo lepsze. 💪**
