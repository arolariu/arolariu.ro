# Regression-Proof Checklist

Use once after the regression fails for the diagnosed cause and again before
completion.

## Reproduction

- [ ] Expected behavior has a named authority.
- [ ] The exact input, state, actor/ownership context, and environment are
      recorded.
- [ ] The reproduction is the smallest deterministic boundary available.
- [ ] The first causal failure is separated from downstream noise.

## Root Cause

- [ ] The first violated invariant and owning source path are identified.
- [ ] The diagnosis explains the observed behavior end to end.
- [ ] Recent history and current callers do not reveal intentional behavior.
- [ ] The proposed fix corrects the cause rather than suppressing the symptom.

## Fail Without

- [ ] The regression test ran without the fix.
- [ ] It failed at the intended assertion, not during setup/import/build.
- [ ] The failure message/output is retained in the task evidence.
- [ ] If reconstructed after implementation, only the owned fix was
      temporarily removed and restored; no reset/checkout overwrote user work.

## Pass With

- [ ] The same test, input, and environment pass with the fix.
- [ ] No assertion was deleted, weakened, broadened, skipped, retried, or
      delayed.
- [ ] Repository behavior executes through real repository modules.
- [ ] Negative assertions prove the forbidden side effect/state/call is absent
      when relevant.

## Related Validation

- [ ] The narrow related caller/contract suite passes.
- [ ] The smallest relevant build passes when compilation, generated types,
      DI, or public signatures are affected.
- [ ] Cancellation, ownership/partition, cleanup, and exact exception behavior
      remain intact when adjacent to the defect.
- [ ] No unrelated test failure is labeled a regression without baseline
      evidence.

## Scope

- [ ] The production change is the smallest complete fix.
- [ ] No opportunistic rename, reformat, extraction, modernization, or refactor
      is included.
- [ ] No pre-existing user change was overwritten.
- [ ] The scoped diff contains the regression and only required supporting
      artifacts.
