# `.github` Directory Guide

This directory holds the repository's GitHub configuration: CI/CD workflows, composite actions, the TypeScript scripts those workflows run,
issue and pull request templates, and Copilot customization assets. The files themselves are authoritative. This guide maps them and links
to the documentation that owns their details.

## Folder Map

| Path                                                   | Contents                                                                                              |
| ------------------------------------------------------ | ----------------------------------------------------------------------------------------------------- |
| [`workflows/`](workflows/)                             | GitHub Actions workflow definitions; see [Workflows](#workflows)                                      |
| [`actions/`](actions/)                                 | Workspace setup and its internal runtime helper; see [Composite Actions](#composite-actions)          |
| [`scripts/`](scripts/)                                 | Isolated npm package of TypeScript workflow scripts; see [Workflow Scripts](#workflow-scripts)        |
| [`templates/`](templates/)                             | `e2e-test-template.md`, the body template for E2E live-test failure issues                            |
| [`ISSUE_TEMPLATE/`](ISSUE_TEMPLATE/)                   | Issue forms and the template chooser configuration (`config.yml`)                                     |
| [`PULL_REQUEST_TEMPLATE.md`](PULL_REQUEST_TEMPLATE.md) | Pull request description template                                                                     |
| [`CODEOWNERS`](CODEOWNERS)                             | Automatic review assignment                                                                           |
| [`dependabot.yml`](dependabot.yml)                     | Version updates for GitHub Actions, npm, NuGet, pip, and Docker manifests, all targeting `preview`    |
| [`codeql/`](codeql/)                                   | CodeQL configuration file; its [README](codeql/README.md) explains how code scanning currently runs   |
| [`docs/`](docs/)                                       | [Workflow guide](docs/WORKFLOW_GUIDE.md) and [AI customization guide](docs/ai-customization-guide.md) |

The Copilot customization assets are [`copilot-instructions.md`](copilot-instructions.md), [`mcp.json`](mcp.json), [`agents/`](agents/),
[`instructions/`](instructions/), [`skills/`](skills/), [`prompts/`](prompts/), [`extensions/`](extensions/), [`memory/`](memory/), and
[`agent-governance/`](agent-governance/). The [AI customization guide](docs/ai-customization-guide.md) and the
[AI Customization](../AGENTS.md#ai-customization) section of the root `AGENTS.md` own their structure and rules.

## Workflows

| Workflow                                                                       | Triggers                                                                              | Purpose                                                                                      |
| ------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------- |
| [`official-website-build.yml`](workflows/official-website-build.yml)           | Push to `preview` touching `sites/arolariu.ro/**`; manual dispatch                    | Test the website, then build and push its container image                                    |
| [`official-website-release.yml`](workflows/official-website-release.yml)       | Completed `official-website-build` run on `preview`; manual dispatch                  | Deploy the website container to Azure App Service                                            |
| [`official-api-trigger.yml`](workflows/official-api-trigger.yml)               | Push to `main` touching `sites/api.arolariu.ro/**`; manual dispatch                   | Test, containerize, and deploy the .NET API to Azure App Service                             |
| [`official-exp-trigger.yml`](workflows/official-exp-trigger.yml)               | Push to `main` touching `sites/exp.arolariu.ro/**`; manual dispatch                   | Test (pytest), containerize, and deploy the FastAPI service to Azure App Service             |
| [`official-cv-trigger.yml`](workflows/official-cv-trigger.yml)                 | Push to `main` touching `sites/cv.arolariu.ro/**`; manual dispatch                    | Test and package CV; deploy only in Azure mode                                               |
| [`official-status-trigger.yml`](workflows/official-status-trigger.yml)         | Push to `main` touching `sites/status.arolariu.ro/**`; manual dispatch                | Test and package status; deploy only in Azure mode                                           |
| [`official-docs-trigger.yml`](workflows/official-docs-trigger.yml)             | Push to `main` unless every changed file matches `.github/*`; manual dispatch         | Generate and deploy the documentation site to Azure Static Web Apps                          |
| [`official-components-publish.yml`](workflows/official-components-publish.yml) | Push of a `components-v*` tag; manual dispatch (dry run, npm dist-tag)                | Validate and publish `@arolariu/components` to npm with Trusted Publishing and provenance    |
| [`official-hygiene-check-v2.yml`](workflows/official-hygiene-check-v2.yml)     | Pull request opened, synchronized, or reopened; manual dispatch (`affected` / `full`) | "Code Hygiene Check (v3)": planned format, lint, TypeScript/.NET/Python test, and stats jobs |
| [`official-e2e-action.yml`](workflows/official-e2e-action.yml)                 | Daily schedule (`17 6 * * *`, UTC); manual dispatch                                   | Newman live tests for the frontend, backend, and CV; opens an issue when they fail           |
| [`official-status-probe.yml`](workflows/official-status-probe.yml)             | Schedule every 30 minutes (`9,39 * * * *`); manual dispatch                           | Probe service health endpoints and commit aggregates to the `status-data` branch             |
| [`copilot-setup-steps.yml`](workflows/copilot-setup-steps.yml)                 | Manual dispatch; push changing this workflow file                                     | Prepare the Copilot coding agent environment                                                 |

The [workflow guide](docs/WORKFLOW_GUIDE.md) covers choosing, triggering, and debugging these workflows. The workflow files own the exact
inputs, conditions, and job graphs.

## Composite Actions

| Action                                                 | Role                                                                                                                                                |
| ------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------- |
| [`setup-workspace`](actions/setup-workspace/readme.md) | The workflow entry point. Provisions selected toolchains and optionally installs dependencies and browsers, generates files, and builds components. |
| [`setup-runtime`](actions/setup-runtime/readme.md)     | Internal to `setup-workspace`; provisions the toolchains and configures their download caches.                                                      |

Both are local actions (`uses: ./.github/actions/<name>`) and neither checks out the repository, so a job runs `actions/checkout` first.
Each action's readme owns its inputs, outputs, and usage examples.

## Workflow Scripts

[`scripts/`](scripts/) is an isolated ES-module npm package. Node.js runs its TypeScript directly through type stripping, without a build
step. Workflows enter it at these points:

| Entry point                                                                                | Caller                                                  | Invocation                                                                                          |
| ------------------------------------------------------------------------------------------ | ------------------------------------------------------- | --------------------------------------------------------------------------------------------------- |
| [`src/runUnitTestAction.ts`](scripts/src/runUnitTestAction.ts)                             | `official-website-build.yml`, `test` job                | `actions/github-script` imports the module and awaits its parameterless default export              |
| [`src/runLiveTestAction.ts`](scripts/src/runLiveTestAction.ts)                             | `official-e2e-action.yml`, `raise-issue-on-failure` job | `actions/github-script` imports the module and awaits its parameterless default export              |
| [`src/hygiene/pipeline/preparePlan.ts`](scripts/src/hygiene/pipeline/preparePlan.ts)       | `official-hygiene-check-v2.yml`, `detect` job           | `node --experimental-strip-types src/hygiene/pipeline/preparePlan.ts --scope <scope>`               |
| [`src/hygiene/pipeline/runProvider.ts`](scripts/src/hygiene/pipeline/runProvider.ts)       | `official-hygiene-check-v2.yml`, `providers` matrix job | `node --experimental-strip-types src/hygiene/pipeline/runProvider.ts <provider> --plan <plan.json>` |
| [`src/hygiene/pipeline/runProjections.ts`](scripts/src/hygiene/pipeline/runProjections.ts) | `official-hygiene-check-v2.yml`, `gate` job             | `node --experimental-strip-types src/hygiene/pipeline/runProjections.ts --plan <plan.json>`         |

The hygiene commands run from `.github/scripts`. The [scripts README](scripts/README.md) owns the rest:

- [Boundaries](scripts/README.md#boundaries): the `src` → `lib` → `helpers` → `helpers/sdk` → `@actions/*` layering and module ownership.
- [Hygiene: one plan, six named jobs](scripts/README.md#hygiene-one-plan-six-named-jobs): the `format`, `lint`, `test-typescript`,
  `test-dotnet`, `test-python`, and `stats` providers, planned skips, and the gate.
- [Verification](scripts/README.md#verification): the local test, type-check, and coverage commands.

The [helper guide](scripts/helpers/README.md) documents the native SDK facades and the narrow helper modules.

Root `npm run setup` restores the `.github/scripts` dependencies. In CI, the hygiene jobs restore them through the `node-scripts-install`
input of `setup-workspace`, as does the E2E failure reporter. The website's `actions/github-script` step runs `npm ci` in `.github/scripts`
before importing its entry point. From the repository root:

```powershell
npm --prefix .github/scripts test
npm --prefix .github/scripts run typecheck
npm --prefix .github/scripts run test:coverage
```

## Security

- Every workflow declares explicit `permissions:`, at the top level or (in `copilot-setup-steps.yml`) on its only job. Jobs that need more,
  such as the E2E failure-issue job, raise permissions at job level.
- `azure/login` steps authenticate with OIDC federated credentials (`id-token: write`). Static Web Apps deployments use per-site deployment
  tokens, and npm publishing uses Trusted Publishing with provenance.
- Credentials come from the `secrets` context.
- External action pins follow the [workflow instructions](instructions/workflows.instructions.md#rules). The `github-actions` entry in
  [`dependabot.yml`](dependabot.yml) proposes updates.
- Code scanning is described in the [CodeQL README](codeql/README.md).

## Maintaining This Guide

When you add, rename, or remove a workflow, composite action, or script entry point, update the matching table in this guide and the README
that owns the detail.
