# GitHub Actions brokers

Two routes serve different contracts:

| Route                         | Guarantee                                                                        |
| ----------------------------- | -------------------------------------------------------------------------------- |
| `helpers/sdk/<entrypoint>.ts` | Lossless installed public Actions API, including types/defaults/errors/sentinels |
| Narrow helper modules         | Documented composition-based conveniences, sometimes intentionally stricter      |

Native runtime bindings and public type exports are checked against installed package entrypoints. Artifact's default export is preserved
explicitly. Supported GitHub/IO/HTTP public utility subpaths have their own facades; private SDK imports are not supported. Facade exposure
does not authorize invoking OIDC, attestation, tool installation, deletion, or cross-run operations.

```typescript
import {HttpClient} from "./sdk/http-client.ts";
import {createHttpHelper} from "./http/index.ts";

// Exact native API, including raw/stream/JSON operations and handlers.
const native = new HttpClient("workflow");
native.dispose();

// Owned convenience client with native constructor configuration.
const helper = createHttpHelper("workflow", {
  requestOptions: {allowRedirects: false, maxRetries: 0},
});
try {
  await helper.download("https://example.invalid/report.bin", "artifacts/report.bin");
} finally {
  helper.dispose();
}
```

Use narrow imports for isolation. The `helpers/index.ts` barrel eagerly exports all decorators. Its Promise-based `Helpers` factories are
compatible async construction methods, not a lazy-loading boundary.

## Decorator contracts

### Environment and execution context

`createEnvironmentHelper(record?)` can read an explicit immutable source or the current ambient environment. Supplied-invalid
booleans/integers are errors; missing values alone use defaults. Required/validated reads throw without calling `core.setFailed`. Snapshots
may contain secrets and must not be logged or serialized. Native action inputs/state/masking remain in `sdk/core.ts`.

Workflow metadata belongs to `lib/context.ts`: the pure builder takes explicit Actions/local mode, actual checkout SHA, workspace, and
clock. Its capture adapter acquires cwd/SHA through brokers. Returned context excludes credentials and environment records; local mode has
no remote run URL.

### Checked execution and Git

`execChecked(command, args, options)` requires exit zero and retains captured output in `CommandExecutionError`. Native startup/listener
errors preserve identity. Use `sdk/exec.ts` when the caller owns finding-exit interpretation; there is no invented native timeout option.

```typescript
import {createGitHelper} from "./git/index.ts";
const git = createGitHelper({cwd: workspaceRoot});
const changes = await git.getChangeSet(workspaceRoot, baseRef, headRef);
```

`getChangeSet` resolves immutable commits and a merge-base comparison, using NUL-delimited name/status records. It retains rename/copy
origins, deletions, spaces/newlines, and explicit unknown scope. Ordinary `getChangedFiles` and `getDiffStats` remain two-tip comparisons.
Checked fetch/diff/tree/count failures do not become empty successful data. Scoped clients never mutate cwd.

### Filesystem and evidence

`readJson<T>` is a caller assertion, **not** validation. Evidence consumers use `readValidatedJson(path, decode, maxBytes)` or
`readTextBounded`, which enforce observed byte limits. `exists` returns false only for missing/non-directory paths; permission errors
propagate.

`writeJsonAtomic` and `writeStreamAtomic` exclusively own a temporary sibling, await closure, then rename. Failed writes preserve the
destination and clean only owned state. `withTemporaryDirectory(prefix, callback)` retains its owned directory through awaited work and
cleans up on success/rejection. Cleanup failure is surfaced, including the original failure when both occur.

Traversal honors zero/finite/unlimited depth, preserves list/find defaults, does not follow directory symlinks, and does not mutate caller
regex state. Native glob/IO APIs remain available through their facades.

### HTTP

Constructor handlers/options are native. Legacy per-request `timeout` maps to native socket inactivity timeout, not a total deadline.
Request policy uses owned temporary clients without mutating the shared base client; false/zero options survive. Bodies finish before
temporary disposal, including rejection. Unsupported request options reject rather than being ignored.

Downloads require 2xx and atomically stream original bytes; 404 cannot replace a destination with an error page. HEAD has no fabricated
body. Convenience response generics do not validate payload schemas. Dispose owned helpers.

### Cache

Native `undefined`/`-1` values and error classes remain unchanged in `sdk/cache.ts`. Decorated save requires a positive real ID.

`exists` is lookup-only and never restores files. Restoration probes exact policy before writes; nonempty `restoreKeys` explicitly opt into
native prefix/fallback matching. A match changing between lookup and restore is an error, not an exact success. An SDK miss cannot establish
a more precise cause than the SDK retained.

Native upload/download/cross-OS options are forwarded. Unsupported legacy `downloadChunkSize` rejects. Every file supplied to
`generateKey`/`autoCache` is required and readable; do not list alternative lockfile formats as though they were optional. Auto-cache uses
exact policy and records state on a miss: it installs no post-job saver. Call `save` explicitly with the generated key.

### Artifacts and GitHub

`createArtifactHelper(client?)` composes a complete native client. Uploads require positive identity and retain actual optional size/digest
metadata. Native compression/retention/archive/find/hash options are exposed through `nativeOptions`; conflicting retention values reject.
Download owns its destination and rejects integrity mismatch. Listings retain native metadata.

`createGitHubHelper(token, context?, {client?})` accepts complete configured Octokit clients. Comment/issue lists paginate; branch lookup
returns null only for a successful empty response. SDK errors keep identity. Marker matching remains substring-based without a new
author/incident ownership policy. `getClient()` retains the full native REST/GraphQL/plugin/pagination surface.

### Raw reports and Markdown

Newman accepts actual serialized JSON, including Buffer DTOs and request errors. Playwright visits nested suites and respects logical
expected/flaky outcomes, interruption, and retries. Global setup/teardown errors remain separate from assertion counters and render as
runner failures rather than a green browser section. Vitest coverage/report counters and percentages are decoded, not cast. JUnit/TRX
helpers return raw DTOs; `lib/testing` normalizes them into workflow suites/findings without fake runner-error tests.

`MarkdownUtils.fence` chooses a delimiter longer than embedded backtick runs. `tableCell` protects pipes/line endings. The fluent builder
uses both; explicit `addRaw` remains raw. Workflow layout and publication policy stay in `lib`/entrypoints.

## Testing

Use the commands in the [scripts guide](../README.md). Tests exercise real temporary files/repositories and complete native SDK clients,
mocking only external boundaries. Native parity tests are not an excuse to duplicate SDK internals or invoke
destructive/credential-sensitive operations.
