# Transformation Catalog

Select only the transformation that addresses the approved smell. Each row is
one coherent step; combining rows requires validation between them.

| Transformation | Preconditions | Forbidden behavior changes | Targeted validation | Rollback |
| --- | --- | --- | --- | --- |
| Extract a focused utility, component, hook, or service | A cohesive responsibility and stable caller contract are characterized; a current sibling confirms the owning location | Do not alter inputs, outputs, copy, accessibility, error semantics, side-effect order, or make domain code artificially shared | Run caller characterization plus the extracted unit's focused tests; verify imports and public entry points | Inline the extracted behavior back into the caller, restore the prior imports, and remove only the new unreferenced file/export |
| Split a Server/Client boundary | Browser APIs, hooks, state, or handlers form a clear client island while server data/auth/metadata remain server-owned | Do not move server-only work client-side, change serialized props, hydration output, auth enforcement, messages, or metadata | Run route/component behavior tests and the website type/build boundary that resolves server and client modules | Restore the prior component boundary and prop flow; remove only newly introduced island/shell files after consumers point back |
| Consolidate duplicated domain logic | All callers are proven semantically equivalent for valid, invalid, and edge inputs | Do not choose one divergent behavior, broaden a domain helper into the shared component package, or change ownership semantics | Run every former caller's tests plus focused tests for the consolidated boundary | Restore independent implementations from the pre-step diff and remove the shared helper after all imports are restored |
| Move coordination to the established Processing, Orchestration, or Management owner | Live API guidance and architecture tests show coordination is in the wrong existing layer; downstream contracts are characterized | Do not put business logic in Brokers, create Foundation-to-Foundation calls, bypass the Management entry point, or change exception/telemetry/cancellation behavior | Run the affected Processing/Orchestration/Management service tests, exception tests, constructor/architecture tests, and adapter tests | Restore method ownership, constructor dependencies, interfaces, registrations, and caller direction as one rollback unit |
| Reduce service dependencies | A delegating boundary can absorb coordination without hiding dependencies; current constructor and behavior contracts are pinned | Do not introduce a service locator, dependency bag, generic façade, circular dependency, or wider layer access | Run constructor architecture tests, DI composition checks, and behavior/exception tests for both services | Restore the former constructor, fields, DI registration, and calls together; remove the intermediary only after references are restored |
| Normalize identifier or transport helpers | Duplicate conversions/guards have identical accepted values, rejected values, normalization, ownership, and serialization semantics | Do not broaden coercion, alter partition/user identity, rename wire fields, change null handling, or silently accept malformed success payloads | Run transport, DTO, guard, security/ownership, and caller tests | Restore caller-local conversion in each affected path, then remove the shared helper/export |
| Split a large focused file | Stable seams already exist by responsibility, partial-class convention, or pure-versus-effectful logic; public shape is characterized | Do not change exported names/signatures, initialization order, CSS/render order, exception classification, or async sequencing | Run the same behavior tests after each file extraction, then type/build and architecture checks for the owner | Recombine the moved declarations without rewriting them, restore the original imports/partial files, and delete only empty new files |

## Selection Rules

1. Name the smell in one sentence.
2. Pick the narrowest row that removes it.
3. Read
   [dependency-boundary-decisions.md](dependency-boundary-decisions.md) before
   crossing a route, package, standalone-site, or API layer boundary.
4. Define the single rollback unit before editing.
5. Run the
   [incremental validation checklist](../checklists/incremental-validation.md)
   before selecting another row.

Formatting, opportunistic renames, behavior fixes, dependency upgrades, and
contract redesign are not transformations in this catalog.
