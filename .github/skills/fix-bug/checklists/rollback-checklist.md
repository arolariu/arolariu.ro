# Rollback Checklist

Use before implementing a multi-file fix or one that changes coordination,
lifecycle, registration, persistence handling, or another materially risky
boundary. This checklist does not authorize schema, data, security,
infrastructure, or destructive changes.

## Before the Fix

- [ ] Record the current worktree and separate pre-existing user changes from
      the planned fix.
- [ ] List every owned file and the invariant each edit must restore.
- [ ] Define the rollback trigger: regression still fails, related contract
      breaks, runtime cannot start, data/state is lost, or scope expands.
- [ ] Define a non-destructive reverse step for each file. Do not rely on a
      whole-tree reset or checkout.
- [ ] Preserve the original reproduction and targeted validation so rollback
      can be verified.

## Boundary-Specific Reversal

- [ ] **Exports/signatures:** restore caller and callee together; remove no
      public symbol while a consumer remains.
- [ ] **DI/constructors:** reverse registrations, constructor arguments, and
      architecture expectations as one coherent unit.
- [ ] **State/lifecycle:** restore transition and cleanup behavior together;
      do not clear persisted user state to simulate rollback.
- [ ] **Persistence/ownership:** stop and ask if reversal needs schema/data
      mutation, partition changes, or authorization changes.
- [ ] **Generated artifacts:** restore source inputs first and use the
      repository-owned generator; never hand-maintain divergent output.
- [ ] **Tests:** retain the regression test when it documents the valid
      contract; if behavior is unresolved, revert the assertion and stop rather
      than encoding a guess.

## Execute Rollback When Triggered

- [ ] Reverse only edits owned by this fix in dependency-safe order.
- [ ] Confirm pre-existing user changes remain byte-for-byte outside the owned
      hunks.
- [ ] Rerun the original reproduction and baseline targeted selection.
- [ ] Confirm the tree is coherent: no dangling import/export, registration,
      generated output, or half-applied test expectation.
- [ ] Report the trigger, reversed files, resulting behavior, and blocker.

Do not use rollback as permission to experiment past a stop-and-ask boundary.
