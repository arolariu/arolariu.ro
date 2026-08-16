namespace arolariu.Backend.Domain.Tests.Integration;

using System;
using System.Collections.Generic;
using System.Security.Claims;
using System.Threading;
using System.Threading.Tasks;

using arolariu.Backend.Common.Http;
using arolariu.Backend.Domain.Invoices.Endpoints;
using arolariu.Backend.Domain.Invoices.Services.Processing;

using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Http.Timeouts;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;

using Moq;

using Microsoft.VisualStudio.TestTools.UnitTesting;

/// <summary>
/// Asserts that a cancelled request produces the correct HTTP outcome at the endpoint boundary:
/// a client disconnect is not a server fault, and only a genuine timeout yields 504.
/// </summary>
[TestClass]
public sealed class EndpointCancellationTests
{
  // ---------------------------------------------------------------------------
  // Helpers
  // ---------------------------------------------------------------------------

  private sealed class StubTimeoutFeature : IHttpRequestTimeoutFeature, IDisposable
  {
    private readonly CancellationTokenSource _cts;

    /// <summary>Initialises a stub whose <see cref="RequestTimeoutToken"/> is already cancelled.</summary>
    public StubTimeoutFeature()
    {
      _cts = new CancellationTokenSource();
      _cts.Cancel();
    }

    /// <inheritdoc/>
    public CancellationToken RequestTimeoutToken => _cts.Token;

    /// <inheritdoc/>
    public void DisableTimeout() { }

    /// <inheritdoc/>
    public void Dispose() => _cts.Dispose();
  }

  private static HttpContextAccessor CreateAuthenticatedContextAccessor(DefaultHttpContext? ctx = null)
  {
    var context = ctx ?? new DefaultHttpContext();
    context.RequestServices = new ServiceCollection().BuildServiceProvider();
    var claims = new List<Claim>
    {
      new Claim("userIdentifier", Guid.NewGuid().ToString()),
    };
    var identity = new ClaimsIdentity(claims, authenticationType: "TestAuth");
    context.User = new ClaimsPrincipal(identity);
    return new HttpContextAccessor { HttpContext = context };
  }

  // ---------------------------------------------------------------------------
  // Tests
  // ---------------------------------------------------------------------------

  /// <summary>
  /// A stub <see cref="IHostApplicationLifetime"/> whose <see cref="ApplicationStopping"/> token is
  /// already cancelled, simulating a write that begins while the host is shutting down.
  /// </summary>
  private sealed class StoppingLifetime : IHostApplicationLifetime, IDisposable
  {
    private readonly CancellationTokenSource stopping;

    public StoppingLifetime()
    {
      stopping = new CancellationTokenSource();
      stopping.Cancel();
    }

    /// <inheritdoc/>
    public CancellationToken ApplicationStarted => CancellationToken.None;

    /// <inheritdoc/>
    public CancellationToken ApplicationStopping => stopping.Token;

    /// <inheritdoc/>
    public CancellationToken ApplicationStopped => CancellationToken.None;

    /// <inheritdoc/>
    public void StopApplication() { }

    /// <inheritdoc/>
    public void Dispose() => stopping.Dispose();
  }

  /// <summary>
  /// Verifies the write-scope arm of the timeout discrimination: when the write scope itself is
  /// cancelled (here by application shutdown) while NO request-timeout feature is present, the
  /// endpoint must still answer 504 rather than 499.
  /// </summary>
  /// <remarks>
  /// This is the <c>writeScope.IsCancellationRequested</c> disjunct of <c>HandleCancellation</c>,
  /// which the client-disconnect and middleware-timeout tests do not reach. It is the reason the
  /// write tier exists: a write must not be reported as a client abort when the server is the one
  /// that gave up on it.
  /// </remarks>
  [TestMethod]
  public async Task DeleteInvoicesAsync_WhenWriteScopeCancelled_Returns504NotClientClosed()
  {
    var processing = new Mock<IInvoiceProcessingService>();
    processing
      .Setup(p => p.DeleteInvoices(It.IsAny<Guid>(), It.IsAny<CancellationToken>()))
      .ThrowsAsync(new OperationCanceledException());

    // ForWrite links IHostApplicationLifetime.ApplicationStopping, so an already-stopping host
    // yields a scope that is cancelled from the moment it is created.
    using var lifetime = new StoppingLifetime();
    var services = new ServiceCollection();
    services.AddSingleton<IHostApplicationLifetime>(lifetime);

    var context = new DefaultHttpContext { RequestServices = services.BuildServiceProvider() };
    var claims = new List<Claim> { new Claim("userIdentifier", Guid.NewGuid().ToString()) };
    context.User = new ClaimsPrincipal(new ClaimsIdentity(claims, authenticationType: "TestAuth"));
    var accessor = new HttpContextAccessor { HttpContext = context };

    // Deliberately NO IHttpRequestTimeoutFeature — so WasTimeout() is false and only the write
    // scope can drive the 504. If the write-scope arm regressed, this would return 499.
    var result = await InvoiceEndpoints
      .DeleteInvoicesAsync(processing.Object, accessor)
      .ConfigureAwait(true);

    var statusResult = Assert.IsInstanceOfType<IStatusCodeHttpResult>(result);
    Assert.AreEqual(StatusCodes.Status504GatewayTimeout, statusResult.StatusCode);
  }

