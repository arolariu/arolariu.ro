# Backend Test Matrix

Select rows owned by the changed service or adapter. Each layer test should
exercise the real layer implementation and substitute only its direct seam
when interaction or classification is the behavior.

| Behavior category | Cases to consider | Required proof | Current inspection target |
| --- | --- | --- | --- |
| Valid behavior | Representative valid input; empty/optional input if allowed; idempotent/retry behavior | Exact result plus strict direct-dependency arguments and call count | `sites/api.arolariu.ro/tests/arolariu.Backend.Domain.Tests/Invoices/Services/Orchestration/InvoiceOrchestrationServiceTests.cs` |
| Input validation | Null/default/malformed/range/domain invariant | Exact validation/argument exception; direct dependency not called | `sites/api.arolariu.ro/tests/arolariu.Backend.Domain.Tests/Invoices/Services/Foundation/StorageValidationCoverageTests.cs` |
| Dependency validation | Direct dependency emits validation/not-found/already-exists/forbidden/locked/rate-limited classification | Exact current-layer dependency-validation outer type and retained inner object(s) at the classifier-specific depth | `sites/api.arolariu.ro/src/Invoices/Services/Management/InvoiceManagementService.Exceptions.cs`; `sites/api.arolariu.ro/tests/arolariu.Backend.Domain.Tests/Invoices/Services/Management/InvoiceManagementServiceTests.cs` |
| Dependency failure | Timeout/provider/storage/direct dependency failure | Exact dependency outer type; separate injected direct-layer exception from the expected retained/unwrapped cause and assert identity | `sites/api.arolariu.ro/src/Invoices/Services/Processing/InvoiceProcessingService.Exceptions.cs`; `sites/api.arolariu.ro/tests/arolariu.Backend.Domain.Tests/Invoices/Services/Processing/InvoiceProcessingServiceCurrentArchitectureTests.cs` |
| Service failure | Unknown or current-layer exception | Exact service outer type; no accidental dependency classification | `sites/api.arolariu.ro/tests/arolariu.Backend.Domain.Tests/Invoices/Services/Processing/InvoiceProcessingServiceCurrentArchitectureTests.cs` |
| Cancellation | Pre-cancelled token; dependency cancellation; timeout versus client disconnect at adapter | Original `OperationCanceledException` or exact protocol result; token forwarded; no fault classification | `sites/api.arolariu.ro/tests/arolariu.Backend.Domain.Tests/Invoices/Services/Foundation/GenerativeAnalysisRetryPolicyCancellationTests.cs`; `sites/api.arolariu.ro/tests/arolariu.Backend.Domain.Tests/Integration/EndpointCancellationTests.cs` |
| Partition and ownership | Owner/shared/public/foreign user; partition-scoped versus deliberate cross-partition call; empty identifier | Exact identifier/partition passed and visible result/failure | `sites/api.arolariu.ro/tests/arolariu.Backend.Domain.Tests/Invoices/Endpoints/MerchantCollectionAuthorizationTests.cs`; Broker tests under `Invoices/Brokers/` |
| Orchestration calls | Required order; conditional branch; deduplication; no-extra-call path; partial/best-effort behavior | `MockBehavior.Strict`, exact arguments/order/count, `VerifyAll`/`VerifyNoOtherCalls` where material | `sites/api.arolariu.ro/tests/arolariu.Backend.Domain.Tests/Invoices/Services/Processing/InvoiceProcessingServiceCurrentArchitectureTests.cs` |
| Foundation | Domain validation, provider-neutral mapping, Broker call, external failure classification | Real Foundation method and typed Broker seam; no Foundation-to-Foundation coordination | Tests under `Invoices/Services/Foundation/` |
| Orchestration | Coordination of Foundation contracts, aggregate mutation, idempotency, classification | Real Orchestration implementation; exact Foundation calls/result/failure | Tests under `Invoices/Services/Orchestration/` |
| Processing | Multi-stage sequence, reconciliation, queue policy, ownership, Orchestration classifications | Real Processing implementation; strict direct Orchestration contracts | Tests under `Invoices/Services/Processing/` |
| Management | Delegation to Processing and application-boundary classification | Real Management implementation; exact Processing call and outer exception | Tests under `Invoices/Services/Management/` |
| Exact exception assertion | Every typed failure branch | `Assert.ThrowsExactly`/`Assert.ThrowsExactlyAsync`; exact outer and classifier-specific inner identity | Read the target layer's live `*.Exceptions.cs`, then inspect Foundation, Processing, or Management siblings for `ThrowsExactly` |
| Endpoint mapping when in scope | Status/ProblemDetails/body/headers; cancellation distinction; authorization visibility | Real mapper or endpoint result and exact protocol contract | `sites/api.arolariu.ro/tests/arolariu.Backend.Core.Tests/Common/Http/ExceptionToHttpResultMapperTests.cs`; `sites/api.arolariu.ro/tests/arolariu.Backend.Domain.Tests/Integration/InvoiceEndpointsStatusCodeTests.cs` |
| DI/layer architecture | Registration resolves; constructor graph; prohibited dependency direction | Real service collection or reflection result | `sites/api.arolariu.ro/tests/arolariu.Backend.Domain.Tests/Invoices/Architecture/InvoiceStandardLayeringArchitectureTests.cs` |

## Assertion Discipline

- Use deterministic identifiers and fixed values. Random builders are not
  suitable when exact classification, ordering, dates, partitioning, or
  reproduction matters.
- Verify cancellation tokens and ownership identifiers when their propagation
  is contractual. Use a distinct caller-owned token and exact setup/verification
  matching rather than `CancellationToken.None` plus
  `It.IsAny<CancellationToken>()`.
- Do not assert only that "an exception" occurred. Classification tests require
  the exact outer type and the relevant inner chain.
- Keep `injectedDependencyException` and `expectedRetainedCause` as separate
  variables. Assert `AreSame` at each identity-preserving layer; do not infer
  Foundation, Processing, and Management have the same unwrap depth.
- `VerifyAll` is useful only with strict, behavior-relevant setups. Avoid
  setups for incidental calls merely to satisfy a mock.
- Endpoint mapping belongs in endpoint/mapper tests, not inferred from a
  service exception test.
