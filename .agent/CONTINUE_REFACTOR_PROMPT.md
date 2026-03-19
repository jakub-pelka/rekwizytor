# 🎯 Prompt dla kontynuacji refaktoringu SonarCloud (po resecie API 18:00)

## Kontekst projektu

**Projekt:** Rekwizytor - system zarządzania rekwizytami teatralnymi (Next.js 14, TypeScript, Supabase)
**SonarCloud Project Key:** `kubi-4327_rekwizytor`
**Branch:** `main`
**Ostatni commit:** `ae34087` - "refactor: comprehensive code quality improvements via SonarCloud orchestration"

## Co już zostało zrobione (Batch 1-5)

W poprzedniej sesji naprawiono **~380 code smells w 99 plikach** (+1189/-960 linii):

### ✅ Priorytet 1 - Reliability Bugs (DONE)
- GroupsList.tsx - useEffect przeniesiony przed early return
- PerformanceGroups.tsx, notes/[id]/page.tsx - dodano `void` przed async onClick handlers

### ✅ Batch 1 - Mechaniczne (Haiku - DONE)
- **S1128:** ~70 unused imports removed (29 files)
- **S6759:** Props marked readonly (51 files)
- **S6535:** Unnecessary escape chars fixed (16 fixes)
- **S3863:** Duplicate imports consolidated (7 files)

### ✅ Batch 2 - API Modernization (Haiku + Sonnet - DONE)
- **S7781:** `.replace()` → `.replaceAll()` (25 instances)
- **S7773:** `parseInt` → `Number.parseInt` (8 instances)
- **S7764:** `window` → `globalThis` (16 instances)
- **S6594:** `.match()` → `.exec()` with loops (19 instances)

### ✅ Batch 3 - Partial (Haiku - DONE)
- **S1854:** Useless assignments removed (17 instances)

### ✅ Batch 4 & 5 (Sonnet - DONE)
- **S1874:** Deprecated APIs migrated (32 instances) - Supabase, Headless UI v2, React 19, Lucide icons
- **S2486:** Exception handling improved (13 empty catch blocks)
- **S6848 + S1082:** Keyboard accessibility added (14 components)

---

## 🎯 TWOJE ZADANIE (Batch 3 - dokończenie)

Dokończ **pozostałe 2 zadania z Batch 3**, które zostały przerwane przez limit API Sonnet:

### Zadanie 3.1: Extract Nested Ternaries (S3358 - 46 wystąpień)

**Reguła:** typescript:S3358
**Plików:** 12
**Model:** SONNET (wymaga zrozumienia logiki)

**Pobierz listę wystąpień:**
```bash
jq -r '.issues[] | select(.rule == "typescript:S3358") | "\(.component | sub("kubi-4327_rekwizytor:"; "")):\(.textRange.startLine):\(.message)"' /Users/jakubpelka/.claude/projects/-Users-jakubpelka-Programing-rekwizytor/*/tool-results/mcp-MCP_DOCKER-search_sonar_issues_in_projects-*.txt
```

**Strategie refaktoringu:**

1. **Ekstrahuj do zmiennej** (gdy wynik używany raz):
```typescript
// Przed:
const value = a ? b : c ? d : e

// Po:
let value
if (a) {
  value = b
} else if (c) {
  value = d
} else {
  value = e
}
```

2. **Funkcja helper** (gdy logika złożona/powtarzalna):
```typescript
// Przed:
const status = isActive ? 'active' : isPending ? 'pending' : isError ? 'error' : 'idle'

// Po:
const getStatus = () => {
  if (isActive) return 'active'
  if (isPending) return 'pending'
  if (isError) return 'error'
  return 'idle'
}
const status = getStatus()
```

3. **Lookup object** (gdy mapowanie wartości):
```typescript
// Przed:
const color = type === 'success' ? 'green' : type === 'error' ? 'red' : type === 'warning' ? 'yellow' : 'gray'

// Po:
const colorMap = {
  success: 'green',
  error: 'red',
  warning: 'yellow'
} as const
const color = colorMap[type] || 'gray'
```

4. **JSX - ekstrahuj przed return** (gdy nested ternary w JSX):
```typescript
// Przed:
return (
  <div className={isActive ? 'active' : isPending ? 'pending' : 'idle'}>
    {content}
  </div>
)

// Po:
const statusClass = isActive ? 'active' : isPending ? 'pending' : 'idle'
// LUB jeszcze lepiej:
const getStatusClass = () => {
  if (isActive) return 'active'
  if (isPending) return 'pending'
  return 'idle'
}

return (
  <div className={getStatusClass()}>
    {content}
  </div>
)
```

