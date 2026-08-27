# GitHub Actions Reference Catalog

Owner: `.github/instructions/workflows.instructions.md`. This catalog holds
extensive, repository-specific GitHub Actions workflow and composite-action
examples, anti-patterns, edge cases, and rationale for `.github/workflows/`
and `.github/actions/`. It does not define a workflow procedure itself and it
does not authorize any workflow mutation — every change still requires the
explicit user approval described in the Infrastructure Expert agent's
read-only-versus-mutation classification and escalation examples. It does not
restate versions, global commands, or root safety policy — see root
`AGENTS.md` and RFC 0001. It does not duplicate `refactor`, `documentation`,
or `dependency-migration` skill workflow procedures; this catalog explains the
CI/CD architecture and constraints those approved changes must fit into, with
YAML, not procedure.

## Permissions

Every workflow declares the narrowest top-level `permissions:` block its jobs
actually need — nothing defaults to broad, and additions are visibly
justified inline:

```yaml
# .github/workflows/official-api-trigger.yml
permissions:
  id-token: write # Required for OIDC authentication with Azure
  contents: read # Required to checkout repository
```

```yaml
# .github/workflows/official-website-build.yml
permissions:
  id-token: write # Required for OIDC authentication with Azure
  contents: read # Required to checkout repository
  issues: write # Required for PR comments on test results
  pull-requests: write # Required for PR comments on test results
```

```yaml
# .github/workflows/official-components-publish.yml
permissions:
  id-token: write # Required for OIDC authentication with npm
  contents: read # Required to checkout repository
  attestations: write # Required for provenance attestations
```

```yaml
# .github/workflows/official-hygiene-check-v2.yml
permissions:
  contents: read
  pull-requests: write
  checks: write
```

`official-status-probe.yml` is the one workflow with `contents: write` at the
top level, because its whole job is committing aggregated probe data to an
orphan `status-data` branch — that permission is not a template to copy for
workflows that merely read or deploy. A job can also carry its own narrower
(or broader-but-scoped) block: `official-e2e-action.yml`'s
`raise-issue-on-failure` job separately declares
`permissions: { contents: read, issues: write }` even though the workflow's
top-level `permissions` is just `contents: read`, because only that one job
needs to open an issue.

## OIDC authentication

Jobs that invoke the currently pinned `azure/login` action authenticate with a
client ID, tenant ID, and subscription ID sourced from GitHub Secrets — never a
client secret or long-lived credential:

```yaml
# .github/workflows/official-api-trigger.yml
- name: 🔒 Performing auth against Azure Public Cloud...
  uses: Azure/login@<current-approved-major>
  with:
    client-id: ${{ secrets.AZURE_CLIENT_ID }}
    tenant-id: ${{ secrets.AZURE_TENANT_ID }}
    subscription-id: ${{ secrets.AZURE_SUBSCRIPTION_ID }}
```

This only works because `permissions.id-token: write` is set (GitHub must be
allowed to mint the OIDC token) and because the federated credential's
`subject` claim on the Azure side matches the workflow's GitHub Environment
exactly:

```bicep
// infra/Azure/Bicep/identity/federatedCredentials.bicep
{ name: 'FederatedGithubCredentialForProduction', subject: 'repo:arolariu/arolariu.ro:environment:production' }
```

```yaml
# .github/workflows/official-api-trigger.yml
environment: ${{ inputs.environment || 'production' }}
```

Anti-pattern: adding a new GitHub Environment name (or renaming one) without
also adding a matching `federatedIdentityCredentials` subject in
`identity/federatedCredentials.bicep` — the Azure login step fails with an
OIDC token-exchange error that looks unrelated to the environment rename.
`official-components-publish.yml` uses OIDC for npm Trusted Publishing
instead of Azure — no `NODE_AUTH_TOKEN` is set anywhere, and the publish step
comment says so explicitly:

```yaml
# .github/workflows/official-components-publish.yml
- name: 🚀 Publish to npm
  if: inputs.dry-run != true
  run: npm publish --provenance --tag ${{ inputs.tag || 'latest' }} --access public
  # Note: No NODE_AUTH_TOKEN needed - using Trusted Publishing (OIDC)
```

`AZURE_CLIENT_ID`, `AZURE_TENANT_ID`, and `AZURE_SUBSCRIPTION_ID` are
identifiers supplied from GitHub Secrets; they are not a client secret and do
not replace the federated OIDC token. Do not infer mixed credential
authentication merely from those inputs. A `client-secret`/password/certificate
input would be a different, long-lived credential design and requires explicit
security approval.

Static Web Apps deployments are a separate live authentication path. The CV,
documentation, and status workflows invoke the currently pinned
`Azure/static-web-apps-deploy` action with a site-specific
`azure_static_web_apps_api_token` secret:

