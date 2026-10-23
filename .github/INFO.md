# GitHub Automation and AI Guidance

This folder contains repository automation, contribution templates, and AI
customization. Live source and configuration own current behavior;
[root AGENTS.md](../AGENTS.md) owns repository-wide rules and commands.

## Start Here

| Need | Maintained entrypoint |
| --- | --- |
| AI customization, ownership, and supported clients | [AI customization guide](docs/ai-customization-guide.md) |
| File-triggered constraints | [Instruction ownership](instructions/README.md) |
| Workflow operation and troubleshooting | [Workflow guide](docs/WORKFLOW_GUIDE.md) and [workflow definitions](workflows/) |
| Toolchains without repository bootstrap | [setup-tooling](actions/setup-tooling/readme.md) |
| Dependencies, generation, components, and browser setup | [setup-workspace](actions/setup-workspace/readme.md) |
| CI script usage | [Scripts README](scripts/README.md) |
| Reusable CI helpers | [Helper reference](scripts/helpers/README.md) |
| AI-asset changes | [Operating protocol](agent-governance/operating-protocol.md) and [threat model](agent-governance/threat-model.md) |

## Automation Source

- [Hygiene pipeline](scripts/src/hygiene/) owns providers and their projections.
- [Live E2E reporting](scripts/src/runLiveTestAction.ts) consumes the scheduled
  workflow's Newman results.
- [Website test reporting](scripts/src/runUnitTestAction.ts) handles its
  separate test-reporting path.
- [Dependabot configuration](dependabot.yml) owns update schedules and groups.

Calling workflows own checkout and its `fetch-depth`. `setup-tooling` installs
selected runtimes; `setup-workspace` adds repository bootstrap. Read the action's
current inputs before copying an example.

Follow the [workflow instruction](instructions/workflows.instructions.md) for
permissions, caching, concurrency, and approval boundaries. Do not infer live
branch protection or cloud permissions from this directory.

## Local Checks

From the repository root, the existing script tests can be selected with:

```powershell
npm --prefix .github\scripts test -- <existing-test-file>
```

Use the owning guide for application checks. Running or changing a deployment
workflow is a separate approved operation, not a local test shortcut.
