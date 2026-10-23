# Context Relevance and Git-Selected Deployments

Status: approved and implemented locally; live deployment validation remains pending.

## Intent and boundaries

Improve which repository guidance the CLI suggests, and make manual deployments
build, test, and deploy the exact Git revision the operator selected.

These are independent work packages. Either can be implemented and reverted
without the other. This specification does not authorize implementation or a
live deployment.

- Implementation edits remain in existing `.github` files.
- No new dependencies, standalone scripts, services, Azure resources, or secrets.
- Preserve the current unrelated worktree changes.
- No image-digest selector, image-only release path, generic policy engine, or
  additional agent framework.
- Keep native GitHub Environment controls and existing identity bindings.
  Tracked YAML is not evidence that live protection/RBAC settings are correct.

## A. More relevant context

### Current behavior

The [resolver](../extensions/arolariu-context/resolver.mjs) selects task assets
after two description-token matches, alphabetically orders candidates, and
stops adding pointers when its payload budget is exhausted. Generic test-related
words can therefore select auth/action guidance while missing the testing skill.

Named-project discovery considers `sites` and `packages`, not tooling.
Instruction inventory is recursive, but resolver scope loading is not.

### Chosen approach

Tuning stopwords alone is the smaller alternative, but does not adequately
address task intent or ordering. Extend the existing deterministic matcher:

1. Keep root `AGENTS.md` first.
2. Give explicitly named assets and quoted repository paths priority over
   inferred matches. Preserve their matching instructions and nearest guides.
3. Prefer relevant project/task matches over generic description overlap.
   Derive relevance from live asset names, descriptions, and repository
   ownership; do not introduce a separate task-to-skill registry.
4. Recognise existing local guides, including tooling/AppHost requests.
5. Reuse existing safe inventory/frontmatter helpers for consistent recursive
   instruction discovery.
6. Break equal-priority ties deterministically and deduplicate pointers.

The resolver remains advisory: it emits candidate paths, not loaded instructions,
tool approvals, automatic delegation, or permission decisions.

### Safety and acceptance

Keep the hook's existing 2,000-character cap and honour smaller `maxCharacters`
values. Emit only complete escaped pointers; preserve the untrusted-data footer.
Retain repository boundaries, symlink restrictions, and formatting-character
rejection. No meaningful repository signal still means no additional context.

Extend the existing [resolver tests](../extensions/arolariu-context/resolver.test.mjs)
with inclusion, exclusion, ordering, and budget assertions:

| Request | Required outcome |
| --- | --- |
| Focused unit test for a website invoice filter hook | Testing/hook guidance is preferred; auth and Server Action guidance do not match solely through generic test words. |
| Fix an API bug | API guide and bug-fix guidance are discoverable, including meaningful short terms such as `API`. |
| Explain tooling/AppHost architecture | Existing tooling guide is found without requiring an explicitly quoted file path. |
| Edit a path governed by a nested instruction | That instruction is found consistently with the checker inventory. |
| Name a skill or quote a path under a tight budget | Explicit signals are not crowded out by weak inferred matches. |
| Unrelated conceptual prompt or unsafe path | Existing no-op and path-safety behavior remains intact. |

Use representative live metadata as well as small fixtures. Do not require an
exact global candidate list that would make unrelated asset additions fail.

## B. Consistent targets and exact Git revisions

### Manual input contract

Use GitHub's existing **Run workflow** branch selector, not another custom
branch-selection input. Add one optional `commit_sha` string to each manual
website build, API, and experimental trigger.

- Empty `commit_sha`: use the selected branch revision captured by the dispatch
  event, not a later moving branch tip.
- Supplied `commit_sha`: require a full 40-hex-character commit ID, normalise its
  case, and verify that it is a commit in the selected branch's captured history.
  Malformed, nonexistent, or unrelated revisions fail explicitly.
- Production dispatches run from `main`; an optional older commit must belong
  to `main` history. Keep this to ordinary Git ancestry checks, not a policy
  framework. A full-history validation checkout is sufficient.
- Development may use another branch in this repository. Fork URLs, arbitrary
  remotes, tags, and image references are not accepted as revision selectors.

The branch selector also selects the workflow definition. Branches must contain
the updated workflows to expose the new contract. Production rollback can run
the current workflow from `main` while checking out an older allowed application
commit through `commit_sha`.

### Existing target map

| Service | Environment | Image repository | App Service |
| --- | --- | --- | --- |
| Website | development | `frontend/dev.arolariu` | `dev-arolariu-ro` |
| Website | production | `frontend/arolariu` | `www-arolariu-ro` |
| API | production | `backend/api.arolariu` | `api-arolariu-ro` |
| Experimental | production | `exp/exp.arolariu` | `exp-arolariu-ro` |

Website manual runs retain the development/production environment choice.
Remove the independent website container selector. API/experimental targets
are production-only, so remove their misleading environment choices.
These cloud workflows are Azure-only; remove their local infrastructure choices.
Legacy unsupported input combinations must not silently select a default target.
Document the changed dispatch interface rather than adding a compatibility shim.
Remove the website deployment flow's `skip_tests` input and bypass: tests are
mandatory for this Git-selected path.

Registry, app, identity, subscription, and resource-group values are not
caller-controlled inputs. Keep the existing known bindings; do not create
development API/experimental resources or broaden permissions.

