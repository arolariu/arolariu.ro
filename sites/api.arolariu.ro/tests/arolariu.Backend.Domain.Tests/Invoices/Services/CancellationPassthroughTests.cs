namespace arolariu.Backend.Domain.Tests.Invoices.Services;

using System;
using System.Threading;
using System.Threading.Tasks;

using arolariu.Backend.Domain.Invoices.Brokers.AnalysisBrokers.ClassifierBroker;
using arolariu.Backend.Domain.Invoices.Brokers.AnalysisBrokers.IdentifierBroker;
using arolariu.Backend.Domain.Invoices.Brokers.DatabaseBroker;
using arolariu.Backend.Domain.Invoices.DDD.AggregatorRoots.Invoices;
using arolariu.Backend.Domain.Invoices.Services.Foundation.InvoiceAnalysis;
using arolariu.Backend.Domain.Invoices.Services.Foundation.InvoiceStorage;
using arolariu.Backend.Domain.Invoices.Services.Foundation.MerchantStorage;
using arolariu.Backend.Domain.Invoices.Services.Orchestration.InvoiceService;
using arolariu.Backend.Domain.Invoices.Services.Orchestration.MerchantService;
using arolariu.Backend.Domain.Invoices.Services.Processing;
using arolariu.Backend.Domain.Invoices.DTOs;
using arolariu.Backend.Domain.Tests.Builders;
using arolariu.Backend.Domain.Tests.Invoices.Helpers;

using Microsoft.Extensions.Logging.Abstractions;

using Moq;

using Microsoft.VisualStudio.TestTools.UnitTesting;

/// <summary>
/// Guards the single most regression-prone rule of the cancellation contract:
/// cancellation must never be reclassified into a domain exception, because that
/// turns a client disconnect into an HTTP 500/503 and a false failure metric.
/// </summary>
[TestClass]
public sealed class CancellationPassthroughTests
{
  private static InvoiceStorageFoundationService CreateStorageService(Mock<IInvoiceNoSqlBroker> broker) =>
    new(broker.Object, TaxonomyBrokerTestFactory.Create(), NullLoggerFactory.Instance);

  /// <summary>
  /// Verifies that <see cref="InvoiceStorageFoundationService.ReadInvoiceObject"/> propagates
  /// <see cref="OperationCanceledException"/> thrown by the broker without reclassifying it.
  /// </summary>
  [TestMethod]
  public async Task ReadInvoiceObject_WhenBrokerCancels_PropagatesOperationCanceledException()
  {
    var broker = new Mock<IInvoiceNoSqlBroker>();
    broker
      .Setup(b => b.ReadInvoiceAsync(It.IsAny<Guid>(), It.IsAny<Guid?>(), It.IsAny<CancellationToken>()))
      .ThrowsAsync(new OperationCanceledException());

    var service = CreateStorageService(broker);

    await Assert.ThrowsExactlyAsync<OperationCanceledException>(
      () => service.ReadInvoiceObject(Guid.NewGuid(), null, CancellationToken.None)).ConfigureAwait(true);
  }

  /// <summary>
  /// Verifies that <see cref="InvoiceStorageFoundationService.ReadAllInvoiceObjects"/> propagates
  /// <see cref="TaskCanceledException"/> thrown by the broker without reclassifying it.
  /// </summary>
  [TestMethod]
  public async Task ReadAllInvoiceObjects_WhenBrokerCancels_PropagatesOperationCanceledException()
  {
    var broker = new Mock<IInvoiceNoSqlBroker>();
    broker
      .Setup(b => b.ReadInvoicesAsync(It.IsAny<Guid>(), It.IsAny<CancellationToken>()))
      .ThrowsAsync(new TaskCanceledException());

    var service = CreateStorageService(broker);

    // TaskCanceledException derives from OperationCanceledException — one clause covers both.
    await Assert.ThrowsExactlyAsync<TaskCanceledException>(
      () => service.ReadAllInvoiceObjects(Guid.NewGuid(), CancellationToken.None)).ConfigureAwait(true);
  }

  /// <summary>
  /// Verifies that <see cref="InvoiceStorageFoundationService.CreateInvoiceObject"/> propagates
  /// <see cref="OperationCanceledException"/> thrown by the broker without reclassifying it.
  /// </summary>
  [TestMethod]
  public async Task CreateInvoiceObject_WhenBrokerCancels_PropagatesOperationCanceledException()
  {
    var broker = new Mock<IInvoiceNoSqlBroker>();
    broker
      .Setup(b => b.CreateInvoiceAsync(It.IsAny<Invoice>(), It.IsAny<CancellationToken>()))
      .ThrowsAsync(new OperationCanceledException());

    var service = CreateStorageService(broker);
    var invoice = InvoiceBuilder.CreateRandomInvoice();

    await Assert.ThrowsExactlyAsync<OperationCanceledException>(
      () => service.CreateInvoiceObject(invoice, null, CancellationToken.None)).ConfigureAwait(true);
  }

