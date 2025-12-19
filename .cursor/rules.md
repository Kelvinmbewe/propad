# CURSOR PROJECT RULES
# DEV ENVIRONMENT WITH PRODUCTION-BOUND CHANGES

This project is in active development.
However, all changes are intended for eventual production use.

## CORE PRINCIPLES
1. Treat all existing code as production-bound.
2. Stability and backward compatibility are mandatory.
3. Dev speed is allowed ONLY if it does not introduce regressions.

## CHANGE SAFETY RULES
4. DO NOT refactor, rename, or restructure working code unless explicitly requested.
5. DO NOT change existing behavior unless explicitly instructed.
6. Preserve all function signatures, exports, routes, and contracts.
7. Changes must be minimal, localized, and reversible.

## ERROR FIXING MODE
8. Fix errors by correcting logic, not by rewriting systems.
9. Prefer incremental fixes over redesigns.
10. If a fix requires refactoring, STOP and explain before proceeding.

## BROWSER & RUNTIME TESTING
11. Browser preview and runtime testing are ALLOWED when necessary.
12. Use browser/testing ONLY to:
    - Reproduce bugs
    - Verify fixes
    - Confirm UI or API behavior
13. Browser/testing is READ-ONLY unless explicitly allowed.
14. Do NOT modify unrelated code after testing.

## DATABASE & STATE SAFETY
15. No destructive migrations.
16. No column renames or drops.
17. Assume existing data must remain valid.

## DEPENDENCIES
18. Do NOT add, remove, or upgrade dependencies unless explicitly requested.

## CODE CONSISTENCY
19. Follow existing patterns and conventions.
20. Avoid introducing new abstractions unless required for the fix.

## COMMUNICATION
21. State clearly which files and lines will be changed.
22. Confirm “no-regression” intent for any non-trivial change.
23. Ask before making broad or cross-cutting edits.

## DEFAULT ASSUMPTION
Dev environment.
Production mindset.
Safety > correctness > elegance > speed.
