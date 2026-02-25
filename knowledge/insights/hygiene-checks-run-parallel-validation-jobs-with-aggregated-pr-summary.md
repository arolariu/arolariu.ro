---
description: "The hygiene workflow fans out lint, format, test, and stats as independent parallel jobs, then a summary job collects all result artifacts into a single rich PR comment"
type: pattern
source: "docs/rfc/0001-github-actions-workflows.md"
status: current
created: 2026-02-25
---

# Hygiene checks run parallel validation jobs with aggregated PR summary

The `official-hygiene-check-v2.yml` workflow implements a fan-out/fan-in pattern for code quality validation on every pull request. After an initial setup job that detects changed files, four independent jobs execute in parallel: formatting checks (Prettier), linting (ESLint with 20+ plugins), unit tests (Vitest), and dependency statistics. Each job produces a JSON result artifact. A final summary job depends on all four, downloads the artifacts, and generates a consolidated PR comment.

The parallelism is possible because these validations are truly independent -- formatting does not depend on lint results, and neither depends on test outcomes. Running them simultaneously rather than sequentially reduces total wall-clock time from the sum of all jobs to roughly the duration of the slowest one. Each parallel job sets up its own workspace independently, which means each can potentially reuse cached dependencies from another parallel job's earlier run.

The fan-in summary job serves developer experience: rather than requiring a developer to click into four separate job logs, the aggregated PR comment presents all results in one place. This is the Validation workflow pattern in action -- no deployment occurs, only quality signals are produced.

---

Related Insights:
- [[ci-cd-uses-three-workflow-patterns-based-on-deployment-risk-level]] -- foundation: this is the primary example of the Validation workflow pattern
- [[composite-setup-workspace-action-centralizes-all-ci-environment-configuration]] -- enables: each parallel job uses the same composite action for consistent setup

Domains:
- [[infrastructure]]
- [[cross-cutting]]
