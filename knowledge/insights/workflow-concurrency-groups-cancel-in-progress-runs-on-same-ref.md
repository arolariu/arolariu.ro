---
description: "Every workflow sets concurrency group to workflow-name + git ref with cancel-in-progress: true, preventing parallel runs on the same branch"
type: convention
source: "docs/rfc/0001-github-actions-workflows.md"
status: current
created: 2026-02-25
---

# Workflow concurrency groups cancel in-progress runs on same ref

All GitHub Actions workflows in the monorepo define a concurrency group using the pattern `${{ github.workflow }}-${{ github.ref }}` with `cancel-in-progress: true`. This means that when a new push arrives on a branch while a workflow is still running for that same branch, the in-progress run is automatically cancelled in favor of the newer one.

This convention serves two purposes. First, it prevents resource waste: if a developer pushes three commits in quick succession, only the final commit's workflow runs to completion rather than consuming GitHub Actions minutes on intermediate states. Second, it prevents deployment conflicts: without concurrency groups, two simultaneous deployment jobs for the same branch could race to deploy different versions, leading to unpredictable outcomes.

The group key combines workflow name with git ref, which means different workflows can still run concurrently on the same branch (the website build and the hygiene check can overlap), but the same workflow will not run twice for the same branch. This is the right granularity for a monorepo where multiple pipelines legitimately fire on the same push event.

---

Related Insights:
- [[ci-cd-uses-three-workflow-patterns-based-on-deployment-risk-level]] -- foundation: all three workflow patterns apply this concurrency convention
- [[website-deployment-separates-build-from-release-with-manual-approval-gates]] -- enables: concurrency groups prevent parallel build-release chains from conflicting

Domains:
- [[infrastructure]]