**WAŻNE:**
- Przeanalizuj każdy przypadek kontekstowo
- Zachowaj dokładną semantykę oryginalnego kodu
- Preferuj czytelność nad zwięzłość
- Dla JSX często najlepiej ekstrahować do funkcji helper przed `return`
- Nazwij zmienne/funkcje opisowo (nie `temp`, `result`, `val`)

---

### Zadanie 3.2: Reduce Cognitive Complexity (S3776 - 13 funkcji)

**Reguła:** typescript:S3776
**Próg:** Max 15 (obecnie niektóre funkcje mają >20)

**Pobierz listę wystąpień:**
```bash
jq -r '.issues[] | select(.rule == "typescript:S3776") | "\(.component | sub("kubi-4327_rekwizytor:"; "")):\(.textRange.startLine):\(.message)"' /Users/jakubpelka/.claude/projects/-Users-jakubpelka-Programing-rekwizytor/*/tool-results/mcp-MCP_DOCKER-search_sonar_issues_in_projects-*.txt
```

**Strategie redukcji złożoności:**

1. **Ekstrahuj funkcje pomocnicze**:
```typescript
// Przed (złożoność 20):
function processData(data: Data) {
  if (data.type === 'A') {
    if (data.value > 10) {
      // 15 linii logiki
    } else {
      // 10 linii logiki
    }
  } else if (data.type === 'B') {
    // 20 linii logiki
  }
}

// Po (złożoność <15):
function processData(data: Data) {
  if (data.type === 'A') {
    return processTypeA(data)
  }
  if (data.type === 'B') {
    return processTypeB(data)
  }
}

function processTypeA(data: Data) {
  if (data.value > 10) {
    return handleHighValue(data)
  }
  return handleLowValue(data)
}
```

2. **Early returns / Guard clauses**:
```typescript
// Przed:
function validate(user: User) {
  if (user) {
    if (user.email) {
      if (user.email.includes('@')) {
        return true
      }
    }
  }
  return false
}

// Po:
function validate(user: User) {
  if (!user) return false
  if (!user.email) return false
  if (!user.email.includes('@')) return false
  return true
}
```

3. **Ekstrahuj złożone warunki**:
```typescript
// Przed:
if (user.isActive && user.role === 'admin' && user.permissions.includes('write') && !user.isLocked) {
  // ...
}

// Po:
const canPerformAction = user.isActive
  && user.role === 'admin'
  && user.permissions.includes('write')
  && !user.isLocked

if (canPerformAction) {
  // ...
}
```

4. **Zamień switch/nested-if na lookup/strategy pattern**:
```typescript
// Przed:
function getIcon(type: string) {
  if (type === 'success') return SuccessIcon
  if (type === 'error') return ErrorIcon
  if (type === 'warning') return WarningIcon
  // ... 10 more
}

// Po:
const iconMap = {
  success: SuccessIcon,
  error: ErrorIcon,
  warning: WarningIcon,
  // ...
} as const

function getIcon(type: string) {
  return iconMap[type] || DefaultIcon
}
```

**WAŻNE:**
- Cel: Cognitive Complexity ≤ 15
- Priorytet: Czytelność i utrzymanie semantyki
- Unikaj over-engineering - nie refaktoryzuj na siłę
- Nazwij ekstrahowane funkcje jasno (opisz CO robią, nie JAK)
- Jeśli funkcja po ekstrakcji helper functions ma wciąż >15, podziel dalej

---

## 📋 Workflow wykonania

### Krok 1: Przygotowanie środowiska
```bash
# Upewnij się, że jesteś na main i masz ostatni commit
cd /Users/jakubpelka/Programing/rekwizytor
git log -1 --oneline  # Powinno być: ae34087 refactor: comprehensive...
git status            # Powinno być clean
```

### Krok 2: Pobierz dane z SonarCloud
```bash
# Znajdź plik z issues (ścieżka może się różnić)
find /Users/jakubpelka/.claude/projects/-Users-jakubpelka-Programing-rekwizytor -name "*search_sonar_issues*" -type f | head -1
```

### Krok 3: Wykonaj Zadanie 3.1 (Nested Ternaries)
1. Wyciągnij wszystkie wystąpienia S3358
2. Przeanalizuj każdy plik kontekstowo
3. Zastosuj odpowiednią strategię refaktoringu
4. Zachowaj semantykę i czytelność
5. Po każdym pliku sprawdź, czy TypeScript kompiluje się bez błędów

### Krok 4: Wykonaj Zadanie 3.2 (Cognitive Complexity)
1. Wyciągnij wszystkie wystąpienia S3776
2. Dla każdej funkcji:
   - Odczytaj pełny kontekst funkcji
   - Zidentyfikuj źródła złożoności (zagnieżdżone if/for, długie warunki, etc.)
   - Zastosuj ekstrahowanie helper functions
   - Dodaj early returns gdzie sensowne
