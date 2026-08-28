# RPC Boundary Decisions

Use before adding or changing `"use server"`.

## Server Action or private helper

| Consumer | Boundary |
| --- | --- |
| Client Component/form/event handler must invoke it | Server Action; public RPC rules apply |
| Server Component, metadata function, Route Handler, cron/webhook server code only | Private helper importing `"server-only"` |
| Both server and client need the same domain operation | Keep private implementation server-only; expose a narrow validated action adapter for the client |

A directory named `actions` does not make a function a Server Action.
The directive and import graph define the boundary.

## Trust sequence

Perform checks in this order unless the live protocol requires a deliberately
non-disclosing alternative:

1. bound payload size and parse/validate the runtime shape;
2. identify whether the established policy is principal-required,
   anonymous/public, or has both branches;
3. for principal-required branches, derive the server session identity and
   authenticate it;
4. for anonymous/public branches, verify the persisted public policy
   server-side rather than trusting a caller flag;
5. authorize the operation and concrete resource under the selected branch;
6. execute the downstream read/mutation;
7. validate downstream response data;
8. map to the established typed result.

Do not accept an owner identifier merely because it equals a typed string. For
resource IDs, normalize with the existing identifier helper, then verify that
the principal or explicitly validated anonymous/public policy permits the
operation.

## Authorization and disclosure

- Middleware protects matched navigation; it does not authorize a Server
  Action invocation.
- A page's access check does not transfer to an action called later.
- A downstream API check is defense in depth, not a reason to omit the action's
  established authorization rule.
- Preserve the live not-found/forbidden disclosure policy. Do not reveal
  resource existence through different messages, timing, or metadata without
  an approved policy change.

Any change to these rules routes to `react-auth` and requires explicit
approval.

## Transport and result

- Parse browser input and downstream JSON as `unknown`.
- Reuse `fetchWithTimeout`, transport parsers, identifier normalization, and
  the current `ServerActionResult<T>` mapping where the caller already uses
  them.
- Preserve status and error-code meaning. A malformed backend payload is a
  server/contract failure, not user validation.
- Do not return stack traces, raw backend bodies, tokens, provider errors, or
  secret-bearing objects.

## Timeouts, cancellation, and side effects

The browser canceling navigation does not prove server work stopped. Bound
downstream calls with the established timeout and propagate a signal only
where the API supports it.

For each mutation answer:

- Is retry safe before and after an unknown network outcome?
- Who creates the idempotency key, and what operation does it identify?
- What happens on duplicate submission?
- Which side effect commits first, and how is partial failure represented?
- Can telemetry identify the operation without recording sensitive data?

Never promise cancellation after an irreversible side effect has committed.
