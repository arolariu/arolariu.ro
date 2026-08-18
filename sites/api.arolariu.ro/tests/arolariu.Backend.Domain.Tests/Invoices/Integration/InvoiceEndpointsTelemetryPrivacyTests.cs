namespace arolariu.Backend.Domain.Tests.Invoices.Integration;

using System;
using System.Threading;
using System.Threading.Tasks;

using arolariu.Backend.Common.Options;
using arolariu.Backend.Domain.Invoices.DDD.AggregatorRoots.Invoices;
using arolariu.Backend.Domain.Invoices.DTOs.Requests;
using arolariu.Backend.Domain.Invoices.Endpoints;
using arolariu.Backend.Domain.Invoices.Services.Processing;
using arolariu.Backend.Domain.Tests.Invoices.Helpers;

using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;
using Microsoft.VisualStudio.TestTools.UnitTesting;

using Moq;

/// <summary>
/// Verifies endpoint telemetry cannot export scan credentials or customer-controlled product and merchant names.
/// </summary>
[TestClass]
[DoNotParallelize]
public sealed class InvoiceEndpointsTelemetryPrivacyTests
{
  /// <summary>
  /// Verifies scan, product, and merchant sentinels do not appear in activity tags, events, statuses, or logs.
  /// </summary>
  [TestMethod]
  public async Task EndpointHandlers_SensitiveScanProductAndMerchantInputs_ExcludeSentinelsFromTelemetry()
  {
    // Arrange
    const string scanSasSentinel =
      "https://invoiceuploads.blob.core.windows.net/invoice-scans/receipt.jpg?sv=2026-08-06&sig=FAKE-SAS-SENTINEL";
    const string productNameSentinel = "PRIVATE-PRODUCT-SENTINEL";
    const string merchantNameSentinel = "PRIVATE-MERCHANT-SENTINEL";

    Guid ownerIdentifier = Guid.CreateVersion7();
    var invoice = new Invoice
    {
      id = Guid.CreateVersion7(),
      UserIdentifier = ownerIdentifier,
    };
    var service = new Mock<IInvoiceProcessingService>(MockBehavior.Strict);
    service
      .Setup(processing => processing.ReadInvoice(invoice.id, ownerIdentifier, It.IsAny<CancellationToken>()))
      .ReturnsAsync(invoice);
    service
      .Setup(processing => processing.AddProduct(
        It.IsAny<arolariu.Backend.Domain.Invoices.DDD.ValueObjects.Products.Product>(),
        invoice.id,
        ownerIdentifier,
        It.IsAny<CancellationToken>()))
      .Returns(Task.CompletedTask);
    service
      .Setup(processing => processing.UpdateInvoice(
        invoice,
        invoice.id,
        ownerIdentifier,
        It.IsAny<CancellationToken>()))
      .ReturnsAsync(invoice);
    service
      .Setup(processing => processing.CreateMerchant(
        It.IsAny<arolariu.Backend.Domain.Invoices.DDD.Entities.Merchants.Merchant>(),
        null,
        It.IsAny<CancellationToken>()))
      .Returns(Task.CompletedTask);

    var contextAccessor = new HttpContextAccessor
    {
      HttpContext = CreateAuthenticatedHttpContext(ownerIdentifier),
    };
    IOptionsManager optionsManager = new TelemetryStorageOptionsManager();
    using var capture = new AnalysisTelemetryPrivacyCapture();
    using ILoggerFactory loggerFactory = LoggerFactory.Create(builder => builder.AddProvider(capture));
    using var activities = new InvoiceActivityRecorder();

    // Act
    _ = await InvoiceEndpoints.AddProductToInvoiceAsync(
      service.Object,
      contextAccessor,
      invoice.id,
      new CreateProductRequestDto(productNameSentinel, null, 1m, null, null, 1m)).ConfigureAwait(false);
    _ = await InvoiceEndpoints.CreateNewMerchantAsync(
      service.Object,
      contextAccessor,
      new CreateMerchantRequestDto(merchantNameSentinel, string.Empty, string.Empty, Guid.Empty)).ConfigureAwait(false);
    _ = await InvoiceEndpoints.CreateInvoiceScanAsync(
      service.Object,
      optionsManager,
      contextAccessor,
      invoice.id,
      new CreateInvoiceScanRequestDto(ScanType.JPG, new Uri(scanSasSentinel), Metadata: null)).ConfigureAwait(false);

    // Assert
    capture.AssertSurfaceExcludes(activities, scanSasSentinel);
    capture.AssertSurfaceExcludes(activities, productNameSentinel);
    capture.AssertSurfaceExcludes(activities, merchantNameSentinel);
  }

  private static DefaultHttpContext CreateAuthenticatedHttpContext(Guid ownerIdentifier)
  {
    var context = new DefaultHttpContext
    {
      RequestServices = new ServiceCollection().BuildServiceProvider(),
    };
    context.User = new System.Security.Claims.ClaimsPrincipal(
      new System.Security.Claims.ClaimsIdentity(
        [new System.Security.Claims.Claim("userIdentifier", ownerIdentifier.ToString())],
        authenticationType: "TestAuthentication"));
    return context;
  }

  private sealed class TelemetryStorageOptionsManager : IOptionsManager
  {
    public ApplicationOptions GetApplicationOptions() =>
      new LocalOptions
      {
        StorageAccountName = "invoiceuploads",
        StorageAccountEndpoint = "https://invoiceuploads.blob.core.windows.net/invoice-scans",
      };
  }
}
