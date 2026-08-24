namespace arolariu.Backend.Domain.Tests.Integration;

using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.Diagnostics;
using System.Linq;
using System.Security.Claims;
using System.Threading;
using System.Threading.Tasks;

using arolariu.Backend.Common.Exceptions;
using arolariu.Backend.Common.Http;
using arolariu.Backend.Domain.Invoices.DDD.AggregatorRoots.Invoices;
using arolariu.Backend.Domain.Invoices.DDD.Analysis.Enums;
using arolariu.Backend.Domain.Invoices.DDD.Entities.Merchants;
using arolariu.Backend.Domain.Invoices.DDD.ValueObjects;
using arolariu.Backend.Domain.Invoices.DDD.ValueObjects.Classifications;
using arolariu.Backend.Domain.Invoices.DDD.ValueObjects.Products;
using arolariu.Backend.Domain.Invoices.DTOs.Requests;
using arolariu.Backend.Domain.Invoices.Endpoints;
using arolariu.Backend.Domain.Invoices.Services.Management;

using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Http.HttpResults;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.DependencyInjection;

using Moq;

using Microsoft.VisualStudio.TestTools.UnitTesting;

/// <summary>
/// Integration-style tests asserting that invoice REST endpoints emit the correct
/// HTTP status code per exception type thrown by <see cref="IInvoiceManagementService"/>.
/// </summary>
/// <remarks>
/// <para>
/// <b>Scope:</b> Exercises the real endpoint handler (<see cref="InvoiceEndpoints.RetrieveSpecificInvoiceAsync"/>,
/// <c>InvoiceEndpoints.CreateNewInvoiceAsync</c>) wired to the real
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
[TestClass]
public sealed class InvoiceEndpointsStatusCodeTests
{
  #region Local test exceptions implementing the Common marker interfaces.
  // These intentionally live inside the test so the suite is decoupled from whether
  // concrete domain exception types (e.g., InvoiceNotFoundException) implement the
  // markers today - the integration contract under test is endpoint -> mapper.
  private sealed class TestNotFoundException : Exception, INotFoundException
  {
    public TestNotFoundException(string message) : base(message) { }

    public TestNotFoundException()
    {
    }
    public TestNotFoundException(string message, Exception innerException) : base(message, innerException)
    {
    }
  }

  private sealed class TestConflictException : Exception, IAlreadyExistsException
  {
    public TestConflictException(string message) : base(message) { }

    public TestConflictException()
    {
    }

    public TestConflictException(string message, Exception innerException) : base(message, innerException)
    {
    }
  }

  private sealed class TestLockedException : Exception, ILockedException
  {
    public TestLockedException(string message) : base(message) { }

    public TestLockedException()
    {
    }

    public TestLockedException(string message, Exception innerException) : base(message, innerException)
    {
    }
  }

  private sealed class TestRateLimitedException : Exception, IRateLimitedException
  {
    public TestRateLimitedException(string message, TimeSpan retryAfter) : base(message)
    {
      RetryAfter = retryAfter;
    }

    public TimeSpan RetryAfter { get; }

    public TestRateLimitedException()
    {
    }

    public TestRateLimitedException(string message) : base(message)
    {
    }

    public TestRateLimitedException(string message, Exception innerException) : base(message, innerException)
    {
    }
  }

  private sealed class TestDependencyException : Exception, IDependencyException
  {
    public TestDependencyException(string message) : base(message) { }

    public TestDependencyException()
    {
    }

    public TestDependencyException(string message, Exception innerException) : base(message, innerException)
    {
    }
  }

  private sealed class TestUnauthorizedException : Exception, IUnauthorizedException
  {
    public TestUnauthorizedException(string message) : base(message) { }

    public TestUnauthorizedException()
    {
    }

    public TestUnauthorizedException(string message, Exception innerException) : base(message, innerException)
    {
    }
  }

  private sealed class TestForbiddenException : Exception, IForbiddenException
  {
    public TestForbiddenException(string message) : base(message) { }

    public TestForbiddenException()
    {
    }

    public TestForbiddenException(string message, Exception innerException) : base(message, innerException)
    {
    }
  }
  #endregion

  #region Test utilities
  private static HttpContextAccessor CreateAuthenticatedContextAccessor(Guid? userIdentifier = null)
  {
    var effectiveUserId = userIdentifier ?? Guid.NewGuid();
    var claims = new List<Claim>
    {
      new Claim("userIdentifier", effectiveUserId.ToString()),
    };
    var identity = new ClaimsIdentity(claims, authenticationType: "TestAuth");
    var principal = new ClaimsPrincipal(identity);
    var httpContext = new DefaultHttpContext
    {
      User = principal,
      RequestServices = new ServiceCollection().BuildServiceProvider(),
    };
    return new HttpContextAccessor { HttpContext = httpContext };
  }

