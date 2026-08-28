# React Compiler Adoption Matrix

## Before approval

- [ ] Dependency availability and exact ownership are verified from live files.
- [ ] ESLint plugin import/registration/rules are checked separately.
- [ ] Next transform option is checked separately from the SWC `compiler`
      object.
- [ ] Current official React and Next setup/compatibility docs were consulted.
- [ ] Audit scope, exclusions, baseline tests/build, and expected rollout stage
      are recorded.
- [ ] Dependency, ESLint/config, and `next.config.ts` mutations have explicit
      approval.

## Diagnostics and remediation

- [ ] Each finding has a file, diagnostic, behavior impact, and disposition.
- [ ] No bulk suppression or speculative memoization was introduced.
- [ ] Render purity, hooks, refs, effects, mutation, async races, and library
      boundaries relevant to the finding are covered.
- [ ] Server/Client Component ownership is unchanged unless separately
      approved.
- [ ] Focused tests fail for an actual behavior defect or otherwise prove
      preserved behavior around a compatibility remediation.

## Transform stage

- [ ] The option and required package/config come from current official docs.
- [ ] Transform is enabled only for the approved scope/stage.
- [ ] Diagnostics, type checking, targeted Vitest, and website build pass.
- [ ] Interaction, hydration, cleanup/race, and performance-sensitive paths
      relevant to the scope are validated.
- [ ] A documented diagnostic or output check proves the transform ran.

## Rollback

- [ ] Transform can be disabled independently.
- [ ] Diagnostic registration/scope can be reverted independently.
- [ ] Correct source remediations are classified separately.
- [ ] Baseline tests/build pass after rollback.
- [ ] Expansion stops on new behavior, build, hydration, or performance
      regression.
