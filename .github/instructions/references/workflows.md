# GitHub Actions Reference Catalog

Owner: `.github/instructions/workflows.instructions.md`. This catalog holds extensive, repository-specific GitHub Actions workflow and
composite-action examples, anti-patterns, edge cases, and rationale for `.github/workflows/` and `.github/actions/`. It does not define a
workflow procedure itself and it does not authorize any workflow mutation — every change still requires the explicit user approval described
in the Infrastructure Expert agent's read-only-versus-mutation classification and escalation examples. It does not restate versions, global
commands, or root safety policy — see root `AGENTS.md` and RFC 0001. It does not duplicate `code-refactor`, `code-documentation`, or
`infra-dependency-update` skill workflow procedures; this catalog explains the CI/CD architecture and constraints those approved changes
must fit into, with YAML, not procedure.

## Permissions

Only workflow/job `permissions` constrain `GITHUB_TOKEN` and OIDC capabilities. A workflow-level block applies to every job; an
`env: GITHUB_TOKEN` assignment only exposes the token value to a step and does not narrow what the token can do. Prefer job-level
permissions when only one job needs a capability:

```yaml
# .github/workflows/official-e2e-action.yml
raise-issue-on-failure:
  permissions:
    contents: read
    issues: write
```

`official-status-probe.yml` is the one workflow with `contents: write` at the top level, because its whole job is committing aggregated
probe data to an orphan `status-data` branch — that permission is not a template to copy for workflows that merely read or deploy. A job can
also carry its own narrower (or broader-but-scoped) block: `official-e2e-action.yml`'s `raise-issue-on-failure` job separately declares
`permissions: { contents: read, issues: write }` even though the workflow's top-level `permissions` is just `contents: read`, because only
that one job needs to open an issue.

**Live least-privilege drift, not templates:**

- API and experimental-service workflows grant `id-token: write` at workflow scope even though their `test` jobs never call `azure/login`.
- The website build grants `issues: write`/`pull-requests: write` at workflow scope although only the `test` job's PR-comment step uses
  them.
- Components publishing grants OIDC/attestation capabilities to its validation job even though publishing owns those capabilities.
- The hygiene workflow grants PR/check writes to every job even though only reporting/gating needs them.
- CV and documentation grant `id-token: write` despite using Static Web Apps token secrets and never calling `azure/login`.

Do not copy these broad blocks. Narrowing them is a workflow security change and remains approval-gated.

## OIDC authentication

Jobs that invoke the currently pinned `azure/login` action authenticate with a client ID, tenant ID, and subscription ID sourced from GitHub
Secrets — never a client secret or long-lived credential:

```yaml
# .github/workflows/official-api-trigger.yml
- name: 🔒 Performing auth against Azure Public Cloud...
  uses: Azure/login@<approved-commit-sha> # <release>
  with:
    client-id: ${{ secrets.AZURE_CLIENT_ID }}
    tenant-id: ${{ secrets.AZURE_TENANT_ID }}
    subscription-id: ${{ secrets.AZURE_SUBSCRIPTION_ID }}
```

When a job uses `azure/login`, this only works because `permissions.id-token: write` is set (GitHub must be allowed to mint the OIDC token)
and because the federated credential's `subject` claim on the Azure side matches the job's GitHub Environment exactly:

```bicep
// infra/Azure/Bicep/identity/federatedCredentials.bicep
{ name: 'FederatedGithubCredentialForProduction', subject: 'repo:arolariu/arolariu.ro:environment:production' }
```

```yaml
# .github/workflows/official-api-trigger.yml
environment: ${{ inputs.environment || 'production' }}
```

Anti-pattern: adding or renaming a GitHub Environment on a job that uses `azure/login` with the infrastructure UAMI without also adding the
matching `federatedIdentityCredentials` subject in `identity/federatedCredentials.bicep` — the Azure login step fails with an OIDC
token-exchange error that looks unrelated to the environment rename. Environments used only by npm Trusted Publishing or Static Web Apps
token deployment do not need an Azure federated subject. `official-components-publish.yml` uses OIDC for npm Trusted Publishing instead of
Azure — no `NODE_AUTH_TOKEN` is set anywhere, and the publish step comment says so explicitly:

