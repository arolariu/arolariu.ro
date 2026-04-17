namespace arolariu.Backend.Domain.Tests.Integration;

using System;
using System.Collections.Generic;
using System.Diagnostics;
using System.Security.Claims;
using System.Threading;
using System.Threading.Tasks;

using arolariu.Backend.Common.Exceptions;
using arolariu.Backend.Common.Http;
using arolariu.Backend.Domain.Invoices.DTOs.Requests;
using arolariu.Backend.Domain.Invoices.Endpoints;
using arolariu.Backend.Domain.Invoices.Services.Processing;

using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Http.HttpResults;
using Microsoft.AspNetCore.Mvc;

using Moq;

using Xunit;

/// <summary>
/// Integration-style tests asserting that invoice REST endpoints emit the correct
/// HTTP status code per exception type thrown by <see cref="IInvoiceProcessingService"/>.
/// </summary>
/// <remarks>
/// <para>
/// <b>Scope:</b> Exercises the real endpoint handler (<see cref="InvoiceEndpoints.RetrieveSpecificInvoiceAsync"/>,
/// <see cref="InvoiceEndpoints.CreateNewInvoiceAsync"/>) wired to the real
/// <see cref="ExceptionToHttpResultMapper"/>; only the processing service is mocked.
/// </para>
/// <para>
/// <b>Why not <c>WebApplicationFactory&lt;Program&gt;</c>?</b> The production <c>Program.cs</c>
/// boots Azure KeyVault, Cosmos DB, SQL Server, and Application Insights during startup,
/// none of which are available in unit/CI environments. Invoking the internal handler
/// delegates directly keeps the verification surface focused on the
/// endpoint &#8594; mapper &#8594; <see cref="IResult"/> contract without introducing
/// infrastructure dependencies.
/// </para>
/// <para>
/// <b>Plan deviation:</b> Task 19 originally specified asserting a <c>Retry-After</c>
/// HTTP header for 429 responses. The real mapper surfaces the retry hint as a
/// <c>retryAfterSeconds</c> extension member on the RFC 7807 <see cref="ProblemDetails"/>
/// body instead (see <see cref="ExceptionToHttpResultMapper"/>), so the 429 assertion
/// matches the implementation.
/// </para>
/// </remarks>
public sealed class InvoiceEndpointsStatusCodeTests
{
  #region Local test exceptions implementing the Common marker interfaces.
  // These intentionally live inside the test so the suite is decoupled from whether
  // concrete domain exception types (e.g., InvoiceNotFoundException) implement the
  // markers today - the integration contract under test is endpoint -> mapper.
  private sealed class TestNotFoundException : Exception, INotFoundException
  {
    public TestNotFoundException(string message) : base(message) { }
  }

  private sealed class TestConflictException : Exception, IAlreadyExistsException
  {
    public TestConflictException(string message) : base(message) { }
  }

  private sealed class TestLockedException : Exception, ILockedException
  {
    public TestLockedException(string message) : base(message) { }
  }

  private sealed class TestRateLimitedException : Exception, IRateLimitedException
  {
    public TestRateLimitedException(string message, TimeSpan retryAfter) : base(message)
    {
      RetryAfter = retryAfter;
    }

    public TimeSpan RetryAfter { get; }
  }

  private sealed class TestDependencyException : Exception, IDependencyException
  {
    public TestDependencyException(string message) : base(message) { }
  }

  private sealed class TestUnauthorizedException : Exception, IUnauthorizedException
  {
    public TestUnauthorizedException(string message) : base(message) { }
  }

  private sealed class TestForbiddenException : Exception, IForbiddenException
  {
    public TestForbiddenException(string message) : base(message) { }
  }
  #endregion

  #region Test utilities
  private static IHttpContextAccessor CreateAuthenticatedContextAccessor(Guid? userIdentifier = null)
  {
    var effectiveUserId = userIdentifier ?? Guid.NewGuid();
    var claims = new List<Claim>
    {
      new Claim("userIdentifier", effectiveUserId.ToString()),
    };
    var identity = new ClaimsIdentity(claims, authenticationType: "TestAuth");
    var principal = new ClaimsPrincipal(identity);
    var httpContext = new DefaultHttpContext { User = principal };
    return new HttpContextAccessor { HttpContext = httpContext };
  }

