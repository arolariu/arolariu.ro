---
name: refactor
description: Improve code structure without changing observable behavior. Use for an explicit refactor request after establishing passing characterization tests; keep each transformation small and verify behavior after every step.
---

# Refactor

## Use When

The user explicitly requests structural improvement with preserved behavior.

## Inputs

- Target files
- Structural problem
- Observable behavior to preserve
- Existing tests and consumers

## Procedure

1. Read the target, consumers, tests, local guide, and matching instructions.
2. Run characterization tests before editing.
3. Add a focused characterization test when a behavior is not pinned.
4. Identify one responsibility or dependency boundary to improve.
5. Apply one behavior-preserving transformation.
6. Run targeted tests after that transformation.
7. Repeat only for the explicitly approved scope.
8. Update docs/imports when signatures or locations change.
9. Verify coverage and build behavior did not regress.

## Completion

State the structural improvement and evidence that observable behavior remains
unchanged.

## Stop and Ask

- A characterization test reveals ambiguous behavior
- The correct change requires a public contract or architecture decision
- New dependency, schema/data, auth/security, infrastructure, or deployment
