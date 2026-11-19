---
name: infra-dependency-update
description:
  Research, plan, or perform approved monorepo npm, NuGet, Python, GitHub Actions, framework, runtime, or dependency-pattern updates using
  exact targets, release notes, migration paths, ownership, validation, and rollback.
---

# Infrastructure Dependency Update

## When to Use

Use this skill when the user asks to investigate or perform:

- an npm, NuGet, Python package, or GitHub Action upgrade;
- a framework/runtime compatibility migration;
- replacement of an established dependency or API pattern; or
- coordinated source/configuration changes required by an approved target.

Read-only compatibility research may begin without mutation approval.

## When Not to Use

- The task changes application structure without changing a dependency or framework pattern; use `code-refactor`.
- The task is only a defect fix against the current dependency contract.
- The user has not identified a package/pattern or a concrete migration goal.
- The proposed change is primarily auth/security, schema/data, infrastructure/deployment, or public product behavior; route it to the owning
  workflow and approval boundary.

## Required Inputs

- Package or pattern, ecosystem, and reason for migrating.
- Exact current declarations and proposed target, plus the owning lock or resolution-evidence status; never substitute “latest.”
- Affected runtime, workspaces/projects, source uses, tests, generated artifacts, docs, and deployment/container surfaces.
- Required compatibility constraints and official release/migration sources.
- Explicit dependency-mutation approval status.

## Decision Points

1. Is this research-only or does the user explicitly approve mutation?
2. Which live file owns the direct declaration, which lock domain or resolution evidence applies, and what owns the runtime floor and peers?
3. Which ecosystem resource applies after declaration/manifest inspection?
4. Is this a narrow package update or a major/framework/pattern migration that needs phased rollout?
5. Which imports, configuration, tests, docs, generated files, containers, and AI guidance are invalidated?
6. What can rollback guarantee from the available lock/snapshot evidence, and what restores prior declarations, source, and runtime parity
   without rewriting history?

## Core Procedure

1. Capture the original declarations, lock/resolution evidence, runtime floors, and ownership boundaries before editing, including the
   matching `.github/dependabot.yml` entry and container/deployment use such as Dockerfile base images. Keep this baseline immutable; an
   intermediate prerelease edit must never become evidence of the original release channel.
2. Build one target ledger using the release-selection policy below. Filter channels and compatibility before researching migrations or
   installing. Include unchanged declarations and explicit holds, not only packages reported as outdated.
3. Research selected source-to-target intervals using exact registry metadata and maintainer changelogs/migration guides. Group shared
   releases by cohort; identify changed APIs/defaults, peers/engines, advisories, native assets, and required intermediate versions.
4. Inspect affected consumers and select ecosystem guidance. Record mutations, validation, rollback, and independently reversible phases
   where needed. Reuse the user's existing in-scope approval; request only missing approval or a newly crossed risk boundary.
5. After approval, establish the smallest affected baseline and apply declarations with the owning native package manager; for a GitHub
   Action, update only the approved `uses:` declarations.
6. Prove the proposed graph early: inspect peers, engines, provenance, and transitive deltas, then perform a clean install/restore from the
   generated lock where one exists. Do this before expensive application-wide validation or speculative source migrations.
7. Apply only adaptations required by the selected targets, preserving behavior. If targets or channel policy change, remove this task's
   obsolete adapters, configuration, tests, and workspace pins before proceeding. Reassess temporary security pins, overrides, and
   workaround-only direct references against the upgraded parents and restored graph; do not blindly bump or retain them.
8. Run focused regressions per changed cohort. Once targets and the graph are frozen, run the affected broad checks once; rerun only checks
   invalidated by a later edit or unresolved failure. Separate baseline failures from migration regressions.
9. Re-query authoritative metadata for every declaration before closing, including unchanged packages and holds. Compare final manifests,
   locks, installed versions, and the ledger; investigate new drift and validate only the affected delta.
10. Review the final diff, resolution, runtime boundaries, and rollback. Report selected versions versus newer held releases, official
    evidence, final-graph validation, and material limitations. Use the repository template when a PR is requested.

## Release Selection Policy

- Originally stable dependencies stay on the latest supported, compatible stable release. Do not introduce canary, beta, alpha, RC, or
  preview versions merely because their number or publication date is newer.
- For an originally prerelease dependency, prefer a supported compatible stable release only when it does not downgrade the original
  version. Otherwise select the latest compatible release in its existing preview channel. An older stable release is not an upgrade;
  crossing back to it requires explicit downgrade approval, even when its API still compiles.
- Compare complete published versions using ecosystem-aware ordering, not only a `latest` tag. Exclude yanked, unlisted, accidental,
  deprecated-placeholder, and incompatible releases; record the reason rather than presenting a hold as latest.
- Distinguish direct channel choices from prereleases pulled in by stable packages. Review that transitive graph explicitly instead of
  claiming that stable direct pins imply a stable-only tree.
- Runtime/SDK, installer-policy, public-contract, and deployment migrations are separate decisions. A newer package or compiler CLI does not
  authorize changing those boundaries or replacing a required compiler API.