  private static Mock<IInvoiceProcessingService> CreateServiceMockThatThrowsOnRead(Exception exceptionToThrow)
  {
    var mock = new Mock<IInvoiceProcessingService>(MockBehavior.Strict);
    mock
      .Setup(s => s.ReadInvoice(It.IsAny<Guid>(), It.IsAny<Guid?>(), It.IsAny<CancellationToken>()))
      .ThrowsAsync(exceptionToThrow);
    return mock;
  }

  private static Mock<IInvoiceProcessingService> CreateServiceMockThatThrowsOnMerchantRead(Exception exceptionToThrow)
  {
    var mock = new Mock<IInvoiceProcessingService>(MockBehavior.Strict);
    mock
      .Setup(s => s.ReadMerchant(It.IsAny<Guid>(), It.IsAny<Guid?>(), It.IsAny<CancellationToken>()))
      .ThrowsAsync(exceptionToThrow);
    return mock;
  }

  private static int GetStatusCode(IResult result)
  {
    if (result is IStatusCodeHttpResult statusResult && statusResult.StatusCode.HasValue)
    {
      return statusResult.StatusCode.Value;
    }
    throw new InvalidOperationException(
      $"Expected IResult to implement IStatusCodeHttpResult with a value; got '{result.GetType().FullName}'.");
  }

  private static ProblemDetails GetProblemDetails(IResult result)
  {
    var problem = Assert.IsType<ProblemHttpResult>(result);
    return problem.ProblemDetails;
  }
  #endregion

  #region GET /rest/v1/invoices/{id} status code tests
  /// <summary>
  /// Verifies that an <see cref="INotFoundException"/> thrown by the processing service
  /// is mapped to a 404 Not Found <see cref="ProblemDetails"/> response by the endpoint.
  /// </summary>
  [Fact]
  public async Task RetrieveSpecificInvoiceAsync_WhenServiceThrowsNotFound_Returns404()
  {
    // Arrange
    var mockService = CreateServiceMockThatThrowsOnRead(new TestNotFoundException("invoice not found"));
    var accessor = CreateAuthenticatedContextAccessor();

    // Act
    var result = await InvoiceEndpoints
      .RetrieveSpecificInvoiceAsync(mockService.Object, accessor, Guid.NewGuid())
      .ConfigureAwait(false);

    // Assert
    Assert.Equal(StatusCodes.Status404NotFound, GetStatusCode(result));
    var problem = GetProblemDetails(result);
    Assert.Equal(ProblemTypeUris.NotFound, problem.Type);
  }

  /// <summary>
  /// Verifies that an <see cref="IAlreadyExistsException"/> thrown by the processing service
  /// is mapped to a 409 Conflict <see cref="ProblemDetails"/> response by the endpoint.
  /// </summary>
  [Fact]
  public async Task RetrieveSpecificInvoiceAsync_WhenServiceThrowsConflict_Returns409()
  {
    var mockService = CreateServiceMockThatThrowsOnRead(new TestConflictException("already exists"));
    var accessor = CreateAuthenticatedContextAccessor();

    var result = await InvoiceEndpoints
      .RetrieveSpecificInvoiceAsync(mockService.Object, accessor, Guid.NewGuid())
      .ConfigureAwait(false);

    Assert.Equal(StatusCodes.Status409Conflict, GetStatusCode(result));
    Assert.Equal(ProblemTypeUris.Conflict, GetProblemDetails(result).Type);
  }

  /// <summary>
  /// Verifies that an <see cref="ILockedException"/> thrown by the processing service
  /// is mapped to a 423 Locked <see cref="ProblemDetails"/> response by the endpoint.
  /// </summary>
  [Fact]
  public async Task RetrieveSpecificInvoiceAsync_WhenServiceThrowsLocked_Returns423()
  {
    var mockService = CreateServiceMockThatThrowsOnRead(new TestLockedException("resource locked"));
    var accessor = CreateAuthenticatedContextAccessor();

    var result = await InvoiceEndpoints
      .RetrieveSpecificInvoiceAsync(mockService.Object, accessor, Guid.NewGuid())
      .ConfigureAwait(false);

    Assert.Equal(StatusCodes.Status423Locked, GetStatusCode(result));
    Assert.Equal(ProblemTypeUris.Locked, GetProblemDetails(result).Type);
  }