  private static Mock<IInvoiceManagementService> CreateServiceMockThatThrowsOnRead(Exception exceptionToThrow)
  {
    var mock = new Mock<IInvoiceManagementService>(MockBehavior.Strict);
    mock
      .Setup(s => s.ReadInvoice(It.IsAny<Guid>(), It.IsAny<Guid?>(), It.IsAny<CancellationToken>()))
      .ThrowsAsync(exceptionToThrow);
    return mock;
  }

  private static Mock<IInvoiceManagementService> CreateServiceMockThatThrowsOnMerchantRead(Exception exceptionToThrow)
  {
    var mock = new Mock<IInvoiceManagementService>(MockBehavior.Strict);
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
    var problem = Assert.IsExactInstanceOfType<ProblemHttpResult>(result);
    return problem.ProblemDetails;
  }
  #endregion

  #region GET /rest/v1/invoices/{id} status code tests
  /// <summary>
  /// Verifies that an <see cref="INotFoundException"/> thrown by the processing service
  /// is mapped to a 404 Not Found <see cref="ProblemDetails"/> response by the endpoint.
  /// </summary>
  [TestMethod]
  public async Task RetrieveSpecificInvoiceAsync_WhenServiceThrowsNotFound_Returns404()
  {
    // Arrange
    var mockService = CreateServiceMockThatThrowsOnRead(new TestNotFoundException("invoice not found"));
    var accessor = CreateAuthenticatedContextAccessor();

    // Act
    var result = await InvoiceEndpoints
      .RetrieveSpecificInvoiceAsync(mockService.Object, accessor, Guid.NewGuid(), CancellationToken.None)
;

    // Assert
    Assert.AreEqual(StatusCodes.Status404NotFound, GetStatusCode(result));
    var problem = GetProblemDetails(result);
    Assert.AreEqual(ProblemTypeUris.NotFound, problem.Type);
  }

  /// <summary>
  /// Verifies that an <see cref="IAlreadyExistsException"/> thrown by the processing service
  /// is mapped to a 409 Conflict <see cref="ProblemDetails"/> response by the endpoint.
  /// </summary>
  [TestMethod]
  public async Task RetrieveSpecificInvoiceAsync_WhenServiceThrowsConflict_Returns409()
  {
    var mockService = CreateServiceMockThatThrowsOnRead(new TestConflictException("already exists"));
    var accessor = CreateAuthenticatedContextAccessor();

    var result = await InvoiceEndpoints
      .RetrieveSpecificInvoiceAsync(mockService.Object, accessor, Guid.NewGuid(), CancellationToken.None)
;

    Assert.AreEqual(StatusCodes.Status409Conflict, GetStatusCode(result));
    Assert.AreEqual(ProblemTypeUris.Conflict, GetProblemDetails(result).Type);
  }

  /// <summary>
  /// Verifies that an <see cref="ILockedException"/> thrown by the processing service
  /// is mapped to a 423 Locked <see cref="ProblemDetails"/> response by the endpoint.
  /// </summary>
  [TestMethod]
  public async Task RetrieveSpecificInvoiceAsync_WhenServiceThrowsLocked_Returns423()
  {
    var mockService = CreateServiceMockThatThrowsOnRead(new TestLockedException("resource locked"));
    var accessor = CreateAuthenticatedContextAccessor();

    var result = await InvoiceEndpoints
      .RetrieveSpecificInvoiceAsync(mockService.Object, accessor, Guid.NewGuid(), CancellationToken.None)
;

    Assert.AreEqual(StatusCodes.Status423Locked, GetStatusCode(result));
    Assert.AreEqual(ProblemTypeUris.Locked, GetProblemDetails(result).Type);
  }

