namespace arolariu.Backend.Domain.Tests.Invoices.Services.Orchestration;

using System;
using System.Collections.Generic;
using System.Threading;
using System.Threading.Tasks;

using arolariu.Backend.Domain.Invoices.DDD.AggregatorRoots.Invoices;
using arolariu.Backend.Domain.Invoices.DDD.Analysis.Aggregates;
using arolariu.Backend.Domain.Invoices.DDD.Analysis.Contracts;
using arolariu.Backend.Domain.Invoices.DDD.Analysis.Results;
using arolariu.Backend.Domain.Invoices.Services.Foundation.AnalysisRuns;
using arolariu.Backend.Domain.Invoices.Services.Foundation.DocumentAnalysis;
using arolariu.Backend.Domain.Invoices.Services.Foundation.GenerativeAnalysis;
using arolariu.Backend.Domain.Invoices.Services.Orchestration.AnalysisService;

using Microsoft.Extensions.Logging.Abstractions;
using Microsoft.VisualStudio.TestTools.UnitTesting;

using Moq;

/// <summary>
/// Verifies the current analysis orchestration layer that owns durable runs and non-classification capabilities.
/// </summary>
[TestClass]
public sealed class AnalysisOrchestrationCurrentArchitectureTests
{
  /// <summary>
  /// Verifies queueing an invoice run persists a resolved durable run through the analysis-run foundation.
  /// </summary>
  [TestMethod]
  public async Task QueueInvoiceRunAsync_ValidRequest_CreatesDurableRun()
  {
    Guid invoiceId = Guid.NewGuid();
    Guid userIdentifier = Guid.NewGuid();
    InvoiceAnalysisOptions options = InvoiceAnalysisOptions.Fast();
    AnalysisRun? captured = null;

    var runFoundation = new Mock<IAnalysisRunFoundationService>(MockBehavior.Strict);
    var document = new Mock<IDocumentAnalysisFoundationService>(MockBehavior.Strict);
    var generative = new Mock<IGenerativeAnalysisFoundationService>(MockBehavior.Strict);

    runFoundation.Setup(service => service.CreateRunAsync(It.IsAny<AnalysisRun>(), It.IsAny<CancellationToken>()))
      .Callback<AnalysisRun, CancellationToken>((run, _) => captured = run)
      .ReturnsAsync((AnalysisRun run, CancellationToken _) => run);

    var service = new AnalysisOrchestrationService(runFoundation.Object, document.Object, generative.Object, NullLoggerFactory.Instance);

    AnalysisRun result = await service
      .QueueInvoiceRunAsync(invoiceId, userIdentifier, options, "trace-parent", CancellationToken.None)
      .ConfigureAwait(false);

    Assert.IsNotNull(captured);
    Assert.AreEqual(invoiceId, captured.TargetId);
    Assert.AreEqual(result.Id, captured.Id);
    Assert.AreEqual(options.Profile, captured.InvoiceOptions?.Profile);
  }

  /// <summary>
  /// Verifies receipt extraction delegates directly to the document-analysis foundation.
  /// </summary>
  [TestMethod]
  public async Task ExtractInvoiceAsync_ValidScans_DelegatesToDocumentFoundation()
  {
    InvoiceScan[] scans =
    [
      new InvoiceScan(ScanType.JPG, new Uri("https://unit-tests.arolariu.ro/invoices/scans/receipt.jpg"), Metadata: null),
    ];

    var extraction = new ReceiptExtractionResult(
      merchantCandidate: null,
      products: [],
      paymentInformation: new arolariu.Backend.Domain.Invoices.DDD.ValueObjects.PaymentInformation(),
      receiptType: "receipt",
      countryRegion: "RO",
      taxDetails: [],
      payments: []);

    var runFoundation = new Mock<IAnalysisRunFoundationService>(MockBehavior.Strict);
    var document = new Mock<IDocumentAnalysisFoundationService>(MockBehavior.Strict);
    var generative = new Mock<IGenerativeAnalysisFoundationService>(MockBehavior.Strict);

    document.Setup(service => service.ExtractInvoiceAsync(
        It.IsAny<IReadOnlyList<InvoiceScan>>(),
        It.IsAny<CancellationToken>()))
      .ReturnsAsync(extraction);

    var service = new AnalysisOrchestrationService(runFoundation.Object, document.Object, generative.Object, NullLoggerFactory.Instance);

    ReceiptExtractionResult result = await service
      .ExtractInvoiceAsync(scans, CancellationToken.None)
      .ConfigureAwait(false);

    Assert.AreSame(extraction, result);
    document.Verify(service => service.ExtractInvoiceAsync(It.IsAny<IReadOnlyList<InvoiceScan>>(), It.IsAny<CancellationToken>()), Times.Once);
  }
}
