namespace arolariu.Backend.Domain.Tests.Invoices.Services.Foundation;

using System;
using System.Threading;
using System.Threading.Tasks;

using arolariu.Backend.Common.Options;
using arolariu.Backend.Domain.Invoices.Brokers.BlobStorageBroker;
using arolariu.Backend.Domain.Invoices.Brokers.DocumentIntelligenceBroker;
using arolariu.Backend.Domain.Invoices.DDD.AggregatorRoots.Invoices;
using arolariu.Backend.Domain.Invoices.DDD.Analysis.Exceptions.Outer.Foundation;
using arolariu.Backend.Domain.Invoices.DDD.AggregatorRoots.Invoices.Exceptions.Outer.Foundation;
using arolariu.Backend.Domain.Invoices.DDD.AggregatorRoots.Invoices.Exceptions.Outer.Orchestration;
using arolariu.Backend.Domain.Invoices.Services.Foundation.DocumentAnalysis;
using arolariu.Backend.Domain.Invoices.Services.Foundation.InvoiceStorage;
using arolariu.Backend.Domain.Invoices.Services.Orchestration.InvoiceService;
using arolariu.Backend.Domain.Tests.Invoices.Helpers;

using Microsoft.Extensions.Logging.Abstractions;
using Microsoft.VisualStudio.TestTools.UnitTesting;

using Moq;

/// <summary>
/// Verifies backend-authoritative Blob Storage inspection for invoice scan size and type boundaries.
/// </summary>
[TestClass]
public sealed class InvoiceScanStorageFoundationServiceTests
{
  /// <summary>
  /// Verifies an oversized approved blob is rejected with a typed validation error after one property lookup.
  /// </summary>
  [TestMethod]
  public async Task ValidateInvoiceScanAsync_OversizedBlob_ThrowsFoundationValidationException()
  {
    // Arrange
    Uri location = new("https://invoiceuploads.blob.core.windows.net/invoices/receipt.jpg");
    var blobBroker = new Mock<IInvoiceBlobStorageBroker>(MockBehavior.Strict);
    blobBroker
      .Setup(broker => broker.GetPropertiesAsync("receipt.jpg", It.IsAny<CancellationToken>()))
      .ReturnsAsync(new InvoiceScanBlobProperties((10L * 1024L * 1024L) + 1L, true, "image/jpeg"));
    var service = new InvoiceScanStorageFoundationService(
      blobBroker.Object,
      new ScanStorageOptionsManager(),
      NullLoggerFactory.Instance);
    var scan = new InvoiceScan(ScanType.JPG, location, Metadata: null);

    // Act + Assert
    await Assert.ThrowsExactlyAsync<InvoiceFoundationValidationException>(
      () => service.ValidateInvoiceScanAsync(scan, CancellationToken.None)).ConfigureAwait(false);
    blobBroker.Verify(broker => broker.GetPropertiesAsync("receipt.jpg", It.IsAny<CancellationToken>()), Times.Once);
  }

  /// <summary>
  /// Verifies an oversized scan never invokes Document Intelligence after backend property validation.
  /// </summary>
  [TestMethod]
  public async Task ExtractInvoiceAsync_OversizedBlob_DoesNotInvokeDocumentIntelligence()
  {
    // Arrange
    Uri location = new("https://invoiceuploads.blob.core.windows.net/invoices/receipt.jpg");
    var documentBroker = new Mock<IDocumentIntelligenceBroker>(MockBehavior.Strict);
    var blobBroker = new Mock<IInvoiceBlobStorageBroker>(MockBehavior.Strict);
    blobBroker
      .Setup(broker => broker.GetPropertiesAsync("receipt.jpg", It.IsAny<CancellationToken>()))
      .ReturnsAsync(new InvoiceScanBlobProperties((10L * 1024L * 1024L) + 1L, true, "image/jpeg"));
    var service = new DocumentAnalysisFoundationService(
      documentBroker.Object,
      blobBroker.Object,
      NullLoggerFactory.Instance,
      new ScanStorageOptionsManager());
    var scan = new InvoiceScan(ScanType.JPG, location, Metadata: null);

    // Act + Assert
    await Assert.ThrowsExactlyAsync<AnalysisFoundationValidationException>(
      () => service.ExtractInvoiceAsync([scan], CancellationToken.None)).ConfigureAwait(false);
    documentBroker.VerifyNoOtherCalls();
  }

  /// <summary>
  /// Verifies an oversize scan cannot load, mutate, or persist its target invoice during an attachment workflow.
  /// </summary>
  [TestMethod]
  public async Task AttachInvoiceScanAsync_OversizedBlob_DoesNotInvokeInvoiceStorage()
  {
    // Arrange
    Uri location = new("https://invoiceuploads.blob.core.windows.net/invoices/receipt.jpg");
    var blobBroker = new Mock<IInvoiceBlobStorageBroker>(MockBehavior.Strict);
    blobBroker
      .Setup(broker => broker.GetPropertiesAsync("receipt.jpg", It.IsAny<CancellationToken>()))
      .ReturnsAsync(new InvoiceScanBlobProperties((10L * 1024L * 1024L) + 1L, true, "image/jpeg"));
    var scanStorage = new InvoiceScanStorageFoundationService(
      blobBroker.Object,
      new ScanStorageOptionsManager(),
      NullLoggerFactory.Instance);
    var invoiceStorage = new Mock<IInvoiceStorageFoundationService>(MockBehavior.Strict);
    var service = new InvoiceOrchestrationService(
      invoiceStorage.Object,
      scanStorage,
      NullLoggerFactory.Instance);
    var scan = new InvoiceScan(ScanType.JPG, location, Metadata: null);

    // Act + Assert
    await Assert.ThrowsExactlyAsync<InvoiceOrchestrationValidationException>(
      () => service.AttachInvoiceScanAsync(
        scan,
        Guid.CreateVersion7(),
        Guid.CreateVersion7(),
        CancellationToken.None)).ConfigureAwait(false);

    invoiceStorage.VerifyNoOtherCalls();
  }

  private sealed class ScanStorageOptionsManager : IOptionsManager
  {
    public ApplicationOptions GetApplicationOptions() =>
      new LocalOptions
      {
        StorageAccountName = "invoiceuploads",
        StorageAccountEndpoint = "https://invoiceuploads.blob.core.windows.net",
      };
  }
}
