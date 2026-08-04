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

using Moq;

using Xunit;

/// <summary>
/// Asserts that a cancelled request produces the correct HTTP outcome at the endpoint boundary:
/// a client disconnect is not a server fault, and only a genuine timeout yields 504.
/// </summary>
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
  /// Verifies that when the processing service throws <see cref="OperationCanceledException"/>
  /// and no <c>IHttpRequestTimeoutFeature</c> is present (i.e. the client disconnected),
  /// the endpoint returns 499 and not a 5xx error.
  /// </summary>
  [Fact]
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
    var statusResult = Assert.IsAssignableFrom<IStatusCodeHttpResult>(result);
    Assert.Equal(RequestCancellation.ClientClosedRequest, statusResult.StatusCode);
  }

  /// <summary>
  /// Verifies that when the processing service throws <see cref="OperationCanceledException"/>
  /// and a <c>IHttpRequestTimeoutFeature</c> with a cancelled token is installed on the context,
  /// <see cref="InvoiceEndpoints.RetrieveAllInvoicesAsync"/> returns 504 Gateway Timeout —
  /// not 499 or any 5xx server fault.
  /// </summary>
  [Fact]
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
    var statusResult = Assert.IsAssignableFrom<IStatusCodeHttpResult>(result);
    Assert.Equal(StatusCodes.Status504GatewayTimeout, statusResult.StatusCode);
  }

  /// <summary>
  /// Verifies that when the processing service throws <see cref="OperationCanceledException"/>
  /// on the first <c>ReadInvoice</c> call and no timeout feature is installed,
  /// <see cref="InvoiceEndpoints.RetrieveSpecificInvoiceAsync"/> returns 499 (client disconnect)
  /// rather than a 5xx server fault.
  /// </summary>
  [Fact]
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

    var statusResult = Assert.IsAssignableFrom<IStatusCodeHttpResult>(result);
    Assert.Equal(RequestCancellation.ClientClosedRequest, statusResult.StatusCode);
  }
}