  /// <summary>
  /// Verifies that when the processing service throws <see cref="OperationCanceledException"/>
  /// and no <c>IHttpRequestTimeoutFeature</c> is present (i.e. the client disconnected),
  /// the endpoint returns 499 and not a 5xx error.
  /// </summary>
  [TestMethod]
  public async Task RetrieveAllInvoicesAsync_WhenClientDisconnects_DoesNotReturnServerError()
  {
    var processing = new Mock<IInvoiceProcessingService>();
    processing
      .Setup(p => p.ReadInvoices(It.IsAny<Guid>(), It.IsAny<CancellationToken>()))
      .ThrowsAsync(new OperationCanceledException());

    var context = new DefaultHttpContext();
    var accessor = new HttpContextAccessor { HttpContext = context };

    var result = await InvoiceEndpoints
      .RetrieveAllInvoicesAsync(processing.Object, accessor, CancellationToken.None)
      .ConfigureAwait(true);

    // No IHttpRequestTimeoutFeature is present, so this is a client abort — never 500/503.
    var statusResult = Assert.IsInstanceOfType<IStatusCodeHttpResult>(result);
    Assert.AreEqual(StatusCodes.Status499ClientClosedRequest, statusResult.StatusCode);
  }

  /// <summary>
  /// Verifies that when the processing service throws <see cref="OperationCanceledException"/>
  /// and a <c>IHttpRequestTimeoutFeature</c> with a cancelled token is installed on the context,
  /// <see cref="InvoiceEndpoints.RetrieveAllInvoicesAsync"/> returns 504 Gateway Timeout —
  /// not 499 or any 5xx server fault.
  /// </summary>
  [TestMethod]
  public async Task RetrieveAllInvoicesAsync_WhenRequestTimesOut_Returns504()
  {
    var processing = new Mock<IInvoiceProcessingService>();
    processing
      .Setup(p => p.ReadInvoices(It.IsAny<Guid>(), It.IsAny<CancellationToken>()))
      .ThrowsAsync(new OperationCanceledException());

    using var timeoutFeature = new StubTimeoutFeature();
    var context = new DefaultHttpContext();
    context.Features.Set<IHttpRequestTimeoutFeature>(timeoutFeature);
    var accessor = new HttpContextAccessor { HttpContext = context };

    var result = await InvoiceEndpoints
      .RetrieveAllInvoicesAsync(processing.Object, accessor, CancellationToken.None)
      .ConfigureAwait(true);

    // IHttpRequestTimeoutFeature is present with a cancelled token → this is a server timeout.
    var statusResult = Assert.IsInstanceOfType<IStatusCodeHttpResult>(result);
    Assert.AreEqual(StatusCodes.Status504GatewayTimeout, statusResult.StatusCode);
  }

  /// <summary>
  /// Verifies that when the processing service throws <see cref="OperationCanceledException"/>
  /// on the first <c>ReadInvoice</c> call and no timeout feature is installed,
  /// <see cref="InvoiceEndpoints.RetrieveSpecificInvoiceAsync"/> returns 499 (client disconnect)
  /// rather than a 5xx server fault.
  /// </summary>
  [TestMethod]
  public async Task RetrieveSpecificInvoiceAsync_WhenClientDisconnects_Returns499()
  {
    var processing = new Mock<IInvoiceProcessingService>();
    processing
      .Setup(p => p.ReadInvoice(It.IsAny<Guid>(), It.IsAny<Guid?>(), It.IsAny<CancellationToken>()))
      .ThrowsAsync(new OperationCanceledException());

    // No IHttpRequestTimeoutFeature → client disconnect path.
    var accessor = CreateAuthenticatedContextAccessor();

    var result = await InvoiceEndpoints
      .RetrieveSpecificInvoiceAsync(processing.Object, accessor, Guid.NewGuid(), CancellationToken.None)
      .ConfigureAwait(true);

    var statusResult = Assert.IsInstanceOfType<IStatusCodeHttpResult>(result);
    Assert.AreEqual(StatusCodes.Status499ClientClosedRequest, statusResult.StatusCode);
  }

