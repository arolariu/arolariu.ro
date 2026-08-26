---
name: fix-bug
description: Reproduce, diagnose, and fix a specific repository defect with a regression test. Use for reported failures or unexpected behavior; prove the bug, trace the root cause, make the smallest fix, and verify the test fails without it and passes with it.
---

# Fix Bug

## When to Use

- A concrete behavior fails, regressed, flakes, or differs from an established
  expectation.
- A test, build, endpoint, page, worker, store, transport, or extension has a
  reproducible unexpected outcome.
- A narrowly scoped production correction and regression proof are required.

## When Not to Use

- Use the feature workflow when the requested behavior does not exist yet.
- Use `unit-test` when production behavior is correct and only coverage or test
  quality changes.
- Use `refactor` only after a defect is isolated when structural improvement is
  independently requested; opportunistic refactoring is prohibited here.
- Do not use this workflow for dependency migrations, unresolved product
  choices, or speculative cleanup.

## Required Inputs

- Observed and expected behavior, including the authority for the expectation.
- The smallest known reproduction, affected surface, inputs, environment, and
  first failing output or symptom.
- Affected source, public entry point, current tests/builders, and recent
  history for those files.
- Root/local guidance, matching path instructions, and relevant accepted RFC
  when architectural intent is involved.
- Current worktree status so pre-existing user changes remain distinguishable.

## Decision Points

Before editing production code, decide:

1. Whether the report is already deterministic; otherwise select the next
   evidence rung rather than guessing.
2. Which concrete failure signature and boundary the first symptom identifies.
3. Whether expected behavior is established by live contract/tests, accepted
   RFC, or explicit user requirement.
4. Which root-cause branch owns the defect: input/transport, state/lifecycle,
   boundary contract, layer/dependency, persistence/ownership, external
   dependency, environment/configuration, or intended-behavior mismatch.
5. What the smallest regression boundary is and how fail-without/pass-with
   will be demonstrated safely.
6. Whether that boundary keeps repository modules real. Aliases that redirect
   repository modules to substitutes, repository fake implementations, and
   module mocks are migration debt and cannot prove behavior owned by what
   they replace; move outward or report structural pressure when no compliant
   seam exists.
7. Whether a multi-file or risky correction needs an explicit rollback plan.
8. Whether the discovered change crosses a dependency, security, schema,
   infrastructure, destructive, or public-behavior boundary.

## Core Procedure

1. Read the report, entry point, affected path, tests/builders, applicable
   guidance, and recent history. Preserve unrelated worktree changes.
2. Reproduce at the highest available evidence rung. Record expected versus
   actual behavior, exact input, and the first causal failure rather than only
   downstream noise.
3. After the first concrete symptom, compare its signature with current known
   repository boundaries.
4. Trace from the public entry point through real calls and state transitions
   to the first violated invariant. Complete the root-cause decision before
   editing.
5. Write or retain the smallest regression test with repository behavior
   executing through real repository modules. Run it without the fix and
   confirm the assertion fails for the identified cause. If no compliant unit
   seam exists, reproduce at the next integration/E2E rung or report the
   structural pressure.
6. Apply the smallest production correction at the owning boundary. Do not
   rename, reorganize, modernize, or refactor adjacent code opportunistically.
7. Run the regression with the fix and confirm it passes without weakened,
   skipped, broadened, or deleted assertions.
8. Prove both directions: fail-without and pass-with. Prefer the pre-fix run;
   if proof is reconstructed, temporarily remove only the owned fix and
   restore it without resetting or overwriting user changes.
9. Run the narrow related suite/build that covers callers, contracts, and the
   affected boundary. Inspect the scoped diff and execute the rollback plan if
   a defined rollback trigger occurred.

## Resource Triggers

Load only the resource named by the current evidence or decision:

| Named trigger | Resource |
| --- | --- |
| The report is not already deterministic | [Reproduction ladder](references/reproduction-ladder.md) |
| After the first concrete symptom is captured | [Common failure signatures](references/common-failure-signatures.md) |
| Before the first production edit | [Root-cause decision tree](references/root-cause-decision-tree.md) |
| Selecting a current regression-proof shape for the identified boundary | [Regression-proof patterns](examples/regression-proof-patterns.md) |
| After the regression fails for the root cause and again before completion | [Regression-proof checklist](checklists/regression-proof-checklist.md) |
| The fix is multi-file, changes coordination/lifecycle/registration, or otherwise has a material rollback risk | [Rollback checklist](checklists/rollback-checklist.md) |
| Only after the first concrete reproduction or verification step fails unexpectedly | [Bug troubleshooting](references/troubleshooting.md) |

Do not open troubleshooting before attempting a concrete reproduction.

## Verification

- The original observed behavior is reproduced locally, or local reproduction
  is explicitly marked impossible with bounded external evidence.
- The root cause names the first violated invariant and owning source boundary,
  not merely the visible symptom.
- The regression test fails without the fix for that cause and passes with the
  fix.
- Existing assertions remain at least as strict; no skip, retry, delay, broad
  exception assertion, repository alias to a substitute, repository fake
  implementation, or module mock hides the defect.
- The smallest related suite/build passes and covers the affected caller or
  contract.
- The production diff is the smallest complete correction and contains no
  opportunistic refactor or unrelated cleanup.
- Any defined rollback trigger and restoration steps were evaluated.

## Stop and Ask

- The behavior is intentional, ambiguous, or externally relied upon.
- The fix changes a public contract or requires a materially different product
  or UX choice.
- Authentication/authorization/security, schema/data, infrastructure,
  deployment, dependency, destructive, or material cost change.
- Local reproduction remains impossible and external evidence is insufficient
  to identify one root cause.
- The only fix requires broad structural change; route that separately to
  `refactor` after defect isolation.

## Completion Contract

Report the deterministic reproduction, root cause, smallest fix, regression
test, fail-without/pass-with evidence, related validation, and only material
residual risk, rollback status, or incomplete validation.