```yaml
# .github/workflows/official-components-publish.yml
- name: 🚀 Publish to npm
  if: inputs.dry-run != true
  run: npm publish --provenance --tag ${{ inputs.tag || 'latest' }} --access public
  # Note: No NODE_AUTH_TOKEN needed - using Trusted Publishing (OIDC)
```

`AZURE_CLIENT_ID`, `AZURE_TENANT_ID`, and `AZURE_SUBSCRIPTION_ID` are identifiers supplied from GitHub Secrets; they are not a client secret
and do not replace the federated OIDC token. Do not infer mixed credential authentication merely from those inputs. A
`client-secret`/password/certificate input would be a different, long-lived credential design and requires explicit security approval.

Static Web Apps deployments are a separate live authentication path. The CV, documentation, and status workflows invoke the currently pinned
`Azure/static-web-apps-deploy` action with a site-specific `azure_static_web_apps_api_token` secret:

```yaml
- uses: Azure/static-web-apps-deploy@<approved-commit-sha> # <release or reviewed exception>
  with:
    azure_static_web_apps_api_token: ${{ secrets.<site-specific-token-name> }}
    action: upload
```

These are long-lived deployment-token secrets, not OIDC. Do not describe them as federated credentials, copy one site's token to another
workflow, or expose the value in logs. Replacing this current authentication path is a workflow and security design change that requires
explicit approval.

**Live drift, not a template:** the CV and documentation workflows still describe Azure OIDC in header comments and grant `id-token: write`,
while their deploy steps use Static Web Apps deployment tokens. Do not copy that mismatch into new workflows or infer that the token
deployment consumes the OIDC permission. Removing the permission/comment or changing the authentication path is a workflow security change
and remains approval-gated.

## Actions and pinned versions

Read the pinned commit and release annotation from the exact workflow family. Check relevant siblings before editing; this catalog does not
snapshot action versions. For example, CV and status require the SWA action input `skip_api_build`; the docs workflow does not.

## Caching

Toolchain-level caches (`~/.npm`, `~/.nuget/packages`, pip) are delegated entirely to each `actions/setup-*` action's own built-in
mechanism, configured by the internal `setup-runtime` composite:

```yaml
# .github/actions/setup-runtime/action.yml
- uses: actions/setup-node@<approved-commit-sha> # <release>
  with:
    cache: ${{ inputs.cache == 'true' && 'npm' || '' }}
    cache-dependency-path: |
      package-lock.json
      .github/scripts/package-lock.json
```

The comment on that step explains a real bug the two-path list prevents: if only the root lock file were hashed, a change to
`.github/scripts/package-lock.json` would leave the cache key unchanged, so the stale cache would be restored, npm would re-download the
changed packages anyway, and — because the restore counted as a hit — nothing would be written back, repeating the wasted download on every
subsequent run.

