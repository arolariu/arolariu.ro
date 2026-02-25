---
description: "The website build workflow tags Docker images pushed to Azure Container Registry with the git commit SHA, creating a 1:1 mapping between deployed artifact and source code"
type: convention
source: "docs/rfc/0001-github-actions-workflows.md"
status: current
created: 2026-02-25
---

# Docker images tagged with commit SHA for artifact traceability

The website build workflow tags every Docker image pushed to Azure Container Registry with the git commit SHA from which it was built. This creates an immutable, bidirectional mapping: given a running container, you can trace back to the exact source commit; given a commit, you can identify which container image was produced.

SHA-based tagging is preferred over semantic version tags or `latest` tags in the CI/CD pipeline because it eliminates ambiguity. A `latest` tag is mutable -- it points to whatever was last pushed -- making it impossible to know which code is actually running in production without additional metadata. A commit SHA is immutable and globally unique within the repository, so it serves as both an identifier and a provenance record.

This convention integrates with the Build-Release pattern: the build workflow pushes the SHA-tagged image, and the release workflow deploys it by referencing that specific tag. If a deployment needs to be rolled back, operators can redeploy a previous SHA-tagged image without rebuilding. The trade-off is that container registries accumulate many tagged images over time, requiring a retention policy to manage storage costs.

---

Related Insights:
- [[website-deployment-separates-build-from-release-with-manual-approval-gates]] -- enables: the release workflow references SHA-tagged images produced by the build workflow
- [[preview-branch-serves-as-website-staging-with-promotion-to-main]] -- extends: SHA tags allow precise identification of which build is deployed to staging vs production

Domains:
- [[infrastructure]]
