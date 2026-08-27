# Bug-Fix Troubleshooting

Open this file only after the first concrete reproduction or verification step
fails unexpectedly. Preserve the failure before changing the harness.

| Failed step | Diagnose | Next safe action | Do not |
| --- | --- | --- | --- |
| New regression test passes before the fix | Wrong input/branch, assertion observes setup, production already fixed, or report expectation differs | Trace the input through the real public boundary; add a precondition/negative assertion; compare current history/authority | Sabotage unrelated code or weaken the expected behavior to manufacture red |
| Test fails, but during import/setup/build | Environment/configuration or fixture problem, not the defect | Fix/classify setup independently, then rerun unchanged behavior assertion | Count setup failure as fail-without evidence |
| Failure is intermittent | Uncontrolled time, randomness, shared state, race ordering, network/provider, or retries | Fix values, control promise/token ordering, reset public state, isolate external boundary, repeat | Add sleeps, retries, or broader timeouts |
| Frontend test seems to require an internal module mock | Unit boundary is too narrow or production coupling has no public seam | Execute the repository module and substitute only its external boundary; move outward to a contract/integration test; report structural pressure | Add `vi.mock` for repository actions, stores, utilities, contexts, or components |
| DOM test cannot reproduce hydration/focus/browser behavior | Configured DOM environment does not implement the runtime contract | Use controlled local browser/E2E observation at the next reproduction rung | Patch production around a test-environment limitation |
| Transport reproduction yields a different field failure | Fixture drift or an earlier validation branch is the real cause | Rebuild the raw fixture from current DTO/wire source and assert the earliest invalid field | Catch all parser errors or cast the payload |
| Exact .NET exception differs | Setup injected wrong dependency type, inner marker changed, or TryCatch catch order/classifier is wrong | Inspect direct dependency family and exact outer/inner chain; decide test versus production defect | Replace `ThrowsExactly` with a broad assertion |
| DI runtime fails but constructor test passes | Missing/wrong registration, lifetime, factory, or startup configuration | Add/use the smallest real service-collection resolution proof and inspect owning module | Add duplicate fallback registration |
| Cancellation test hangs or returns a service failure | Token not observed, retry loop continues, or cancellation is caught generically | Use a controlled cancelled token and verify no later call; trace catch order from earliest boundary | Increase timeout or classify cancellation as dependency failure |
| External provider cannot be reached | Local environment/credential/provider availability, not yet a production code root cause | Use a real Broker boundary with an external SDK transport/record fixture, or sanitized external evidence; state what the substitute cannot prove | Replace a repository Broker/service with a fake implementation, hardcode credentials, expose secrets, or guess provider behavior |
| Cannot safely demonstrate fail-without after implementing | Fix hunk is entangled with user changes or reversal would be destructive | Use recorded pre-fix evidence; otherwise isolate an owned inverse edit only if safe and restore it immediately | Reset, checkout, stash, or overwrite unrelated work |
| Related suite fails after regression passes | Real collateral regression, pre-existing failure, or over-broad selection | Reproduce the failing related test alone, compare baseline evidence, and trace shared contract | Dismiss it, rewrite unrelated tests, or fold a refactor into the fix |

Stop when troubleshooting reveals ambiguous intended behavior, a protected risk
boundary, or a correction materially larger than the isolated defect; route a
separate behavior-preserving cleanup to `code-refactor`.
