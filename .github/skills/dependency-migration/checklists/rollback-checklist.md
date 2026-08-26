# Dependency Migration Rollback Checklist

Prepare this before the first approved mutation. Roll back only migration-owned
changes and preserve unrelated worktree changes. Never use a hard reset,
history rewrite, force checkout, or wholesale lockfile restoration that can
discard other work.

## Record the Prior State

- [ ] Exact prior direct declarations, peer ranges, runtime/tool settings, and
      available lock entries or lockless graph observations are recorded from
      live evidence.
- [ ] Each owner is labeled lock-backed, diagnostic-snapshot-only, or
      unsnapshotted so the rollback guarantee cannot exceed its evidence.
- [ ] Affected manifests, lockfiles, source/config/tests/docs, generated files,
      environments, and containers are listed by rollout phase.
- [ ] Pre-existing user changes and failures are separated.
- [ ] Each phase has a last-known-green validation boundary.

## Reverse Application and Generated Changes

- [ ] Stop at the failed phase; do not stack a workaround onto it.
- [ ] Reverse source/config/test/doc adaptations in the opposite cohort order.
- [ ] Restore old imports, API calls, config keys, serializers, lifecycle, DI,
      and public/transport behavior before removing compatibility code.
- [ ] Delete only generated files created by this migration and still
      unmodified; restore changed generated inputs through their owning tool.

## Restore the Ecosystem State

### npm

- [ ] Run the native npm operation from each in-scope lock-domain owner to
      restore every recorded prior declaration or peer range.
- [ ] Regenerate only that domain's owning `package-lock.json`; do not hand-edit
      it or touch an independent nested domain outside the approved scope.
- [ ] Confirm peers, engines, integrity/registry, and direct/transitive graph
      match the recorded prior lock state in every affected domain.

### NuGet

- [ ] Restore prior API central `PackageVersion` values and tooling
      project-local `PackageReference Version`/`Sdk Version` values at their
      actual owners.
- [ ] Restore affected projects; regenerate and review `packages.lock.json`
      only for owners whose baseline included one. Do not create project locks
      as incidental rollback work.
- [ ] For a lockless owner, compare the post-approval restored graph with the
      recorded observation and state that exact transitive restoration is not
      guaranteed without resolver-enforcing evidence.
- [ ] Confirm target framework, analyzers/warnings, package sources, and
      direct/transitive graph match the strongest recorded baseline evidence.

### Python

- [ ] Restore the exact prior production/dev requirement specifier text in its
      owning layer.
- [ ] Recreate the isolated environment instead of relying on packages left
      installed by the failed target.
- [ ] Record that the live requirements contain ranges and have no committed
      Python lockfile: rollback guarantees declarations and a clean
      re-resolution, not the exact prior transitive graph.
- [ ] Compare the clean graph with a pre-mutation `pip inspect`/`pip freeze`
      observation when available. Treat that output as drift evidence, not a
      resolver-enforcing lock.
- [ ] If exact graph restoration is required, obtain approval and create a
      resolver-consumable fully pinned/hash-verified lock or constraints
      snapshot, or retain immutable environment/image artifacts, before the
      first dependency mutation. Otherwise record acceptance of re-resolution
      risk in the approval packet.
- [ ] Revalidate the clean production requirements and production image/runtime
      separately from dev/test tools.

## Verify the Rollback

- [ ] Exact pre-migration declarations and lock-backed graphs are restored;
      lockless graphs are compared within their recorded evidence limit.
- [ ] The last-known-green focused compile/type, tests, build, and runtime
      boundary pass.
- [ ] No old/new API mix, temporary shim, generated migration file, or target
      transitive dependency remains.
- [ ] The scoped diff excludes the failed phase and preserves unrelated user
      changes.

If rollback itself requires a different dependency target, protected behavior
change, or broader file scope than approved, stop and request renewed approval.
