---
name: code-refactor
description: Improve structure without changing observable behavior across TypeScript/React/Svelte/Node, .NET, or Python/FastAPI after the current behavior is characterized.
---

# Code Refactor

## When to Use

Use this skill when the user explicitly asks to improve structure while
preserving observable behavior, including:

- extracting a focused utility, component, hook, or service;
- splitting a large file or a Server/Client boundary;
- moving code to its existing architectural owner;
- consolidating behavior that is proven equivalent;
- reducing dependencies without changing contracts; or
- renaming or moving internal code while preserving consumers.

## When Not to Use

- The requested outcome changes product behavior, UX, API contracts, persisted
  data, or security semantics.
- A defect must first be reproduced and fixed; use `code-fix-bug`.
- A package or framework must change; use `infra-dependency-update`.
- Cleanup is merely opportunistic and outside the explicitly approved scope.
- No observable structural problem or preservation boundary can be stated.

## Required Inputs

- Explicitly approved target files and refactor scope.
- The structural smell or dependency boundary to improve.
- Observable behavior to preserve: inputs, outputs, errors, side effects,
  rendering, timing/cancellation, serialization, and public shape as relevant.
- Live consumers, tests, configuration, nearest `AGENTS.md`, and matching
  instructions.
- A reproducible baseline, including any pre-existing targeted failures.

Derive missing file and test locations from live source. Do not infer intended
behavior when consumers and tests disagree.

## Decision Points

1. Is the request behavior-preserving and bounded?
2. Which characterization strategy proves the current behavior?
3. Which single transformation addresses the identified smell?
4. Does extraction or movement cross a package, rendering, or backend layer
   boundary?
5. Does the change require a rollback plan because files, exports, signatures,
   constructors, or DI registrations move?
6. What is the smallest existing validation that can run after each coherent
   transformation?

## Core Procedure

1. Read the target, its public entry points, direct consumers, tests, local
   guide, matching instructions, and accepted RFCs that govern intent.
2. Write down the behavior contract and the exact structural problem. Exclude
   unrelated cleanup.
3. Select a characterization strategy and establish a passing baseline before
   editing. Add a focused characterization test when current tests do not pin
   the behavior.
4. Load only the matching TypeScript, .NET, or Python refactor artifact, then
   select one catalogued transformation and inspect a current sibling with the
   same boundary. Do not copy a historical implementation over live source.
5. Apply one behavior-preserving transformation. Keep source and test moves
   together, and preserve side-effect order, error classification,
   cancellation, ownership, rendering, and serialization.
6. Run the incremental validation checklist immediately after that coherent
   transformation. Revert or correct it before starting another.
7. Repeat only within the approved scope. Update imports, exports, DI,
   documentation, and tests solely where the structural move requires it.
8. Run the smallest affected test/build/architecture checks named by live
   project configuration and root guidance.
9. Inspect the scoped diff for behavior drift, accidental public changes,
   unrelated cleanup, and stale paths.

## Resource Triggers

| Trigger | Load |
| --- | --- |
| Before any structural edit | [Characterization decision table](references/characterization-decision-table.md) |
| After identifying the exact smell or boundary | [Transformation catalog](references/transformation-catalog.md), but only the matching transformation |
| The refactor is TypeScript, React, Svelte, worker, Node tooling, or package-boundary work | [TypeScript refactors](references/typescript-refactors.md) |
| The refactor is .NET service, endpoint, Broker, DI, exception, or architecture work | [.NET refactors](references/dotnet-refactors.md) |
| The refactor is Python, FastAPI, config, authz, telemetry, or package-boundary work | [Python refactors](references/python-refactors.md) |
| When extracting or moving code across route, package, standalone-site, or backend-layer boundaries | [Dependency boundary decisions](references/dependency-boundary-decisions.md) |
| After choosing a comparable refactor category and before imitating it | [Live refactors](examples/live-refactors.md), then inspect the listed live source |
| After every coherent transformation | [Incremental validation](checklists/incremental-validation.md) |
| Before moving files or changing exports, signatures, constructors, or DI registrations | [Rollback checklist](checklists/rollback-checklist.md) |
| Only after a concrete import-cycle, export, mock, type, layer, build, or behavior-drift failure | [Troubleshooting](references/troubleshooting.md) for that signature |

Do not preload every resource.

## Verification

- The same characterization evidence passes before and after each
  transformation.
- New characterization tests assert behavior rather than the old internal
  structure.
- Affected consumers, architecture tests, type checks, and builds pass where
  the changed boundary requires them.
- Public exports, transport shapes, exception categories, telemetry,
  cancellation, accessibility, and localized output remain unchanged unless
  explicitly outside the refactor.
- The scoped diff contains no application behavior change or unrelated cleanup.

Select commands from live project configuration and the root command contract;
do not rely on commands copied into this skill.

## Stop and Ask

- Characterization exposes ambiguous, contradictory, or apparently defective
  behavior.
- The desired result needs a product, public API, architecture, or UX decision.
- A new dependency, schema/data change, auth/security change, infrastructure or
  deployment change, or incidental shared-library change is required.
- Source and accepted RFC intent materially disagree and resolving the drift
  would change behavior.
- Preserving behavior would require weakening assertions or suppressing an
  architecture/type failure.

## Completion Contract

Report the approved scope, preserved behavior, characterization evidence, each
completed transformation, and targeted validation. Include the prepared
rollback when the trigger applied and disclose pre-existing failures or
residual risk. The refactor is incomplete if behavior was not proven before
and after, a resource remains orphaned, or the scoped diff includes unrelated
changes.