  /// <summary>
  /// Verifies that an <see cref="IRateLimitedException"/> thrown by the processing service
  /// is mapped to a 429 Too Many Requests <see cref="ProblemDetails"/> response carrying
  /// the retry hint on the <c>retryAfterSeconds</c> extension member.
  /// </summary>
  [Fact]
  public async Task RetrieveSpecificInvoiceAsync_WhenServiceThrowsRateLimit_Returns429WithRetryAfterSecondsExtension()
  {
    // Arrange - include a non-trivial RetryAfter so the mapper surfaces a positive hint.
    var retryAfter = TimeSpan.FromSeconds(42);
    var mockService = CreateServiceMockThatThrowsOnRead(
      new TestRateLimitedException("slow down", retryAfter));
    var accessor = CreateAuthenticatedContextAccessor();

    // Act
    var result = await InvoiceEndpoints
      .RetrieveSpecificInvoiceAsync(mockService.Object, accessor, Guid.NewGuid())
      .ConfigureAwait(false);

    // Assert
    Assert.Equal(StatusCodes.Status429TooManyRequests, GetStatusCode(result));
    var problem = GetProblemDetails(result);
    Assert.Equal(ProblemTypeUris.RateLimited, problem.Type);

    // The mapper surfaces the retry hint as a ProblemDetails extension (JSON body),
    // NOT as an HTTP Retry-After header. See ExceptionToHttpResultMapper.
    Assert.True(
      problem.Extensions.TryGetValue("retryAfterSeconds", out var retryHint),
      "Expected 'retryAfterSeconds' extension on 429 ProblemDetails body.");
    Assert.Equal(42, Assert.IsType<int>(retryHint));
  }

  /// <summary>
  /// Verifies that an <see cref="IDependencyException"/> thrown by the processing service
  /// is mapped to a 503 Service Unavailable <see cref="ProblemDetails"/> response by the endpoint.
  /// </summary>
  [Fact]
  public async Task RetrieveSpecificInvoiceAsync_WhenServiceThrowsDependencyFailure_Returns503()
  {
    var mockService = CreateServiceMockThatThrowsOnRead(
      new TestDependencyException("upstream dependency failed"));
    var accessor = CreateAuthenticatedContextAccessor();

    var result = await InvoiceEndpoints
      .RetrieveSpecificInvoiceAsync(mockService.Object, accessor, Guid.NewGuid())
      .ConfigureAwait(false);

    Assert.Equal(StatusCodes.Status503ServiceUnavailable, GetStatusCode(result));
    Assert.Equal(ProblemTypeUris.ServiceUnavailable, GetProblemDetails(result).Type);
  }

  /// <summary>
  /// Verifies that an unclassified <see cref="Exception"/> (implementing none of the marker interfaces)
  /// is mapped to a 500 Internal Server Error without leaking the exception type name or stack trace
  /// into the <see cref="ProblemDetails"/> payload.
  /// </summary>
  [Fact]
  public async Task RetrieveSpecificInvoiceAsync_WhenServiceThrowsUnclassifiedException_Returns500WithoutLeakingType()
  {
    // Arrange - a plain Exception that implements none of the marker interfaces
    // should hit the fallback branch in the mapper's switch and be reported as 500.
    const string secretDetail = "Cosmos DB connection string=AccountEndpoint=...;AccountKey=...";
    var mockService = CreateServiceMockThatThrowsOnRead(new Exception(secretDetail));
    var accessor = CreateAuthenticatedContextAccessor();

    // Act
    var result = await InvoiceEndpoints
      .RetrieveSpecificInvoiceAsync(mockService.Object, accessor, Guid.NewGuid())
      .ConfigureAwait(false);

    // Assert
    Assert.Equal(StatusCodes.Status500InternalServerError, GetStatusCode(result));
    var problem = GetProblemDetails(result);
    Assert.Equal(ProblemTypeUris.InternalServerError, problem.Type);

    // The mapper's BuildSafeDetail surfaces Message only - it does NOT emit the
    // exception type name / namespace / stack into the ProblemDetails payload.
    Assert.Equal("An unexpected error occurred. Please try again later.", problem.Detail);
  }
  #endregion

