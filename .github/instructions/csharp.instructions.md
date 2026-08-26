---
name: C# Standards
description: C# language, nullable, documentation, and asynchronous programming rules.
applyTo: "**/*.cs"
---

# C# Standards

## Scope

Owns C# language and library-level conventions. API layering belongs to the
backend instruction.

## Required Inputs

- Root and nearest local `AGENTS.md`
- The current type and public consumers
- Existing exception and telemetry helpers

## Rules

- Keep nullable reference types accurate.
- Avoid broad null-forgiving operators.
- Use primary constructors and collection expressions where they improve
  clarity and match neighboring code.
- Public APIs have useful XML documentation.
- Async library/service code uses `.ConfigureAwait(false)`.
- Never use `.Result`, `.Wait()`, or another sync-over-async pattern.
- Preserve cancellation tokens where the public contract provides them.
- Catch only exceptions that can be classified or enriched.
- Do not suppress warnings with `NoWarn`, `#pragma`, or weakened analyzers.
- Keep warnings-as-errors clean.

## Validation

Run the smallest relevant project build and test selection.

## Escalation

Ask before a public contract change, dependency, warning-policy change, or
behaviorally different nullability decision.