  /// <summary>
  /// Verifies that an <see cref="IRateLimitedException"/> thrown by the processing service
  /// is mapped to a 429 Too Many Requests <see cref="ProblemDetails"/> response carrying
  /// the retry hint on the <c>retryAfterSeconds</c> extension member.
  /// </summary>
  [TestMethod]
  public async Task RetrieveSpecificInvoiceAsync_WhenServiceThrowsRateLimit_Returns429WithRetryAfterSecondsExtension()
  {
    // Arrange - include a non-trivial RetryAfter so the mapper surfaces a positive hint.
    var retryAfter = TimeSpan.FromSeconds(42);
    var mockService = CreateServiceMockThatThrowsOnRead(
      new TestRateLimitedException("slow down", retryAfter));
    var accessor = CreateAuthenticatedContextAccessor();

    // Act
    var result = await InvoiceEndpoints
      .RetrieveSpecificInvoiceAsync(mockService.Object, accessor, Guid.NewGuid(), CancellationToken.None)
;

    // Assert
    Assert.AreEqual(StatusCodes.Status429TooManyRequests, GetStatusCode(result));
    var problem = GetProblemDetails(result);
    Assert.AreEqual(ProblemTypeUris.RateLimited, problem.Type);

    // The mapper surfaces the retry hint as a ProblemDetails extension (JSON body),
    // NOT as an HTTP Retry-After header. See ExceptionToHttpResultMapper.
    Assert.IsTrue(
      problem.Extensions.TryGetValue("retryAfterSeconds", out var retryHint),
      "Expected 'retryAfterSeconds' extension on 429 ProblemDetails body.");
    Assert.AreEqual(42, Assert.IsExactInstanceOfType<int>(retryHint));
  }

  /// <summary>
  /// Verifies that an <see cref="IDependencyException"/> thrown by the processing service
  /// is mapped to a 503 Service Unavailable <see cref="ProblemDetails"/> response by the endpoint.
  /// </summary>
  [TestMethod]
  public async Task RetrieveSpecificInvoiceAsync_WhenServiceThrowsDependencyFailure_Returns503()
  {
    var mockService = CreateServiceMockThatThrowsOnRead(
      new TestDependencyException("upstream dependency failed"));
    var accessor = CreateAuthenticatedContextAccessor();

    var result = await InvoiceEndpoints
      .RetrieveSpecificInvoiceAsync(mockService.Object, accessor, Guid.NewGuid(), CancellationToken.None)
;

    Assert.AreEqual(StatusCodes.Status503ServiceUnavailable, GetStatusCode(result));
    Assert.AreEqual(ProblemTypeUris.ServiceUnavailable, GetProblemDetails(result).Type);
  }

  /// <summary>
  /// Verifies that an unclassified <see cref="Exception"/> (implementing none of the marker interfaces)
  /// is mapped to a 500 Internal Server Error without leaking the exception type name or stack trace
  /// into the <see cref="ProblemDetails"/> payload.
  /// </summary>
  [TestMethod]
  public async Task RetrieveSpecificInvoiceAsync_WhenServiceThrowsUnclassifiedException_Returns500WithoutLeakingType()
  {
    // Arrange - a plain Exception that implements none of the marker interfaces
    // should hit the fallback branch in the mapper's switch and be reported as 500.
    const string secretDetail = "Cosmos DB connection string=AccountEndpoint=...;AccountKey=...";
    var mockService = CreateServiceMockThatThrowsOnRead(new InvalidOperationException(secretDetail));
    var accessor = CreateAuthenticatedContextAccessor();

    // Act
    var result = await InvoiceEndpoints
      .RetrieveSpecificInvoiceAsync(mockService.Object, accessor, Guid.NewGuid(), CancellationToken.None)
;

    // Assert
    Assert.AreEqual(StatusCodes.Status500InternalServerError, GetStatusCode(result));
    var problem = GetProblemDetails(result);
    Assert.AreEqual(ProblemTypeUris.InternalServerError, problem.Type);

    // The mapper's BuildSafeDetail surfaces Message only - it does NOT emit the
    // exception type name / namespace / stack into the ProblemDetails payload.
    Assert.AreEqual("An unexpected error occurred. Please try again later.", problem.Detail);
  }
  #endregion

  #region POST /rest/v1/invoices validation tests
  /// <summary>
  /// Verifies the endpoint forwards the body-trusted user identifier without adding a guard.
  /// </summary>
  [TestMethod]
  public async Task CreateNewInvoiceAsync_WhenUserIdentifierIsEmpty_DelegatesTrustedBodyValue()
  {
    var mockService = new Mock<IInvoiceManagementService>(MockBehavior.Strict);
    var accessor = CreateAuthenticatedContextAccessor();

    var invalidDto = new CreateInvoiceRequestDto(
      UserIdentifier: Guid.Empty,
      InitialScan: default!,
      AdditionalMetadata: null);
    mockService.Setup(service => service.CreateInvoice(
        It.Is<Invoice>(invoice => invoice.UserIdentifier == Guid.Empty),
        Guid.Empty,
        It.IsAny<CancellationToken>()))
      .Returns(Task.CompletedTask);

    // Act
    var result = await InvoiceEndpoints
      .CreateNewInvoiceAsync(mockService.Object, accessor, invalidDto)
;

    // Assert
    Assert.AreEqual(StatusCodes.Status201Created, GetStatusCode(result));
    mockService.VerifyAll();
  }

