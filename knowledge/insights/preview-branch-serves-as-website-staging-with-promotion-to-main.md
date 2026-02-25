---
description: "The website build triggers on push to preview, deploys to staging via workflow_run, then production release is a separate manual or automated promotion from preview to main"
type: decision
source: "docs/rfc/0001-github-actions-workflows.md"
status: current
created: 2026-02-25
---

# Preview branch serves as website staging with promotion to main

The monorepo uses a two-branch environment promotion model for the website: `preview` is the staging environment and `main` is production. The website build workflow triggers on pushes to `preview`, builds a Docker image, pushes it to Azure Container Registry tagged with the commit SHA, and the release workflow fires automatically via `workflow_run` to deploy that image to the staging environment.

Production deployment happens when code is promoted from `preview` to `main`, either through a pull request merge or manual workflow dispatch. This creates a deliberate gate between staging validation and production release -- changes soak in the preview environment before reaching users.

Other projects in the monorepo (API, CV site, documentation) skip the preview stage entirely and deploy directly from `main` using the single-step Trigger pattern. The website is the only project that uses the `preview` branch as a staging intermediary, reflecting its higher deployment risk as the primary user-facing application. This asymmetry means the `preview` branch is primarily a website concern, not a monorepo-wide staging convention.

---

Related Insights:
- [[website-deployment-separates-build-from-release-with-manual-approval-gates]] -- extends: the preview branch is the mechanism that enables the build-release separation
- [[ci-cd-uses-three-workflow-patterns-based-on-deployment-risk-level]] -- foundation: the preview staging model is the reason the website needs the Build-Release pattern
- [[docker-images-tagged-with-commit-sha-for-artifact-traceability]] -- enables: SHA-tagged images in the preview environment allow precise rollback

Domains:
- [[infrastructure]]
