namespace arolariu.Backend.Domain.Tests.Invoices.Services;

using System;
using System.Threading;
using System.Threading.Tasks;

using arolariu.Backend.Domain.Invoices.Brokers.DatabaseBroker;
using arolariu.Backend.Domain.Invoices.Brokers.TaxonomyBroker;
using arolariu.Backend.Domain.Invoices.DDD.AggregatorRoots.Invoices;
using arolariu.Backend.Domain.Invoices.DTOs.Analysis;
using arolariu.Backend.Domain.Invoices.Services.Foundation.InvoiceStorage;
using arolariu.Backend.Domain.Invoices.Services.Foundation.MerchantStorage;
using arolariu.Backend.Domain.Invoices.Services.Orchestration.AnalysisService;
using arolariu.Backend.Domain.Invoices.Services.Orchestration.InvoiceService;
using arolariu.Backend.Domain.Invoices.Services.Orchestration.MerchantService;
using arolariu.Backend.Domain.Invoices.Services.Processing;
using arolariu.Backend.Domain.Invoices.Services.Processing.AnalysisService;
using arolariu.Backend.Domain.Tests.Builders;

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
    new(broker.Object, new Mock<ITaxonomyBroker>().Object, NullLoggerFactory.Instance);

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

    var service = new InvoiceOrchestrationService(storage.Object, NullLoggerFactory.Instance);

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

    var service = new MerchantStorageFoundationService(
      broker.Object,
      new Mock<ITaxonomyBroker>().Object,
      NullLoggerFactory.Instance);

    await Assert.ThrowsExactlyAsync<OperationCanceledException>(
      () => service.ReadMerchantObject(Guid.NewGuid(), null, CancellationToken.None)).ConfigureAwait(true);
  }

  /// <summary>
  /// Verifies that queueing an analysis run propagates <see cref="OperationCanceledException"/> raised by the
  /// orchestration layer instead of reclassifying it into a processing fault.
  /// </summary>
  [TestMethod]
  public async Task QueueInvoiceAnalysisAsync_WhenOrchestrationCancels_PropagatesOperationCanceledException()
  {
    var invoiceOrchestration = new Mock<IInvoiceOrchestrationService>();
    invoiceOrchestration
      .Setup(o => o.ReadInvoiceObject(It.IsAny<Guid>(), It.IsAny<Guid?>(), It.IsAny<CancellationToken>()))
      .ThrowsAsync(new OperationCanceledException());

    var analysisOrchestration = new Mock<IAnalysisOrchestrationService>();

    var service = new AnalysisProcessingService(
      invoiceOrchestration.Object,
      new Mock<IMerchantOrchestrationService>().Object,
      analysisOrchestration.Object,
      NullLoggerFactory.Instance);

    await Assert.ThrowsExactlyAsync<OperationCanceledException>(
      () => service.QueueInvoiceAnalysisAsync(
        Guid.NewGuid(),
        Guid.NewGuid(),
        new AnalyzeInvoiceRequestDto(),
        CancellationToken.None)).ConfigureAwait(true);

    analysisOrchestration.Verify(
      o => o.QueueInvoiceRunAsync(
        It.IsAny<Guid>(),
        It.IsAny<Guid>(),
        It.IsAny<arolariu.Backend.Domain.Invoices.DDD.Analysis.Contracts.InvoiceAnalysisOptions>(),
        It.IsAny<string>(),
        It.IsAny<CancellationToken>()),
      Times.Never,
      "A cancelled request must never leave a queued run behind.");
  }

  /// <summary>
  /// Verifies that the worker entry point propagates cancellation without claiming a run.
  /// </summary>
  /// <remarks>
  /// <para>This is the load-bearing guard that keeps host shutdown from stranding a claimed run under a lease that
  /// no live worker is renewing.</para>
  /// </remarks>
  [TestMethod]
  public async Task TryExecuteNextRunAsync_WhenAlreadyCancelled_DoesNotClaimARun()
  {
    var analysisOrchestration = new Mock<IAnalysisOrchestrationService>();

    var service = new AnalysisProcessingService(
      new Mock<IInvoiceOrchestrationService>().Object,
      new Mock<IMerchantOrchestrationService>().Object,
      analysisOrchestration.Object,
      NullLoggerFactory.Instance);

    using var cts = new CancellationTokenSource();
    await cts.CancelAsync().ConfigureAwait(true);

    await Assert.ThrowsExactlyAsync<OperationCanceledException>(
      () => service.TryExecuteNextRunAsync("worker-1", cts.Token)).ConfigureAwait(true);

    analysisOrchestration.Verify(
      o => o.ClaimNextRunAsync(
        It.IsAny<string>(),
        It.IsAny<DateTimeOffset>(),
        It.IsAny<TimeSpan>(),
        It.IsAny<CancellationToken>()),
      Times.Never,
      "A run must not be claimed once the host has begun shutting down.");
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
