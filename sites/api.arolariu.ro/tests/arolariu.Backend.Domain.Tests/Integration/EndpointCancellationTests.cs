namespace arolariu.Backend.Domain.Tests.Integration;

using System;
using System.Threading;
using System.Threading.Tasks;

using arolariu.Backend.Common.Http;
using arolariu.Backend.Domain.Invoices.Endpoints;
using arolariu.Backend.Domain.Invoices.Services.Processing;

using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Http.HttpResults;

using Moq;

using Xunit;

/// <summary>
/// Asserts that a cancelled request produces the correct HTTP outcome at the endpoint boundary:
/// a client disconnect is not a server fault, and only a genuine timeout yields 504.
/// </summary>
public sealed class EndpointCancellationTests
{
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
}
