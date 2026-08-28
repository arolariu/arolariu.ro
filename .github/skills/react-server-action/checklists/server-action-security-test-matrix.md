# Server Action Security Test Matrix

Select all rows relevant to the action.

| Category | Prove |
| --- | --- |
| Runtime input | Missing, malformed, oversized, unknown, and cross-field-invalid input fails before a side effect |
| Identity | Caller-supplied user/owner fields cannot replace server-derived identity |
| Authentication | No session receives the established non-sensitive failure |
| Authorization | Authenticated wrong-role/wrong-owner/unshared users cannot read or mutate |
| Resource disclosure | Missing and inaccessible resources follow the approved not-found/forbidden policy |
| Happy path | Authorized input produces the exact downstream request and typed result |
| Transport response | Malformed or additive downstream data follows parser policy |
| Error mapping | Relevant 4xx, 5xx, network, timeout, and unknown failures map correctly |
| Telemetry | Expected span/events occur without secrets, tokens, or sensitive payloads |
| Cancellation/timeout | Downstream work is bounded and cleanup occurs |
| Duplicate/retry | Same idempotency key cannot repeat the protected side effect |
| Partial failure | Multi-step mutation reports and recovers/compensates according to its contract |
| Import boundary | Private helpers cannot enter a client graph; public action exports are intentional |

Use deterministic fixtures and assert forbidden side effects were not called
on every validation/auth failure. Test the action itself; do not mock it from
the component test that is meant to prove the RPC contract.
