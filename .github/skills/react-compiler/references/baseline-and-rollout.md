# Compiler Baseline and Rollout Decisions

Use before diagnosing or enabling React Compiler.

## Three independent states

| State | Evidence |
| --- | --- |
| Dependency available | Package manifest/lock contains the required package |
| Diagnostics active | ESLint config imports/registers the current documented plugin/rules and a lint run reports from them |
| Transform active | Next/build config enables the documented React Compiler transform and build diagnostics/output confirm it ran |

None implies another. The `compiler` property already present in Next config
contains SWC transforms such as console/property removal and must not be
described as React Compiler.

## Baseline audit

Record:

- approved source scope and exclusions;
- current React hook/rules lint configuration;
- plugin registration (not just installation);
- top-level Next React Compiler option presence;
- Babel or alternate transform configuration if any;
- generated/vendor/story/test treatment;
- targeted tests and build result before mutation.

Inspect compiler diagnostics first. Likely review areas include render
mutation/impurity, conditional hooks, ref access during render, effect-driven
derived state, mutable aliases, and unsupported library APIs. Treat current
tool diagnostics and official docs as authority; do not invent a static list
of guaranteed incompatibilities.

## Diagnostic disposition

For every finding choose one:

1. behavior bug that should be fixed regardless of compiler;
2. behavior-preserving compatibility remediation;
3. unsupported external/generated boundary to exclude at the narrowest scope;
4. verified tool false positive to document narrowly;
5. behavior/API change requiring separate approval.

Do not bulk-disable diagnostics, add `useMemo`/`useCallback` everywhere, or use
an opt-out directive unless current official docs support it and the specific
case is documented.

## Staged rollout

Prefer stages that can be independently validated and reverted:

1. baseline only;
2. diagnostics on a narrow website scope;
3. source remediation with transform still off;
4. transform for the approved scope;
5. measured expansion.

Keep server/client boundaries unchanged. Include hooks with lifecycle/race
tests and high-interaction client islands in validation; compilation is not a
replacement for behavior tests.

## Rollback

Define separate rollback switches for:

- transform enablement;
- diagnostic rule registration;
- scope/exclusion changes.

Correct source remediations need not be reverted merely because the transform
is rolled back. After rollback, rerun the pre-adoption targeted tests/build and
confirm no stale generated/cache evidence is being mistaken for active
compilation.
