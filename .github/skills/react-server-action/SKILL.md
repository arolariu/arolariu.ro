---
name: react-server-action
description: Create or materially change a Next.js use-server export for the arolariu.ro website. Use for browser-callable Server Functions/Actions requiring validation, server-derived identity, authorization, transport mapping, telemetry, timeouts, idempotency, and focused tests.
---

# React Server Action

## When to Use

- Create or materially change an exported function from a `"use server"`
  module.
- Change its input/result contract, authorization, downstream transport,
  telemetry, timeout, side effect, or idempotency behavior.
- Add focused tests for a browser-callable Server Function/Action.

## Security Boundary

Treat every `"use server"` export as public RPC input from an untrusted
browser. TypeScript types, hidden UI, middleware, and a Server Component caller
do not establish trust.

Use a private module importing `"server-only"` when only server code needs the
operation. Do not add `"use server"` for organizational symmetry.

## Required Inputs

- Every caller and the reason a browser must invoke the operation.
- Runtime input schema/guards, identity source when a principal is required,
  anonymous/public rule when allowed, resource policy, and non-disclosure
  behavior.
- Downstream transport, response parser, timeout/cancellation contract,
  side effects, retry/idempotency semantics, and typed result mapping.
- Existing telemetry boundary and focused sibling tests.

## Procedure

1. Decide RPC versus private helper. If no client invocation is required, use
   or create a private `"server-only"` helper instead.
2. Inventory every export in a file-level `"use server"` module; each export
   must be safe for browser invocation.
3. Validate the runtime shape, size, identifiers, enums, and cross-field
   invariants before side effects. Reject unknown/untrusted data deliberately.
4. Derive identity from the server session when the policy requires a
   principal. Ignore or reject caller-supplied owner/user/tenant fields; never
   use them as authorization evidence.
5. Enforce the action's complete access policy independently. Authenticate and
   authorize principal-required branches; explicitly validate any established
   anonymous/public branch; verify resource access before reading sensitive
   data or mutating it; preserve non-disclosing failures.
6. Reuse the current transport wrapper and validate response JSON from
   `unknown` before returning it. Preserve the caller's typed discriminated
   result/error contract.
7. Preserve the RFC 1001 span boundary and events. Record operational context,
   never tokens, message bodies, secrets, or sensitive payloads.
8. Bound downstream work with the established timeout/abort mechanism. Define
   what can be canceled and what remains committed if the caller disconnects.
9. For side effects, define idempotency key ownership, duplicate submission,
   retries, ordering, and partial-failure behavior before implementation.
10. Test validation, principal-required unauthenticated/unauthorized cases,
    established anonymous/public cases, ownership, transport parsing/mapping,
    timeout, idempotency, and side effects as applicable; then run targeted
    website verification.

## Resource Triggers

| Trigger | Resource |
| --- | --- |
| Before deciding RPC/private helper, trust boundaries, identity, resource authorization, result mapping, timeout, or idempotency | [RPC boundary decisions](references/rpc-boundary-decisions.md) |
| Need current invoice, email, or private helper evidence | [Live action examples](examples/live-actions.md) |
| Before selecting security and behavior tests | [Server Action security test matrix](checklists/server-action-security-test-matrix.md) |

## Verification

- Every exported Server Action independently validates and enforces its
  principal-required and/or anonymous/public policy.
- Identity and resource ownership are server-derived when a principal is
  required.
- Untrusted request and response data cross runtime validation boundaries.
- Results are typed and non-sensitive; telemetry contains no credentials or
  payload secrets.
- Timeouts, retries, duplicate side effects, and partial failures have explicit
  behavior and focused coverage.

## Stop and Ask

- Authentication, authorization, guest/public/shared/owner, or route behavior
  would change; route the decision through `react-auth`.
- A dependency, public route/API contract, or security policy must change.
- Safe idempotency or partial-failure semantics cannot be derived from current
  behavior.

## Completion Contract

Report why the export is browser-callable, its validation/identity/
authorization and resource policy, transport/result/telemetry/timeout/
idempotency behavior, exact tests run, and only material residual risk or
incomplete validation.
