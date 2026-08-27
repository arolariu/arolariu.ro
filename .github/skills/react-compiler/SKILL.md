---
name: react-compiler
description: Audit or explicitly approved adopt/remediate React Compiler for the arolariu.ro website. Use for baseline diagnostics, incompatible React patterns, staged lint/transform rollout, validation, and rollback without confusing the lint plugin with the compiler transform.
---

# React Compiler

## Current Baseline

Load [the live compiler baseline](examples/live-baseline.md) and verify every
claim against current configuration. Dependency presence, a lint plugin, and
an active transform are separate states; do not infer one from another.

## When to Use

- Audit website readiness or investigate a compiler diagnostic.
- Plan an approved staged React Compiler rollout.
- Remediate incompatible React patterns while preserving behavior.
- Validate or roll back an approved lint/transform adoption.

## Approval Gate

Read-only research and source audit may proceed. Adding/changing dependencies,
ESLint/compiler configuration, or `sites/arolariu.ro/next.config.ts` requires
explicit approval. Verify current official React and Next.js documentation
before proposing exact configuration.

## Procedure

1. Capture the live dependency, ESLint, Next, build, test, and package-boundary
   baseline. State separately whether lint diagnostics and transforms run.
2. Consult current official [React Compiler documentation](https://react.dev/learn/react-compiler)
   and [Next.js `reactCompiler` documentation](https://nextjs.org/docs/app/api-reference/config/next-config-js/reactCompiler).
   Do not rely on remembered option names or infer support from a version.
3. Without mutation approval, inspect likely target code for existing Rules of
   React violations and produce a file-specific diagnostic/rollout plan only.
4. With explicit approval, establish diagnostics before transform rollout
   using the exact plugin/config recommended by current docs. Record baseline
   findings rather than bulk-suppressing them.
5. Classify each diagnostic: real behavior bug, compiler limitation,
   unsupported library boundary, generated/vendor code, or false positive.
6. Remediate the smallest behavior-preserving source area. Do not add blanket
   memoization or alter server/client ownership merely to silence diagnostics.
7. Enable transformation only through the current documented Next.js path and
   only for the approved stage. Do not place React Compiler settings inside
   the existing SWC `compiler` object.
8. Validate targeted lint/diagnostics, TypeScript, Vitest, website build, and
   relevant interaction/performance behavior. Confirm compiled output through
   a documented diagnostic/tool, not assumption.
9. Expand by measured stage only after the previous scope is clean.
10. Roll back the transform independently from source remediations and lint
    diagnostics; verify the pre-rollout behavior/build still passes.

## Resource Triggers

| Trigger | Resource |
| --- | --- |
| Before interpreting baseline, diagnostics, incompatible patterns, lint versus transform, staged rollout, or rollback | [Compiler baseline and rollout decisions](references/baseline-and-rollout.md) |
| Need exact live config/source pointers | [Live compiler baseline](examples/live-baseline.md) |
| Before approval, adoption, validation, or rollback | [Compiler adoption matrix](checklists/compiler-adoption-matrix.md) |

## Verification

- Reports distinguish installed dependency, registered lint diagnostics, and
  active transform.
- Every exact option comes from current official docs and live configuration.
- Remediations preserve user behavior and Server/Client boundaries.
- Each rollout stage has diagnostics, tests/build evidence, and an independent
  rollback.

## Stop and Ask

- Any dependency or configuration mutation lacks explicit approval.
- `next.config.ts` would change.
- A diagnostic requires behavior, auth, public API, or shared-library changes.
- Official docs and the installed toolchain disagree on supported setup.

## Completion Contract

Report baseline lint/transform state, audited or approved scope, diagnostic
classification/remediations, exact validation, rollout stage and rollback,
and only material residual risk or incomplete validation.
