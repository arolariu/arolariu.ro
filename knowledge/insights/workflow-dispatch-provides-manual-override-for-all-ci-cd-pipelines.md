---
description: "Every workflow includes workflow_dispatch alongside its primary trigger, enabling manual runs that bypass path filters for hotfixes, re-runs after transient failures, or infrastructure-only changes"
type: convention
source: "docs/rfc/0001-github-actions-workflows.md"
status: current
created: 2026-02-25
---

# Workflow dispatch provides manual override for all CI/CD pipelines

Every GitHub Actions workflow in the monorepo includes `workflow_dispatch` as a trigger alongside its primary event (push, pull_request, workflow_run, or tag push). This is a deliberate operational escape hatch: manual dispatch bypasses the path filters and branch conditions that normally gate workflow execution.

The primary use cases for manual dispatch are: re-running a workflow after a transient CI failure (flaky test, runner timeout, external service outage) without pushing a new commit; deploying after an infrastructure change in Azure that affects the application but does not modify any source files (so path filters would not trigger the workflow); and performing hotfix deployments that need to skip the normal preview-to-main promotion flow.

Manual dispatch is especially important for the website release workflow, where `workflow_run` is the primary trigger. If the build workflow succeeds but the release fails due to an Azure outage, the operator can manually re-trigger the release without re-running the entire build. Without `workflow_dispatch`, the only option would be pushing an empty commit to re-trigger the build-release chain.

This convention is universal: no workflow exists that cannot be manually triggered. It costs nothing when unused and provides critical operational flexibility when needed.

---

Related Insights:
- [[monorepo-workflows-use-path-filters-to-trigger-only-relevant-pipelines]] -- extends: workflow_dispatch is the override mechanism when path filters need to be bypassed
- [[website-deployment-separates-build-from-release-with-manual-approval-gates]] -- enables: manual dispatch on the release workflow allows independent re-triggering
- [[ci-cd-uses-three-workflow-patterns-based-on-deployment-risk-level]] -- foundation: all three patterns include this escape hatch

Domains:
- [[infrastructure]]