  /// <summary>
  /// Verifies that when the processing service throws <see cref="OperationCanceledException"/>
  /// and no <c>IHttpRequestTimeoutFeature</c> is present (client disconnected),
  /// <see cref="InvoiceEndpoints.CreateNewInvoiceAsync"/> returns 499.
  /// </summary>
  [TestMethod]
  public async Task CreateNewInvoiceAsync_WhenClientDisconnects_Returns499()
  {
    var processing = new Mock<IInvoiceProcessingService>();
    processing
      .Setup(p => p.CreateInvoice(
        It.IsAny<arolariu.Backend.Domain.Invoices.DDD.AggregatorRoots.Invoices.Invoice>(),
        It.IsAny<Guid?>(),
        It.IsAny<CancellationToken>()))
      .ThrowsAsync(new OperationCanceledException());

    var invoiceDto = new arolariu.Backend.Domain.Invoices.DTOs.Requests.CreateInvoiceRequestDto(
      UserIdentifier: Guid.NewGuid(),
      InitialScan: new arolariu.Backend.Domain.Invoices.DDD.AggregatorRoots.Invoices.InvoiceScan(
        arolariu.Backend.Domain.Invoices.DDD.AggregatorRoots.Invoices.ScanType.JPG,
        new Uri("https://example.com/invoice.jpg"),
        null),
      Metadata: null);

    // No IHttpRequestTimeoutFeature → client disconnect path.
    var accessor = CreateAuthenticatedContextAccessor();

    var result = await InvoiceEndpoints
      .CreateNewInvoiceAsync(processing.Object, accessor, invoiceDto)
      .ConfigureAwait(true);

    var statusResult = Assert.IsInstanceOfType<IStatusCodeHttpResult>(result);
    Assert.AreEqual(StatusCodes.Status499ClientClosedRequest, statusResult.StatusCode);
  }

  /// <summary>
  /// Verifies that when the processing service throws <see cref="OperationCanceledException"/>
  /// and a cancelled <c>IHttpRequestTimeoutFeature</c> is installed,
  /// <see cref="InvoiceEndpoints.CreateNewInvoiceAsync"/> returns 504 Gateway Timeout.
  /// </summary>
  [TestMethod]
  public async Task CreateNewInvoiceAsync_WhenRequestTimesOut_Returns504()
  {
    var processing = new Mock<IInvoiceProcessingService>();
    processing
      .Setup(p => p.CreateInvoice(
        It.IsAny<arolariu.Backend.Domain.Invoices.DDD.AggregatorRoots.Invoices.Invoice>(),
        It.IsAny<Guid?>(),
        It.IsAny<CancellationToken>()))
      .ThrowsAsync(new OperationCanceledException());

    var invoiceDto = new arolariu.Backend.Domain.Invoices.DTOs.Requests.CreateInvoiceRequestDto(
      UserIdentifier: Guid.NewGuid(),
      InitialScan: new arolariu.Backend.Domain.Invoices.DDD.AggregatorRoots.Invoices.InvoiceScan(
        arolariu.Backend.Domain.Invoices.DDD.AggregatorRoots.Invoices.ScanType.JPG,
        new Uri("https://example.com/invoice.jpg"),
        null),
      Metadata: null);

    using var timeoutFeature = new StubTimeoutFeature();
    var context = new DefaultHttpContext();
    context.RequestServices = new ServiceCollection().BuildServiceProvider();
    context.Features.Set<IHttpRequestTimeoutFeature>(timeoutFeature);
    var accessor = new HttpContextAccessor { HttpContext = context };

    var result = await InvoiceEndpoints
      .CreateNewInvoiceAsync(processing.Object, accessor, invoiceDto)
      .ConfigureAwait(true);

    // IHttpRequestTimeoutFeature present with cancelled token → server timeout.
    var statusResult = Assert.IsInstanceOfType<IStatusCodeHttpResult>(result);
    Assert.AreEqual(StatusCodes.Status504GatewayTimeout, statusResult.StatusCode);
  }
}