```yaml
- uses: Azure/static-web-apps-deploy@<current-approved-major>
  with:
    azure_static_web_apps_api_token: ${{ secrets.<site-specific-token-name> }}
    action: upload
```

These are long-lived deployment-token secrets, not OIDC. Do not describe them
as federated credentials, copy one site's token to another workflow, or expose
the value in logs. Replacing this current authentication path is a workflow and
security design change that requires explicit approval.

**Live drift, not a template:** the CV and documentation workflows still
describe Azure OIDC in header comments and grant `id-token: write`, while their
deploy steps use Static Web Apps deployment tokens. Do not copy that mismatch
into new workflows or infer that the token deployment consumes the OIDC
permission. Removing the permission/comment or changing the authentication
path is a workflow security change and remains approval-gated.

## Actions and pinned versions

Actions are pinned to a specific major version in live workflow/action files.
Read the current reference from the exact workflow family and compare relevant
siblings before editing; this catalog intentionally does not snapshot action
versions.

Live drift exists between the pinned major used by the hygiene gate and the
one used by the E2E failure fan-in for `actions/download-artifact`. Do not
propagate or normalize that difference as unrelated cleanup. Match the owning
workflow unless an action-version change is explicitly approved.

## Caching

Toolchain-level caches (`~/.npm`, `~/.nuget/packages`, pip) are delegated
entirely to each `actions/setup-*` action's own built-in mechanism, configured
by `setup-tooling` with a `cache-dependency-path` and nothing else:

```yaml
# .github/actions/setup-tooling/action.yml
- uses: actions/setup-node@<current-approved-major>
  with:
    cache: ${{ inputs.cache == 'true' && 'npm' || '' }}
    cache-dependency-path: |
      package-lock.json
      .github/scripts/package-lock.json
```

The comment on that step explains a real bug the two-path list prevents: if
only the root lock file were hashed, a change to `.github/scripts/package-lock.json`
would leave the cache key unchanged, so the stale cache would be restored, npm
would re-download the changed packages anyway, and — because the restore
counted as a hit — nothing would be written back, repeating the wasted
download on every subsequent run.

Workspace-produced artifacts (`node_modules`, the Playwright browser bundle)
use explicit `actions/cache` steps pinned in the live composite action with
**no `restore-keys` fallback**,
per RFC 0001 §3.2 ("Why No Fallback Keys?"):

```yaml
# .github/actions/setup-workspace/action.yml
key: ${{ runner.os }}-node-modules-${{ inputs.node-version }}-${{ hashFiles('package-lock.json') }}
# NO restore-keys
```

```yaml
key: ${{ runner.os }}-playwright-${{ hashFiles('package-lock.json') }}
```

The `node_modules` key includes the Node major version and the Playwright key
does not — this is deliberate, not an inconsistency to reconcile. A
`node_modules` cache hit skips `npm ci` entirely, so a natively-compiled addon
(the tree pulls in `sharp`) built for a previous Node ABI would never rebuild;
the Node version must be part of the key so a Node bump forces a fresh
install. The Playwright bundle holds browser binaries, not Node addons, and
the Playwright version that governs them is already pinned by the lock file
the key hashes. Anti-pattern: adding a `restore-keys:` fallback to either
cache "to reduce cache misses" — RFC 0001 documents the exact failure mode
this reintroduces (a version bump without a regenerated lock file silently
restoring an incompatible cache).

## Path filters and triggers

Path filters scope automatic triggers to the part of the monorepo a workflow
actually builds:

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

Not every workflow uses a path filter, and the exceptions are deliberate:
`official-hygiene-check-v2.yml` runs on every `pull_request` regardless of
path and computes its own `git diff` in a dedicated `detect` job instead,
because it needs one shared "did anything change" gate feeding six parallel
provider jobs across the whole repo, not a single-directory scope. Cron- and
tag-triggered workflows (`official-status-probe.yml`'s
`schedule: "9,39 * * * *"`, `official-components-publish.yml`'s
`push: { tags: ["components-v*"] }`) have no `paths:` filter at all, because
their trigger is time- or tag-based, not file-change-based — adding a path
filter to either would be a no-op at best and a functional regression at
worst (a scheduled probe must always run; a version-tag push rarely touches
`packages/components/**` in the same commit).

## Concurrency

The RFC 0001 baseline concurrency group is
`${{ github.workflow }}-${{ github.ref }}` with `cancel-in-progress: true`,
but live workflows tune the group key to the actual collision they need to
prevent:

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