  /// <summary>
  /// Verifies that <see cref="InvoiceOrchestrationService.ReadInvoiceObject"/> propagates
  /// <see cref="OperationCanceledException"/> thrown by a foundation service without reclassifying it.
  /// </summary>
  [TestMethod]
  public async Task OrchestrationLayer_WhenFoundationCancels_PropagatesOperationCanceledException()
  {
    var storage = new Mock<IInvoiceStorageFoundationService>();
    storage
      .Setup(s => s.ReadInvoiceObject(It.IsAny<Guid>(), It.IsAny<Guid?>(), It.IsAny<CancellationToken>()))
      .ThrowsAsync(new OperationCanceledException());

    var analysis = new Mock<IInvoiceAnalysisFoundationService>();
    var service = new InvoiceOrchestrationService(analysis.Object, storage.Object, NullLoggerFactory.Instance);

    await Assert.ThrowsExactlyAsync<OperationCanceledException>(
      () => service.ReadInvoiceObject(Guid.NewGuid(), null, CancellationToken.None)).ConfigureAwait(true);
  }

  /// <summary>
  /// Verifies that <see cref="InvoiceProcessingService.ReadInvoice"/> propagates
  /// <see cref="OperationCanceledException"/> through all three wrapping layers without reclassifying it.
  /// </summary>
  [TestMethod]
  public async Task ProcessingLayer_WhenOrchestrationCancels_PropagatesOperationCanceledException()
  {
    var invoiceOrchestration = new Mock<IInvoiceOrchestrationService>();
    invoiceOrchestration
      .Setup(o => o.ReadInvoiceObject(It.IsAny<Guid>(), It.IsAny<Guid?>(), It.IsAny<CancellationToken>()))
      .ThrowsAsync(new OperationCanceledException());

    var merchantOrchestration = new Mock<IMerchantOrchestrationService>();
    var service = new InvoiceProcessingService(
      invoiceOrchestration.Object,
      merchantOrchestration.Object,
      NullLoggerFactory.Instance);

    // Proves the exception survives all three wrapping layers, not just the innermost one.
    await Assert.ThrowsExactlyAsync<OperationCanceledException>(
      () => service.ReadInvoice(Guid.NewGuid(), null, CancellationToken.None)).ConfigureAwait(true);
  }

  /// <summary>
  /// Verifies that <see cref="MerchantStorageFoundationService.ReadMerchantObject"/> propagates
  /// <see cref="OperationCanceledException"/> thrown by the broker without reclassifying it.
  /// </summary>
  [TestMethod]
  public async Task MerchantStorage_WhenBrokerCancels_PropagatesOperationCanceledException()
  {
    var broker = new Mock<IInvoiceNoSqlBroker>();
    broker
      .Setup(b => b.ReadMerchantAsync(It.IsAny<Guid>(), It.IsAny<Guid?>(), It.IsAny<CancellationToken>()))
      .ThrowsAsync(new OperationCanceledException());

    var service = new MerchantStorageFoundationService(broker.Object, NullLoggerFactory.Instance);

    await Assert.ThrowsExactlyAsync<OperationCanceledException>(
      () => service.ReadMerchantObject(Guid.NewGuid(), null, CancellationToken.None)).ConfigureAwait(true);
  }

  /// <summary>
  /// Verifies that <see cref="InvoiceOrchestrationService.AnalyzeInvoiceWithOptions"/> does not
  /// persist the result when cancellation is requested after the analysis stage completes.
  /// </summary>
  [TestMethod]
  public async Task AnalyzeInvoiceWithOptions_WhenCancelledAfterAnalysis_DoesNotPersistTheResult()
  {
    var invoice = InvoiceBuilder.CreateRandomInvoice();
    using var cts = new CancellationTokenSource();

    var storage = new Mock<IInvoiceStorageFoundationService>();
    storage
      .Setup(s => s.ReadInvoiceObject(It.IsAny<Guid>(), It.IsAny<Guid?>(), It.IsAny<CancellationToken>()))
      .ReturnsAsync(invoice);

    var analysis = new Mock<IInvoiceAnalysisFoundationService>();
    analysis
      .Setup(a => a.AnalyzeInvoiceAsync(It.IsAny<AnalysisOptions>(), It.IsAny<Invoice>(), It.IsAny<CancellationToken>()))
      .ReturnsAsync(() =>
      {
        // Simulate the client giving up while the AI stage was running.
        cts.Cancel();
        return invoice;
      });

    var service = new InvoiceOrchestrationService(analysis.Object, storage.Object, NullLoggerFactory.Instance);

    await Assert.ThrowsAsync<OperationCanceledException>(
      () => service.AnalyzeInvoiceWithOptions(AnalysisOptions.CompleteAnalysis, Guid.NewGuid(), null, cts.Token))
      .ConfigureAwait(true);

    storage.Verify(
      s => s.UpdateInvoiceObject(It.IsAny<Invoice>(), It.IsAny<Guid>(), It.IsAny<Guid?>(), It.IsAny<CancellationToken>()),
      Times.Never,
      "The update must not run once the request was abandoned mid-pipeline.");
  }