### Execution and handoff

1. A read-only validation job captures the event branch/SHA, validates any
   supplied SHA and production ancestry, and emits one resolved source SHA
   and effective target. Pass input values through environment variables and
   quoted Git arguments, not shell interpolation of GitHub expressions.
2. Every test/build checkout uses that resolved SHA. Source validation occurs
   before Azure authentication, image publication, or deployment.
3. Tests must succeed before the selected revision can be deployed. Failed or
   skipped tests cannot authorize release; the existing manual test-skip escape
   must not bypass this Git-selected deployment path.
4. Build and smoke-test using the existing service-specific checks. Use the
   resolved SHA for build arguments, `COMMIT_SHA`, image identity, and application
   metadata instead of accidentally using the workflow-definition SHA.
5. Publish the run-specific tag
   `<resolved-sha>-<run-id>-<run-attempt>`. Pass that exact image reference from
   build to deployment; never reconstruct it from `latest` or from a later
   release retry's attempt number. Job outputs carry the repository-and-tag;
   deployment prefixes the unchanged environment registry binding. This avoids
   GitHub suppressing an output containing the masked registry address.
6. Deployment derives the app/repository from the effective environment and
   validates that the supplied build output matches that target.

For the website, keep both existing files but convert
[release](../workflows/official-website-release.yml) to a reusable workflow
called by the successful [build](../workflows/official-website-build.yml).
This replaces the `workflow_run` handoff and direct release dispatch. Manual
operators start the build workflow; release is not a separate image-selection
shortcut. Pass the validated environment, source SHA, and exact built image
through same-run inputs.
The reusable workflow definition comes from the caller's workflow commit,
not from an optionally older application-source checkout.

Keeping `workflow_run` plus an authenticated build-metadata artifact is the
alternative. It is not selected because it adds handoff/validation machinery
unnecessary for this Git-only flow.

The [API](../workflows/official-api-trigger.yml) and
[experimental](../workflows/official-exp-trigger.yml) workflows retain their
existing test/build/deploy layout and pass validated job outputs between stages.
The experimental app's `COMMIT_SHA` setting must use the resolved source SHA.

### Controls, failures, and compatibility

- Keep the reusable release job's explicit GitHub Environment. Pass existing
  secrets by name, preserve environment-secret precedence, and fail clearly
  when a required binding is empty. Do not add blanket secret inheritance.
- A reusable call cannot elevate caller permissions. Retain necessary existing
  deployment rights; the source-validation job needs only repository reads.
- Invalid inputs, unavailable history, unsupported targets, failed tests/builds,
  or unavailable built images stop the run. No fallback to another SHA, branch,
  environment, image, or skipped-test success.
- An older revision must work with the current pipeline. Do not silently add
  historical toolchain shims or rebuild a different revision when it fails.
- Summaries distinguish the selected source SHA from the workflow-definition
  SHA and report the effective target and exact built image without secret values.
- Keep automatic behavior: website pushes on `preview` target development;
  API/experimental pushes on `main` target production, using their event SHA.
- Apart from replacing the website release handoff with `workflow_call`, keep
  trigger sources and path filters unchanged. Add no resources, slots, RBAC
  assignments, or generalized release coordinator. Concurrency/release-ordering
  redesign is separate work.

## Verification and rollout

Use existing Node/Vitest test files and isolated Git/shell checks; no new test
framework or standalone validation script. Exercise actual validation logic,
not only constants or a detached decision table.

Deployment acceptance covers branch-head/default SHA, a valid older commit,
malformed/unknown SHA, a commit outside the selected branch, production outside
`main` history, unsupported targets, and failed/skipped tests. A branch movement
after capture must not change the tested/built/deployed SHA.

Verify all website target pairs and the fixed API/experimental targets.
Check that every image/build/app-setting SHA comes from validated outputs,
that the website caller passes the exact built image, and that invalid calls
to the reusable release cannot select an arbitrary repository/application.
YAML parsing alone is not proof that these semantics work.

Primary implementation files are the existing resolver/test files and the four
linked workflow files. Update the existing workflow/customization guides for
the new manual entrypoint and advisory matching behavior. Do not modify
application source, root manifests, or infrastructure.
The same-run website handoff deliberately changes the current event-chain
implementation; record that distinction rather than presenting it as unchanged.

Implement context and deployment separately. Validate deployment behavior with
isolated fixtures first; any actual development workflow run or production
deployment requires an explicit target-specific checkpoint. Inspect live
environment protection and identity settings before relying on them.

Rollback is an approved run against a previous allowed Git SHA, with tests and
build repeated. There is no automatic rollback or image-only fallback.
The website caller/callee interface must be changed or reverted together;
neither rollout nor rollback may leave the old automatic release trigger active
alongside the new call.

## Source references

- [Existing context hook](../extensions/arolariu-context/extension.mjs)
- [Safe inventory](../extensions/arolariu-checker/inventory.mjs)
- [Root operating contract](../../AGENTS.md)
- [Workflow constraints](../instructions/workflows.instructions.md)
- [Workflow architecture RFC](../../docs/rfc/0001-github-actions-workflows.md)
- [Git ancestry check](https://git-scm.com/docs/git-merge-base)
- [Reusable workflows and environment secrets](https://docs.github.com/en/actions/how-tos/reuse-automations/reuse-workflows)