The status-probe group is a fixed string (not templated on `ref` or PR
number) and explicitly sets `cancel-in-progress: false` — the job pushes to a
shared orphan `status-data` branch, and cancelling a run mid-push (or letting
a second run race the same branch) risks a corrupted or lost commit. That is
the concrete counter-example to "always cancel in progress": a workflow that
performs a stateful, non-idempotent push to shared data should serialize
(queue), not cancel.

## Artifacts and secrets

Artifacts follow a produce → upload → download → aggregate shape for
fan-out/fan-in work. `official-hygiene-check-v2.yml`'s matrix `providers` job
uploads one `outcome-<provider>` artifact per parallel check, and the `gate`
job downloads all of them with a pattern and merges them into one directory:

```yaml
# .github/workflows/official-hygiene-check-v2.yml (providers job)
- uses: actions/upload-artifact@<current-approved-major>
  with:
    name: outcome-${{ matrix.provider.id }}
    path: artifacts/hygiene/outcome-${{ matrix.provider.id }}.json
    if-no-files-found: warn
    retention-days: 7

# (gate job)
- uses: actions/download-artifact@<current-approved-major>
  with:
    pattern: outcome-*
    path: artifacts/hygiene
    merge-multiple: true
```

`if-no-files-found` is chosen per situation, not defaulted: `warn` for a
best-effort outcome file, `error` for
`official-website-build.yml`'s test-report upload where a missing report
means the test phase itself is broken, not merely quiet.

Secrets are always threaded through `env:`, never interpolated directly into
a `run:` string — `setup-workspace/action.yml`'s own header comment states
this as a rule, not a suggestion:

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

`GITHUB_TOKEN` is scoped per job/step rather than assumed global — for
example `official-website-build.yml`'s PR-comment step and
`official-hygiene-check-v2.yml`'s gate step each set
`GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}` explicitly in their own `env:`
block rather than relying on an ambient token.

## Environments and deployment safety

The website's build/release split separates production deployment from the
build workflow and provides a place for environment protection (RFC 0001
§4.1):

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

`environment:` blocks scope environment secrets and the exposed URL to the job,
not the workflow:

```yaml
# .github/workflows/official-website-release.yml
environment:
  name: ${{ inputs.environment || 'development'}}
  url: ${{ steps.deploy-to-webapp.outputs.webapp-url }}
```

An environment creates a manual approval gate only when that environment has
deployment protection rules configured. The current production, development,
CV, documentation, and status environments have no protection rules, so do not
claim an active approval gate from YAML presence alone. Query current
environment settings when approval behavior matters and treat adding
protection rules as a production workflow/repository-settings decision.

`official-components-publish.yml` applies the same job-level scoping principle
even without a development/production choice: only the `publish` job carries
an `environment: { name: npm-publish }` block, while the preceding `validate`
job (build, version check, dry-run pack) runs with no environment. Whether that
environment currently enforces reviewers must be verified from repository
settings rather than inferred.

`official-api-trigger.yml` is the trigger-pattern counter-example — one
workflow does test → build → deploy in sequence with `needs:` chaining rather
than a separate release workflow, because RFC 0001 classifies API deployments
as lower-risk than the website's user-facing release:

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

Anti-pattern: adding a direct deploy step to a workflow that currently only
builds/tests (or removing the build/release split for the website) — that is
a deployment-behavior change requiring the same confirmation as any other
production deployment edit, regardless of how small the diff looks.

## Reusable composite actions

`setup-tooling` and `setup-workspace` are the only two composite actions, and
they have a strict ownership boundary documented in `setup-tooling`'s own
header: `setup-tooling` only installs binaries (Node/.NET/Python) and is
repo-agnostic; `setup-workspace` wraps it and adds everything repo-specific
(dependency installs, Playwright, code generation, the components build).
Jobs that need only a binary (for example `official-e2e-action.yml`'s
`prepare` job, which just needs `node` to resolve inputs) use
`setup-tooling` directly instead of paying for a full workspace bootstrap:

```yaml
# .github/workflows/official-e2e-action.yml
- name: 🧰 Setup tooling
  uses: ./.github/actions/setup-tooling
```

`setup-workspace` validates its own input combinations *before* installing
any toolchain, specifically so a contradictory input set fails in seconds
instead of after a multi-minute SDK provision, and so a disabled toolchain
cannot silently fall through to whatever version the runner happens to
preinstall:

```yaml
# .github/actions/setup-workspace/action.yml
require() {
  if [ "$3" = "true" ] && [ "$1" != "true" ]; then
    errors+=("  - '$4: true' requires '$2: true' (currently '$2: $1')")
  fi
}
require "$NODE" node "$INSTALL_NODE_DEPS" install-node-deps
require "$INSTALL_NODE_DEPS" install-node-deps "$RUN_GENERATE" run-generate
```

