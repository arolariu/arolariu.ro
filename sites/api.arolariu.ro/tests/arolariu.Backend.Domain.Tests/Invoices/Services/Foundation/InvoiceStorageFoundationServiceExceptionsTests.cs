namespace arolariu.Backend.Domain.Tests.Invoices.Services.Foundation;

using System;
using System.Threading;
using System.Threading.Tasks;

using arolariu.Backend.Domain.Invoices.Brokers.DatabaseBroker;
using arolariu.Backend.Domain.Invoices.DDD.AggregatorRoots.Invoices;
using arolariu.Backend.Domain.Invoices.DDD.AggregatorRoots.Invoices.Exceptions.Inner;
using arolariu.Backend.Domain.Invoices.DDD.AggregatorRoots.Invoices.Exceptions.Outer.Foundation;
using arolariu.Backend.Domain.Invoices.Services.Foundation.InvoiceStorage;

using Microsoft.Extensions.Logging.Abstractions;

using Moq;

using Xunit;

/// <summary>
/// Verifies that inner exceptions propagated from the Cosmos broker are classified
/// into the proper Foundation-tier outer exceptions by the TryCatch boundary.
/// </summary>
public class InvoiceStorageFoundationServiceExceptionsTests
{
  private readonly Mock<IInvoiceNoSqlBroker> _broker = new();
  private readonly InvoiceStorageFoundationService _sut;

  public InvoiceStorageFoundationServiceExceptionsTests()
  {
    _sut = new InvoiceStorageFoundationService(_broker.Object, NullLoggerFactory.Instance);
  }

  [Fact]
  public async Task ReadInvoiceObject_WhenBrokerThrowsNotFound_ThrowsFoundationDependencyValidationException()
  {
    _broker.Setup(b => b.ReadInvoiceAsync(It.IsAny<Guid>(), It.IsAny<Guid?>(), It.IsAny<CancellationToken>()))
      .ThrowsAsync(new InvoiceNotFoundException(Guid.NewGuid()));

    var ex = await Assert.ThrowsAsync<InvoiceFoundationDependencyValidationException>(
      () => _sut.ReadInvoiceObject(Guid.NewGuid(), Guid.NewGuid()));

    Assert.IsType<InvoiceNotFoundException>(ex.InnerException);
  }

  [Fact]
  public async Task CreateInvoiceObject_WhenBrokerThrowsAlreadyExists_ThrowsFoundationDependencyValidationException()
  {
    _broker.Setup(b => b.CreateInvoiceAsync(It.IsAny<Invoice>(), It.IsAny<CancellationToken>()))
      .ThrowsAsync(new InvoiceAlreadyExistsException(Guid.NewGuid()));
    var invoice = new Invoice { id = Guid.NewGuid(), UserIdentifier = Guid.NewGuid() };

    var ex = await Assert.ThrowsAsync<InvoiceFoundationDependencyValidationException>(
      () => _sut.CreateInvoiceObject(invoice));

    Assert.IsType<InvoiceAlreadyExistsException>(ex.InnerException);
  }

  [Fact]
  public async Task ReadInvoiceObject_WhenBrokerThrowsRateLimit_ThrowsFoundationDependencyException()
  {
    _broker.Setup(b => b.ReadInvoiceAsync(It.IsAny<Guid>(), It.IsAny<Guid?>(), It.IsAny<CancellationToken>()))
      .ThrowsAsync(new InvoiceCosmosDbRateLimitException(TimeSpan.FromSeconds(2), new Exception()));

    await Assert.ThrowsAsync<InvoiceFoundationDependencyException>(
      () => _sut.ReadInvoiceObject(Guid.NewGuid(), Guid.NewGuid()));
  }

  [Fact]
  public async Task ReadInvoiceObject_WhenBrokerThrowsFailedStorage_ThrowsFoundationDependencyException()
  {
    _broker.Setup(b => b.ReadInvoiceAsync(It.IsAny<Guid>(), It.IsAny<Guid?>(), It.IsAny<CancellationToken>()))
      .ThrowsAsync(new InvoiceFailedStorageException("down"));

    await Assert.ThrowsAsync<InvoiceFoundationDependencyException>(
      () => _sut.ReadInvoiceObject(Guid.NewGuid(), Guid.NewGuid()));
  }

  [Fact]
  public async Task ReadInvoiceObject_WhenBrokerThrowsUnknown_ThrowsFoundationServiceException()
  {
    _broker.Setup(b => b.ReadInvoiceAsync(It.IsAny<Guid>(), It.IsAny<Guid?>(), It.IsAny<CancellationToken>()))
      .ThrowsAsync(new InvalidOperationException("boom"));

    await Assert.ThrowsAsync<InvoiceFoundationServiceException>(
      () => _sut.ReadInvoiceObject(Guid.NewGuid(), Guid.NewGuid()));
  }
}
