# npm Migrations

Load only after live inspection establishes npm/workspace ownership.

## Ownership-Based Lock Domains

A lock domain is the `package.json` that npm operates from, its `package-lock.json`, and only the workspace manifests declared by that
owner. Inventory every tracked `package-lock.json`, then prove its owner and workspace membership from live manifests before inspecting a
target.

The live repository demonstrates two valid domains:

- [`package.json`](../../../../package.json) owns the root workspaces and [`package-lock.json`](../../../../package-lock.json). Version
  ownership is centralized: root `devDependencies` hold exact versions, and workspace manifests such as
  [`sites/arolariu.ro/package.json`](../../../../sites/arolariu.ro/package.json) and
  [`packages/components/package.json`](../../../../packages/components/package.json) declare member dependencies as `"*"`. There are two
  exceptions. The shared package's `peerDependencies` carry real ranges, and the website pins a published `@arolariu/components` registry
  tarball (lock entry `sites/arolariu.ro/node_modules/@arolariu/components`) instead of the root workspace link to `packages/components`, so
  a shared-package change reaches the website only after it is published and that URL is bumped. Change other versions at the root, and edit
  a member manifest only to add or remove usage or to change a peer range. The root `overrides` block in
  [`package.json`](../../../../package.json) also belongs to this domain: keep the `typescript` override equal to its root devDependency,
  and re-check every override when its target, parent, or peer constraints change. The Docusaurus-scoped `css-loader` override satisfies
  Rspack's optional peer requirement; remove it only after a native resolution proves the updated Docusaurus graph satisfies that peer
  without the override. [`.npmrc`](../../../../.npmrc) and [`nx.json`](../../../../nx.json) affect this domain.
- [`.github/scripts/package.json`](../../../../.github/scripts/package.json) is outside the root workspace membership and owns its adjacent
  [`.github/scripts/package-lock.json`](../../../../.github/scripts/package-lock.json). It is an independent install and resolution domain.

A nested manifest without its own lock is not automatically independent, and a nested manifest/lock pair is not automatically an error.
Inspect only the candidate owner's manifest, target-declaring workspace members, effective npm configuration, lockfile, and affected
consumers. Do not require unrelated workspace manifests or independent locks merely because they exist.

## Read-Only Compatibility Pass

1. Build the ownership map from each manifest/lock pair and workspace declaration. Locate the target only in candidate owning domain(s).
2. Find direct imports, dynamic imports, config keys, plugins, types, tests, stories, generated output, and build/runtime adapters.
3. Read exact-target package metadata for engines, peers, optional/native packages, deprecations, and exports.
4. Use official framework upgrade/release docs for every source-to-target breaking interval.
5. When the root Nx domain is affected, inspect the project targets and named inputs that validate each affected consumer.
6. Compare the proposed transitive graph and advisories; never solve an incompatibility with a blind override.

Read-only diagnostics may include `npm view <package>@<target>` and `npm explain <package>`. Commands that install, update, audit-fix,
generate a migration, or rewrite a lockfile remain blocked before approval. If the existing tree cannot support `npm explain`, record the
evidence limit rather than installing to populate it.

## Compatibility Cohorts

| Cohort                                                                             | Inspect together                                                                                        | High-risk drift                                                                                |
| ---------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------- |
| Next, React, React DOM, TypeScript, Next plugins, React compiler/lint/test tooling | Official peer/engine matrix, App Router changes, server/client behavior, JSX/types, build/test adapters | Hydration/rendering defaults, server-only/client-only APIs, metadata/routing, type regressions |
| Nx and installed executors/plugins                                                 | Official Nx migration path, workspace schema, project targets, cache inputs, generated migration plan   | Migration generators can alter source/config beyond the package declaration                    |
| Svelte, SvelteKit, Vite plugin, adapters, Svelte testing/checking                  | Each standalone site's manifest/config and official compiler/runtime migration docs                     | Reactivity syntax, prerender/adapter behavior, compiler diagnostics, test transform            |
| Shared React component package and website consumer                                | Package peers/exports, website's registry-tarball pin, website imports, package/website tests/builds    | Accidentally narrowing peer support or making the shared package depend on website code        |
| Azure/telemetry/browser packages                                                   | Runtime target, ESM/CJS/browser exports, auth/lifecycle, bundling, and instrumentation tests            | Server/client bundling, credential or telemetry behavior, native/optional dependencies         |

Treat each cohort as an evidence set, not an instruction to upgrade every member. Mutate only approved packages.

## After Explicit Approval

1. Establish the smallest affected baseline.
2. Run the native npm operation from each approved manifest owner, preserving that domain's save/workspace policy. Do not edit a lockfile by
   hand or run one owner from another domain.
