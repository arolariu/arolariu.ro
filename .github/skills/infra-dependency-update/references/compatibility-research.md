# Compatibility Research

Complete this research before requesting dependency-mutation approval. This
phase is read-only: do not run codemods/migration generators or alter
manifests, lockfiles, environments, source, or generated artifacts.

## Evidence Hierarchy

1. **Live repository state:** owning declaration and ownership domain, existing
   lockfile or lockless resolution evidence, runtime/tool configuration,
   imports, config, tests, and containers.
2. **Exact-target primary sources:** official registry metadata, maintainer
   release notes, migration guide, API reference, and upstream repository.
3. **Runtime/framework compatibility sources:** official peer, engine, target
   framework, language, and platform support.
4. **Security advisories:** official registry/advisory records and maintainer
   notices.

Context7 or search results may locate documentation, but every material claim
must be verified against an official source for the exact target. Community
posts, generated summaries, and “latest” documentation are not sufficient
evidence for a breaking change.

## Research Record

Record evidence for every row:

| Question | Required evidence |
| --- | --- |
| What is current? | Exact direct declaration, owning domain, resolved version evidence, lock entry when one exists, explicit no-lock status, and runtime/toolchain from live files |
| What is target? | Exact target identifier/version or pattern and its official release/migration documentation |
| Is the path supported? | Official supported source-to-target path, intermediate releases/codemods, and end-of-support/deprecation notes |
| What constrains it? | Engine/runtime/target-framework, language, operating-system, peer, plugin, analyzer, and SDK constraints |
| What breaks? | Removed/renamed APIs, changed defaults, serialization, lifecycle, rendering, errors, auth, generated output, and config format |
| What resolves transitively? | Added/removed/changed transitive packages, duplicate majors, advisories, native/optional packages, and owning lock/snapshot impact or lockless evidence limit |
| Where is it used? | Imports, reflection/config names, adapters, tests, mocks, generated files, docs, AI guidance, containers, and deployment inputs |
| How is it proven? | Baseline and post-change targeted compile/type, tests, build, runtime boundary, and package-health checks |
| How is it reversed? | Exact prior declarations, lock regeneration owner when present, lockless graph guarantee and required snapshot, source/config reversal order, and runtime/environment restoration |

## Official Source Boundaries

Use these indexes to find the exact target page; do not copy whatever version
the index currently advertises into a skill:

| Ecosystem | Official starting points |
| --- | --- |
| npm/workspaces | [npm workspaces](https://docs.npmjs.com/cli/using-npm/workspaces/), package registry metadata, and the package maintainer's releases/migration guide |
| Next/React/TypeScript/Nx/Svelte | [Next upgrade guides](https://nextjs.org/docs/app/guides/upgrading), [React versions](https://react.dev/versions), [TypeScript docs](https://www.typescriptlang.org/docs/), [Nx dependency migrations](https://nx.dev/docs/features/automate-updating-dependencies), and [Svelte docs](https://svelte.dev/docs) |
| NuGet/.NET | [NuGet Central Package Management](https://learn.microsoft.com/en-us/nuget/consume-packages/central-package-management), package pages/repositories, and [.NET compatibility guidance](https://learn.microsoft.com/en-us/dotnet/core/compatibility/) |
| Python | [PyPI](https://pypi.org/), [requirements file format](https://pip.pypa.io/en/stable/reference/requirements-file-format/), package release/migration docs, [FastAPI release notes](https://fastapi.tiangolo.com/release-notes/), and [Pydantic migration guides](https://docs.pydantic.dev/latest/migration/) |
| GitHub Actions | The action's GitHub repository, release notes/tags, `action.yml`, [workflow syntax](https://docs.github.com/en/actions/reference/workflows-and-actions/workflow-syntax), and runner/runtime deprecation notices |

Follow links to release-specific material for the proposed target and record
the retrieval source in the approval packet.

## Approval Packet Gate

Before asking for approval, provide:

- exact current and target state;
- why the target is needed and why alternatives were rejected;
- supported migration path and official evidence;
- complete affected-file inventory;
- breaking/default/peer/runtime/transitive findings;
- proposed mutation and any generated output;
- phased plan when required;
- smallest baseline and post-change validation;
- executable rollback, its evidence-backed guarantee, and stop conditions.

Stop if the exact target is undocumented, unsupported on the live runtime, or
requires a protected behavior change that is not separately approved.
