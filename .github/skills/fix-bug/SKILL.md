---
name: fix-bug
description: Reproduce, diagnose, and fix a specific repository defect with a regression test. Use for reported failures or unexpected behavior; prove the bug, trace the root cause, make the smallest fix, and verify the test fails without it and passes with it.
---

# Fix Bug

## Use When

A concrete behavior is failing or differs from an established expectation.

## Inputs

- Observed behavior
- Expected behavior
- Reproduction or failing command
- Affected surface

## Procedure

1. Read the report, affected code path, tests, and recent file history.
2. Reproduce the defect with a targeted command or failing regression test.
3. Trace from the entry point to the violated invariant.
4. Identify the root cause; do not patch only the symptom.
5. Write or retain the regression test and confirm it fails for the cause.
6. Apply the smallest production fix.
7. Confirm the regression passes and run the narrow related suite/build.
8. Verify the test would fail without the fix.
9. Do not mix unrelated refactoring into the bug commit.

## Completion

State the root cause, fix, regression test, and validation.

## Stop and Ask

- The behavior is intentional or externally relied upon
- The fix changes a public contract
- Auth/security, schema/data, infrastructure, or dependency change
- Reproduction remains impossible after focused investigation
