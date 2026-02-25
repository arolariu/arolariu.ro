---
description: "Build-Release for high-risk staged deployments (website), Trigger for direct deploy (API/CV/docs), Validation for PR quality gates (hygiene/e2e)"
type: decision
source: "docs/rfc/0001-github-actions-workflows.md"
status: current
created: 2026-02-25
---

# CI/CD uses three workflow patterns based on deployment risk level

The monorepo's GitHub Actions architecture classifies every workflow into one of three patterns, each matched to the risk and complexity of what it deploys.

**Build-Release** workflows split the pipeline into separate build and release phases connected by `workflow_run`. The website uses this pattern because production deployment is high-risk: the build workflow pushes a Docker image to Azure Container Registry, and a separate release workflow deploys it after optional manual approval. This two-phase design enables testing in the preview environment before promoting to production.

**Trigger** workflows combine build, test, and deploy into a single pipeline. The .NET API, SvelteKit CV site, and DocFX documentation all use this pattern because they carry lower deployment risk and benefit from a faster feedback loop. The API workflow, for instance, runs unit tests and deploys to Azure App Service in one pass.

**Validation** workflows focus exclusively on code quality without deploying anything. The hygiene check runs on every PR with parallel lint, format, test, and stats jobs that aggregate into a summary comment. E2E tests run on schedule and manual dispatch.

This tiered approach means adding a new deployable project requires choosing the right pattern rather than inventing a new pipeline structure. The composite action ([[composite-setup-workspace-action-centralizes-all-ci-environment-configuration]]) ensures all three patterns share the same environment setup, regardless of which tier they belong to.

---

Related Insights:
- [[composite-setup-workspace-action-centralizes-all-ci-environment-configuration]] -- foundation: all three patterns share the same environment setup
- [[website-deployment-separates-build-from-release-with-manual-approval-gates]] -- example: the Build-Release pattern applied to the website
- [[hygiene-checks-run-parallel-validation-jobs-with-aggregated-pr-summary]] -- example: the Validation pattern applied to code quality
- [[tag-based-publishing-workflow-triggers-on-components-v-prefix]] -- extends: component publishing is a variant of the Trigger pattern

Domains:
- [[infrastructure]]
