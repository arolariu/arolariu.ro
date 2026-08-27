# Phased Rollout Checklist

Use only for a major, framework, runtime, or established-pattern migration.
A narrow compatible package update should not acquire unnecessary phases.

## Phase 0: Research and Approval

- [ ] Exact current/target state, official migration path, affected inventory,
      behavior contracts, validation, and rollback are complete.
- [ ] Coupled packages/framework plugins and required intermediate steps are
      explicit.
- [ ] Generated migration/codemod scope is previewed where the tool supports it.
- [ ] Dependency mutation and all generated/source scopes are explicitly
      approved.

**Exit:** approval covers a bounded sequence of independently reversible
phases.

## Phase 1: Baseline and Contract Protection

- [ ] Focused compile/type, tests, build, and runtime boundary pass before
      mutation.
- [ ] Contract-sensitive serialization, rendering, lifecycle, errors,
      cancellation, and public shape are characterized where existing tests
      are insufficient.
- [ ] Pre-existing failures are separated from migration failures.

**Exit:** the pre-migration state is reproducible.

## Phase 2: Resolution and Tooling

- [ ] Approved declarations change at the actual owner with the native package
      manager.
- [ ] Manifest plus owning lockfile or recorded resolution-evidence deltas are
      reviewed before source edits.
- [ ] Approved official migration tooling runs as a separate reviewed step.
- [ ] Tool/config/compiler/analyzer changes pass their smallest checks.

**Exit:** resolution is reviewed against the owner's lock/snapshot evidence and
tooling understands the target. Claim determinism only when the recorded
artifact enforces it, even if application cohorts still use temporary
documented compatibility paths.

## Phase 3: Bounded Consumer Cohorts

- [ ] Consumers are grouped by real boundary, not file count.
- [ ] One cohort moves from old to target APIs/config at a time.
- [ ] The cohort's focused tests/build/runtime checks pass before the next
      cohort.
- [ ] Any temporary adapter is internal, behavior-preserving, owned, and has a
      removal phase; no permanent dual contract is assumed.

**Exit:** every inventoried consumer is on the target or the migration stops at
a fully working, explicitly approved compatibility boundary.

## Phase 4: Runtime and Container Parity

- [ ] Startup, DI/lifecycle, serialization/rendering, generated artifacts, and
      external-boundary adapters work on the live runtime.
- [ ] Production install/container behavior matches the validated local graph.
- [ ] No undeclared/stale local dependency masks a production failure.

**Exit:** the target works in the actual execution environment.

## Phase 5: Remove Compatibility and Close

- [ ] Old imports, config keys, pins/references, shims, generated output, docs,
      and tests are removed only after all consumers migrate.
- [ ] Final resolution has no unexplained duplicate major, peer, downgrade,
      advisory, source, or integrity drift.
- [ ] Affected checks and scoped diff review pass.
- [ ] Rollback is updated to match the final phase boundaries.

Stop between phases if target/scope changes, protected behavior is implicated,
or rollback cannot restore the last green phase within its recorded guarantee.
