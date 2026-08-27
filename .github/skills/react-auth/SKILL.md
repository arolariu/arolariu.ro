---
name: react-auth
description: Investigate or implement explicitly approved Clerk and website access-control changes. Use for proxy matchers, server redirects, guest/public/shared/owner policy, route handlers, and independent Server Action authorization with a rollback and actor test matrix.
---

# React Authentication and Authorization

## Approval Gate

Research and read-only investigation may begin immediately. Do not mutate
authentication, authorization, matcher, redirect, guest/public/shared/owner,
or resource-disclosure behavior without explicit approval for that behavior.
Approval to inspect or fix an unrelated component is not auth approval.

## When to Use

- Change `src/proxy.ts` matchers or Clerk middleware behavior.
- Change a server page redirect or access decision.
- Change guest, public, shared-user, owner, role, or resource policy.
- Change authentication/authorization in a Route Handler or Server Action.
- Audit an auth boundary and produce a test/rollback plan.

## Non-Negotiable Boundaries

- Never move an access decision into a Client Component.
- Client auth state may tailor already-authorized presentation; it cannot
  protect data or a mutation.
- Every Server Action independently enforces its applicable policy, even when
  middleware or its rendering page checked access. Principal-required branches
  authenticate/authorize; established anonymous/public branches are explicitly
  validated rather than accidentally removed.
- Preserve non-disclosure behavior for missing versus forbidden resources
  unless the approved change explicitly alters it.

## Required Inputs

- Explicitly approved behavior and affected routes/actions/resources.
- Actor/resource matrix: guest, authenticated non-member, shared user, owner,
  role/admin, public/private, missing, soft-deleted as applicable.
- Current Clerk matcher, server page checks, Route Handlers, Server Actions,
  downstream enforcement, tests, telemetry, and rollback mechanism.

## Procedure

1. Trace the complete request path from matcher through server page/handler/
   action to the downstream resource check. Record current behavior by actor.
2. Identify the single policy decision being changed, its authority, and
   whether it changes route visibility, resource disclosure, or mutation
   rights.
3. If mutation is not explicitly approved, stop after reporting evidence and
   a proposed actor/test/rollback matrix.
4. Define deny-by-default behavior and server-derived identity. Decide the
   expected redirect/status/result for every affected actor/resource pair.
5. Keep coarse route matching in `src/proxy.ts`; enforce route/resource rules
   in server pages, Route Handlers, and every Server Action that owns them,
   including explicit anonymous/public branches where established.
6. Validate webhook signatures and action/handler inputs before identity or
   resource side effects. Never trust caller-supplied owner identifiers.
7. Add focused negative tests before the approved implementation, including
   assertions that protected reads/mutations were not invoked.
8. Implement the smallest server-owned policy change and preserve
   security-safe telemetry without tokens, claims payloads, or personal data.
9. Execute the actor matrix, targeted unit/integration tests, and browser E2E
   only for middleware/redirect/cookie navigation behavior.
10. Verify the documented rollback restores prior matcher/policy behavior and
    list monitoring signals for denial spikes or accidental exposure.

## Resource Triggers

| Trigger | Resource |
| --- | --- |
| Before deciding matcher, redirect, route-handler, action, resource, disclosure, or identity ownership | [Access-control decisions](references/access-control-decisions.md) |
| Need current Clerk, auth page, invoice access, Route Handler, or action evidence | [Live auth surfaces](examples/live-auth-surfaces.md) |
| Before requesting approval or implementing/testing/rolling back a change | [Auth change and rollback matrix](checklists/auth-change-and-rollback-matrix.md) |

## Verification

- Approval matches the exact behavior changed.
- All access enforcement remains server-owned and deny-by-default.
- Middleware, page, Route Handler, Server Action, and downstream checks are
  complementary rather than assumed to transfer trust; guest/public cases are
  covered explicitly.
- Negative actor/resource cases and rollback are proven.

## Stop and Ask

- Any auth/security behavior mutation lacks explicit approval.
- Guest/public/shared/owner semantics or missing/forbidden disclosure are
  ambiguous.
- Clerk configuration, dependency, public route contract, or secret handling
  would change beyond the approval.

## Completion Contract

Lead with approved policy outcome and server-owned enforcement points. Report
the actor/resource matrix, exact tests, rollback, monitoring, and only material
residual risk or incomplete validation.
