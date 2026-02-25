---
description: "Each workflow specifies paths: filters matching its project directory, so a change to sites/cv.arolariu.ro/ only triggers the CV pipeline, not the website or API pipelines"
type: convention
source: "docs/rfc/0001-github-actions-workflows.md"
status: current
created: 2026-02-25
---

# Monorepo workflows use path filters to trigger only relevant pipelines

Every deployment workflow in the monorepo configures `paths:` filters on its push and pull_request triggers to scope execution to files that actually affect the target project. A push that changes only `sites/cv.arolariu.ro/` triggers the CV workflow but not the website or API workflows. This prevents wasted CI/CD minutes and avoids unnecessary deployments when unrelated code changes.

Path filtering is essential for monorepo CI/CD because without it, every push to `main` or `preview` would trigger all workflows simultaneously -- building and deploying the website, API, CV site, and documentation even when only one project has changes. In a monorepo with five deployment targets across different tech stacks (Node.js, .NET, SvelteKit, DocFX), this would multiply CI costs and create noise in deployment logs.

The standard workflow structure pattern documented in the RFC shows paths configured alongside branch triggers in the `on:` block. Combined with the workflow concurrency convention ([[workflow-concurrency-groups-cancel-in-progress-runs-on-same-ref]]), path filtering ensures that the CI system responds precisely to what changed: the right workflow fires, and only the latest version of that workflow runs.

All workflows also support `workflow_dispatch` for manual triggering, which bypasses path filters. This provides an escape hatch when a workflow needs to run despite no relevant file changes (for example, after an infrastructure configuration change in Azure that affects deployment but not source code).

---

Related Insights:
- [[ci-cd-uses-three-workflow-patterns-based-on-deployment-risk-level]] -- foundation: path filtering applies across all three workflow patterns
- [[workflow-concurrency-groups-cancel-in-progress-runs-on-same-ref]] -- extends: concurrency + path filters together define the trigger precision model
- [[tag-based-publishing-workflow-triggers-on-components-v-prefix]] -- example: tag-based triggering is an alternative to path-based for the component library

Domains:
- [[infrastructure]]
