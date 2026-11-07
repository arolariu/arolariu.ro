# GitHub Actions scripts

Repository-local brokers and workflow services for GitHub Actions. Runtime, repository, and risk contracts are owned by
[AGENTS.md](../../AGENTS.md).

## Boundaries

```text
src entrypoints -> lib services/contracts -> helpers -> helpers/sdk -> @actions/*
```

`src` is CLI/imported-workflow glue. `lib` owns immutable context, planning, normalization, evidence, reporting, and publication policy.
Helpers own external SDK/resource operations and raw reporter decoding; they never import `lib`. Only `helpers/sdk` imports the Actions
packages, including type-only and dynamic imports. Pure path/URL/data operations remain ordinary code.

The [native facade catalog](helpers/sdk/fixtures/public-entrypoints.json) is a test-owned contract checked against the installed public
export maps. Facades preserve native values, types, overloads, defaults, errors, and sentinels; decorators add documented stricter behavior.
See the [helper guide](helpers/README.md).

| Area                                                          | Owner                                                   |
| ------------------------------------------------------------- | ------------------------------------------------------- |
| Native Actions APIs                                           | `helpers/sdk/`                                          |
| Checked exec, Git, filesystem, HTTP, cache, artifacts, GitHub | Narrow helper modules                                   |
| Serialized Newman/Playwright/Vitest/JUnit/TRX/ESLint decoding | `helpers/newman/`, `playwright/`, `vitest/`, `reports/` |
| Context, clock, and Actions/local identity                    | `lib/context.ts`                                        |
| Graph wire validation and affected selection                  | `lib/planning/`                                         |
| Provider metadata, payloads, execution, outcomes, aggregation | `lib/hygiene/`                                          |
| Independent required/optional publication                     | `lib/reporting/`                                        |
| Live and unit report applications                             | `lib/live-tests/`, `lib/unit-tests/`                    |

Importing either `runLiveTestAction.ts` or `runUnitTestAction.ts` does not run it. Their default functions retain the existing workflow
invocation style:

```typescript
const {default: runLiveTestAction} = await import("./src/runLiveTestAction.ts");
await runLiveTestAction();
```

## Hygiene: one plan, six named jobs

[`official-hygiene-check-v2.yml`](../workflows/official-hygiene-check-v2.yml) retains the v3 workflow/check identities and the `detect`,
`providers`, and `gate` jobs. The detect job bootstraps planning dependencies once, then writes `artifacts/hygiene/plan.json` and uploads
`hygiene-plan`.

The plan always contains `format`, `lint`, `test-typescript`, `test-dotnet`, `test-python`, and `stats`. It selects their work and expensive
setup; an unselected job still gets minimal Node/scripts bootstrap and emits an explicit planned-skip outcome. The gate requires all six
records, including skips.

Affected mode checks changed supported existing files first. Tests select owners and reverse graph consumers: a component change includes
website tests. Renames retain both owners; deleted paths still affect tests but are not passed to path-based tools. CI scripts and root
tooling are explicit suites. The planner reads shared inputs from the live `nx.json`, not a copied root list. Unknown
diff/graph/shared-input evidence broadens scope with diagnostics. Manual dispatch exposes `scope: affected | full`, defaulting to
`affected`.

These native commands run with valid Actions metadata:

```powershell
node --experimental-strip-types .github\scripts\src\hygiene\pipeline\preparePlan.ts --scope affected
node --experimental-strip-types .github\scripts\src\hygiene\pipeline\runProvider.ts format --plan artifacts\hygiene\plan.json
node --experimental-strip-types .github\scripts\src\hygiene\pipeline\runProjections.ts --plan artifacts\hygiene\plan.json
```

Providers and the gate **require** `--plan`; there is no missing-plan fallback. Paths are workspace-relative in artifacts and
current-directory-relative in CLI arguments. Applications creating local contexts explicitly use `mode: "local"`; local identity never
publishes placeholder remote URLs.

Planning invokes only the fixed root `scripts/inspection/workspace-facts.worker.ts`. It reuses the existing Nx provider's isolation, bounded
timeout, validation, temporary state, and cleanup. Reporting/gate jobs do not load Effect/Nx.

## Evidence and failure semantics

Provider envelopes use version `"1"` and bind provider, commit, run, originating attempt, and plan. Execution status, evidence completeness,
and gate result are separate. Runner errors do not fabricate failed tests. Nonzero process exits cannot pass merely because partial
assertions passed.

Outcome downloads retain artifact directories. Loading validates envelopes, payloads, findings, policy, and required identities before
aggregation. Same-run/commit/plan earlier-attempt records may be reused; the newest compatible attempt wins. Future, duplicate,
incompatible, malformed, and missing records remain explicit errors, not silently filtered successes. A known-empty diff passes only after
six explicit skips.

The aggregate remains report version `"3"`, with additive plan/provenance/issues. `artifacts/hygiene/hygiene-report.json` is required
publication. PR comments, step summaries, and existing `hygiene/<provider>` checks are independent: synchronous or asynchronous notification
failure cannot starve required JSON. Created check IDs remain available; deferred annotations are not enabled. Only entrypoints map final
action/exit status after awaited persistence.

TypeScript suites run sequentially with their own processes and JSON report files; JSON-only hygiene runs disable coverage. Root tooling
uses `scripts/vitest.config.ts` with bounded fork workers. Typed ESLint projects remain sequential, retaining the existing heap budget and
supplied Node options.

## Live and unit reporting

Live reporting separates configuration, single-index/bounded evidence reads, execution reduction, pure rendering, and required failure-issue
publication. An explicit failure/cancellation/skip cannot become success because assertions passed. Existing UTC-date deduplication, labels,
assignee, template fallback, compact mode, and character overrides remain. Evidence ceilings are 64 MiB JSON and 4 MiB logs; presentation
redaction precedes new truncation. Root Newman execution still owns its auth transport, artifact sanitization, and cleanup.

Unit reporting retains coverage, Playwright, branch comparison, PR discovery, and timestamp sections through explicit dependencies/context.
Missing optional reports differ from malformed data; a missing browser report explicitly labels job-status inference instead of claiming
parsed assertions passed. API lookup failures are not "no PR".

## Verification

From the repository root:

```powershell
npm --prefix .github\scripts test -- --reporter=dot
npm --prefix .github\scripts run typecheck
npm --prefix .github\scripts run test:coverage -- --reporter=dot
npx --no-install vitest run --config scripts\vitest.config.ts --coverage.enabled=false --pool=forks --maxWorkers=4 scripts\ci-scripts-architecture.test.ts scripts\architecture.test.ts scripts\inspection\workspace-facts.worker.test.ts scripts\inspection\workspace.test.ts
```

Coverage includes helpers and `lib`, excluding tests/fixtures. Coverage requires a compatible already-installed provider; do not silently
fetch one. Root lint currently defines Node profiles for root tooling, not this isolated CI package; an ignored/unconfigured-file warning is
not proof of linting.

Tests use real files, local temporary Git repositories, serialized fixtures, native SDK clients, and external boundary doubles. Native smoke
tests deny Effect/Nx resolution and workflow effects during imported-entrypoint checks. No routine test invokes live GitHub writes, OIDC,
attestation, or workflow dispatch.