## Efficient Execution

- Keep one evidence ledger per owner/cohort: original declaration/channel, newest stable, selected version, hold reason, primary source,
  retrieval time, graph fingerprint, and applicable check results. Reuse verified evidence for unchanged selections.
- Batch/cache registry metadata with bounded concurrency. Reuse recent upgrade-session findings as leads, then verify them against live
  metadata; never copy historical version holds as permanent policy.
- Parallelize independent research or disjoint execution graphs, not installs and checks sharing dependencies or imported root
  configuration. Separate lock owners can still share inputs, including tests that inspect another owner's installed package metadata.
  Prepare those owners before collecting a baseline. Limit concurrent heavy builds/tests so resource contention does not masquerade as a
  regression.
- Protect shared running environments. When isolation is needed, use task-owned source/output directories containing only required tracked
  files and safe generated inputs, not ignored credentials; copy back only reviewed source and native-generated locks.
- After a concrete failure, use the matching troubleshooting probe and a controlled comparison. Do not repeatedly rebuild the same graph,
  retry identical resolutions, weaken gates, or expand installation policy without evidence.
- Keep resolution, import/compile, behavioral tests, runtime smoke, and live external-service acceptance separate. Passing one is not proof
  of another; a known limitation does not justify rerunning unrelated successful suites.
- Inspect compound scripts, argument forwarding, and default coverage before scheduling them. A packed gate may already run the full suite;
  nested runners may swallow concurrency flags or reject duplicate scalar options. Do not repeat an equivalent successful gate.
- Verify runner selectors/exclusions with test discovery before repeating a broad gate. Glob syntax is not necessarily native filesystem
  path syntax; an accepted flag does not prove that the intended files were excluded.

## Resource Triggers

| Trigger                                                                                                                   | Load                                                                                   |
| ------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------- |
| After deriving exact current/target state and before requesting mutation approval                                         | [Compatibility research](references/compatibility-research.md)                         |
| Before summarizing changelogs, release ranges, advisories, codemods, or an upgrade path                                   | [Release and changelog intelligence](references/release-and-changelog-intelligence.md) |
| After confirming the owner is an npm workspace/manifest                                                                   | [npm migrations](references/npm-migrations.md)                                         |
| After confirming central/project NuGet ownership                                                                          | [NuGet migrations](references/nuget-migrations.md)                                     |
| After confirming Python requirements/runtime ownership                                                                    | [Python migrations](references/python-migrations.md)                                   |
| After confirming a GitHub Actions `uses:` declaration or action-runtime dependency                                        | [GitHub Actions updates](references/github-actions-updates.md)                         |
| When locating ownership and representative imports/config/tests                                                           | [Live manifest usage](examples/live-manifest-usage.md), then inspect its live paths    |
| Before requesting approval or mutating any dependency                                                                     | [Affected-file inventory](checklists/affected-file-inventory.md)                       |
| Only for a major, framework, runtime, or established-pattern migration                                                    | [Phased rollout](checklists/phased-rollout.md)                                         |
| Before the first approved mutation                                                                                        | [Rollback checklist](checklists/rollback-checklist.md)                                 |
| Only after a concrete resolution, peer, generated-artifact, compile/type, runtime, lockfile, or partial-migration failure | [Troubleshooting](references/troubleshooting.md) for that signature                    |

Do not preload all ecosystem resources.

## Verification

- Manifest declarations and each affected lock domain resolve to the approved target with no unexplained transitive or peer drift; GitHub
  Actions declarations use the approved exact ref consistently within the intended workflow family.
- Lockless owners match the recorded resolution evidence within an explicitly documented reproducibility limit; evidence alone is not called
  a lock.
- Runtime/toolchain constraints match live configuration and official target documentation.
- Every affected import, API, config, generated artifact, test, doc, AI guidance claim, and container/runtime surface is accounted for.
- The smallest affected tests/builds pass after each phase; framework migrations also exercise the relevant runtime boundary.
- Rollback steps were derived before mutation, restore prior declarations and lock-backed state, and state any lockless graph limitation
  accurately.

Choose validation commands from live manifests, project configuration, and the root command contract rather than copying commands into this
skill.

## Stop and Ask

- Explicit dependency mutation approval is absent.
- The current or target state cannot be determined exactly.
- Official sources conflict or do not cover the installed runtime/target pair.
- Multiple targets or replacement strategies have material trade-offs.
- The migration requires auth/security, schema/data, infrastructure, deployment, material cost, or public behavior changes.
- Generated migration output exceeds approved scope or touches another owner.
- Resolution requires overriding an incompatible peer/transitive constraint without maintainer support.

## Completion Contract

For research-only work, return the approval packet and make no mutations. For approved work, report the exact prior/target state, official
sources, affected files, applied phases, resolution and runtime evidence, targeted validation, and executable rollback. The migration is
incomplete if approval was assumed, resolution drift is unexplained, a resource is orphaned, a rollback guarantee exceeds its evidence, or
partial old/new APIs remain.