  /// <summary>Verifies the initial scan is a non-nullable required constructor contract.</summary>
  [TestMethod]
  public void CreateInvoiceRequestDto_InitialScan_IsRequiredAndNonNullable()
  {
    System.Reflection.ParameterInfo parameter = typeof(CreateInvoiceRequestDto)
      .GetConstructors(System.Reflection.BindingFlags.Public | System.Reflection.BindingFlags.Instance)
      .Single()
      .GetParameters()
      .Single(candidate => candidate.Name == nameof(CreateInvoiceRequestDto.InitialScan));

    Assert.AreEqual(typeof(InvoiceScan), parameter.ParameterType);
    Assert.IsNotNull(parameter.GetCustomAttributes(typeof(RequiredAttribute), inherit: false).SingleOrDefault());
  }
  #endregion

  #region Analysis acceptance contract tests
  /// <summary>Verifies invoice analysis returns the Azure message identifier as the 202 body.</summary>
  [TestMethod]
  public async Task AnalyzeInvoiceAsync_QueuedMessage_ReturnsMessageIdBody()
  {
    Guid invoiceId = Guid.NewGuid();
    Guid userId = Guid.NewGuid();
    var request = new InvoiceAnalysisRequestDto(
      AnalysisProfile.Fast,
      null,
      null,
      null,
      null,
      null,
      null,
      null);
    var service = new Mock<IInvoiceManagementService>(MockBehavior.Strict);
    service.Setup(candidate => candidate.QueueInvoiceAnalysisAsync(
        invoiceId,
        userId,
        request,
        It.IsAny<CancellationToken>()))
      .ReturnsAsync("message-1");

    IResult result = await InvoiceEndpoints.AnalyzeInvoiceAsync(
      service.Object,
      CreateAuthenticatedContextAccessor(userId),
      invoiceId,
      request);

    Assert.AreEqual(StatusCodes.Status202Accepted, GetStatusCode(result));
    Assert.AreEqual("message-1", ((IValueHttpResult)result).Value);
    service.VerifyAll();
  }

  /// <summary>Verifies merchant analysis returns the Azure message identifier as the 202 body.</summary>
  [TestMethod]
  public async Task AnalyzeMerchantAsync_QueuedMessage_ReturnsMessageIdBody()
  {
    Guid merchantId = Guid.NewGuid();
    Guid userId = Guid.NewGuid();
    var request = new MerchantAnalysisRequestDto(
      AnalysisProfile.Fast,
      MerchantClassification: null,
      DescriptionGeneration: null);
    var service = new Mock<IInvoiceManagementService>(MockBehavior.Strict);
    service.Setup(candidate => candidate.QueueMerchantAnalysisAsync(
        merchantId,
        userId,
        request,
        It.IsAny<CancellationToken>()))
      .ReturnsAsync("message-2");

    IResult result = await InvoiceEndpoints.AnalyzeMerchantAsync(
      service.Object,
      CreateAuthenticatedContextAccessor(userId),
      merchantId,
      request);

    Assert.AreEqual(StatusCodes.Status202Accepted, GetStatusCode(result));
    Assert.AreEqual("message-2", ((IValueHttpResult)result).Value);
    service.VerifyAll();
  }
  #endregion

  #region GET /rest/v1/invoices/{id} - 401/403 status code tests
  /// <summary>
  /// Verifies that an <see cref="IUnauthorizedException"/> thrown by the processing service
  /// is mapped to a 401 Unauthorized <see cref="ProblemDetails"/> response by the endpoint.
  /// </summary>
  [TestMethod]
  public async Task RetrieveSpecificInvoiceAsync_WhenServiceThrowsUnauthorized_Returns401()
  {
    var mockService = CreateServiceMockThatThrowsOnRead(new TestUnauthorizedException("authentication required"));
    var accessor = CreateAuthenticatedContextAccessor();

    var result = await InvoiceEndpoints
      .RetrieveSpecificInvoiceAsync(mockService.Object, accessor, Guid.NewGuid(), CancellationToken.None)
;

    Assert.AreEqual(StatusCodes.Status401Unauthorized, GetStatusCode(result));
    Assert.AreEqual(ProblemTypeUris.Unauthorized, GetProblemDetails(result).Type);
  }