Workspace-produced artifacts (`node_modules` and Playwright's browser bundle) use explicit, exact-key `actions/cache` steps in
[`setup-workspace`](../../actions/setup-workspace/readme.md#caching-model), without `restore-keys`. The npm tree requires a completeness
check before skipping `npm ci`. Playwright still installs OS libraries on a browser cache hit.

## Path filters and triggers

Path filters scope automatic triggers to the part of the monorepo a workflow actually builds:

```yaml
# .github/workflows/official-api-trigger.yml
on:
  push:
    branches: ["main"]
    paths: ["sites/api.arolariu.ro/**"]
```

```yaml
# .github/workflows/official-website-build.yml
on:
  push:
    branches: ["preview"]
    paths: ["sites/arolariu.ro/**"]
```

**Live drift, not a dependency-aligned example:** the website workflow's automatic filter (`sites/arolariu.ro/**`) excludes build inputs
outside the site directory: the root manifests and lockfile, root configuration such as `tsconfig.json`, the `packages/components` workspace
manifest, and the `infra/containers/Dockerfile.frontend` recipe its build job uses. Component-library source is not a website build input
today: the website installs the published `@arolariu/components` tarball pinned in `sites/arolariu.ro/package.json`, and its Nx `build`
target sets `dependsOn: []`. Do not copy that filter as canonical. Derive a proposed filter from the Nx/project dependency graph and every
called setup/build input; at a minimum, account for build-owning root files. Changing the live trigger remains approval-gated.

Not every workflow uses a path filter, and several exceptions are deliberate: `official-hygiene-check-v2.yml` runs on every `pull_request`
regardless of path and computes its own `git diff` in a dedicated `detect` job instead, because it needs one shared "did anything change"
gate feeding six parallel provider jobs across the whole repo, not a single-directory scope. Cron- and tag-triggered workflows
(`official-status-probe.yml`'s `schedule: "9,39 * * * *"`, `official-components-publish.yml`'s `push: { tags: ["components-v*"] }`) have no
`paths:` filter at all, because their trigger is time- or tag-based, not file-change-based — adding a path filter to either would be a no-op
at best and a functional regression at worst (a scheduled probe must always run; a version-tag push rarely touches `packages/components/**`
in the same commit).

## Concurrency

The RFC 0001 baseline concurrency group is `${{ github.workflow }}-${{ github.ref }}` with `cancel-in-progress: true`, but live workflows
tune the group key to the actual collision they need to prevent:

```yaml
# .github/workflows/official-hygiene-check-v2.yml
concurrency:
  group: hygiene-${{ github.event.pull_request.number || github.ref }}
  cancel-in-progress: true
```

```yaml
# .github/workflows/official-e2e-action.yml
concurrency:
  group: e2e-live-${{ github.ref }}
  cancel-in-progress: true
```

```yaml
# .github/workflows/official-status-probe.yml
concurrency:
  group: status-probe
  cancel-in-progress: false
```

The status-probe group is a fixed string (not templated on `ref` or PR number) and explicitly sets `cancel-in-progress: false` — the job
pushes to a shared orphan `status-data` branch, and cancelling a run mid-push (or letting a second run race the same branch) risks a
corrupted or lost commit. That is the concrete counter-example to "always cancel in progress": a workflow that performs a stateful,
non-idempotent push to shared data should serialize (queue), not cancel.

## Artifacts and secrets

Artifacts follow a produce → upload → download → aggregate shape for fan-out/fan-in work. `official-hygiene-check-v2.yml`'s matrix
`providers` job uploads one `outcome-<provider>` artifact per parallel check, and the `gate` job downloads them by pattern into per-artifact
subdirectories. The download is best-effort only to let the verifier publish an errored report. The verifier checks the download's raw
`outcome` rather than its post-`continue-on-error` `conclusion` and rejects any files left behind by a failed transfer:

```yaml
# .github/workflows/official-hygiene-check-v2.yml (providers job)
- uses: actions/upload-artifact@<approved-commit-sha> # <release>
  if: always()
  with:
    name: outcome-${{ matrix.provider.id }}
    path: artifacts/hygiene/outcome-${{ matrix.provider.id }}.json
    if-no-files-found: warn
    retention-days: 7

# (gate job)
- uses: actions/download-artifact@<approved-commit-sha> # <release>
  id: download-outcomes
  continue-on-error: true
  with:
    pattern: outcome-*
    path: artifacts/hygiene/outcomes
    merge-multiple: false

- name: Run projections and gate
  env:
    HYGIENE_OUTCOME_DOWNLOAD_FAILED: ${{ steps.download-outcomes.outcome == 'failure' && 'true' || 'false' }}
  working-directory: .github/scripts
  run: node --experimental-strip-types src/hygiene/pipeline/runProjections.ts --plan "$GITHUB_WORKSPACE/artifacts/hygiene/plan.json"
```

`if-no-files-found` is chosen per situation, not defaulted: `warn` for a best-effort outcome file, `error` for
`official-website-build.yml`'s test-report upload where a missing report means the test phase itself is broken, not merely quiet.

New or changed shell steps should thread secrets and expression-derived values through `env:` rather than interpolate them directly into a
`run:` string. `setup-workspace/action.yml` states this as its own rule:

```yaml
# .github/actions/setup-workspace/action.yml
# Inputs are never interpolated directly into `run:` blocks; they
# are passed through `env:` to avoid script injection.
```

```yaml
# .github/workflows/official-e2e-action.yml
env:
  E2E_TEST_AUTH_TOKEN: ${{ secrets.E2E_TEST_AUTH_TOKEN }}
```

**Live drift, not a safety guarantee:** API, experimental-service, and website deployment scripts currently interpolate the Azure Container
Registry address expression directly into shell commands. Do not copy that pattern or assume all existing `run:` blocks are already safe.
Moving those values through step-level environment variables is a workflow security change and requires explicit approval.

Setting `GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}` in a step's `env:` block makes the value available to that step. It does not reduce
capabilities; only the nearest job/workflow `permissions` block does that.

## Environments and deployment safety

The website's build/release split separates production deployment from the build workflow and provides a place for environment protection
(RFC 0001 §4.1):

```yaml
# .github/workflows/official-website-release.yml
on:
  workflow_run:
    workflows: ["official-website-build"]
    types: ["completed"]
    branches: ["preview"]
  workflow_dispatch:
    inputs:
      environment:
        options: ["development", "production"]
        default: "development"
```

`environment:` blocks scope environment secrets and the exposed URL to the job, not the workflow:

```yaml
# .github/workflows/official-website-release.yml
environment:
  name: ${{ inputs.environment || 'development'}}
  url: ${{ steps.deploy-to-webapp.outputs.webapp-url }}
```

An environment creates a manual approval gate only when that environment has deployment protection rules configured. YAML presence alone
proves no approval behavior. Query current repository environment settings whenever a gate matters, and treat adding or changing protection
rules as a production workflow/repository-settings decision.

`official-components-publish.yml` applies the same job-level scoping principle even without a development/production choice: only the
`publish` job carries an `environment: { name: npm-publish }` block, while the preceding `validate` job (build, version check, dry-run pack)
runs with no environment. Whether that environment currently enforces reviewers must be verified from repository settings rather than
inferred.

`official-api-trigger.yml` is the trigger-pattern counter-example — one workflow does test → build → deploy in sequence with `needs:`
chaining rather than a separate release workflow, because RFC 0001 classifies API deployments as lower-risk than the website's user-facing
release:

```yaml
# .github/workflows/official-api-trigger.yml
build:
  needs: test
deploy:
  needs: build
  environment:
    name: ${{ inputs.environment || 'production' }}
    url: ${{ steps.deploy-to-webapp.outputs.webapp-url }}
```

Anti-pattern: adding a direct deploy step to a workflow that currently only builds/tests (or removing the build/release split for the
website) — that is a deployment-behavior change requiring the same confirmation as any other production deployment edit, regardless of how
small the diff looks.

## Reusable composite actions

Only `setup-workspace` calls `setup-runtime`, which provisions the requested toolchains. Workflows use `setup-workspace` even when they want
only a toolchain:

```yaml
# .github/workflows/official-e2e-action.yml
- name: Prepare Node.js without workspace dependencies
  uses: ./.github/actions/setup-workspace
  with:
    node-install: "true"
```

`setup-workspace` validates its own input combinations _before_ installing any toolchain, specifically so a contradictory input set fails in
seconds instead of after a multi-minute SDK provision, and so a disabled toolchain cannot silently fall through to whatever version the
runner happens to preinstall:

```yaml
# .github/actions/setup-workspace/action.yml
require() {
  if [ "$3" = "true" ] && [ "$1" != "true" ]; then
    errors+=("  - '$4: true' requires '$2: true'")
  fi
}
require "$NODE" node-install "$INSTALL_NODE_DEPS" node-deps-install
require "$INSTALL_NODE_DEPS" node-deps-install "$RUN_GENERATE" workspace-generate
```

This is the pattern to follow when adding a new composite-action input that depends on another one: validate the combination up front with a
clear `::error::`, don't let a downstream step fail with a confusing, unrelated error message. `official-hygiene-check-v2.yml`'s matrix
strategy shows the same "provision only what's needed" discipline at the workflow level — each `provider` entry carries its own
`needs-dotnet`/`needs-python` booleans, and `setup-workspace` is called once per matrix job with those booleans forwarded directly as
`dotnet-install:`/`python-install:` inputs, so a lint-only job never pays for a .NET SDK install.

## RFC 0001 patterns at a glance

| Pattern                  | Shape                                                                                           | Live example                                                                       |
| ------------------------ | ----------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------- |
| Build-Release            | `push/manual build → validate → workflow_run/manual release → [configured protection] → deploy` | `official-website-build.yml` + `official-website-release.yml`                      |
| Trigger                  | `push/manual → test → build-azure → deploy-azure` (docs: single build-and-deploy job)           | `official-api-trigger.yml`, `official-cv-trigger.yml`, `official-docs-trigger.yml` |
| PR validation            | `PR/manual → detect → provider matrix → gate/report`                                            | `official-hygiene-check-v2.yml`                                                    |
| Scheduled E2E validation | `schedule/manual → E2E → failure reporting`                                                     | `official-e2e-action.yml`                                                          |

Use this table to classify which pattern a proposed workflow change belongs to before comparing it against the wrong example — a
trigger-pattern workflow gaining a manual-approval gate is effectively becoming a build-release workflow, which is a deployment-behavior
change, not a small tweak.

**Live drift, not a template:** `official-website-release.yml` currently has no top-level or job-level concurrency key. Do not copy that
absence into a new deployment workflow. Adding concurrency to the existing release workflow is still a production-workflow behavior change
and requires explicit approval; the catalog records the gap but does not authorize correcting it.

## Anti-pattern corrections summary

| Anti-pattern                                                                                              | Why it fails here                                                                                                                 | Correction                                                                                                                                                                                  |
| --------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Adding `restore-keys:` to the `node_modules` or Playwright cache                                          | Allows a changed lock hash to fall back to artifacts from an older dependency graph                                               | Keep exact-match restoration                                                                                                                                                                |
| Renaming/adding a GitHub Environment on an Azure-login job without a matching Bicep federated credential  | The pinned `azure/login` action's OIDC token exchange fails against a subject claim that does not exist                           | Add the matching `federatedIdentityCredentials` entry in `identity/federatedCredentials.bicep` in the same approved change; do not add Azure federation for npm/SWA-token-only environments |
| Interpolating a secret directly into a `run:` shell string                                                | Script-injection risk; violates `setup-workspace`'s own documented convention                                                     | Pass the value through an `env:` block and reference the environment variable inside `run:`                                                                                                 |
| Bumping one workflow's pinned action version without checking siblings                                    | Can break shared output, cache, artifact, or authentication contracts                                                             | Check related callers and update only the approved cohort                                                                                                                                   |
| Adding a deploy step to a currently build/test-only trigger workflow                                      | Silently converts a lower-risk trigger pattern into a production deployment behavior change                                       | Treat as a deployment-safety/environment change requiring confirmation, not a routine step addition                                                                                         |
| Setting `cancel-in-progress: true` on a workflow that pushes to shared state (e.g. an orphan data branch) | Can cancel mid-write and corrupt or lose the push                                                                                 | Use a fixed concurrency group with `cancel-in-progress: false` to serialize instead                                                                                                         |
| Adding a `paths:` filter to a schedule- or tag-triggered workflow                                         | `schedule`/tag-push triggers are time- or version-based, not file-change-based; a path filter can silently suppress required runs | Leave schedule/tag workflows without a `paths:` filter                                                                                                                                      |

## Live source pointers

- `docs/rfc/0001-github-actions-workflows.md` — workflow pattern taxonomy, caching philosophy, and the "why no fallback keys" rationale
- `.github/actions/setup-runtime/action.yml` — internal toolchain provisioning and built-in cache configuration
- `.github/actions/setup-workspace/action.yml` — workspace bootstrap, input validation guard, and explicit cache steps
- `.github/workflows/official-api-trigger.yml` — trigger-pattern test→build→deploy chain with OIDC and environment gating
- `.github/workflows/official-website-build.yml`, `official-website-release.yml` — build-release split and `workflow_run` chaining
- `.github/workflows/official-hygiene-check-v2.yml` — matrix fan-out, artifact fan-in, and job-scoped toolchain provisioning
- `.github/workflows/official-e2e-action.yml` — scheduled live testing, matrix strategy, and a job-scoped `permissions` override
- `.github/workflows/official-status-probe.yml` — fixed concurrency group with `cancel-in-progress: false` for a stateful branch push
- `.github/workflows/official-components-publish.yml` — npm OIDC Trusted Publishing and job-scoped `environment:` gating
- `infra/Azure/Bicep/identity/federatedCredentials.bicep` — the OIDC subject claims that must match each GitHub Environment name
