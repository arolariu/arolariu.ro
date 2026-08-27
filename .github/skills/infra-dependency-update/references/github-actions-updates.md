# GitHub Actions Dependency Updates

Use this reference only after live workflow or composite-action inspection
shows that the dependency is a `uses:` declaration or an action-owned runtime
contract. Editing a workflow remains approval-gated even when only a version
ref changes.

## Identify the ownership cohort

1. Record every external `owner/repository@ref` caller under
   `.github/workflows/` and `.github/actions/`; exclude local `./` actions from
   version research.
2. Group callers by workflow family, composite owner, artifact exchange,
   authentication path, and runner. Do not normalize an unrelated version
   difference merely because the same action appears elsewhere.
3. Record the exact current and proposed ref. This repository currently uses
   approved major tags; changing the pinning policy to commit SHAs is a
   separate workflow-security decision.

## Research the target

- Use the action's repository release/tag and `action.yml` as primary sources.
- Read every crossed release for changed inputs, outputs, defaults, bundled
  Node runtime, runner requirements, permissions, token handling, caching,
  artifact format, and deprecations.
- Check coupled producers and consumers together, especially
  upload/download-artifact and reusable/composite action interfaces.
- For setup actions, verify the repository's engine/runtime declarations,
  cache owner, and dependency-path inputs remain compatible.
- For Azure login/deploy actions, preserve the current OIDC, environment,
  secret, RBAC, and workflow-permission contract. A version bump does not
  authorize an authentication or permission redesign.

## Apply and verify

After explicit approval, update only the intended `uses:` refs and the
source-proven compatibility adaptations required by that target. Preserve
local action paths, expressions, conditions, permissions, concurrency,
environments, and artifact names unless the release contract requires an
approved change.

Validate the complete affected YAML graph, including composite and reusable
callers, with the repository's existing workflow checks. Inspect the diff for
unrelated version normalization and retain the prior refs plus any coupled
input/output changes as the rollback unit.
