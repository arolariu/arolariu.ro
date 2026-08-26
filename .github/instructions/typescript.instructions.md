---
name: TypeScript Standards
description: Type-system and language rules for TypeScript source files.
applyTo: "**/*.ts,**/*.tsx"
---

# TypeScript Standards

## Scope

Owns TypeScript language and type-system behavior only. React, Next.js, Svelte,
and project architecture belong to their narrower instructions.

## Required Inputs

- The current file and its public consumers
- The nearest `AGENTS.md`
- Existing shared types and guards before adding new ones

## Rules

- Never introduce explicit `any`.
- Use `unknown` plus a type guard for untrusted data.
- Prefer domain-specific interfaces, discriminated unions, and generics over
  assertions.
- Give exported functions explicit return types.
- Use `Readonly<T>` or readonly properties for input contracts.
- Preserve nullability; do not silence it with broad non-null assertions.
- Use `satisfies` when validating object shape without widening.
- Keep runtime validation at transport or trust boundaries.
- Reuse identifier-normalization and parsing helpers already present in the
  codebase.
- Do not add a new utility when an existing module owns the behavior.

## Validation

Run the smallest project test/build from the nearest local guide that exercises
the changed TypeScript.

## Escalation

Ask before changing a public contract, adding a dependency, weakening
validation, or choosing among behaviorally different type models.
