---
name: code-review
description: Review an existing worktree, diff, pull request, commit, or branch range read-only across repository stacks for evidence-backed security, correctness, architecture, contract, performance, and missing-test defects; ignore style-only feedback and route fixes to the owning specialist.
---

# Code Review

## When to Use

- Review the current staged, unstaged, and in-scope untracked changes.
- Review a named pull request, commit, branch, or comparison range.
- Perform an independent post-implementation review.
- Re-review a corrected diff to determine whether blocking findings remain.

## When Not to Use

- Do not use this skill for planning or implementation.
- Do not edit, fix, approve, commit, push, or manufacture validation evidence.
- Do not review formatting, naming taste, import order, or subjective
  maintainability without demonstrated behavioral impact.
- Do not expand a bounded review into a repository-wide audit without approval.
- Route an explicitly exploit-focused security review to the platform's
  security-review specialist.

## Required Inputs

- Exact review target: current worktree, pull request, commit, branch, or
  comparison range. If unspecified, use only the current worktree; do not fetch
  or infer a remote base.
- Current branch and staged/unstaged/untracked state.
- Complete changed files plus direct consumers, public entry points, tests,
  configuration, and generated ownership relevant to each material hunk.
- Root and nearest local guides, matching path instructions, and accepted RFCs
  only where an architecture claim needs intent.
- Existing validation evidence. Source or test-file presence is not proof that
  a check ran.

## Decision Points

1. What exact diff/range is in scope?
2. Which changed behaviors, trust boundaries, public contracts, persistent
   state, lifecycle/cancellation paths, or dependency directions are reachable?
3. Which stack-specific review resource applies?
4. What source owns the expected behavior?
5. Does a candidate meet reachability, impact, confidence, and line-evidence
   thresholds?
6. Is it one root cause or a downstream duplicate of another finding?
7. Which specialist and remedy skill own the correction?

## Core Procedure

1. Freeze the review target and inspect branch plus complete worktree state.
   Include in-scope untracked files; do not reason from a partial staged diff.
2. Read every changed file in context. Follow direct consumers, configuration,
   public exports/contracts, and tests where the hunk's behavior depends on
   them.
3. Load only the applicable local guides, path instructions, and
   stack-specific review resources.
4. Build a behavior map for each material change: entry point, reachable
   caller, inputs, trust boundary, state/side effects, error/cancellation
   behavior, public shape, and existing proof.
5. Trace each candidate to the first violated invariant. Name the authority
   for expected behavior and rule out intentional, already-tested differences.
6. Apply the finding gates below. Reject style-only, unreachable,
   contradicted, duplicate, and low-confidence candidates.
7. Inspect supplied or safely available validation evidence under the Code
   Reviewer agent's read-only tool restrictions. Do not run package scripts,
   interpreters, or commands that can mutate the worktree.
8. Order admitted findings by severity, route the correction, and list only
   material validation gaps.

## Resource Triggers

Load only the resources whose changed boundaries are present:

| Trigger | Resource |
| --- | --- |
| TypeScript, React, Svelte, browser-worker, or Node boundary changed | [TypeScript and UI review](references/typescript-review.md) |
| .NET API, service, worker, Broker, endpoint, DI, or DTO boundary changed | [.NET review](references/dotnet-review.md) |
| Experimental Python/FastAPI boundary changed | [Python review](references/python-review.md) |
| Any changed path is matched by Agent Asset Governance, or MCP configuration changed | [AI asset review](references/ai-assets-review.md) |
| Bicep, GitHub Actions, deployment, or local orchestration boundary changed | [Infrastructure review](references/infrastructure-review.md) |

Cross-stack diffs may load more than one resource. Do not preload unrelated
catalogs.

## Finding Gates

A candidate is a finding only when all apply:

- the changed source/configuration is inside the requested scope;
- a reachable caller, runtime path, or supported consumer exists;
- expected behavior has a named authority;
- impact is security, correctness, data loss, public contract, architecture,
  material performance, or missing proof for materially changed behavior;
- the finding cites the changed line or nearest owning source line;
- no intentional and already-tested behavior contradicts the claim.

A missing test is reportable only when behavior materially changed and current
coverage does not exercise that change. Test absence alone does not prove a
production defect.

## Confidence and Severity

| Confidence | Admission |
| --- | --- |
| High | Direct source/configuration plus caller evidence proves the reachable defect, or executed evidence reproduces it; no material assumption remains |
| Medium | Contract and reachability are supported, but one bounded runtime/environment fact remains unverified; state it explicitly |
| Low | Material reachability, contract, or runtime assumptions remain; do not report it as a finding |

Critical and High findings require High confidence. Severity describes impact,
not reviewer certainty.

| Severity | Threshold |
| --- | --- |
| Critical | Exploitable vulnerability, auth/authz bypass, compromise-enabling secret exposure, or realistic broad/security-relevant irreversible data loss |
| High | Confirmed correctness defect, broken supported public contract, substantial data-loss risk, or runtime-changing architecture violation |
| Medium | Missing proof for materially changed behavior, or a recoverable/narrow defect with bounded impact |
| Low | Reachable, evidenced, low-impact edge case with an actual consumer |

Prefer one root-cause finding over several symptoms. Do not promote a lint or
formatter diagnostic into a behavioral finding.

## Output Contract

Report:

```markdown
## Blocking findings

- [High] Concise defect title - `path/file.ext:line`
  - Evidence: changed behavior and authoritative contract
  - Impact: reachable user/runtime/security consequence
  - Confidence: High
  - Correction: smallest required outcome, not a patch
  - Route: owning specialist using `remedy-skill`, or direct approved handling

## Non-blocking findings

- [Medium] ...

## Material validation gaps

- Missing evidence and what would resolve it
```

Order Critical, High, Medium, then Low. Omit empty finding sections. If no
candidate meets the threshold, say:

`No finding meets the evidence threshold.`

Still state material validation gaps. Do not add praise, recap, or speculative
"consider" items.

## Stop and Ask

- The requested range is ambiguous and materially different comparisons are
  plausible.
- Review scope must expand beyond the requested diff/range.
- A suspected issue depends on an unresolved product, public-contract,
  architecture, auth/security, schema/data, infrastructure, or deployment
  decision.

## Completion Contract

Return only admitted findings ordered by severity, followed by material
validation gaps. Every finding includes line evidence, reachability/impact,
confidence, correction outcome, owner, and either an existing remedy skill or
explicit direct handling with its approval checkpoint. Do not approve while an
unresolved Critical or High finding remains.
