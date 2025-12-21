# PropAd Zimbabwe – AI Architect Rules

These rules apply to ALL AI tools used on this repository
(Cursor, Google Antigravity, ChatGPT, etc.).

## NON-NEGOTIABLE RULES

1. DO NOT refactor existing business logic.
2. DO NOT rename or remove public methods, routes, or DTOs.
3. DO NOT change database schema unless explicitly instructed.
4. DO NOT introduce `any`, `unknown`, `@ts-ignore`, or silent type suppression.
5. DO NOT split large files unless explicitly approved.
6. DO NOT optimize, clean up, or “improve” code unless asked.
7. DO NOT run docker builds, prisma migrate, or pnpm build via AI tools.

## STRUCTURAL FIXES

- Structural fixes (brace alignment, scope errors) must:
  - Preserve ALL logic
  - Change the smallest possible number of lines
  - Be incremental and compiler-error driven

## BACKEND AUTHORITY

- Backend logic is the source of truth.
- Frontend must reflect backend state only.
- No frontend-only business rules.

## VERIFICATION & PAYMENTS

- Verification is step-based and single-request only.
- Payment creation is conditional on admin-configured price.
- If price == 0, payment UI must be hidden.

## STOP CONDITIONS

- If uncertain, STOP and ask.
- If errors multiply, STOP after first structural fix.
- Never “fix everything” in one pass.

## COMPLETION GOAL

The goal is a production-ready system with:
- No regressions
- No hidden refactors
- Full build success