  /// <summary>
  /// Verifies that <see cref="InvoiceAnalysisFoundationService.AnalyzeInvoiceAsync"/> does not
  /// invoke the GPT stage when cancellation is requested after the OCR stage completes.
  /// This checkpoint is the load-bearing guard that prevents both expensive AI stages from
  /// running after the caller has already given up.
  /// </summary>
  [TestMethod]
  public async Task AnalyzeInvoiceAsync_WhenCancelledAfterOcrStage_DoesNotInvokeGptStage()
  {
    var invoice = InvoiceBuilder.CreateRandomInvoice();
    using var cts = new CancellationTokenSource();

    var ocrBroker = new Mock<IFormRecognizerBroker>();
    ocrBroker
      .Setup(b => b.PerformOcrAnalysisOnSingleInvoice(It.IsAny<Invoice>(), It.IsAny<AnalysisOptions>()))
      .Returns<Invoice, AnalysisOptions>((inv, _) =>
      {
        // Simulate the caller giving up while OCR was running.
#pragma warning disable CA1849 // CancelAsync is not awaitable inside a ValueTask factory callback
        cts.Cancel();
#pragma warning restore CA1849
        return ValueTask.FromResult(inv);
      });

    var classifierBroker = new Mock<IClassifierBroker>();

    var service = new InvoiceAnalysisFoundationService(
      classifierBroker.Object,
      ocrBroker.Object,
      NullLoggerFactory.Instance);

    await Assert.ThrowsAsync<OperationCanceledException>(
      () => service.AnalyzeInvoiceAsync(AnalysisOptions.CompleteAnalysis, invoice, cts.Token))
      .ConfigureAwait(true);

    classifierBroker.Verify(
      b => b.PerformGptAnalysisOnSingleInvoice(It.IsAny<Invoice>(), It.IsAny<AnalysisOptions>()),
      Times.Never,
      "The GPT stage must not run once the caller has abandoned the request after OCR completed.");
  }

  /// <summary>
  /// Verifies that <see cref="InvoiceProcessingService.DeleteInvoices"/> stops iterating its
  /// fan-out loop as soon as cancellation is requested, instead of deleting every remaining
  /// invoice after the caller has already given up.
  /// </summary>
  [TestMethod]
  public async Task DeleteInvoices_WhenCancelledMidFanOut_StopsIterating()
  {
    var invoices = new[]
    {
      InvoiceBuilder.CreateRandomInvoice(),
      InvoiceBuilder.CreateRandomInvoice(),
      InvoiceBuilder.CreateRandomInvoice(),
    };

    using var cts = new CancellationTokenSource();
    var deleteCount = 0;

    var invoiceOrchestration = new Mock<IInvoiceOrchestrationService>();
    invoiceOrchestration
      .Setup(o => o.ReadAllInvoiceObjects(It.IsAny<Guid>(), It.IsAny<CancellationToken>()))
      .ReturnsAsync(invoices);
    invoiceOrchestration
      .Setup(o => o.DeleteInvoiceObject(It.IsAny<Guid>(), It.IsAny<Guid?>(), It.IsAny<CancellationToken>()))
      .Callback(() =>
      {
        deleteCount++;
#pragma warning disable CA1849 // CancelAsync is not awaitable inside a Moq callback
        cts.Cancel(); // client gives up after the first delete
#pragma warning restore CA1849
      })
      .Returns(Task.CompletedTask);

    var merchantOrchestration = new Mock<IMerchantOrchestrationService>();
    var service = new InvoiceProcessingService(
      invoiceOrchestration.Object,
      merchantOrchestration.Object,
      NullLoggerFactory.Instance);

    await Assert.ThrowsAsync<OperationCanceledException>(
      () => service.DeleteInvoices(Guid.NewGuid(), cts.Token)).ConfigureAwait(true);

    Assert.AreEqual(1, deleteCount);
  }
}
