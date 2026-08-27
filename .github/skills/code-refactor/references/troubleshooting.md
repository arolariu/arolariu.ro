# Refactor Troubleshooting

Load this resource only after a concrete validation failure. Capture the exact
failing check and the last coherent transformation first.

| Failure signature | First probe | Behavior-preserving correction | Stop when |
| --- | --- | --- | --- |
| Import cycle or initialization-before-definition failure | Trace only the new import edges and compare them with the pre-step graph | Back out the last move; relocate a context-neutral type/helper to an existing lower owner only when boundary guidance permits it | Breaking the cycle requires a new abstraction, service locator, or reverse dependency |
| Lost export, unresolved alias, or consumer import failure | Inspect the owning public entry/barrel and all direct consumers; distinguish internal path imports from supported exports | Restore the previous export name or a behavior-neutral forwarding export, then update only imports whose file moved | A rename or export removal would change the public contract |
| Tests fail because mocks target the old module path | Determine whether the mock represents a true external boundary or a repository module | Preserve external-boundary doubles at their supported seam; let repository-module tests use the real moved module and keep assertions behavioral | Passing requires preserving an implementation-detail mock or weakening assertions |
| Type inference widens, narrows, or loses a discriminant | Compare the exported signature and inferred consumer type before/after the move | Add a precise explicit type at the stable boundary or restore the old declaration location; never use `any` | The old and desired public type differ materially |
| Backend architecture/DI test fails | Inspect constructors, interfaces, registrations, and adapter entry points changed in the last step | Restore the approved dependency direction and move coordination to the established owner; keep constructor and registration changes atomic | The target graph needs a new layer, public use case, or extra dependency beyond current limits |
| Hydration, hook, or server-only module error | Inspect `"use client"`, browser/server imports, serialized props, and the nearest working route sibling | Move only interactive code into the island and keep server-only work in the shell; restore prior render output and prop values | Resolving it changes auth, metadata, data ownership, or UX |
| Behavior/contract test drifts after a green baseline | Compare the first failing assertion with the one transformation just applied | Revert that transformation, then retry with a smaller seam while preserving ordering, errors, serialization, and cancellation | The drift is desired or current behavior is ambiguous; that requires a separate decision |
| New warning, generated-file mismatch, or build-only failure | Identify the exact owner from live project configuration and inspect whether the move invalidated generation/config inputs | Update only moved paths/exports owned by the refactor, regenerate through the existing owner when required, and rerun the same check | Fixing it requires dependency, workflow, infrastructure, or unrelated configuration changes |

## Recovery Order

1. Stop additional transformations.
2. Preserve the failure output and current scoped diff.
3. Use the
   [rollback checklist](../checklists/rollback-checklist.md) for the last
   coherent step.
4. Re-establish the pre-step characterization baseline.
5. Re-read the matching decision resource and choose a smaller transformation.

Do not suppress type, architecture, lint, or test failures to make a refactor
appear behavior-preserving.
