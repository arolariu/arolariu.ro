# Backend Behavior Test Matrix

Use this matrix before selecting tests. Cover applicable rows, not every row,
and keep the test at the narrowest boundary that observes the behavior.

| Behavior category | Primary boundary | Minimum proof | Live test anchor |
| --- | --- | --- | --- |
| Valid behavior | Owning service | Expected result/state and exact direct-dependency calls; include call order when order is the policy | `sites/api.arolariu.ro/tests/arolariu.Backend.Domain.Tests/Invoices/Services/Processing/InvoiceProcessingServiceCurrentArchitectureTests.cs` |
| Input validation | Layer that owns the invariant | Invalid value throws the exact current-layer validation exception before any dependency call | `sites/api.arolariu.ro/tests/arolariu.Backend.Domain.Tests/Invoices/Services/Foundation/StorageValidationCoverageTests.cs` |
| Downstream validation/refinement | Current service classifier | Direct dependency's validation/not-found/conflict/locked/rate-limit/access failure becomes the exact outer type and retains the exact inner type | `sites/api.arolariu.ro/tests/arolariu.Backend.Domain.Tests/Invoices/Services/Foundation/InvoiceStorageFoundationServiceExceptionsTests.cs` |
| Downstream dependency failure | Current service classifier | Availability/timeout failure becomes the exact dependency type; no successful side effect is reported | `sites/api.arolariu.ro/tests/arolariu.Backend.Domain.Tests/Invoices/Services/Orchestration/InvoiceOrchestrationServiceExceptionsTests.cs` |
| Unexpected service failure | Current service classifier | Unknown exception becomes the exact service exception and retains useful inner context | `sites/api.arolariu.ro/tests/arolariu.Backend.Domain.Tests/Invoices/Services/Management/InvoiceManagementServiceTests.cs` |
| Cancellation | Every changed asynchronous boundary plus adapter when exposed | The same cancellation escapes service wrappers; downstream receives the token; adapter distinguishes its current timeout/client-abort outcome | `sites/api.arolariu.ro/tests/arolariu.Backend.Domain.Tests/Integration/EndpointCancellationTests.cs` |
| Ownership and partition | Processing/use-case and adapter; Broker for provider selection | Owner/visible/forbidden outcomes and known/null partition intent are explicit; no broader data is returned | `sites/api.arolariu.ro/tests/arolariu.Backend.Domain.Tests/Invoices/Endpoints/MerchantCollectionAuthorizationTests.cs` |
| Null/not-found/empty collection | Contract owner and endpoint mapper | Null versus typed not-found and empty versus missing are asserted exactly | `sites/api.arolariu.ro/tests/arolariu.Backend.Domain.Tests/Integration/InvoiceEndpointsStatusCodeTests.cs` |
| Batch or partial failure | Processing or Orchestration | Atomicity or partial progress, stop/continue policy, cancellation checkpoints, duplicates, and operation order are deterministic | `sites/api.arolariu.ro/tests/arolariu.Backend.Domain.Tests/Invoices/Services/Processing/InvoiceProcessingReconciliationTests.cs` |
| Durable queue work | Broker serialization, Processing policy, and worker adapter as applicable | Round trip, malformed input, receipt renewal, persistence/delete/replacement order, terminal outcome, trace continuation, and cancellation | `sites/api.arolariu.ro/tests/arolariu.Backend.Domain.Tests/Invoices/Services/Processing/InvoiceProcessingServiceCurrentArchitectureTests.cs` |
| Telemetry classification is externally observable | Activity/metric/log owner | Correct source/name/parent and bounded outcome tags; no sensitive parameter or payload surface | `sites/api.arolariu.ro/tests/arolariu.Backend.Domain.Tests/Invoices/Telemetry/AnalysisTelemetryTests.cs` |
| Endpoint exception mapping | Real handler plus shared mapper, or mapper unit test | Exact protocol result and safe ProblemDetails; Management is the only service double | `sites/api.arolariu.ro/tests/arolariu.Backend.Domain.Tests/Integration/InvoiceEndpointsStatusCodeTests.cs` |
| New or changed service constructor within the approved graph | Architecture reflection test | Constructors depend only on approved next-layer contracts and remain within the domain dependency budget | `sites/api.arolariu.ro/tests/arolariu.Backend.Domain.Tests/Invoices/Architecture/InvoiceStandardLayeringArchitectureTests.cs` |
| No unused layer is needed | Diff/architecture review | No empty service, interface, exception, registration, or test double exists solely to complete the hierarchy | `sites/api.arolariu.ro/tests/arolariu.Backend.Domain.Tests/Invoices/Architecture/InvoiceUnifiedLayeringArchitectureTests.cs` |

## Assertion Rules

- Use `Assert.ThrowsExactly` or `Assert.ThrowsExactlyAsync` for exception
  contracts; do not allow a derived type accidentally.
- For classification, assert the outer layer type and the meaningful exact inner
  type.
- Mock the direct dependency contract at a service unit boundary. Do not mock
  unrelated repository modules.
- Use deterministic builders and explicit operation lists for ordering.
- Verify cancellation tokens when propagation is part of the change.
- Use the real mapper/handler for protocol mapping rather than reimplementing
  its decision in a test double.
- Do not add coverage for unchanged or unused layers merely to satisfy the
  architecture shape.
