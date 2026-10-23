# GitHub Actions Scripts

This directory contains TypeScript modules used by GitHub Actions workflows for the arolariu.ro monorepo.

## Directory Structure

```text
.github/scripts/
├── helpers/           # Shared utility helpers for all scripts
│   ├── artifacts/     # Artifact upload/download utilities
│   ├── cache/         # Caching utilities
│   ├── comments/      # PR comment builder
│   ├── environment/   # Environment variable helpers
│   ├── filesystem/    # File system utilities
│   ├── git/           # Git operations
│   ├── github/        # GitHub API client
│   ├── http/          # HTTP client
│   ├── newman/        # Newman/Postman test parser
│   ├── playwright/    # Playwright test parser
│   └── vitest/        # Vitest coverage parser
├── src/               # Main script entry points
│   ├── hygiene/       # Domain, providers, projections, pipeline
│   ├── runLiveTestAction.ts
│   └── runUnitTestAction.ts
└── types/             # Shared TypeScript types
```

## Scripts

### Hygiene provider pipeline

The hygiene check pipeline is split into per-provider entry points and a final projection gate. Both are invoked from the workflow
[`official-hygiene-check-v2.yml`](../workflows/official-hygiene-check-v2.yml).
The filename is retained; the legacy four-check implementation is not the current pipeline.

- `src/hygiene/pipeline/runProvider.ts <providerId>` runs one provider and writes
  `artifacts/hygiene/outcome-<id>.json`. Exit code is 1 when its gate result is
  `failed` or `errored` and 0 otherwise. The workflow's provider step does not
  use `continue-on-error`; a nonzero exit fails that job.
- `src/hygiene/pipeline/runProjections.ts` -- loads all outcome JSON files, builds the aggregate `HygieneReport`, fans out to projections
  (`jsonArtifact`, `stepSummary`, `prComment`, `statusChecks`) via `Promise.allSettled`, and calls `core.setFailed()` if `overallResult` is
  `failed` or `errored`. This is the aggregate gate; provider jobs can fail
  independently. Check the YAML dependencies and conditions to establish
  whether a job actually ran.

The [provider registry](src/hygiene/providers/registry.ts) owns the available
IDs: `format`, `lint`, `test-typescript`, `test-dotnet`, `test-python`, and
`stats`. There is no generic `test` provider.

Adding a check requires registering its `CheckProvider<P>` and including its
ID in the workflow matrix. Keep its outcome artifact and gate policy aligned.

The `test-typescript` provider runs each project's worker pool in turn and reads an explicitly selected, temporary JSON report file. Vitest
5 no longer writes that report to stdout by default. Reports are cleaned up after each run, and a nonzero runner exit cannot pass merely
because its assertions passed.

The `lint` provider runs typed projects sequentially in separate processes, each with an 8 GB heap (`--max-old-space-size=8192`) unless
`NODE_OPTIONS` already sets a heap limit; other Node options are preserved. Remaining root and tooling files run in a final, disjoint scope,
releasing project/compiler state between owners. Generated build directories are globally ignored by the root ESLint configuration;
application and tooling source remain in scope. Fatal process exits are reported directly rather than as downstream JSON errors.

### runLiveTestAction.ts

Reports the live workflow's Newman results, statuses, and failure details.

### runUnitTestAction.ts

Reports website test and coverage results.

---

## Hygiene Layout and Data Flow

| Directory | Responsibility |
| --- | --- |
| [domain](src/hygiene/domain/) | Provider/report contracts, changed-file routing, and aggregation |
| [providers](src/hygiene/providers/) | Individual checks and their registry |
| [pipeline](src/hygiene/pipeline/) | Workflow context, provider execution, and projection entrypoints |
| [projections](src/hygiene/projections/) | JSON artifacts, summaries, PR comments, and check runs |

1. Provider jobs write `artifacts/hygiene/outcome-<id>.json` under the workspace root.
2. The workflow uploads `outcome-*` artifacts and downloads them for aggregation.
3. `runProjections.ts` loads outcomes and builds the report using the domain contracts.
4. Projections write `artifacts/hygiene/hygiene-report.json` and publish their
   configured GitHub outputs.

Artifact paths are workspace-relative, not relative to the scripts working
directory. The live [provider contract](src/hygiene/domain/provider.ts) and
[report types](src/hygiene/domain/types.ts) own payload shapes; do not copy the
retired `HygieneCheckResult` format into new consumers.

---

## Helpers

The `helpers/` directory provides reusable utilities:

| Helper        | Description                               |
| ------------- | ----------------------------------------- |
| `artifacts`   | Upload/download GitHub Actions artifacts  |
| `cache`       | Cache management with key generation      |
| `comments`    | Fluent builder for markdown PR comments   |
| `environment` | Type-safe environment variable access     |
| `filesystem`  | File reading, globbing, JSON parsing      |
| `git`         | Git operations (diff, fetch, file sizes)  |
| `github`      | GitHub API client (issues, comments, PRs) |
| `http`        | HTTP requests; only header options forwarded |
| `newman`      | Parse Newman/Postman test results         |
| `playwright`  | Parse Playwright test results             |
| `vitest`      | Parse Vitest coverage reports             |

### Usage Example

```typescript
import {env, git, createGitHubHelper} from "../helpers/index.ts";

// Get environment variables
const token = env.getRequired("GITHUB_TOKEN");
const headRef = env.get("HEAD_REF", "HEAD");

// Git operations
const changedFiles = await git.getChangedFiles("origin/main", headRef);
const diffStats = await git.getDiffStats("origin/main", headRef);

// GitHub API
const gh = createGitHubHelper(token);
await gh.upsertComment(prNumber, commentBody, uniqueId);
```

---

## Development

### Prerequisites

```powershell
Set-Location .github\scripts
npm ci
```

### Type Checking

```bash
npx tsc --noEmit
```

### Testing

```bash
npm test
```

### Adding a New Script

1. Create module in `src/` directory
2. Add types to `types/` if needed
3. Use helpers from `helpers/` for common operations
4. Match the existing entrypoint's invocation style: CLI modules and imported workflow modules differ
5. Update its focused tests and documentation
6. Update workflow YAML only within an explicitly approved workflow change
