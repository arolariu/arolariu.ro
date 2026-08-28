# Infrastructure and Workflow Review

Use for Bicep, deployment configuration, GitHub workflows/composite actions,
or local orchestration changes. Read the matching instructions, RFC 0001 for
workflows, live modules/callers, and the Infrastructure Expert's approval
boundaries.

## Identity, secrets, network, and cost

- Flag broadened RBAC scope, credential fallback, plaintext secrets, public
  exposure, weakened TLS/firewall/private-link behavior, or missing secure
  parameter flow.
- Review new resources, SKU/region/scale changes, replacement/deletion
  semantics, and realistic cost direction.
- Verify environment/OIDC subjects and deployment identities remain aligned;
  an environment rename can break token exchange.

## GitHub Actions

- Review workflow/job permissions, fork/PR secret exposure, command injection,
  third-party action refs, mutable inputs, and untrusted artifact/cache use.
- Check triggers, path filters, conditions, reusable/composite interfaces,
  concurrency, environments, and producer/consumer artifact compatibility.
- Flag `continue-on-error`, conditions, or aggregation logic that turns failed
  validation/deployment into success.
- Cache keys must cover the real dependency owner and must not restore
  incompatible runtime/native artifacts.

## Bicep and deployment behavior

- Verify module composition, target scope, names, secure parameters, outputs,
  dependencies, diagnostics, and destructive replacement behavior.
- A successful compile does not prove a safe target deployment. `what-if` and
  live deployment evidence require the approved target and checkpoint.
- Do not report provider defaults or branch/environment protections without
  live evidence.

## Local orchestration

- Preserve explicit Rancher/Podman selection, dependency/readiness order,
  health semantics, persistence, bootstrap/reset behavior, and bounded stop
  scope.
- Flag hidden data/volume deletion, broad process termination, detached
  lifecycle with no observation owner, secret logging, or readiness inferred
  only from process/container existence.

Infrastructure corrections remain approval-gated. Route dependency/action
version research through `infra-dependency-update` and local runtime operations
through `infra-selfhost`.
