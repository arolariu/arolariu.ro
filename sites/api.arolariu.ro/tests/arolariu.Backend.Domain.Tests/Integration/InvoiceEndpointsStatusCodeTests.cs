namespace arolariu.Backend.Domain.Tests.Integration;

using System;
using System.Collections.Generic;
using System.Diagnostics;
using System.Security.Claims;
using System.Threading;
using System.Threading.Tasks;

using arolariu.Backend.Common.Exceptions;
using arolariu.Backend.Common.Http;
using arolariu.Backend.Domain.Invoices.DDD.AggregatorRoots.Invoices;
using arolariu.Backend.Domain.Invoices.DDD.ValueObjects.Products;
using arolariu.Backend.Domain.Invoices.DDD.ValueObjects.Products.Exceptions;
using arolariu.Backend.Domain.Invoices.DTOs.Requests;
using arolariu.Backend.Domain.Invoices.Endpoints;
using arolariu.Backend.Domain.Invoices.Services.Processing;

using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Http.HttpResults;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.DependencyInjection;

using Moq;

using Microsoft.VisualStudio.TestTools.UnitTesting;

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

  private static HttpContextAccessor CreateContextAccessorWithUserIdentifierClaim(string? userIdentifierClaimValue)
  {
    var claims = new List<Claim>();

    if (userIdentifierClaimValue is not null)
    {
      claims.Add(new Claim("userIdentifier", userIdentifierClaimValue));
    }

    var httpContext = new DefaultHttpContext
    {
      User = new ClaimsPrincipal(new ClaimsIdentity(claims, authenticationType: "TestAuth")),
      RequestServices = new ServiceCollection().BuildServiceProvider(),
    };

    return new HttpContextAccessor { HttpContext = httpContext };
  }

  private static CreateInvoiceRequestDto CreateValidInvoiceRequest() => new(
    Name: "Creation contract test invoice",
    Description: string.Empty,
    Classification: null,
    PaymentInformation: null,
    MerchantReference: null,
    IsImportant: false,
    Scans:
    [
      new CreateInvoiceScanRequestDto(
        ScanType.JPG,
        new Uri("https://example.test/receipt.jpg"),
        Metadata: null),
    ],
    Items: null,
    Metadata: null);

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
    var problem = Assert.IsExactInstanceOfType<ProblemHttpResult>(result);
    return problem.ProblemDetails;
  }
  #endregion

  #region DELETE /rest/v1/invoices/{id}/products status code tests
  /// <summary>
  /// Verifies that a product deletion delegates one deterministic selector to processing and maps a typed not-found
  /// error to HTTP 404 without separately retrieving the product.
  /// </summary>
  [TestMethod]
  public async Task RemoveProductFromInvoiceAsync_WhenServiceThrowsProductNotFound_Returns404()
  {
    // Arrange
    var invoiceIdentifier = Guid.NewGuid();
    var mockService = new Mock<IInvoiceProcessingService>(MockBehavior.Strict);
    mockService
      .Setup(service => service.DeleteProduct(
        It.Is<ProductUpdateSelector>(selector =>
          selector.OriginalName == "Missing product"
          && selector.OriginalQuantity == 1m
          && selector.OriginalUnitPrice == 1m
          && selector.OriginalTotalPrice == 1m
          && selector.OccurrenceOrdinal == 0),
        invoiceIdentifier,
        It.IsAny<Guid?>(),
        It.IsAny<CancellationToken>()))
      .ThrowsAsync(new ProductNotFoundException(invoiceIdentifier));
    var accessor = CreateAuthenticatedContextAccessor();
    var request = new DeleteProductRequestDto(
      Selector: new ProductUpdateSelectorDto(
        OriginalProductCode: null,
        OriginalName: "Missing product",
        OriginalQuantity: 1m,
        OriginalUnitPrice: 1m,
        OriginalTotalPrice: 1m,
        OccurrenceOrdinal: 0));

    // Act
    IResult result = await InvoiceEndpoints
      .RemoveProductFromInvoiceAsync(mockService.Object, accessor, invoiceIdentifier, request)
      .ConfigureAwait(false);

    // Assert
    Assert.AreEqual(StatusCodes.Status404NotFound, GetStatusCode(result));
    Assert.AreEqual(ProblemTypeUris.NotFound, GetProblemDetails(result).Type);
    mockService.Verify(
      service => service.DeleteProduct(
        It.IsAny<ProductUpdateSelector>(),
        invoiceIdentifier,
        It.IsAny<Guid?>(),
        It.IsAny<CancellationToken>()),
      Times.Once);
  }

  /// <summary>
  /// Verifies that an out-of-range product deletion selector maps to HTTP 400.
  /// </summary>
  [TestMethod]
  public async Task RemoveProductFromInvoiceAsync_WhenServiceThrowsOccurrenceOutOfRange_Returns400()
  {
    // Arrange
    var invoiceIdentifier = Guid.NewGuid();
    var mockService = new Mock<IInvoiceProcessingService>(MockBehavior.Strict);
    mockService
      .Setup(service => service.DeleteProduct(
        It.IsAny<ProductUpdateSelector>(),
        invoiceIdentifier,
        It.IsAny<Guid?>(),
        It.IsAny<CancellationToken>()))
      .ThrowsAsync(
        new ProductUpdateSelectorOccurrenceOutOfRangeException(
          invoiceIdentifier,
          occurrenceOrdinal: 2,
          matchingProductCount: 2));
    var accessor = CreateAuthenticatedContextAccessor();
    var request = new DeleteProductRequestDto(
      Selector: new ProductUpdateSelectorDto(
        OriginalProductCode: "duplicate-code",
        OriginalName: null,
        OriginalQuantity: null,
        OriginalUnitPrice: null,
        OriginalTotalPrice: null,
        OccurrenceOrdinal: 2));

    // Act
    IResult result = await InvoiceEndpoints
      .RemoveProductFromInvoiceAsync(mockService.Object, accessor, invoiceIdentifier, request)
      .ConfigureAwait(false);

    // Assert
    Assert.AreEqual(StatusCodes.Status400BadRequest, GetStatusCode(result));
    Assert.AreEqual(ProblemTypeUris.Validation, GetProblemDetails(result).Type);
  }

  /// <summary>
  /// Verifies that an omitted deletion selector maps to HTTP 400 before processing is invoked.
  /// </summary>
  [TestMethod]
  public async Task RemoveProductFromInvoiceAsync_WhenSelectorIsMissing_Returns400()
  {
    // Arrange
    var mockService = new Mock<IInvoiceProcessingService>(MockBehavior.Strict);
    var accessor = CreateAuthenticatedContextAccessor();
    var request = new DeleteProductRequestDto(Selector: null);

    // Act
    IResult result = await InvoiceEndpoints
      .RemoveProductFromInvoiceAsync(mockService.Object, accessor, Guid.NewGuid(), request)
      .ConfigureAwait(false);

    // Assert
    Assert.AreEqual(StatusCodes.Status400BadRequest, GetStatusCode(result));
    Assert.AreEqual(ProblemTypeUris.Validation, GetProblemDetails(result).Type);
    mockService.VerifyNoOtherCalls();
  }

  #endregion

  #region PUT /rest/v1/invoices/{id}/products status code tests
  /// <summary>
  /// Verifies that an unmatched product update reaches the endpoint as a typed 404 response and does not require
  /// the endpoint to separately load, delete, and append invoice products.
  /// </summary>
  [TestMethod]
  public async Task UpdateProductInInvoiceAsync_WhenServiceThrowsProductNotFound_Returns404()
  {
    // Arrange
    var invoiceIdentifier = Guid.NewGuid();
    var mockService = new Mock<IInvoiceProcessingService>(MockBehavior.Strict);
    mockService
      .Setup(service => service.UpdateProduct(
        It.Is<ProductUpdateSelector>(selector =>
          selector.OriginalName == "Missing product"
          && selector.OriginalQuantity == 1m
          && selector.OriginalUnitPrice == 1m
          && selector.OriginalTotalPrice == 1m),
        It.IsAny<Product>(),
        invoiceIdentifier,
        It.IsAny<Guid?>(),
        It.IsAny<CancellationToken>()))
      .ThrowsAsync(new ProductNotFoundException(invoiceIdentifier));
    var accessor = CreateAuthenticatedContextAccessor();
    var request = new UpdateProductRequestDto(
      Selector: new ProductUpdateSelectorDto(
        OriginalProductCode: null,
        OriginalName: "Missing product",
        OriginalQuantity: 1m,
        OriginalUnitPrice: 1m,
        OriginalTotalPrice: 1m,
        OccurrenceOrdinal: null),
      Name: "Replacement",
      Classification: null,
      Quantity: 1,
      QuantityUnit: "pcs",
      ProductCode: null,
      Price: 1m);

    // Act
    IResult result = await InvoiceEndpoints
      .UpdateProductInInvoiceAsync(mockService.Object, accessor, invoiceIdentifier, request)
      .ConfigureAwait(false);

    // Assert
    Assert.AreEqual(StatusCodes.Status404NotFound, GetStatusCode(result));
    Assert.AreEqual(ProblemTypeUris.NotFound, GetProblemDetails(result).Type);
    mockService.Verify(
      service => service.UpdateProduct(
        It.IsAny<ProductUpdateSelector>(),
        It.IsAny<Product>(),
        invoiceIdentifier,
        It.IsAny<Guid?>(),
        It.IsAny<CancellationToken>()),
      Times.Once);
  }

  /// <summary>
  /// Verifies that an ambiguous identity-free product selector reaches clients as a typed validation response.
  /// </summary>
  [TestMethod]
  public async Task UpdateProductInInvoiceAsync_WhenServiceThrowsAmbiguousSelector_Returns400()
  {
    // Arrange
    var invoiceIdentifier = Guid.NewGuid();
    var mockService = new Mock<IInvoiceProcessingService>(MockBehavior.Strict);
    mockService
      .Setup(service => service.UpdateProduct(
        It.IsAny<ProductUpdateSelector>(),
        It.IsAny<Product>(),
        invoiceIdentifier,
        It.IsAny<Guid?>(),
        It.IsAny<CancellationToken>()))
      .ThrowsAsync(new ProductUpdateSelectorAmbiguousException(invoiceIdentifier, matchingProductCount: 2));
    var accessor = CreateAuthenticatedContextAccessor();
    var request = new UpdateProductRequestDto(
      Selector: new ProductUpdateSelectorDto(
        OriginalProductCode: null,
        OriginalName: "Duplicate product",
        OriginalQuantity: 1m,
        OriginalUnitPrice: 1m,
        OriginalTotalPrice: 1m,
        OccurrenceOrdinal: null),
      Name: "Replacement",
      Classification: null,
      Quantity: 1m,
      QuantityUnit: "pcs",
      ProductCode: null,
      Price: 1m);

    // Act
    IResult result = await InvoiceEndpoints
      .UpdateProductInInvoiceAsync(mockService.Object, accessor, invoiceIdentifier, request)
      .ConfigureAwait(false);

    // Assert
    Assert.AreEqual(StatusCodes.Status400BadRequest, GetStatusCode(result));
    Assert.AreEqual(ProblemTypeUris.Validation, GetProblemDetails(result).Type);
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
  /// Verifies that the endpoint rejects a request without an authenticated owner claim before invoking processing.
  /// </summary>
  [TestMethod]
  public async Task CreateNewInvoiceAsync_WhenOwnerClaimIsMissing_Returns400ValidationProblem()
  {
    // Arrange
    var mockService = new Mock<IInvoiceProcessingService>(MockBehavior.Strict);
    var accessor = CreateContextAccessorWithUserIdentifierClaim(userIdentifierClaimValue: null);

    // Act
    var result = await InvoiceEndpoints
      .CreateNewInvoiceAsync(mockService.Object, accessor, CreateValidInvoiceRequest())
;

    // Assert
    Assert.AreEqual(StatusCodes.Status400BadRequest, GetStatusCode(result));
    mockService.VerifyNoOtherCalls();
  }

  /// <summary>
  /// Verifies that malformed owner claims cannot select an invoice partition or enter the processing layer.
  /// </summary>
  [TestMethod]
  public async Task CreateNewInvoiceAsync_WhenOwnerClaimIsInvalid_Returns400ValidationProblem()
  {
    // Arrange
    var mockService = new Mock<IInvoiceProcessingService>(MockBehavior.Strict);
    var accessor = CreateContextAccessorWithUserIdentifierClaim("not-a-guid");

    // Act
    var result = await InvoiceEndpoints
      .CreateNewInvoiceAsync(mockService.Object, accessor, CreateValidInvoiceRequest())
;

    // Assert
    Assert.AreEqual(StatusCodes.Status400BadRequest, GetStatusCode(result));
    mockService.VerifyNoOtherCalls();
  }

  /// <summary>
  /// Verifies the authenticated claim owner, not request content, is persisted and used as the create partition.
  /// </summary>
  [TestMethod]
  public async Task CreateNewInvoiceAsync_WhenOwnerClaimIsValid_PersistsClaimOwnerAndPartition()
  {
    // Arrange
    Guid ownerIdentifier = Guid.NewGuid();
    Invoice? persistedInvoice = null;
    Guid? persistedPartitionIdentifier = null;
    var mockService = new Mock<IInvoiceProcessingService>(MockBehavior.Strict);
    mockService
      .Setup(service => service.CreateInvoice(
        It.IsAny<Invoice>(),
        ownerIdentifier,
        It.IsAny<CancellationToken>()))
      .Callback<Invoice, Guid?, CancellationToken>((invoice, partitionIdentifier, _) =>
      {
        persistedInvoice = invoice;
        persistedPartitionIdentifier = partitionIdentifier;
      })
      .Returns(Task.CompletedTask);

    // Act
    var result = await InvoiceEndpoints
      .CreateNewInvoiceAsync(
        mockService.Object,
        CreateAuthenticatedContextAccessor(ownerIdentifier),
        CreateValidInvoiceRequest())
;

    // Assert
    Assert.AreEqual(StatusCodes.Status201Created, GetStatusCode(result));
    Assert.IsNotNull(persistedInvoice);
    Assert.AreEqual(ownerIdentifier, persistedInvoice.UserIdentifier);
    Assert.AreEqual(ownerIdentifier, persistedInvoice.CreatedBy);
    Assert.AreEqual(ownerIdentifier, persistedPartitionIdentifier);
    mockService.Verify(
      service => service.CreateInvoice(
        It.Is<Invoice>(invoice => invoice.UserIdentifier == ownerIdentifier),
        ownerIdentifier,
        It.IsAny<CancellationToken>()),
      Times.Once);
  }

  /// <summary>
  /// Verifies the scan-attach boundary rejects HEIC's undocumented numeric value before it reads or updates an invoice.
  /// </summary>
  [TestMethod]
  public async Task CreateInvoiceScanAsync_WhenScanTypeIsUnsupported_Returns400ValidationProblem()
  {
    // Arrange
    var mockService = new Mock<IInvoiceProcessingService>(MockBehavior.Strict);
    var accessor = CreateAuthenticatedContextAccessor();
    var request = new CreateInvoiceScanRequestDto(
      Type: (ScanType)9,
      Location: new Uri("https://example.test/receipt.heic"),
      Metadata: null);

    // Act
    var result = await InvoiceEndpoints
      .CreateInvoiceScanAsync(mockService.Object, accessor, Guid.NewGuid(), request)
;

    // Assert
    Assert.AreEqual(StatusCodes.Status400BadRequest, GetStatusCode(result));
    mockService.VerifyNoOtherCalls();
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