  #region POST /rest/v1/invoices validation tests
  /// <summary>
  /// Verifies that the endpoint rejects a request with an empty user identifier by returning
  /// 400 Bad Request <em>before</em> invoking the processing service (endpoint-level validation).
  /// </summary>
  [Fact]
  public async Task CreateNewInvoiceAsync_WhenUserIdentifierIsEmpty_Returns400ValidationProblem()
  {
    // Arrange - endpoint-level validation runs BEFORE any service call, so the mock
    // is never invoked. The strict mock ensures any unexpected call would fail the test.
    var mockService = new Mock<IInvoiceProcessingService>(MockBehavior.Strict);
    var accessor = CreateAuthenticatedContextAccessor();

    var invalidDto = new CreateInvoiceRequestDto(
      UserIdentifier: Guid.Empty,
      InitialScan: default,
      Metadata: null);

    // Act
    var result = await InvoiceEndpoints
      .CreateNewInvoiceAsync(mockService.Object, accessor, invalidDto)
      .ConfigureAwait(false);

    // Assert
    Assert.Equal(StatusCodes.Status400BadRequest, GetStatusCode(result));
    mockService.VerifyNoOtherCalls();
  }
  #endregion

  #region GET /rest/v1/invoices/{id} - 401/403 status code tests
  /// <summary>
  /// Verifies that an <see cref="IUnauthorizedException"/> thrown by the processing service
  /// is mapped to a 401 Unauthorized <see cref="ProblemDetails"/> response by the endpoint.
  /// </summary>
  [Fact]
  public async Task RetrieveSpecificInvoiceAsync_WhenServiceThrowsUnauthorized_Returns401()
  {
    var mockService = CreateServiceMockThatThrowsOnRead(new TestUnauthorizedException("authentication required"));
    var accessor = CreateAuthenticatedContextAccessor();

    var result = await InvoiceEndpoints
      .RetrieveSpecificInvoiceAsync(mockService.Object, accessor, Guid.NewGuid())
      .ConfigureAwait(false);

    Assert.Equal(StatusCodes.Status401Unauthorized, GetStatusCode(result));
    Assert.Equal(ProblemTypeUris.Unauthorized, GetProblemDetails(result).Type);
  }

  /// <summary>
  /// Verifies that an <see cref="IForbiddenException"/> thrown by the processing service
  /// is mapped to a 403 Forbidden <see cref="ProblemDetails"/> response by the endpoint.
  /// </summary>
  [Fact]
  public async Task RetrieveSpecificInvoiceAsync_WhenServiceThrowsForbidden_Returns403()
  {
    var mockService = CreateServiceMockThatThrowsOnRead(new TestForbiddenException("access denied"));
    var accessor = CreateAuthenticatedContextAccessor();

    var result = await InvoiceEndpoints
      .RetrieveSpecificInvoiceAsync(mockService.Object, accessor, Guid.NewGuid())
      .ConfigureAwait(false);

    Assert.Equal(StatusCodes.Status403Forbidden, GetStatusCode(result));
    Assert.Equal(ProblemTypeUris.Forbidden, GetProblemDetails(result).Type);
  }
  #endregion

  #region GET /rest/v1/merchants/{id} status code tests
  // Mirrors the Invoice-endpoint coverage against the Merchant read handler
  // (RetrieveSpecificMerchantAsync). Both handlers funnel exceptions through
  // ExceptionToHttpResultMapper, so the contract under test is identical; only the
  // handler signature and the service method being provoked (ReadMerchant vs ReadInvoice)
  // differ.

  /// <summary>
  /// Verifies that an <see cref="INotFoundException"/> thrown from <c>ReadMerchant</c>
  /// is mapped to a 404 Not Found <see cref="ProblemDetails"/> response by the endpoint.
  /// </summary>
  [Fact]
  public async Task RetrieveSpecificMerchantAsync_WhenServiceThrowsNotFound_Returns404()
  {
    var mockService = CreateServiceMockThatThrowsOnMerchantRead(new TestNotFoundException("merchant not found"));
    var accessor = CreateAuthenticatedContextAccessor();

    var result = await InvoiceEndpoints
      .RetrieveSpecificMerchantAsync(mockService.Object, accessor, Guid.NewGuid(), parentCompanyId: null)
      .ConfigureAwait(false);

    Assert.Equal(StatusCodes.Status404NotFound, GetStatusCode(result));
    Assert.Equal(ProblemTypeUris.NotFound, GetProblemDetails(result).Type);
  }

