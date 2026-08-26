---
name: unit-test
description: Add or improve a focused unit test using the repository's current Vitest or MSTest conventions. Use when asked for unit coverage, a regression test, edge-case tests, or test-quality improvement; mock only true external boundaries.
---

# Unit Test

## Use When

- Adding coverage for existing behavior
- Pinning a regression
- Testing an edge/error case
- Improving a brittle test

## Inputs

- Source file or public behavior
- Expected outcome
- Existing test file and builders

## Procedure

1. Read the source, consumers, colocated/sibling tests, and nearest guide.
2. Identify observable behavior and branches.
3. Reuse real repository modules and deterministic builders.
4. Mock only external boundaries such as network, Azure SDK, Clerk, time, or
   browser APIs when unavoidable.
5. Write one failing test with AAA structure.
6. Run that test and confirm the expected failure.
7. If production behavior is already correct, add the remaining focused cases.
8. If the test exposes a production defect, report it instead of changing
   production code under a test-only request.
9. Run the targeted test selection.

## Stack Rules

- Frontend tests are colocated `*.test.ts`/`*.test.tsx`.
- Use Testing Library queries by role/name and user-visible outcomes.
- Backend uses MSTest, `[TestClass]`, `[TestMethod]`, and exact-type exception
  assertions.

## Completion

List behaviors covered and targeted test evidence.

## Stop and Ask

- Production behavior must change
- New dependency
- Existing assertion appears intentionally different from the requested
  behavior
