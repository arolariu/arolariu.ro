---
description: "The composite action's 'generate' input runs npm run generate during setup, producing GraphQL types and schemas that persist on the runner for subsequent build steps"
type: pattern
source: "docs/rfc/0001-github-actions-workflows.md"
status: current
created: 2026-02-25
---

# GraphQL artifact generation runs during workspace setup before build steps

The composite setup-workspace action includes an optional `generate` input that, when set to `'true'`, executes `npm run generate` as part of the environment setup phase. This produces derived artifacts -- GraphQL types, schemas, i18n files, and environment configurations -- that must exist before the build step can compile the frontend application.

By embedding generation into workspace setup rather than treating it as a separate workflow step, the pipeline ensures that generated code is always available by the time any build or test step runs. The website build workflow enables this flag; the API and hygiene workflows do not, since they have no GraphQL dependencies. Generated artifacts persist on the runner's filesystem for the duration of the job, so every subsequent step (build, test, lint) can reference them without re-running generation.

This design prevents a common CI failure mode where a developer adds a new GraphQL query in source code but the CI build fails because the corresponding generated types were never created in the pipeline. Making generation part of the standard setup eliminates that gap.

---

Related Insights:
- [[composite-setup-workspace-action-centralizes-all-ci-environment-configuration]] -- foundation: generation is one of the composite action's toggleable features
- [[website-deployment-separates-build-from-release-with-manual-approval-gates]] -- enables: the website build relies on generated artifacts before Docker image creation

Domains:
- [[infrastructure]]
