# Tidy Report

## Job 1 — Canonical fluent-call order
- Reordered endpoint mapping chains in `sites\api.arolariu.ro\src\Invoices\Endpoints\InvoiceEndpoints.Mappings.cs` (29 chains) and `sites\api.arolariu.ro\src\Core.Auth\Endpoints\AuthEndpoints.Mappings.cs` (2 chains).
- Preserved arguments and comment lines; changes were reordering-only.
- Before/after fluent-call frequency proof:
  - `InvoiceEndpoints.Mappings.cs`
    - Accepts: before 15, after 15
    - Produces: before 30, after 30
    - ProducesProblem: before 195, after 195
    - ProducesValidationProblem: before 27, after 27
    - RequireAuthorization: before 30, after 30
    - RequireRateLimiting: before 30, after 30
    - WithName: before 30, after 30
    - WithRequestTimeout: before 30, after 30
  - `AuthEndpoints.Mappings.cs`
    - Accepts: before 1, after 1
    - AllowAnonymous: before 2, after 2
    - Produces: before 3, after 3
    - ProducesProblem: before 2, after 2
    - WithRequestTimeout: before 2, after 2
    - WithTags: before 2, after 2

## Job 2 — OpenAPI documentation drift
- Added `30` `[SwaggerResponse(StatusCodes.Status504GatewayTimeout, ...)]` attributes to `sites\api.arolariu.ro\src\Invoices\Endpoints\InvoiceEndpoints.Metadata.cs`.
- Fixed SwaggerResponse attribute ordering to ascending status-code order where needed while inserting 504 entries last after 500.
- Other drift found but intentionally not fixed:
- Status402PaymentRequired appears only in Metadata.cs on AnalyzeInvoiceAsync.

## Job 3 — Expanded abbreviated test-double names
- Applied these renames in both target test files:
  - `ValidationEx` → `ValidationException`
  - `NotFoundEx` → `NotFoundException`
  - `ConflictEx` → `ConflictException`
  - `LockedEx` → `LockedException`
  - `RateLimitEx` → `RateLimitException`
  - `UnauthorizedEx` → `UnauthorizedException`
  - `ForbiddenEx` → `ForbiddenException`
  - `DependencyEx` → `DependencyException`
  - `DependencyValidationEx` → `DependencyValidationException`
  - `ServiceEx` → `ServiceException`
  - `TimeoutEx` → `TimeoutMarkerException`
- Collision review: no additional in-scope type-name collisions found beyond `TimeoutEx`; used `TimeoutMarkerException` to avoid shadowing `System.TimeoutException`.

## Verification
- `dotnet build sites/api.arolariu.ro/src/Core` → succeeded, 0 warnings, 0 errors.
- `dotnet test sites/api.arolariu.ro/tests/arolariu.Backend.Core.Tests/arolariu.Backend.Core.Tests.csproj` → Passed 89 / 89.
- `dotnet test sites/api.arolariu.ro/tests/arolariu.Backend.Domain.Tests/arolariu.Backend.Domain.Tests.csproj` → Passed 1089 / 1089.

## Not done
- Did not fix any non-504 metadata drift beyond requested status ordering, per instruction to report-only.
- Left `MapIdentityApi<AuthenticatedUser>()` immediately after `.MapGroup("/auth")` as requested, so the surrounding chain was not force-normalized.
