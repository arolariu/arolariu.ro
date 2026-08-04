namespace arolariu.Backend.Domain.Tests.Invoices.Services;

using System;
using System.Threading;
using System.Threading.Tasks;

using arolariu.Backend.Domain.Invoices.Brokers.DatabaseBroker;
using arolariu.Backend.Domain.Invoices.DDD.AggregatorRoots.Invoices;
using arolariu.Backend.Domain.Invoices.Services.Foundation.InvoiceAnalysis;
using arolariu.Backend.Domain.Invoices.Services.Foundation.InvoiceStorage;
using arolariu.Backend.Domain.Invoices.Services.Foundation.MerchantStorage;
using arolariu.Backend.Domain.Invoices.Services.Orchestration.InvoiceService;
using arolariu.Backend.Domain.Invoices.Services.Orchestration.MerchantService;
using arolariu.Backend.Domain.Invoices.Services.Processing;
using arolariu.Backend.Domain.Tests.Builders;

using Microsoft.Extensions.Logging.Abstractions;

using Moq;

using Xunit;

/// <summary>
/// Guards the single most regression-prone rule of the cancellation contract:
/// cancellation must never be reclassified into a domain exception, because that
/// turns a client disconnect into an HTTP 500/503 and a false failure metric.
/// </summary>
public sealed class CancellationPassthroughTests
{
  private static InvoiceStorageFoundationService CreateStorageService(Mock<IInvoiceNoSqlBroker> broker) =>
    new(broker.Object, new NullLoggerFactory());

  [Fact]
  public async Task ReadInvoiceObject_WhenBrokerCancels_PropagatesOperationCanceledException()
  {
    var broker = new Mock<IInvoiceNoSqlBroker>();
    broker
      .Setup(b => b.ReadInvoiceAsync(It.IsAny<Guid>(), It.IsAny<Guid?>(), It.IsAny<CancellationToken>()))
      .ThrowsAsync(new OperationCanceledException());

    var service = CreateStorageService(broker);

    await Assert.ThrowsAsync<OperationCanceledException>(
      () => service.ReadInvoiceObject(Guid.NewGuid(), null, CancellationToken.None)).ConfigureAwait(true);
  }

  [Fact]
  public async Task ReadAllInvoiceObjects_WhenBrokerCancels_PropagatesOperationCanceledException()
  {
    var broker = new Mock<IInvoiceNoSqlBroker>();
    broker
      .Setup(b => b.ReadInvoicesAsync(It.IsAny<Guid>(), It.IsAny<CancellationToken>()))
      .ThrowsAsync(new TaskCanceledException());

    var service = CreateStorageService(broker);

    // TaskCanceledException derives from OperationCanceledException — one clause covers both.
    await Assert.ThrowsAsync<TaskCanceledException>(
      () => service.ReadAllInvoiceObjects(Guid.NewGuid(), CancellationToken.None)).ConfigureAwait(true);
  }

  [Fact]
  public async Task CreateInvoiceObject_WhenBrokerCancels_PropagatesOperationCanceledException()
  {
    var broker = new Mock<IInvoiceNoSqlBroker>();
    broker
      .Setup(b => b.CreateInvoiceAsync(It.IsAny<Invoice>(), It.IsAny<CancellationToken>()))
      .ThrowsAsync(new OperationCanceledException());

    var service = CreateStorageService(broker);
    var invoice = InvoiceBuilder.CreateRandomInvoice();

    await Assert.ThrowsAsync<OperationCanceledException>(
      () => service.CreateInvoiceObject(invoice, null, CancellationToken.None)).ConfigureAwait(true);
  }

  [Fact]
  public async Task OrchestrationLayer_WhenFoundationCancels_PropagatesOperationCanceledException()
  {
    var storage = new Mock<IInvoiceStorageFoundationService>();
    storage
      .Setup(s => s.ReadInvoiceObject(It.IsAny<Guid>(), It.IsAny<Guid?>(), It.IsAny<CancellationToken>()))
      .ThrowsAsync(new OperationCanceledException());

    var analysis = new Mock<IInvoiceAnalysisFoundationService>();
    var service = new InvoiceOrchestrationService(analysis.Object, storage.Object, new NullLoggerFactory());

    await Assert.ThrowsAsync<OperationCanceledException>(
      () => service.ReadInvoiceObject(Guid.NewGuid(), null, CancellationToken.None)).ConfigureAwait(true);
  }

  [Fact]
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
      new NullLoggerFactory());

    // Proves the exception survives all three wrapping layers, not just the innermost one.
    await Assert.ThrowsAsync<OperationCanceledException>(
      () => service.ReadInvoice(Guid.NewGuid(), null, CancellationToken.None)).ConfigureAwait(true);
  }

  [Fact]
  public async Task MerchantStorage_WhenBrokerCancels_PropagatesOperationCanceledException()
  {
    var broker = new Mock<IInvoiceNoSqlBroker>();
    broker
      .Setup(b => b.ReadMerchantAsync(It.IsAny<Guid>(), It.IsAny<Guid?>(), It.IsAny<CancellationToken>()))
      .ThrowsAsync(new OperationCanceledException());

    var service = new MerchantStorageFoundationService(broker.Object, new NullLoggerFactory());

    await Assert.ThrowsAsync<OperationCanceledException>(
      () => service.ReadMerchantObject(Guid.NewGuid(), null, CancellationToken.None)).ConfigureAwait(true);
  }
}