This is the pattern to follow when adding a new composite-action input that
depends on another one: validate the combination up front with a clear
`::error::`, don't let a downstream step fail with a confusing, unrelated
error message. `official-hygiene-check-v2.yml`'s matrix strategy shows the
same "provision only what's needed" discipline at the workflow level — each
`provider` entry carries its own `needs-dotnet`/`needs-python` booleans, and
`setup-workspace` is called once per matrix job with those booleans forwarded
directly as `dotnet:`/`python:` inputs, so a lint-only job never pays for a
.NET SDK install.

## RFC 0001 patterns at a glance

| Pattern | Shape | Live example |
| --- | --- | --- |
| Build-Release | `push/PR → build → test → validate → [approval] → release → deploy` (two workflows) | `official-website-build.yml` + `official-website-release.yml` |
| Trigger | `push/PR → build → test → deploy` (one workflow) | `official-api-trigger.yml`, `official-cv-trigger.yml`, `official-docs-trigger.yml` |
| Validation | `PR → lint/format/test → report`, parallel jobs | `official-hygiene-check-v2.yml`, `official-e2e-action.yml` |

Use this table to classify which pattern a proposed workflow change belongs
to before comparing it against the wrong example — a trigger-pattern
workflow gaining a manual-approval gate is effectively becoming a
build-release workflow, which is a deployment-behavior change, not a small
tweak.

**Live drift, not a template:** `official-website-release.yml` currently has no
top-level or job-level concurrency key. Do not copy that absence into a new
deployment workflow. Adding concurrency to the existing release workflow is
still a production-workflow behavior change and requires explicit approval;
the catalog records the gap but does not authorize correcting it.

## Anti-pattern corrections summary

| Anti-pattern | Why it fails here | Correction |
| --- | --- | --- |
| Adding `restore-keys:` to the `node_modules` or Playwright cache | Reintroduces the exact stale-cache failure mode RFC 0001 §3.2 documents (version bump without a lock-file change silently restores an incompatible cache) | Keep the cache key exact-match only; accept the cache miss on genuine dependency changes |
| Renaming/adding a GitHub Environment without a matching Bicep federated credential | The pinned `azure/login` action's OIDC token exchange fails against a subject claim that does not exist | Add the matching `federatedIdentityCredentials` entry in `identity/federatedCredentials.bicep` in the same approved change |
| Interpolating a secret directly into a `run:` shell string | Script-injection risk; violates `setup-workspace`'s own documented convention | Pass the value through an `env:` block and reference the environment variable inside `run:` |
| Bumping one workflow's pinned action version without checking siblings | Creates or extends the current `download-artifact` major-version drift | Match the version the file already uses unless the version bump itself is the approved task |
| Adding a deploy step to a currently build/test-only trigger workflow | Silently converts a lower-risk trigger pattern into a production deployment behavior change | Treat as a deployment-safety/environment change requiring confirmation, not a routine step addition |
| Setting `cancel-in-progress: true` on a workflow that pushes to shared state (e.g. an orphan data branch) | Can cancel mid-write and corrupt or lose the push | Use a fixed concurrency group with `cancel-in-progress: false` to serialize instead |
| Adding a `paths:` filter to a schedule- or tag-triggered workflow | `schedule`/tag-push triggers are time- or version-based, not file-change-based; a path filter can silently suppress required runs | Leave schedule/tag workflows without a `paths:` filter |

## Live source pointers

- `docs/rfc/0001-github-actions-workflows.md` — workflow pattern taxonomy,
  caching philosophy, and the "why no fallback keys" rationale
- `.github/actions/setup-tooling/action.yml` — toolchain-only composite
  action and its built-in cache configuration
- `.github/actions/setup-workspace/action.yml` — workspace bootstrap, input
  validation guard, and explicit cache steps
- `.github/workflows/official-api-trigger.yml` — trigger-pattern
  test→build→deploy chain with OIDC and environment gating
- `.github/workflows/official-website-build.yml`,
  `official-website-release.yml` — build-release split and `workflow_run`
  chaining
- `.github/workflows/official-hygiene-check-v2.yml` — matrix fan-out,
  artifact fan-in, and job-scoped toolchain provisioning
- `.github/workflows/official-e2e-action.yml` — scheduled live testing,
  matrix strategy, and a job-scoped `permissions` override
- `.github/workflows/official-status-probe.yml` — fixed concurrency group
  with `cancel-in-progress: false` for a stateful branch push
- `.github/workflows/official-components-publish.yml` — npm OIDC Trusted
  Publishing and job-scoped `environment:` gating
- `infra/Azure/Bicep/identity/federatedCredentials.bicep` — the OIDC subject
  claims that must match each GitHub Environment name
