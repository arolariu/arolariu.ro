# Auth Change and Rollback Matrix

Complete the relevant rows before implementation.

## Approval and behavior

| Item | Required evidence |
| --- | --- |
| Approval | Exact route/action/resource behavior authorized to change |
| Current state | Source pointers and observed result for every affected actor |
| Proposed state | Redirect/status/result and disclosure policy per actor |
| Enforcement | Matcher, page/layout, handler, action, and downstream owner |
| Identity | Server source and identifier normalization |
| Negative side effects | Protected read/mutation is not invoked after denial |

## Actor/resource test matrix

Mark each applicable combination with expected allow/deny and response shape:

- guest × private/public/missing;
- authenticated unrelated user × private/public/shared/missing;
- explicitly shared user × shared/unshared/soft-deleted;
- owner × active/soft-deleted/missing;
- required role/admin × correct role/wrong role/no session;
- forged caller owner/role/sharing input;
- expired/invalid session or invalid webhook signature.

Use unit/integration tests for server policy and E2E for middleware redirects,
cookie/session navigation, or provider integration that cannot be proven
below the browser boundary.

## Rollback

- Identify the smallest matcher/policy/action change to revert.
- Preserve pre-change tests so rollback restores the old actor matrix.
- Avoid data migrations for a code-only auth rollout; if data changes are
  unavoidable, define a separately approved backward-compatible rollback.
- Record safe monitoring signals: authorization denials, redirect loops,
  action auth failures, and unexpected public-resource access.
- Define the threshold and owner for rollback without logging sensitive
  identities or payloads.