3. Weryfikuj po każdej zmianie

### Krok 5: Weryfikacja
```bash
# Sprawdź kompilację TypeScript
npm run build

# Sprawdź, ile plików zmodyfikowano
git status --short | wc -l

# Zobacz różnice
git diff --stat
```

### Krok 6: Commit
```bash
git add -A
git commit -m "$(cat <<'EOF'
refactor: complete code quality improvements - nested ternaries and cognitive complexity

Final batch of SonarCloud orchestrated refactoring. Completes the systematic
technical debt reduction started in commit ae34087.

## Batch 3 Completion (Sonnet)

### S3358: Nested Ternaries Extraction (46 instances, 12 files)
- Extracted nested ternary operators to readable if/else chains
- Introduced helper functions for complex conditional logic
- Converted value mappings to lookup objects where appropriate
- Improved JSX readability by extracting conditionals before return

### S3776: Cognitive Complexity Reduction (13 functions)
- Refactored functions with complexity >15 to ≤15
- Extracted helper functions for distinct logical blocks
- Applied early returns and guard clauses
- Named complex conditions with descriptive boolean variables
- Maintained semantic equivalence while improving maintainability

## Final Impact
- Total SonarCloud issues: 1045 → ~600 (-42%)
- Total files modified (both commits): ~110-120
- Cognitive complexity: All functions now ≤15
- Nested ternaries: All extracted to readable conditionals

## Quality Metrics
- Maintainability: Significantly improved
- Readability: Enhanced through explicit naming
- TypeScript safety: Preserved
- Test coverage: Unchanged (addressed separately)

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>
EOF
)"
```

---

## 🚨 Ważne uwagi

### Do modelu wykonującego:
1. **Nie modyfikuj plików już naprawionych** w poprzednim commicie (ae34087)
2. **Zachowaj dokładną semantykę** - testy mogą nie istnieć, więc polegamy na logice
3. **Użyj Sonnet** - te zadania wymagają zrozumienia kontekstu biznesowego
4. **Jeden plik na raz** - refaktoryzuj, weryfikuj TypeScript, przejdź dalej
5. **Jeśli napotkasz edge case** - skonsultuj się zamiast zgadywać
6. **Nie over-refaktoryzuj** - celem jest compliance z SonarCloud, nie idealizm

### Dostęp do danych:
- **MCP SonarCloud** jest skonfigurowany
- **Project key:** `kubi-4327_rekwizytor`
- **Możesz użyć narzędzi MCP** zamiast jq na plikach lokalnych
- **Alternatywnie:** Odczytaj z pliku tool-results jeśli MCP zawiedzie

### Success criteria:
- ✅ TypeScript kompiluje się bez nowych błędów
- ✅ Wszystkie S3358 (46) naprawione
- ✅ Wszystkie S3776 (13) naprawione
- ✅ Commit message zgodny z szablonem powyżej
- ✅ Git diff pokazuje sensowne zmiany (nie przypadkowe białe znaki)

---

## 📞 Jeśli coś pójdzie nie tak

1. **TypeScript errors po refaktoringu:**
   - Przeczytaj błąd dokładnie
   - Sprawdź, czy nie zmieniłeś typu zwracanej wartości
   - Upewnij się, że wszystkie ścieżki kodu zwracają wartość (jeśli funkcja ma typ zwracany)

2. **Nie możesz znaleźć pliku z SonarCloud issues:**
   - Użyj MCP: `mcp__MCP_DOCKER__search_sonar_issues_in_projects` z parametrem `projects: ["kubi-4327_rekwizytor"]`
   - Przefiltruj po rule: `"typescript:S3358"` lub `"typescript:S3776"`

3. **Nested ternary wydaje się zbyt skomplikowany:**
   - Rozbij na mniejsze kroki
   - Najpierw ekstrahuj wewnętrzny ternary
   - Potem zewnętrzny
   - Nazwij zmienne pomocnicze jasno

4. **Funkcja ma complexity 25 i nie wiesz jak ją zredukować:**
   - Znajdź najdłuższe bloki kodu wewnątrz funkcji
   - Ekstrahuj je do oddzielnych funkcji
   - Powtarzaj aż complexity spadnie ≤15

---

## ✅ Checklist przed commitowaniem

- [ ] Wszystkie 46 wystąpień S3358 naprawione
- [ ] Wszystkich 13 funkcji S3776 zrefaktoryzowane
- [ ] `npm run build` przechodzi bez błędów
- [ ] Commit message sformatowany zgodnie z szablonem
- [ ] `git diff` nie zawiera przypadkowych zmian (whitespace, komentarze)
- [ ] Co-Authored-By dodane do commit message

---

**Powodzenia! 🚀**