  /// <summary>
  /// Verifies that an <see cref="IAlreadyExistsException"/> thrown from <c>ReadMerchant</c>
  /// is mapped to a 409 Conflict <see cref="ProblemDetails"/> response by the endpoint.
  /// </summary>
  [Fact]
  public async Task RetrieveSpecificMerchantAsync_WhenServiceThrowsConflict_Returns409()
  {
    var mockService = CreateServiceMockThatThrowsOnMerchantRead(new TestConflictException("merchant already exists"));
    var accessor = CreateAuthenticatedContextAccessor();

    var result = await InvoiceEndpoints
      .RetrieveSpecificMerchantAsync(mockService.Object, accessor, Guid.NewGuid(), parentCompanyId: null)
      .ConfigureAwait(false);

    Assert.Equal(StatusCodes.Status409Conflict, GetStatusCode(result));
    Assert.Equal(ProblemTypeUris.Conflict, GetProblemDetails(result).Type);
  }

  /// <summary>
  /// Verifies that an <see cref="ILockedException"/> thrown from <c>ReadMerchant</c>
  /// is mapped to a 423 Locked <see cref="ProblemDetails"/> response by the endpoint.
  /// </summary>
  [Fact]
  public async Task RetrieveSpecificMerchantAsync_WhenServiceThrowsLocked_Returns423()
  {
    var mockService = CreateServiceMockThatThrowsOnMerchantRead(new TestLockedException("merchant locked"));
    var accessor = CreateAuthenticatedContextAccessor();

    var result = await InvoiceEndpoints
      .RetrieveSpecificMerchantAsync(mockService.Object, accessor, Guid.NewGuid(), parentCompanyId: null)
      .ConfigureAwait(false);

    Assert.Equal(StatusCodes.Status423Locked, GetStatusCode(result));
    Assert.Equal(ProblemTypeUris.Locked, GetProblemDetails(result).Type);
  }

  /// <summary>
  /// Verifies that an <see cref="IRateLimitedException"/> thrown from <c>ReadMerchant</c>
  /// is mapped to a 429 Too Many Requests <see cref="ProblemDetails"/> response carrying
  /// the retry hint on the <c>retryAfterSeconds</c> extension member.
  /// </summary>
  [Fact]
  public async Task RetrieveSpecificMerchantAsync_WhenServiceThrowsRateLimit_Returns429WithRetryAfterSecondsExtension()
  {
    var retryAfter = TimeSpan.FromSeconds(17);
    var mockService = CreateServiceMockThatThrowsOnMerchantRead(
      new TestRateLimitedException("merchant reads throttled", retryAfter));
    var accessor = CreateAuthenticatedContextAccessor();

    var result = await InvoiceEndpoints
      .RetrieveSpecificMerchantAsync(mockService.Object, accessor, Guid.NewGuid(), parentCompanyId: null)
      .ConfigureAwait(false);

    Assert.Equal(StatusCodes.Status429TooManyRequests, GetStatusCode(result));
    var problem = GetProblemDetails(result);
    Assert.Equal(ProblemTypeUris.RateLimited, problem.Type);

    Assert.True(
      problem.Extensions.TryGetValue("retryAfterSeconds", out var retryHint),
      "Expected 'retryAfterSeconds' extension on 429 ProblemDetails body.");
    Assert.Equal(17, Assert.IsType<int>(retryHint));
  }

  /// <summary>
  /// Verifies that an <see cref="IUnauthorizedException"/> thrown from <c>ReadMerchant</c>
  /// is mapped to a 401 Unauthorized <see cref="ProblemDetails"/> response by the endpoint.
  /// </summary>
  [Fact]
  public async Task RetrieveSpecificMerchantAsync_WhenServiceThrowsUnauthorized_Returns401()
  {
    var mockService = CreateServiceMockThatThrowsOnMerchantRead(new TestUnauthorizedException("authentication required"));
    var accessor = CreateAuthenticatedContextAccessor();

    var result = await InvoiceEndpoints
      .RetrieveSpecificMerchantAsync(mockService.Object, accessor, Guid.NewGuid(), parentCompanyId: null)
      .ConfigureAwait(false);

    Assert.Equal(StatusCodes.Status401Unauthorized, GetStatusCode(result));
    Assert.Equal(ProblemTypeUris.Unauthorized, GetProblemDetails(result).Type);
  }

