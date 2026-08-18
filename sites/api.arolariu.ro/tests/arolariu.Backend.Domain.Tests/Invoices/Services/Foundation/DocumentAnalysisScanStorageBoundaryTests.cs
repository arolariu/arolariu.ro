namespace arolariu.Backend.Domain.Tests.Invoices.Services.Foundation;

using System;
using System.Threading;
using System.Threading.Tasks;

using arolariu.Backend.Common.Options;
using arolariu.Backend.Domain.Invoices.Brokers.DocumentIntelligenceBroker;
using arolariu.Backend.Domain.Invoices.DDD.AggregatorRoots.Invoices;
using arolariu.Backend.Domain.Invoices.DDD.Analysis.Exceptions.Outer.Foundation;
using arolariu.Backend.Domain.Invoices.Services.Foundation.DocumentAnalysis;

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
  [DataRow("http://invoiceuploads.blob.core.windows.net/invoice-scans/receipt.jpg")]
  [DataRow("file:///invoice-scans/receipt.jpg")]
  [DataRow("ftp://invoiceuploads.blob.core.windows.net/invoice-scans/receipt.jpg")]
  [DataRow("https://invoiceuploads.blob.core.windows.net.attacker.test/invoice-scans/receipt.jpg")]
  [DataRow("https://otheruploads.blob.core.windows.net/invoice-scans/receipt.jpg")]
  [DataRow("https://invoiceuploads.blob.core.windows.net/other-container/receipt.jpg")]
  [DataRow("https://untrusted-user@invoiceuploads.blob.core.windows.net/invoice-scans/receipt.jpg")]
  [DataRow("https://invoiceuploads.blob.core.windows.net/invoice-scans/receipt.jpg#fragment")]
  [DataRow("https://invoiceuploads.blob.core.windows.net:8443/invoice-scans/receipt.jpg")]
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
      new Uri("https://invoiceuploads.blob.core.windows.net/invoice-scans/approved.jpg"),
      Metadata: null);
    var unapprovedScan = new InvoiceScan(
      ScanType.JPG,
      new Uri("http://invoiceuploads.blob.core.windows.net/invoice-scans/unapproved.jpg"),
      Metadata: null);

    // Act
    await Assert.ThrowsExactlyAsync<AnalysisFoundationValidationException>(
      () => service.ExtractInvoiceAsync([approvedScan, unapprovedScan], CancellationToken.None)).ConfigureAwait(false);

    // Assert
    broker.VerifyNoOtherCalls();
  }

  private sealed class ScanStorageOptionsManager : IOptionsManager
  {
    public ApplicationOptions GetApplicationOptions() =>
      new LocalOptions
      {
        StorageAccountName = "invoiceuploads",
        StorageAccountEndpoint = "https://invoiceuploads.blob.core.windows.net/invoice-scans",
      };
  }
}
