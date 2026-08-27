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

## Reference Catalog

Open `references/csharp.md` only when the task needs one of:

- deciding between a primary constructor and a validating conventional
  constructor;
- a nullable/null-forgiving decision at a Broker, DTO, or public boundary;
- writing or correcting XML documentation beyond a one-line summary;
- an async/cancellation/`ConfigureAwait` or exception-classification edge case
  not resolved by the rules above;
- a warnings-as-errors or analyzer-suppression question.

The catalog does not redefine these rules or the verification/escalation
sections below; it only adds repository-specific examples and anti-patterns.

## Validation

Run the smallest relevant project build and test selection.

## Escalation

Ask before a public contract change, dependency, warning-policy change, or
behaviorally different nullability decision.
