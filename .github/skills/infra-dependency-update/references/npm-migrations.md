# npm Migrations

Load only after live inspection establishes npm/workspace ownership.

## Ownership-Based Lock Domains

A lock domain is the `package.json` that npm operates from, its
`package-lock.json`, and only the workspace manifests declared by that owner.
Inventory every tracked `package-lock.json`, then prove its owner and workspace
membership from live manifests before inspecting a target.

The live repository demonstrates two valid domains:

- [`package.json`](../../../../package.json) owns the root workspaces and
  [`package-lock.json`](../../../../package-lock.json). Workspace manifests
  such as
  [`sites/arolariu.ro/package.json`](../../../../sites/arolariu.ro/package.json)
  and
  [`packages/components/package.json`](../../../../packages/components/package.json)
  express member dependency/peer intent. [`.npmrc`](../../../../.npmrc) and
  [`nx.json`](../../../../nx.json) affect this domain.
- [`.github/scripts/package.json`](../../../../.github/scripts/package.json)
  is outside the root workspace membership and owns its adjacent
  [`.github/scripts/package-lock.json`](../../../../.github/scripts/package-lock.json).
  It is an independent install and resolution domain.

A nested manifest without its own lock is not automatically independent, and a
nested manifest/lock pair is not automatically an error. Inspect only the
candidate owner's manifest, target-declaring workspace members, effective npm
configuration, lockfile, and affected consumers. Do not require unrelated
workspace manifests or independent locks merely because they exist.

## Read-Only Compatibility Pass

1. Build the ownership map from each manifest/lock pair and workspace
   declaration. Locate the target only in candidate owning domain(s).
2. Find direct imports, dynamic imports, config keys, plugins, types, tests,
   stories, generated output, and build/runtime adapters.
3. Read exact-target package metadata for engines, peers, optional/native
   packages, deprecations, and exports.
4. Use official framework upgrade/release docs for every source-to-target
   breaking interval.
5. When the root Nx domain is affected, inspect the project targets and named
   inputs that validate each affected consumer.
6. Compare the proposed transitive graph and advisories; never solve an
   incompatibility with a blind override.

Read-only diagnostics may include `npm view <package>@<target>` and
`npm explain <package>`. Commands that install, update, audit-fix, generate a
migration, or rewrite a lockfile remain blocked before approval. If the
existing tree cannot support `npm explain`, record the evidence limit rather
than installing to populate it.

## Compatibility Cohorts

| Cohort | Inspect together | High-risk drift |
| --- | --- | --- |
| Next, React, React DOM, TypeScript, Next plugins, React compiler/lint/test tooling | Official peer/engine matrix, App Router changes, server/client behavior, JSX/types, build/test adapters | Hydration/rendering defaults, server-only/client-only APIs, metadata/routing, type regressions |
| Nx and installed executors/plugins | Official Nx migration path, workspace schema, project targets, cache inputs, generated migration plan | Migration generators can alter source/config beyond the package declaration |
| Svelte, SvelteKit, Vite plugin, adapters, Svelte testing/checking | Each standalone site's manifest/config and official compiler/runtime migration docs | Reactivity syntax, prerender/adapter behavior, compiler diagnostics, test transform |
| Shared React component package and website consumer | Package peers/exports, root resolution, website imports, package and website tests/builds | Accidentally narrowing peer support or making the shared package depend on website code |
| Azure/telemetry/browser packages | Runtime target, ESM/CJS/browser exports, auth/lifecycle, bundling, and instrumentation tests | Server/client bundling, credential or telemetry behavior, native/optional dependencies |

Treat each cohort as an evidence set, not an instruction to upgrade every
member. Mutate only approved packages.

## After Explicit Approval

1. Establish the smallest affected baseline.
2. Run the native npm operation from each approved manifest owner, preserving
   that domain's save/workspace policy. Do not edit a lockfile by hand or run
   one owner from another domain.
3. Review manifest and lock changes before source changes; reject unexplained
   packages, registry drift, duplicate incompatible majors, or peer warnings.
4. If an official Nx/framework codemod is approved, inspect its proposed scope,
   run it as its own phase, and review every generated change.
5. Update source/config/tests in bounded consumer cohorts.
6. Run the affected project's live test/build/type targets and any runtime
   smoke boundary required by the framework change.
7. Re-check each affected domain's resolution, workspace membership, peers,
   advisories, and lockfile determinism.

Use the separate [phased rollout checklist](../checklists/phased-rollout.md)
for a major/framework migration and the
[rollback checklist](../checklists/rollback-checklist.md) before mutation.

## Stop Conditions

- Ownership is ambiguous or workspace membership overlaps lock domains.
- The target genuinely spans multiple lock domains but approval covers only
  one, or an npm operation would rewrite a lock outside its approved owner.
- Official peers/engines exclude the live runtime or another approved cohort.
- A generated migration touches unapproved applications, workflows, or
  infrastructure.
- Passing requires `--force`, `--legacy-peer-deps`, a blind override, skipped
  tests, or unreviewed lockfile edits.
