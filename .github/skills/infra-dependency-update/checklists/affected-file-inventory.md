# Affected-File Inventory

Complete before requesting mutation approval. Mark an item “not affected” only
with live evidence.

## Identity and Ownership

- [ ] Package/pattern, ecosystem, exact current state, and exact target are
      recorded.
- [ ] Owning manifest or central declaration is identified.
- [ ] Every lock is paired with its owning manifest and workspace boundary.
- [ ] Every in-scope workspace/project declaration is assigned to that
      ownership map; unrelated member manifests are not inspected solely
      because another domain exists.
- [ ] Every affected lockfile is listed, or the absence of a lock and the
      available resolution evidence are explicit.
- [ ] Runtime, SDK, engine, language, and package-manager configuration is
      listed.
- [ ] Direct versus transitive ownership is explicit.

## Resolution and Compatibility

- [ ] Direct, peer, optional/native, plugin, analyzer, and transitive
      constraints are captured from exact-target official sources.
- [ ] Every affected lockfile and expected direct/transitive delta is listed;
      lockless owners have an observed-graph comparison and evidence limit.
- [ ] Security advisories, deprecations, removed APIs, changed defaults, and
      supported migration path are recorded.
- [ ] Framework cohorts and any required intermediate migration are identified.

## Repository Uses

- [ ] Static, dynamic, type-only, generated, reflection, and namespace imports.
- [ ] Constructors, methods, models, annotations/decorators, hooks, and
      lifecycle/cleanup.
- [ ] Configuration files, environment keys, plugins, aliases, loaders,
      serializers, DI registrations, and feature flags.
- [ ] Public exports, peer ranges, transport/persistence shape, and auth or
      ownership boundaries.
- [ ] Tests, fixtures, mocks, builders, snapshots/contracts, stories, E2E, and
      coverage/tooling config.
- [ ] Generated files, codemod/migration output, docs/examples, changelogs, and
      AI guidance claims invalidated by the change.
- [ ] Container images/install steps, local orchestration, runtime startup,
      health checks, deployment inputs, and native assets.
- [ ] GitHub Action `uses:` declarations, reusable/composite callers, action
      inputs/outputs, runner/runtime, permissions, OIDC, caching, and artifact
      producer/consumer compatibility.

## Approval Packet

- [ ] Proposed manifest/lock/source/config/generated-file mutations are named.
- [ ] Baseline and per-phase validation come from live project configuration.
- [ ] Major/framework/pattern work has independently reversible phases.
- [ ] Rollback restores exact prior declarations, available lock-backed state,
      source/config, environment, and runtime parity without history rewriting;
      lockless graph guarantees and any required pre-mutation snapshot are
      explicit.
- [ ] Protected auth/security, schema/data, infrastructure/deployment, cost,
      and public-behavior impacts are absent or separately escalated.
- [ ] Explicit dependency-mutation approval is recorded before any mutation.
