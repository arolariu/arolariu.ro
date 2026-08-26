---
name: dependency-migration
description: Upgrade a dependency or migrate a framework/pattern with compatibility research, affected-file inventory, incremental edits, targeted tests, documentation updates, and a rollback path. Use for npm, NuGet, Python, or framework migrations after explicit dependency approval.
---

# Dependency Migration

## Use When

- Upgrading a package
- Moving between framework APIs
- Replacing an established library or pattern

## Inputs

- Package/pattern and current state
- Target state
- Scope and compatibility requirements

## Procedure

1. Inspect the current manifest/lockfile and every direct use.
2. Read official release notes or Context7 documentation for the exact target.
3. Identify breaking changes, peer/runtime constraints, and rollback.
4. Ask for explicit approval before mutating a dependency.
5. Establish passing targeted tests before the change.
6. Change the manifest with the native package manager.
7. Apply source changes incrementally and run affected tests after each
   coherent step.
8. Update only the root `AGENTS.md` version table when a canonical version
   changes.
9. Validate the lockfile, targeted build/tests, and documented rollback.

## Completion

Report old/new state, breaking changes handled, validation, and rollback.

## Stop and Ask

- Dependency approval is absent
- Multiple target versions/strategies have material trade-offs
- Auth/security, schema/data, infrastructure, or public behavior changes
