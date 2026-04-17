namespace arolariu.Backend.Domain.Tests.Integration;

using System;
using System.Collections.Generic;
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
    var mapper = new ExceptionToHttpResultMapper();
    var accessor = CreateAuthenticatedContextAccessor();

    // Act
    var result = await InvoiceEndpoints
      .RetrieveSpecificInvoiceAsync(mockService.Object, mapper, accessor, Guid.NewGuid())
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
    var mapper = new ExceptionToHttpResultMapper();
    var accessor = CreateAuthenticatedContextAccessor();

    var result = await InvoiceEndpoints
      .RetrieveSpecificInvoiceAsync(mockService.Object, mapper, accessor, Guid.NewGuid())
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
    var mapper = new ExceptionToHttpResultMapper();
    var accessor = CreateAuthenticatedContextAccessor();

    var result = await InvoiceEndpoints
      .RetrieveSpecificInvoiceAsync(mockService.Object, mapper, accessor, Guid.NewGuid())
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
    var mapper = new ExceptionToHttpResultMapper();
    var accessor = CreateAuthenticatedContextAccessor();

    // Act
    var result = await InvoiceEndpoints
      .RetrieveSpecificInvoiceAsync(mockService.Object, mapper, accessor, Guid.NewGuid())
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
    var mapper = new ExceptionToHttpResultMapper();
    var accessor = CreateAuthenticatedContextAccessor();

    var result = await InvoiceEndpoints
      .RetrieveSpecificInvoiceAsync(mockService.Object, mapper, accessor, Guid.NewGuid())
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
    var mapper = new ExceptionToHttpResultMapper();
    var accessor = CreateAuthenticatedContextAccessor();

    // Act
    var result = await InvoiceEndpoints
      .RetrieveSpecificInvoiceAsync(mockService.Object, mapper, accessor, Guid.NewGuid())
      .ConfigureAwait(false);

    // Assert
    Assert.Equal(StatusCodes.Status500InternalServerError, GetStatusCode(result));
    var problem = GetProblemDetails(result);
    Assert.Equal(ProblemTypeUris.InternalServerError, problem.Type);

    // The mapper's BuildSafeDetail surfaces Message only - it does NOT emit the
    // exception type name / namespace / stack into the ProblemDetails payload.
    Assert.DoesNotContain("System.Exception", problem.Detail ?? string.Empty, StringComparison.Ordinal);
    Assert.DoesNotContain("at ", problem.Detail ?? string.Empty, StringComparison.Ordinal);
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
    var mapper = new ExceptionToHttpResultMapper();
    var accessor = CreateAuthenticatedContextAccessor();

    var invalidDto = new CreateInvoiceRequestDto(
      UserIdentifier: Guid.Empty,
      InitialScan: default,
      Metadata: null);

    // Act
    var result = await InvoiceEndpoints
      .CreateNewInvoiceAsync(mockService.Object, mapper, accessor, invalidDto)
      .ConfigureAwait(false);

    // Assert
    Assert.Equal(StatusCodes.Status400BadRequest, GetStatusCode(result));
    mockService.VerifyNoOtherCalls();
  }
  #endregion
}
