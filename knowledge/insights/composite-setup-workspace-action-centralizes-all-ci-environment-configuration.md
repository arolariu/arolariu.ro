---
description: "The .github/actions/setup-workspace composite action handles Node.js, .NET, caching, Playwright, and artifact generation — eliminating ~150 lines of duplication"
type: pattern
source: "docs/rfc/0001-github-actions-workflows.md"
status: current
created: 2026-02-25
---

# Composite setup-workspace action centralizes all CI environment configuration

Every GitHub Actions workflow in the monorepo delegates environment setup to a single composite action at `.github/actions/setup-workspace/`. This action accepts input toggles for Node.js version, .NET version, dependency installation, Playwright browser installation, GraphQL artifact generation, and a workflow-specific cache key prefix. It outputs cache hit/miss indicators that downstream steps can use for conditional logic.

The design follows DRY principles at the CI/CD level: rather than each workflow repeating Node.js setup, npm install, .NET restore, and cache configuration, they call the composite action with their specific requirements. A website workflow enables Playwright and generation; an API workflow enables only .NET; a hygiene workflow enables only Node.js. The composite action handles the permutations.

This centralization carries a deliberate trade-off: any change to the composite action affects all workflows simultaneously. The RFC acknowledges this and mitigates it through documentation and testing requirements. The benefit is that updating Node.js from version 22 to 24 or changing the caching strategy happens in one place rather than across eight workflow files.

The action also provides structured progress indicators with emoji markers in CI logs, making it straightforward to identify which setup phase succeeded or failed when debugging workflow runs.

---

Related Insights:
- [[ci-cd-uses-three-workflow-patterns-based-on-deployment-risk-level]] -- foundation: all three workflow patterns consume this composite action
- [[hash-based-caching-without-fallback-keys-guarantees-dependency-correctness]] -- enables: the composite action implements the caching strategy
- [[graphql-artifact-generation-runs-during-workspace-setup-before-build-steps]] -- extends: generation is one of the composite action's optional features

Domains:
- [[infrastructure]]