3. Review manifest and lock changes before source changes; reject unexplained packages, registry drift, duplicate incompatible majors, or
   peer warnings. Preserve existing placements where possible; use a native cohort update when stale locked peers block an otherwise
   compatible set rather than immediately deleting the entire lock.
4. If an official Nx/framework codemod is approved, inspect its proposed scope, run it as its own phase, and review every generated change.
5. Update source/config/tests in bounded consumer cohorts.
6. Run the affected project's live test/build/type targets and any runtime smoke boundary required by the framework change.
7. Re-check each affected domain's resolution, workspace membership, peers, advisories, and lockfile determinism.

## Early Graph Gate

- Inspect the lock-backed dependency tree and its `problems`, including invalid and extraneous optional peers; a successful install or zero
  exit code alone is insufficient. Prove a clean `npm ci` and inspect the resulting tree before broad builds.
- When install succeeds but prune/clean install drops a compatible optional peer, compare the affected placement and current upstream npm
  issue/release evidence. Do not cycle through identical installs/dedupe runs or hand-edit generated dependency flags.
- Consider supported installation layouts only after isolating the resolver defect. Measure package-count/size and workspace impact,
  document the trade-off, preserve security settings, and prove the selected layout with a fresh native lock and clean install. Recheck
  packed declaration portability: inferred public types may accidentally reference a dependency's nested private type packages. A type
  annotation on a destructuring pattern may still leave an inferred exported binding; a direct third-party re-export can preserve the public
  contract without exposing private type paths.
- Changing or removing `install-strategy` does not re-place an existing lock: `npm install`/`npm ci` keep the recorded nested placement. Use
  npm-native operations to generate any approved placement change, then verify every dependency edge, peer, and resolved version. Never
  hand-edit `package-lock.json` or move entries between locations. If native tooling cannot preserve the approved graph, stop and request a
  revised plan rather than manually editing the generated lock.
- Inspect CI/container stages that omit `.npmrc` or copy only a workspace subset. Probe their actual inputs and required output paths; a
  successful dry-run proves lock consistency, not installation or container runtime behavior.
- After a layout change, inventory unresolved bare imports across affected tracked sources, including type-only imports and `createRequire`
  calls and chained `.resolve()` calls in E2E fixtures. Run test discovery even when browser execution is deferred. Classify framework
  aliases and host-provided modules separately; generic Node resolution is not authority for installing them.
- Run each affected owner's full typecheck and packaging smoke before broad suites. Generated adapters can copy imports into a different
  resolution directory, and missing optional type providers can masquerade as unsupported configuration properties.
- Declare genuinely consumed dependencies at their owner instead of relying on accidental hoisting or another package's private
  dependencies. Framework-managed environment markers may need the existing non-production boundary-stub pattern in both tests and
  Storybook; preserve their production framework semantics.
- Preserve workspace wildcard ownership. `"*"` does not explicitly opt into prereleases or mean "inherit the root pin", but npm can reuse a
  locked root prerelease. Verify native resolution, `npm ls`, and clean-install consistency before claiming an extra member pin or override
  is necessary; do not duplicate root versions based only on generic SemVer reasoning.
- Freeze manifests/configuration/lock before installing into the validation tree. Never mutate its `node_modules` while tests or builds are
  using it. Compare tracked source/configuration with the real worktree, including configurations restored after a target change, so
  snapshot results cover the actual diff. Validate an independent nested owner separately.

For framework/compiler changes, distinguish CLI compatibility from consumers of the compiler's JavaScript API. For Storybook and other build
tools, inspect changed defaults and use a focused build before migrating configuration or interpreting timeouts as API failures.

After formatter or rule-preset upgrades, run the complete configured hygiene scope once, including unchanged source and generated locks that
CI checks. Every independent ESLint config block inherits new preset rules. Use the existing provider's project batching and memory
settings; a single monorepo-wide invocation is not an equivalent resource profile. Distinguish real diagnostics from output-parser failures.

Use the separate [phased rollout checklist](../checklists/phased-rollout.md) for a major/framework migration and the
[rollback checklist](../checklists/rollback-checklist.md) before mutation.

## Stop Conditions

- Ownership is ambiguous or workspace membership overlaps lock domains.
- The target genuinely spans multiple lock domains but approval covers only one, or an npm operation would rewrite a lock outside its
  approved owner.
- Official peers/engines exclude the live runtime or another approved cohort.
- A generated migration touches unapproved applications, workflows, or infrastructure.
- Passing requires `--force`, `--legacy-peer-deps`, a blind override, skipped tests, or unreviewed lockfile edits.
