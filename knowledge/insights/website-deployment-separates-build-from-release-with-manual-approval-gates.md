---
description: "official-website-build.yml pushes Docker images to ACR on preview branch; official-website-release.yml deploys via workflow_run trigger with optional manual approval"
type: decision
source: "docs/rfc/0001-github-actions-workflows.md"
status: current
created: 2026-02-25
---

# Website deployment separates build from release with manual approval gates

The Next.js website is the only project in the monorepo that uses the Build-Release workflow pattern, splitting its CI/CD pipeline across two separate workflow files. The build workflow (`official-website-build.yml`) triggers on pushes to the `preview` branch: it sets up the workspace with Node.js, Playwright, and artifact generation, runs tests, builds a Docker image, and pushes it to Azure Container Registry tagged with the commit SHA. The release workflow (`official-website-release.yml`) triggers via `workflow_run` when the build workflow completes on `preview`, and also supports manual dispatch for production deployments.

This separation serves the environment promotion model: code merges to `preview` automatically build and can deploy to staging, but production releases require a deliberate trigger. The `workflow_run` event creates a dependency chain where the release workflow only fires after a successful build, preventing deployment of untested artifacts.

Both workflows support `workflow_dispatch` for manual triggering, which provides escape hatches for hotfixes or re-runs after transient failures. The API, CV site, and documentation projects do not need this separation because their deployment risk is lower -- they use the single-workflow Trigger pattern that builds and deploys in one pass.

---

Related Insights:
- [[ci-cd-uses-three-workflow-patterns-based-on-deployment-risk-level]] -- foundation: this is the Build-Release pattern applied to the highest-risk deployment
- [[workflow-concurrency-groups-cancel-in-progress-runs-on-same-ref]] -- enables: concurrency groups prevent parallel deployments during the build-release chain

Domains:
- [[infrastructure]]