  /// <summary>
  /// Verifies that an <see cref="IForbiddenException"/> thrown by the processing service
  /// is mapped to a 403 Forbidden <see cref="ProblemDetails"/> response by the endpoint.
  /// </summary>
  [TestMethod]
  public async Task RetrieveSpecificInvoiceAsync_WhenServiceThrowsForbidden_Returns403()
  {
    var mockService = CreateServiceMockThatThrowsOnRead(new TestForbiddenException("access denied"));
    var accessor = CreateAuthenticatedContextAccessor();

    var result = await InvoiceEndpoints
      .RetrieveSpecificInvoiceAsync(mockService.Object, accessor, Guid.NewGuid(), CancellationToken.None)
;

    Assert.AreEqual(StatusCodes.Status403Forbidden, GetStatusCode(result));
    Assert.AreEqual(ProblemTypeUris.Forbidden, GetProblemDetails(result).Type);
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
  [TestMethod]
  public async Task RetrieveSpecificMerchantAsync_WhenServiceThrowsNotFound_Returns404()
  {
    var mockService = CreateServiceMockThatThrowsOnMerchantRead(new TestNotFoundException("merchant not found"));
    var accessor = CreateAuthenticatedContextAccessor();

    var result = await InvoiceEndpoints
      .RetrieveSpecificMerchantAsync(mockService.Object, accessor, Guid.NewGuid(), parentCompanyId: null, CancellationToken.None)
;

    Assert.AreEqual(StatusCodes.Status404NotFound, GetStatusCode(result));
    Assert.AreEqual(ProblemTypeUris.NotFound, GetProblemDetails(result).Type);
  }

  /// <summary>
  /// Verifies that an <see cref="IAlreadyExistsException"/> thrown from <c>ReadMerchant</c>
  /// is mapped to a 409 Conflict <see cref="ProblemDetails"/> response by the endpoint.
  /// </summary>
  [TestMethod]
  public async Task RetrieveSpecificMerchantAsync_WhenServiceThrowsConflict_Returns409()
  {
    var mockService = CreateServiceMockThatThrowsOnMerchantRead(new TestConflictException("merchant already exists"));
    var accessor = CreateAuthenticatedContextAccessor();

    var result = await InvoiceEndpoints
      .RetrieveSpecificMerchantAsync(mockService.Object, accessor, Guid.NewGuid(), parentCompanyId: null, CancellationToken.None)
;

    Assert.AreEqual(StatusCodes.Status409Conflict, GetStatusCode(result));
    Assert.AreEqual(ProblemTypeUris.Conflict, GetProblemDetails(result).Type);
  }

  /// <summary>
  /// Verifies that an <see cref="ILockedException"/> thrown from <c>ReadMerchant</c>
  /// is mapped to a 423 Locked <see cref="ProblemDetails"/> response by the endpoint.
  /// </summary>
  [TestMethod]
  public async Task RetrieveSpecificMerchantAsync_WhenServiceThrowsLocked_Returns423()
  {
    var mockService = CreateServiceMockThatThrowsOnMerchantRead(new TestLockedException("merchant locked"));
    var accessor = CreateAuthenticatedContextAccessor();

    var result = await InvoiceEndpoints
      .RetrieveSpecificMerchantAsync(mockService.Object, accessor, Guid.NewGuid(), parentCompanyId: null, CancellationToken.None)
;

    Assert.AreEqual(StatusCodes.Status423Locked, GetStatusCode(result));
    Assert.AreEqual(ProblemTypeUris.Locked, GetProblemDetails(result).Type);
  }

  /// <summary>
  /// Verifies that an <see cref="IRateLimitedException"/> thrown from <c>ReadMerchant</c>
  /// is mapped to a 429 Too Many Requests <see cref="ProblemDetails"/> response carrying
  /// the retry hint on the <c>retryAfterSeconds</c> extension member.
  /// </summary>
  [TestMethod]
  public async Task RetrieveSpecificMerchantAsync_WhenServiceThrowsRateLimit_Returns429WithRetryAfterSecondsExtension()
  {
    var retryAfter = TimeSpan.FromSeconds(17);
    var mockService = CreateServiceMockThatThrowsOnMerchantRead(
      new TestRateLimitedException("merchant reads throttled", retryAfter));
    var accessor = CreateAuthenticatedContextAccessor();

    var result = await InvoiceEndpoints
      .RetrieveSpecificMerchantAsync(mockService.Object, accessor, Guid.NewGuid(), parentCompanyId: null, CancellationToken.None)
;

    Assert.AreEqual(StatusCodes.Status429TooManyRequests, GetStatusCode(result));
    var problem = GetProblemDetails(result);
    Assert.AreEqual(ProblemTypeUris.RateLimited, problem.Type);

    Assert.IsTrue(
      problem.Extensions.TryGetValue("retryAfterSeconds", out var retryHint),
      "Expected 'retryAfterSeconds' extension on 429 ProblemDetails body.");
    Assert.AreEqual(17, Assert.IsExactInstanceOfType<int>(retryHint));
  }

  /// <summary>
  /// Verifies that an <see cref="IUnauthorizedException"/> thrown from <c>ReadMerchant</c>
  /// is mapped to a 401 Unauthorized <see cref="ProblemDetails"/> response by the endpoint.
  /// </summary>
  [TestMethod]
  public async Task RetrieveSpecificMerchantAsync_WhenServiceThrowsUnauthorized_Returns401()
  {
    var mockService = CreateServiceMockThatThrowsOnMerchantRead(new TestUnauthorizedException("authentication required"));
    var accessor = CreateAuthenticatedContextAccessor();

    var result = await InvoiceEndpoints
      .RetrieveSpecificMerchantAsync(mockService.Object, accessor, Guid.NewGuid(), parentCompanyId: null, CancellationToken.None)
;

    Assert.AreEqual(StatusCodes.Status401Unauthorized, GetStatusCode(result));
    Assert.AreEqual(ProblemTypeUris.Unauthorized, GetProblemDetails(result).Type);
  }

  /// <summary>
  /// Verifies that an <see cref="IForbiddenException"/> thrown from <c>ReadMerchant</c>
  /// is mapped to a 403 Forbidden <see cref="ProblemDetails"/> response by the endpoint.
  /// </summary>
  [TestMethod]
  public async Task RetrieveSpecificMerchantAsync_WhenServiceThrowsForbidden_Returns403()
  {
    var mockService = CreateServiceMockThatThrowsOnMerchantRead(new TestForbiddenException("access denied"));
    var accessor = CreateAuthenticatedContextAccessor();

    var result = await InvoiceEndpoints
      .RetrieveSpecificMerchantAsync(mockService.Object, accessor, Guid.NewGuid(), parentCompanyId: null, CancellationToken.None)
;

    Assert.AreEqual(StatusCodes.Status403Forbidden, GetStatusCode(result));
    Assert.AreEqual(ProblemTypeUris.Forbidden, GetProblemDetails(result).Type);
  }

  /// <summary>
  /// Verifies that an <see cref="IDependencyException"/> thrown from <c>ReadMerchant</c>
  /// is mapped to a 503 Service Unavailable <see cref="ProblemDetails"/> response by the endpoint.
  /// </summary>
  [TestMethod]
  public async Task RetrieveSpecificMerchantAsync_WhenServiceThrowsDependencyFailure_Returns503()
  {
    var mockService = CreateServiceMockThatThrowsOnMerchantRead(
      new TestDependencyException("upstream dependency failed"));
    var accessor = CreateAuthenticatedContextAccessor();

    var result = await InvoiceEndpoints
      .RetrieveSpecificMerchantAsync(mockService.Object, accessor, Guid.NewGuid(), parentCompanyId: null, CancellationToken.None)
;

    Assert.AreEqual(StatusCodes.Status503ServiceUnavailable, GetStatusCode(result));
    Assert.AreEqual(ProblemTypeUris.ServiceUnavailable, GetProblemDetails(result).Type);
  }
  #endregion

  #region Product replacement workflow tests
  /// <summary>Verifies a whitespace product classification code rejected by Management maps to bad request.</summary>
  [TestMethod]
  public async Task AddProductToInvoiceAsync_WhitespaceClassificationCode_ReturnsBadRequest()
  {
    Guid invoiceId = Guid.NewGuid();
    Guid userId = Guid.NewGuid();
    var request = new CreateProductRequestDto(
      Name: "Milk",
      ClassificationCode: " ",
      Quantity: 1m,
      QuantityUnit: "pcs",
      ProductCode: null,
      Price: 8m,
      AllergenAssessment: null);
    var service = new Mock<IInvoiceManagementService>(MockBehavior.Strict);
    service.Setup(candidate => candidate.ReadInvoice(
        invoiceId,
        userId,
        It.IsAny<CancellationToken>()))
      .ReturnsAsync(new Invoice { id = invoiceId, UserIdentifier = userId });
    service.Setup(candidate => candidate.AddProduct(
        invoiceId,
        userId,
        It.IsAny<Product>(),
        " ",
        It.IsAny<CancellationToken>()))
      .ThrowsAsync(new BadHttpRequestException("Classification code must not be whitespace."));

    IResult result = await InvoiceEndpoints.AddProductToInvoiceAsync(
      service.Object,
      CreateAuthenticatedContextAccessor(userId),
      invoiceId,
      request);

    Assert.AreEqual(StatusCodes.Status400BadRequest, GetStatusCode(result));
    service.VerifyAll();
  }

  /// <summary>Verifies product replacement composes Management get, delete, and add calls in order.</summary>
  [TestMethod]
  public async Task UpdateProductInInvoiceAsync_ValidReplacement_ComposesManagementCallsInOrder()
  {
    Guid invoiceId = Guid.NewGuid();
    Guid userId = Guid.NewGuid();
    StandardClassification classification = CreateClassification(
      ClassificationSystem.Gs1Gpc,
      "2026-05",
      "10000025",
      "Food or beverage products");
    var request = new UpdateProductRequestDto(
      OriginalProductName: "Old Milk",
      Name: "New Milk",
      ClassificationCode: classification.Code,
      Quantity: 2m,
      QuantityUnit: "pcs",
      ProductCode: string.Empty,
      Price: 9m,
      AllergenAssessment: null);
    var service = new Mock<IInvoiceManagementService>(MockBehavior.Strict);
    var persistedProduct = new Product
    {
      Name = "Old Milk",
      Classification = classification,
      Metadata = new ProductMetadata { IsComplete = true },
    };
    Product? addedProduct = null;
    var sequence = new MockSequence();
    service.InSequence(sequence)
      .Setup(candidate => candidate.GetProduct(
        invoiceId,
        userId,
        "Old Milk",
        It.IsAny<CancellationToken>()))
      .ReturnsAsync(persistedProduct);
    service.InSequence(sequence)
      .Setup(candidate => candidate.DeleteProduct(
        invoiceId,
        userId,
        "Old Milk",
        It.IsAny<CancellationToken>()))
      .Returns(Task.CompletedTask);
    service.InSequence(sequence)
      .Setup(candidate => candidate.AddProduct(
        invoiceId,
        userId,
        It.IsAny<Product>(),
        classification.Code,
        It.IsAny<CancellationToken>()))
      .Callback<Guid, Guid?, Product, string?, CancellationToken>(
        (_, _, product, _, _) => addedProduct = product)
      .Returns(Task.CompletedTask);

    IResult result = await InvoiceEndpoints.UpdateProductInInvoiceAsync(
      service.Object,
      CreateAuthenticatedContextAccessor(userId),
      invoiceId,
      request);

    Assert.AreEqual(StatusCodes.Status202Accepted, GetStatusCode(result));
    Assert.IsNotNull(addedProduct);
    Assert.AreEqual("New Milk", addedProduct.Name);
    Assert.AreEqual(2m, addedProduct.Quantity);
    Assert.AreSame(classification, addedProduct.Classification);
    Assert.IsTrue(addedProduct.Metadata.IsEdited);
    Assert.IsTrue(addedProduct.Metadata.IsComplete);
    service.VerifyAll();
  }
  #endregion

  #region Replacement classification preservation tests
  /// <summary>
  /// Verifies invoice PUT preserves an existing classification when no manual code is supplied.
  /// </summary>
  /// <remarks>
  /// <para>This test previously asserted the opposite — that the endpoint hands Processing an
  /// invoice with a null classification and lets "Processing merge semantics" restore it. No such
  /// merge exists for invoices: <c>InvoiceProcessingService.UpdateInvoice</c> only assigns
  /// <c>Classification</c> when a <c>ClassificationCode</c> is present, and persistence is a
  /// full-document Cosmos upsert. The omitted classification was therefore dropped, so renaming an
  /// invoice silently destroyed its analysis-derived classification, confidence and evidence.</para>
  /// <para>Merchants are unaffected because <c>MerchantStorageFoundationService.UpdateMerchantObject</c>
  /// copies client-editable fields onto the persisted entity field by field, leaving an unassigned
  /// classification intact.</para>
  /// </remarks>
  [TestMethod]
  public async Task UpdateSpecificInvoiceAsync_OmittedClassification_PreservesPersistedSelection()
  {
    Guid invoiceId = Guid.NewGuid();
    Guid userId = Guid.NewGuid();
    StandardClassification classification = CreateClassification(
      ClassificationSystem.EcoicopV2,
      "2",
      "01.1",
      "Food products");
    var invoice = new Invoice
    {
      id = invoiceId,
      UserIdentifier = userId,
      Classification = classification,
    };
    var request = new UpdateInvoiceRequestDto(
      Name: "Groceries",
      Description: "Weekly shop",
      ClassificationCode: null,
      PaymentInformation: new PaymentInformation(),
      MerchantReference: null,
      IsImportant: false,
      PossibleRecipes: null,
      AdditionalMetadata: null);
    var service = new Mock<IInvoiceManagementService>(MockBehavior.Strict);
    Invoice? capturedInvoice = null;
    service
      .Setup(candidate => candidate.ReadInvoice(
        invoiceId,
        userId,
        It.IsAny<CancellationToken>()))
      .ReturnsAsync(invoice);
    service
      .Setup(candidate => candidate.UpdateInvoice(
        invoiceId,
        userId,
        It.IsAny<Invoice>(),
        It.IsAny<CancellationToken>()))
      .Callback<Guid, Guid?, Invoice, CancellationToken>(
        (_, _, updated, _) => capturedInvoice = updated)
      .ReturnsAsync(invoice);

    IResult result = await InvoiceEndpoints.UpdateSpecificInvoiceAsync(
      service.Object,
      CreateAuthenticatedContextAccessor(userId),
      invoiceId,
      request);

    Assert.AreEqual(StatusCodes.Status202Accepted, GetStatusCode(result));
    Assert.IsNotNull(capturedInvoice);
    Assert.AreSame(classification, capturedInvoice.Classification);
  }

  /// <summary>Verifies merchant PUT preserves classification omission for Processing merge semantics.</summary>
  [TestMethod]
  public async Task UpdateSpecificMerchantAsync_OmittedClassification_LeavesSelectionUnset()
  {
    Guid merchantId = Guid.NewGuid();
    Guid parentCompanyId = Guid.NewGuid();
    StandardClassification classification = CreateClassification(
      ClassificationSystem.Nace21,
      "2.1",
      "47.11",
      "Retail sale in non-specialised stores");
    var merchant = new Merchant
    {
      id = merchantId,
      ParentCompanyId = parentCompanyId,
      Classification = classification,
    };
    var request = new UpdateMerchantRequestDto(
      Name: "Store",
      Description: "Description",
      ClassificationCode: null,
      Address: null,
      ParentCompanyId: parentCompanyId,
      AdditionalMetadata: null);
    var service = new Mock<IInvoiceManagementService>(MockBehavior.Strict);
    Merchant? capturedMerchant = null;
    service
      .Setup(candidate => candidate.ReadMerchant(
        merchantId,
        parentCompanyId: null,
        It.IsAny<CancellationToken>()))
      .ReturnsAsync(merchant);
    service
      .Setup(candidate => candidate.UpdateMerchant(
        merchantId,
        parentCompanyId,
        It.IsAny<Merchant>(),
        null,
        It.IsAny<CancellationToken>()))
      .Callback<Guid, Guid?, Merchant, string?, CancellationToken>(
        (_, _, updated, _, _) => capturedMerchant = updated)
      .ReturnsAsync(merchant);

    IResult result = await InvoiceEndpoints.UpdateSpecificMerchantAsync(
      service.Object,
      CreateAuthenticatedContextAccessor(),
      merchantId,
      request);

    Assert.AreEqual(StatusCodes.Status202Accepted, GetStatusCode(result));
    Assert.IsNotNull(capturedMerchant);
    Assert.IsNull(capturedMerchant.Classification);
  }

  private static StandardClassification CreateClassification(
    ClassificationSystem system,
    string version,
    string code,
    string label) =>
    new(
      system,
      version,
      code,
      label,
      [new ClassificationNode("leaf", code, label)],
      ClassificationOrigin.Manual,
      null,
      []);
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
  [TestMethod]
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
    Assert.IsNotNull(activity);

    var mockService = CreateServiceMockThatThrowsOnRead(new TestNotFoundException("invoice not found"));
    var accessor = CreateAuthenticatedContextAccessor();

    // Act
    var result = await InvoiceEndpoints
      .RetrieveSpecificInvoiceAsync(mockService.Object, accessor, Guid.NewGuid(), CancellationToken.None)
;

    // Assert
    Assert.AreEqual(StatusCodes.Status404NotFound, GetStatusCode(result));
    var problem = GetProblemDetails(result);

    Assert.IsTrue(
      problem.Extensions.TryGetValue("traceId", out var traceIdValue),
      "Expected 'traceId' extension on ProblemDetails when an Activity is active.");

    var expectedTraceId = Activity.Current!.TraceId.ToString();
    Assert.AreEqual(expectedTraceId, Assert.IsExactInstanceOfType<string>(traceIdValue));
  }
  #endregion
}
