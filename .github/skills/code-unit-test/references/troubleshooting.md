# Unit-Test Troubleshooting

Open this file only after a concrete runner or test failure. Record the exact
failure, file, and targeted selection before changing setup or assertions.

| Failure signature | Inspect first | Corrective action | Do not |
| --- | --- | --- | --- |
| Test passes alone but fails in a group | Shared store/module state, global mutation, cleanup, current setup reset behavior | Reset through the public API; restore timers/spies/browser globals; make fixtures independent | Add ordering, retries, or sleeps |
| Module cannot load in the configured DOM environment | Root/project Vitest config, `sites/arolariu.ro/vitest.setup.ts`, and whether a configured alias replaces repository code | Use an external runtime/provider shim only for behavior owned by the real repository consumer; if a repository module cannot stay real, move outward or report structural pressure | Treat a repository alias/stub as an approved seam or add an inline repository mock |
| Fake-timer test hangs or never invokes work | Timer setup order, `userEvent` timer integration, queued promises, interval cleanup | Enable timers before render, advance through the public action, flush resulting promises, restore real timers | Mix real and fake timers or advance arbitrary large durations |
| React state update or async assertion is not flushed | Whether the public callback is awaited, effect scheduling, `act`, `waitFor`, `sites/arolariu.ro/tests/helpers/hookAsync.ts` | Await the public callback in `act`; use `waitFor` only for independently scheduled work | Wrap every assertion in `waitFor` or ignore act warnings |
| Repository mock returns `undefined` after reset/restore | Base Vitest reset policy, project setup, and the replaced module | Remove the repository-module mock and reselect the test boundary; configure only an approved external shim in `beforeEach` | Repair or expand the repository fake implementation |
| `vi.mock` hoisting/import-order error | Whether the target is an external boundary, `vi.hoisted` constraints, import evaluation order | Keep repository modules real; use a synchronous hoisted handle only for an approved external boundary | Use dynamic import ordering or aliases to repository substitutes as isolation techniques |
| Clipboard, `URL`, observer, media-query, or storage API is absent | Configured DOM implementation and nearest browser-boundary test | Install a narrow per-test property/spy, assert cleanup, and restore it | Replace all of `window`, `document`, or the repository consumer |
| Query cannot find the element | Rendered accessible tree, translation shim, loading phase, role/name | Query the public semantics actually rendered and await only real asynchronous transitions | Fall back immediately to a test ID or implementation selector |
| MSTest discovers no tests | Test project, namespace/file inclusion, `[TestClass]`, public `[TestMethod]`, supported signature | Match a current sibling and project configuration | Add another runner or duplicate the test in a different project |
| `ThrowsExactly` reports a different type | Live TryCatch/classifier, direct dependency exception, inner chain, cancellation catch order | Decide whether setup or production classification is wrong; assert the exact intended outer and inner contract | Change to a broad exception assertion merely to pass |
| Strict Moq reports an unexpected call | Real service flow and whether the call is observable behavior | Add only behavior-required setup/verification or correct the production/test expectation | Switch to loose mocks to hide coordination |
| Coverage threshold fails after targeted tests pass | Root/project Vitest config, included source set, uncovered behavior branch, exclusions | Add behavior-relevant cases or run the intended scoped coverage selection from live guidance | Add trivial tests, lower thresholds, or exclude testable production code |
| Backend build fails before tests because of a warning | Diagnostic source, API `Directory.Build.props`, current analyzer contract | Fix the test/source diagnostic in scope and rerun the smallest build/test selection | Suppress the warning or weaken warning policy |

If resolving the failure requires production behavior, a new dependency,
runner/configuration policy, or repository-module seam, stop and report it
rather than reshaping the test around the failure.
