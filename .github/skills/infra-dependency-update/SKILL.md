---
name: infra-dependency-update
description: Research, plan, or perform approved monorepo npm, NuGet, Python, GitHub Actions, framework, runtime, or dependency-pattern updates using exact targets, release notes, migration paths, ownership, validation, and rollback.
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

- The task changes application structure without changing a dependency or
  framework pattern; use `code-refactor`.
- The task is only a defect fix against the current dependency contract.
- The user has not identified a package/pattern or a concrete migration goal.
- The proposed change is primarily auth/security, schema/data,
  infrastructure/deployment, or public product behavior; route it to the
  owning workflow and approval boundary.

## Required Inputs

- Package or pattern, ecosystem, and reason for migrating.
- Exact current declarations and proposed target, plus the owning lock or
  resolution-evidence status; never substitute “latest.”
- Affected runtime, workspaces/projects, source uses, tests, generated
  artifacts, docs, and deployment/container surfaces.
- Required compatibility constraints and official release/migration sources.
- Explicit dependency-mutation approval status.

## Decision Points

1. Is this research-only or does the user explicitly approve mutation?
2. Which live file owns the direct declaration, which lock domain or
   resolution evidence applies, and what owns the runtime floor and peers?
3. Which ecosystem resource applies after declaration/manifest inspection?
4. Is this a narrow package update or a major/framework/pattern migration that
   needs phased rollout?
5. Which imports, configuration, tests, docs, generated files, containers, and
   AI guidance are invalidated?
6. What can rollback guarantee from the available lock/snapshot evidence, and
   what restores prior declarations, source, and runtime parity without
   rewriting history?

## Core Procedure

1. Inspect live manifests, existing lockfiles or resolution evidence,
   runtime/tool configuration, direct imports, configuration, tests, and
   container/deployment use. Determine the ownership domain rather than
   assuming the nearest manifest owns resolution.
2. Record exact current and proposed target states from primary sources.
3. Research the exact target and every crossed release using official package
   metadata, maintainer changelogs/releases, migration guides, framework and
   runtime documentation. Identify breaking/deprecated APIs, changed defaults,
   peers/engines, advisories, transitive risk, lock/snapshot impact, codemods,
   and required intermediate versions.
4. Build the affected-file inventory and select the ecosystem-specific
   guidance. For major/framework/pattern migrations, define independently
   reversible phases.
5. Prepare an approval packet: proposed mutations, compatibility findings,
   affected surfaces, validation, rollout, and executable rollback.
6. If explicit approval is absent, stop before any manifest, lockfile, source,
   generated-file, or migration-tool mutation and request approval.
7. After approval, establish the smallest passing affected baseline. Apply the
   dependency change at its actual owner: use the native package manager for
   package manifests, or update only the approved `uses:` declarations for a
   GitHub Action.
8. Apply source/config/test/documentation changes one coherent phase at a time
   and validate after each phase. Keep behavior changes out of the migration
   unless separately approved.
9. Verify direct and transitive resolution against each owner's available
   lock/snapshot evidence, plus peers, compile/types, tests, generated
   artifacts, and runtime/container parity.
10. Inspect the scoped diff and report exact old/new state, official evidence,
    validation, residual risk, and rollback.

## Resource Triggers

| Trigger | Load |
| --- | --- |
| After deriving exact current/target state and before requesting mutation approval | [Compatibility research](references/compatibility-research.md) |
| Before summarizing changelogs, release ranges, advisories, codemods, or an upgrade path | [Release and changelog intelligence](references/release-and-changelog-intelligence.md) |
| After confirming the owner is an npm workspace/manifest | [npm migrations](references/npm-migrations.md) |
| After confirming central/project NuGet ownership | [NuGet migrations](references/nuget-migrations.md) |
| After confirming Python requirements/runtime ownership | [Python migrations](references/python-migrations.md) |
| After confirming a GitHub Actions `uses:` declaration or action-runtime dependency | [GitHub Actions updates](references/github-actions-updates.md) |
| When locating ownership and representative imports/config/tests | [Live manifest usage](examples/live-manifest-usage.md), then inspect its live paths |
| Before requesting approval or mutating any dependency | [Affected-file inventory](checklists/affected-file-inventory.md) |
| Only for a major, framework, runtime, or established-pattern migration | [Phased rollout](checklists/phased-rollout.md) |
| Before the first approved mutation | [Rollback checklist](checklists/rollback-checklist.md) |
| Only after a concrete resolution, peer, generated-artifact, compile/type, runtime, lockfile, or partial-migration failure | [Troubleshooting](references/troubleshooting.md) for that signature |

Do not preload all ecosystem resources.

## Verification

- Manifest declarations and each affected lock domain resolve to the approved
  target with no unexplained transitive or peer drift; GitHub Actions
  declarations use the approved exact ref consistently within the intended
  workflow family.
- Lockless owners match the recorded resolution evidence within an explicitly
  documented reproducibility limit; evidence alone is not called a lock.
- Runtime/toolchain constraints match live configuration and official target
  documentation.
- Every affected import, API, config, generated artifact, test, doc, AI
  guidance claim, and container/runtime surface is accounted for.
- The smallest affected tests/builds pass after each phase; framework
  migrations also exercise the relevant runtime boundary.
- Rollback steps were derived before mutation, restore prior declarations and
  lock-backed state, and state any lockless graph limitation accurately.

Choose validation commands from live manifests, project configuration, and the
root command contract rather than copying commands into this skill.

## Stop and Ask

- Explicit dependency mutation approval is absent.
- The current or target state cannot be determined exactly.
- Official sources conflict or do not cover the installed runtime/target pair.
- Multiple targets or replacement strategies have material trade-offs.
- The migration requires auth/security, schema/data, infrastructure,
  deployment, material cost, or public behavior changes.
- Generated migration output exceeds approved scope or touches another owner.
- Resolution requires overriding an incompatible peer/transitive constraint
  without maintainer support.

## Completion Contract

For research-only work, return the approval packet and make no mutations. For
approved work, report the exact prior/target state, official sources, affected
files, applied phases, resolution and runtime evidence, targeted validation,
and executable rollback. The migration is incomplete if approval was assumed,
resolution drift is unexplained, a resource is orphaned, a rollback guarantee
exceeds its evidence, or partial old/new APIs remain.