  /// <summary>
  /// Verifies that an <see cref="IForbiddenException"/> thrown from <c>ReadMerchant</c>
  /// is mapped to a 403 Forbidden <see cref="ProblemDetails"/> response by the endpoint.
  /// </summary>
  [Fact]
  public async Task RetrieveSpecificMerchantAsync_WhenServiceThrowsForbidden_Returns403()
  {
    var mockService = CreateServiceMockThatThrowsOnMerchantRead(new TestForbiddenException("access denied"));
    var accessor = CreateAuthenticatedContextAccessor();

    var result = await InvoiceEndpoints
      .RetrieveSpecificMerchantAsync(mockService.Object, accessor, Guid.NewGuid(), parentCompanyId: null)
      .ConfigureAwait(false);

    Assert.Equal(StatusCodes.Status403Forbidden, GetStatusCode(result));
    Assert.Equal(ProblemTypeUris.Forbidden, GetProblemDetails(result).Type);
  }

  /// <summary>
  /// Verifies that an <see cref="IDependencyException"/> thrown from <c>ReadMerchant</c>
  /// is mapped to a 503 Service Unavailable <see cref="ProblemDetails"/> response by the endpoint.
  /// </summary>
  [Fact]
  public async Task RetrieveSpecificMerchantAsync_WhenServiceThrowsDependencyFailure_Returns503()
  {
    var mockService = CreateServiceMockThatThrowsOnMerchantRead(
      new TestDependencyException("upstream dependency failed"));
    var accessor = CreateAuthenticatedContextAccessor();

    var result = await InvoiceEndpoints
      .RetrieveSpecificMerchantAsync(mockService.Object, accessor, Guid.NewGuid(), parentCompanyId: null)
      .ConfigureAwait(false);

    Assert.Equal(StatusCodes.Status503ServiceUnavailable, GetStatusCode(result));
    Assert.Equal(ProblemTypeUris.ServiceUnavailable, GetProblemDetails(result).Type);
  }
  #endregion

  #region ProblemDetails traceId extension tests
  /// <summary>
  /// Verifies that when an ambient <see cref="Activity"/> is active during handler execution,
  /// the emitted <see cref="ProblemDetails"/> payload exposes a <c>traceId</c> extension equal to
  /// <see cref="Activity.TraceId"/>. This is the correlation hook that ties a 4xx/5xx response
  /// back to the originating distributed trace for client/SRE diagnostics.
  /// </summary>
  /// <remarks>
  /// Registers an <see cref="ActivityListener"/> with <see cref="ActivitySamplingResult.AllData"/>
  /// so <see cref="ActivitySource.StartActivity(string, ActivityKind)"/> actually produces a
  /// non-null <see cref="Activity"/>; default sampling yields <c>null</c> outside a hosted app.
  /// Mirrors the pattern used by <c>ExceptionMappingHandlerTests.TryHandleAsync_ClassifiableException_IncludesTraceIdWhenActivityPresent</c>.
  /// </remarks>
  [Fact]
  public async Task RetrieveSpecificInvoiceAsync_WhenActivityActive_ProblemDetailsIncludesTraceId()
  {
    // Arrange - register a listener that samples EVERYTHING so StartActivity returns a real Activity.
    using var listener = new ActivityListener
    {
      ShouldListenTo = _ => true,
      Sample = (ref ActivityCreationOptions<ActivityContext> _) => ActivitySamplingResult.AllData,
    };
    ActivitySource.AddActivityListener(listener);

    using var source = new ActivitySource("arolariu.tests.InvoiceEndpointsStatusCodeTests");
    using var activity = source.StartActivity("test-op");
    Assert.NotNull(activity);

    var mockService = CreateServiceMockThatThrowsOnRead(new TestNotFoundException("invoice not found"));
    var accessor = CreateAuthenticatedContextAccessor();

    // Act
    var result = await InvoiceEndpoints
      .RetrieveSpecificInvoiceAsync(mockService.Object, accessor, Guid.NewGuid())
      .ConfigureAwait(false);

    // Assert
    Assert.Equal(StatusCodes.Status404NotFound, GetStatusCode(result));
    var problem = GetProblemDetails(result);

    Assert.True(
      problem.Extensions.TryGetValue("traceId", out var traceIdValue),
      "Expected 'traceId' extension on ProblemDetails when an Activity is active.");

    var expectedTraceId = Activity.Current!.TraceId.ToString();
    Assert.Equal(expectedTraceId, Assert.IsType<string>(traceIdValue));
  }
  #endregion
}
