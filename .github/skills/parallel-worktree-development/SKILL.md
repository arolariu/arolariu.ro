---
name: parallel-worktree-development
description:
  Use when coordinating multiple GitHub Copilot CLI sessions, Git worktrees, or Fleet subagents for parallel work in this monorepo.
---

# Parallel Worktree Development

One mutable checkout per orchestrator. Fleet tasks under one controller share that lane's checkout; separate top-level sessions isolate
independent writers. A Git worktree is not a process, data, or security sandbox.

## Preflight

1. Agree on the workstream branch and base SHA. Prefer the CLI's native `/new worktree` or `/fork worktree` when it can start from the
   intended base. For an existing linked checkout, open `copilot -C "<worktree path>" --name "<lane name>"`. To resume, use the exact
   session ID with `copilot --resume "<session-id>"`, not the last active session.
2. From each session, run `git rev-parse --show-toplevel`, `git branch --show-current`, and `git rev-parse HEAD`. Check the root and branch
   against the packet. A newly issued lane starts at the expected base; on resume, confirm it is still an ancestor with
   `git merge-base --is-ancestor <baseSha> HEAD`. Stop before writes on mismatch. Preserve existing changes. Use
   `npm run doctor -- --quick --json` for `workspace.git` evidence when local npm dependencies are installed.
3. Prepare and verify the lane using [the development guide](../../../DEVELOPMENT.md#parallel-git-worktrees-windows). Verify the effective
   checkout roots of MCP tools from inside the session before using them; use checkout-local built-ins if optional tools are missing or
   mis-scoped. Do not grant access to a sibling checkout to make such a tool work.

## Dispatch

Freeze the write sets **before** running `/fleet`; paths below are relative to the verified checkout. Give each task a bounded packet like
this (fill in the session/root/branch/SHA and choose a test that covers the actual change):

```yaml
session: <exact session ID or name>
checkout: <verified absolute path>
branch: feat/invoice-ui
baseSha: <approved commit>
role: Frontend Expert
writePaths: [sites/arolariu.ro/src/app/domains/invoices/view-invoices/]
readOnlyPaths: [sites/api.arolariu.ro/src/Invoices/DTOs/]
sharedOwner: controller, for DTO changes and tracked generated output
checks:
  - npm run test:unit --workspace @arolariu/website -- --coverage.enabled=false useFilteredInvoices.test.tsx
runtime: unit tests only; no live stack
report: status, checkout root, branch, changed paths or commits, exact command results, blockers
```

Use the Backend Expert for API-owned files and the owning MSTest project for checks. Compare write paths for equality and
ancestor/descendant overlap (case-insensitive on a normal Windows checkout). On overlap, assign one writer and make the other task read-only
or wait for an explicit handoff. Treat root manifests/lockfiles, locales, DTOs, and tracked generated artifacts the same way. Start contract
consumers from the approved contract revision. Pass the recorded base explicitly to `nx affected`, rather than relying on the default base.
Use Fleet only for independent work; do not dispatch the same tasks through both Fleet and a serial implementer/reviewer workflow. A child
does not change into a sibling worktree.

## Handoff

Keep temporary briefs and results in per-session or ignored per-plan storage. Confirm the reported root and diff match the packet, then
combine and validate reviewed changes at the orchestrator level. Route live Aspire/Selfhost, Newman, and reset requests to the
[integration owner](../../../DEVELOPMENT.md#reserve-one-full-stack-integration-slot). Stop only owned processes. Before any approved
non-forced worktree removal, close the session and verify there is no unpreserved work; do not prune registrations automatically.
