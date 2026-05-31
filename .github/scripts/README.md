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
├── hygiene/           # (Legacy) Shell scripts directory
├── src/               # Main script entry points
│   ├── hygiene/       # Hygiene check modules (v3: domain, providers, projections, pipeline)
│   ├── runLiveTestAction.ts
│   └── runUnitTestAction.ts
└── types/             # Shared TypeScript types
```

## Scripts

### Hygiene check (v3)

The hygiene check pipeline is split into per-provider entry points and a final
projection gate. Both are invoked from the workflow `official-hygiene-check-v2.yml`:

- `src/hygiene/pipeline/runProvider.ts <providerId>` -- runs one provider
  (`format`, `lint`, `test`, `stats`), writes `artifacts/hygiene/outcome-<id>.json`.
  Exit code is 1 when the provider's gateResult is `failed` or `errored` and 0
  otherwise; the workflow uses step-level `continue-on-error: true` on each
  provider step so a non-zero exit shows a warning marker in the step UI without
  aborting subsequent providers. Workflow pass/fail is decided by `runProjections.ts`.
- `src/hygiene/pipeline/runProjections.ts` -- loads all outcome JSON files,
  builds the aggregate `HygieneReport`, fans out to projections (`jsonArtifact`,
  `stepSummary`, `prComment`, `statusChecks`) via `Promise.allSettled`, and
  calls `core.setFailed()` if `overallResult` is `failed` or `errored`. This is
  the single point that turns the workflow red.

Adding a new check: create `src/hygiene/providers/myProvider.ts` exporting a
`CheckProvider<P>` value, then register it in `src/hygiene/providers/registry.ts`.

### runLiveTestAction.ts

Handles live/E2E test execution and result reporting.

### runUnitTestAction.ts

Handles unit test execution and coverage reporting.

---

## Hygiene Check System (V2)

The hygiene check system validates code quality on every PR through parallel checks.

### Architecture

```text
┌─────────────────────────────────────────────────────────────────┐
│                    official-hygiene-check-v2.yml                │
├─────────────────────────────────────────────────────────────────┤
│  ┌──────────┐   ┌──────────┐   ┌──────────┐   ┌──────────┐     │
│  │  Format  │   │   Lint   │   │   Test   │   │  Stats   │     │
│  │  Check   │   │  Check   │   │  Check   │   │  Check   │     │
│  └────┬─────┘   └────┬─────┘   └────┬─────┘   └────┬─────┘     │
│       │              │              │              │            │
│       ▼              ▼              ▼              ▼            │
│  format-result  lint-result   test-result   stats-result       │
│      .json         .json         .json          .json          │
│       │              │              │              │            │
│       └──────────────┴──────────────┴──────────────┘            │
│                              │                                   │
│                              ▼                                   │
│                    ┌─────────────────┐                          │
│                    │  Summary Job    │                          │
│                    │  (Downloads +   │                          │
│                    │  PR Comment)    │                          │
│                    └─────────────────┘                          │
└─────────────────────────────────────────────────────────────────┘
```

### Module Structure

```text
src/hygiene/
├── index.ts              # Main entry point and exports
├── types.ts              # Unified type definitions
├── commentBuilder.ts     # Rich PR comment generator
└── checks/
    ├── index.ts          # Check module exports
    ├── formatCheck.ts    # Prettier format check
    ├── lintCheck.ts      # ESLint lint check
    ├── testCheck.ts      # Vitest unit test check
    └── statsCheck.ts     # Code statistics & bundle analysis
```

### Data Flow

1. **Parallel Execution**: All check jobs run independently
2. **Artifact Production**: Each check writes `{check}-result.json`
3. **Artifact Download**: Summary job downloads all artifacts
4. **Comment Generation**: `commentBuilder.ts` produces rich PR comment
5. **Comment Posting**: New comment created per workflow run

### Artifact Format

All check results conform to the `HygieneCheckResult` interface:

```typescript
interface HygieneCheckResult {
  check: 'format' | 'lint' | 'test' | 'stats';
  status: 'success' | 'failure' | 'skipped' | 'error';
  duration: number;
  summary: string;
  timestamp: string;
  // ... check-specific fields
}
```

### PR Comment Features

The generated PR comment includes:

- **Status Summary Table**: Quick overview of all check results
- **Table of Contents**: Jump links to each section
- **Code Statistics**: Files changed, lines added/deleted, churn metrics
- **Bundle Size Analysis**: Comparison vs main branch with file-level details
- **Formatting Issues**: List of files needing `npm run format`
- **Lint Errors**: Grouped by file with rule IDs and locations
- **Test Results**: Pass/fail counts with failed test details
- **Coverage Report**: Line, statement, function, and branch coverage

### Local Development

Run individual checks locally:

```bash
# Format check
npm run format

# Lint check
npm run lint

# Unit tests
npm run test:unit
```

---

## Helpers

The `helpers/` directory provides reusable utilities:

| Helper | Description |
|--------|-------------|
| `artifacts` | Upload/download GitHub Actions artifacts |
| `cache` | Cache management with key generation |
| `comments` | Fluent builder for markdown PR comments |
| `environment` | Type-safe environment variable access |
| `filesystem` | File reading, globbing, JSON parsing |
| `git` | Git operations (diff, fetch, file sizes) |
| `github` | GitHub API client (issues, comments, PRs) |
| `http` | HTTP client with retry logic |
| `newman` | Parse Newman/Postman test results |
| `playwright` | Parse Playwright test results |
| `vitest` | Parse Vitest coverage reports |

### Usage Example

```typescript
import { env, git, createGitHubHelper } from '../helpers/index.ts';

// Get environment variables
const token = env.getRequired('GITHUB_TOKEN');
const headRef = env.get('HEAD_REF', 'HEAD');

// Git operations
const changedFiles = await git.getChangedFiles('origin/main', headRef);
const diffStats = await git.getDiffStats('origin/main', headRef);

// GitHub API
const gh = createGitHubHelper(token);
await gh.upsertComment(prNumber, commentBody, uniqueId);
```

---

## Development

### Prerequisites

```bash
cd .github/scripts
npm install
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
4. Export default function for workflow consumption
5. Update workflow YAML to call the new script
