# Root-Cause Decision Tree

Complete this decision before changing production code. Trace the real path
from entry point to the first violated invariant; later failures are effects.

## 1. Confirm the Expected Behavior

- **Live contract or existing focused test establishes it:** continue.
- **Accepted RFC establishes intent but source differs:** report drift. Stop if
  choosing which side to change alters behavior.
- **Only the report establishes it:** verify with the user request and public
  contract.
- **Existing behavior is intentional or callers rely on it:** stop and ask.

## 2. Classify the First Violated Boundary

| Branch | Questions | Inspect | Root-cause evidence | Stop/ask when |
| --- | --- | --- | --- | --- |
| Input or transport | Was untrusted input validated? Did request and response shapes, identifiers, dates, enums, sentinels, or status handling match? | Website action/request builder, `sites/arolariu.ro/src/types/invoices/transport.ts`, API DTO/endpoint/Broker mapping, paired contract tests | Smallest raw input that reaches the wrong accepted/rejected result and the exact parser/mapper branch | Correct wire/public contract is ambiguous or changing it breaks consumers |
| State, lifecycle, or race | Is state owned at the right lifetime? Did stale async work win? Was cleanup/abort/focus/hydration omitted? | Component/hook/store source, effects, pending-request guards, object URL/event/subscription cleanup, current race tests | Deterministic sequence showing ordering and the first stale/leaked transition | Fix requires a new global state owner or materially different UX |
| Boundary contract | Does a caller assume more/less than the callee guarantees? Is a repository module bypassed or a successful result malformed? | Public types/interfaces, parser/result union, Management contract, exception mapper, closest caller and callee tests | Mismatched precondition/postcondition at the exact boundary | Public API behavior must change |
| Layer or dependency | Is behavior in the wrong layer, bypassing Management, calling sideways, missing DI, or classifying a direct dependency incorrectly? | API service path, constructor graph, `.Exceptions.cs` partials, registration module, architecture tests | First incorrect dependency/call/classification and expected direct-layer contract | Fix changes approved layer direction/responsibility or adds a dependency |
| Persistence or ownership | Is stale/invalid state rehydrated? Is partition/owner/shared/public context missing? Are write ordering or deletion semantics wrong? | Zustand persist/storage source, API Broker partition branch, ownership tests, write/retry tests | Known persisted row/document and actor context producing the wrong result | Schema, migration, partition-key, authorization, or data repair is needed |
| External dependency | Is the repository contract correct but provider/SDK/network behavior failing? Is translation/retry policy wrong? | Real Broker or external adapter, SDK exception mapping, external transport/record fixtures, provider diagnostics | Provider-neutral reproduction through the real repository boundary or sanitized external evidence tied to one adapter branch | New integration/dependency, credential/security change, or provider-only uncertainty |
| Environment or configuration | Is source correct but generated output, test environment, build property, runtime registration, or extension readiness stale/missing? | Generator/config source, project config, local guide, extension status/log, environment-specific setup | Same source/input succeeds and fails solely with one controlled configuration difference | Production workflow/infrastructure/security configuration must change |
| Intended-behavior mismatch | Does implementation match the accepted behavior while the report expects something else? | User request, public docs/contracts, RFC, current tests, recent history | Contradictory authorities or evidence that current behavior is deliberate | Always stop before changing behavior |

## 3. Validate the Root Cause

The diagnosis is sufficient only when all are true:

1. It explains every relevant observation without introducing a second
   unproven cause.
2. A minimal input or state reaches the suspected branch.
3. Removing or correcting that branch changes the regression outcome.
4. The proposed correction belongs to the source boundary that owns the
   invariant.
5. Adjacent cleanup is unnecessary for correctness.

If the correction spans several architectural concerns, isolate the defect
first and route structural improvement to `refactor` as separate work.
