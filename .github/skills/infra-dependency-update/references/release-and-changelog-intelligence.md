# Release and Changelog Intelligence

Load after exact current and proposed target versions are known and before an
approval packet or migration plan is written.

## Source order

1. Owning manifest and lock/resolution evidence in the repository.
2. Official registry metadata for the exact versions.
3. Maintainer release notes/changelog and migration guides for every crossed
   major or documented breaking interval.
4. Framework/runtime compatibility and peer/engine documentation.
5. Official advisories and deprecation/end-of-support notices.

Search tools may locate sources, but every breaking/default/security claim must
link to a primary source. Do not summarize an unbounded “latest” page.

## Range analysis

For a current version `A` and target `B`:

- enumerate every crossed major and any maintainer-designated migration
  boundary;
- identify required intermediate targets or codemods;
- separate package API breaks from changed defaults, peer/runtime floors,
  generated output, configuration format, and deployment/container impact;
- record release-specific fixes or advisories that motivate the update;
- compare direct and transitive graph changes against the owning lock domain;
- search the repository for every removed/renamed API, option, import, plugin,
  action, analyzer, and generated artifact.

## Ecosystem probes

Use read-only native metadata commands only after identifying the owner:

| Ecosystem | Read-only evidence |
| --- | --- |
| npm | Exact `npm view <package>@<version>` metadata, lock entry, `npm explain`, official releases/upgrade guide |
| NuGet | Central/project declaration, resolved assets/lock when present, package page/repository, .NET compatibility notes |
| Python | Requirement specifier, isolated observed graph, PyPI metadata, package/FastAPI/Pydantic release and migration notes |
| GitHub Actions | Exact current/target `uses:` refs, action repository releases/tags, `action.yml`, runner/runtime notices, and every affected workflow/composite caller |

Do not run install/update/audit-fix/codemod commands before approval.

## Migration-plan output

Produce:

- exact old/target declarations and owners;
- release-range table with source, impact, and affected repository paths;
- compatible runtime/peer matrix;
- direct/transitive and lockfile expectations;
- source/config/generated/container changes;
- independently reversible phases;
- smallest baseline and per-phase validation;
- executable rollback and its lock-backed or lockless guarantee.

Stop if primary sources conflict, the target is not exact, a required
intermediate version is unapproved, or compatibility requires overriding an
unsupported peer/transitive constraint.
