namespace arolariu.Backend.Domain.Tests.Invoices.Services.Foundation;

using System;
using System.Threading;
using System.Threading.Tasks;

using arolariu.Backend.Common.Options;
using arolariu.Backend.Domain.Invoices.Brokers.DocumentIntelligenceBroker;
using arolariu.Backend.Domain.Invoices.DDD.AggregatorRoots.Invoices;
using arolariu.Backend.Domain.Invoices.DDD.Analysis.Exceptions.Outer.Foundation;
using arolariu.Backend.Domain.Invoices.Services.Foundation.DocumentAnalysis;
using arolariu.Backend.Domain.Tests.Invoices.Helpers;

using Microsoft.Extensions.Logging.Abstractions;
using Microsoft.VisualStudio.TestTools.UnitTesting;

using Moq;

/// <summary>
/// Verifies document analysis rejects unapproved scan locations before reaching Document Intelligence.
/// </summary>
[TestClass]
public sealed class DocumentAnalysisScanStorageBoundaryTests
{
  /// <summary>
  /// Verifies each prohibited URI form is rejected without invoking the Document Intelligence broker.
  /// </summary>
  /// <param name="location">The prohibited scan location.</param>
  [TestMethod]
  [DataRow("http://invoiceuploads.blob.core.windows.net/invoices/receipt.jpg")]
  [DataRow("file:///invoices/receipt.jpg")]
  [DataRow("ftp://invoiceuploads.blob.core.windows.net/invoices/receipt.jpg")]
  [DataRow("https://invoiceuploads.blob.core.windows.net.attacker.test/invoices/receipt.jpg")]
  [DataRow("https://otheruploads.blob.core.windows.net/invoices/receipt.jpg")]
  [DataRow("https://invoiceuploads.blob.core.windows.net/other-container/receipt.jpg")]
  [DataRow("https://untrusted-user@invoiceuploads.blob.core.windows.net/invoices/receipt.jpg")]
  [DataRow("https://invoiceuploads.blob.core.windows.net/invoices/receipt.jpg#fragment")]
  [DataRow("https://invoiceuploads.blob.core.windows.net:8443/invoices/receipt.jpg")]
  public async Task ExtractInvoiceAsync_UnapprovedLocation_DoesNotInvokeDocumentIntelligence(string location)
  {
    // Arrange
    var broker = new Mock<IDocumentIntelligenceBroker>(MockBehavior.Strict);
    var service = new DocumentAnalysisFoundationService(
      broker.Object,
      NullLoggerFactory.Instance,
      new ScanStorageOptionsManager());
    var scan = new InvoiceScan(ScanType.JPG, new Uri(location), Metadata: null);

    // Act
    await Assert.ThrowsExactlyAsync<AnalysisFoundationValidationException>(
      () => service.ExtractInvoiceAsync([scan], CancellationToken.None)).ConfigureAwait(false);

    // Assert
    broker.VerifyNoOtherCalls();
  }

  /// <summary>
  /// Verifies validation completes for every scan before the first Document Intelligence request can begin.
  /// </summary>
  [TestMethod]
  public async Task ExtractInvoiceAsync_OneUnapprovedLocationInMultipleScans_DoesNotInvokeDocumentIntelligence()
  {
    // Arrange
    var broker = new Mock<IDocumentIntelligenceBroker>(MockBehavior.Strict);
    var service = new DocumentAnalysisFoundationService(
      broker.Object,
      NullLoggerFactory.Instance,
      new ScanStorageOptionsManager());
    var approvedScan = new InvoiceScan(
      ScanType.JPG,
      new Uri("https://invoiceuploads.blob.core.windows.net/invoices/approved.jpg"),
      Metadata: null);
    var unapprovedScan = new InvoiceScan(
      ScanType.JPG,
      new Uri("http://invoiceuploads.blob.core.windows.net/invoices/unapproved.jpg"),
      Metadata: null);

    // Act
    await Assert.ThrowsExactlyAsync<AnalysisFoundationValidationException>(
      () => service.ExtractInvoiceAsync([approvedScan, unapprovedScan], CancellationToken.None)).ConfigureAwait(false);

    // Assert
    broker.VerifyNoOtherCalls();
  }

  /// <summary>
  /// Verifies a configured loopback Azurite scan reaches Document Intelligence after local-boundary validation.
  /// </summary>
  [TestMethod]
  public async Task ExtractInvoiceAsync_LoopbackAzuriteInvoiceScan_InvokesDocumentIntelligence()
  {
    // Arrange
    Uri scanLocation = new("http://127.0.0.1:10000/devstoreaccount1/invoices/scans/receipt.jpg");
    var broker = new Mock<IDocumentIntelligenceBroker>(MockBehavior.Strict);
    broker
      .Setup(candidate => candidate.AnalyzeReceiptAsync(scanLocation, It.IsAny<CancellationToken>()))
      .Returns(() => ValueTask.FromResult(ReceiptDocumentTestData.Document()));
    var service = new DocumentAnalysisFoundationService(
      broker.Object,
      NullLoggerFactory.Instance,
      new AzuriteStorageOptionsManager());
    var scan = new InvoiceScan(ScanType.JPG, scanLocation, Metadata: null);

    // Act
    _ = await service.ExtractInvoiceAsync([scan], CancellationToken.None).ConfigureAwait(false);

    // Assert
    broker.Verify(candidate => candidate.AnalyzeReceiptAsync(scanLocation, It.IsAny<CancellationToken>()), Times.Once);
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

  private sealed class AzuriteStorageOptionsManager : IOptionsManager
  {
    public ApplicationOptions GetApplicationOptions() =>
      new LocalOptions
      {
        StorageAccountName = "devstoreaccount1",
        StorageAccountEndpoint = "http://127.0.0.1:10000/devstoreaccount1",
      };
  }
}
