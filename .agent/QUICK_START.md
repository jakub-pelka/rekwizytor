# ⚡ Quick Start - Dokończenie refaktoringu (18:00+)

## Użycie
Przekaż ten prompt **nowemu modelowi Sonnet** po resecie API (18:00):

---

## Prompt dla modelu:

```
Przeczytaj dokładnie plik:
/Users/jakubpelka/Programing/rekwizytor/.agent/CONTINUE_REFACTOR_PROMPT.md

Jestem kontynuacją refaktoringu SonarCloud z projektu Rekwizytor.

Poprzednia sesja (commit ae34087) naprawiła ~380 code smells w 99 plikach.

TWOJE ZADANIE:
1. Napraw wszystkie 46 wystąpień nested ternaries (S3358) - 12 plików
2. Zredukuj cognitive complexity (S3776) w 13 funkcjach do ≤15

STRATEGIE podane w pliku CONTINUE_REFACTOR_PROMPT.md.

Użyj MCP SonarCloud (project: kubi-4327_rekwizytor) lub odczytaj z:
/Users/jakubpelka/.claude/projects/-Users-jakubpelka-Programing-rekwizytor/*/tool-results/mcp-MCP_DOCKER-search_sonar_issues_in_projects-*.txt

Po zakończeniu zrób commit zgodnie z szablonem w CONTINUE_REFACTOR_PROMPT.md.

Rozpocznij.
```

---

## Dla Ciebie (User)

Po 18:00:
1. **Rozpocznij nową sesję** z Claude Sonnet
2. **Wklej powyższy prompt**
3. Model odczyta CONTINUE_REFACTOR_PROMPT.md i wykona zadanie
4. Sprawdź commit i zrób `git push` jeśli OK

Czas wykonania: ~30-45 minut
Rezultat: Commit z ~60 dodatkowymi naprawami

---

## Alternatywnie (jeśli wolisz skrót):

Możesz też po prostu powiedzieć nowemu modelowi:

```
Odczytaj /Users/jakubpelka/Programing/rekwizytor/.agent/CONTINUE_REFACTOR_PROMPT.md
i wykonaj instrukcje z sekcji "TWOJE ZADANIE".
```

Model ma pełny kontekst w tym pliku.
