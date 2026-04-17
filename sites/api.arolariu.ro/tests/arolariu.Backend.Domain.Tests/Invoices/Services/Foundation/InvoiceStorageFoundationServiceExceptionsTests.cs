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

  /// <summary>Initializes a new instance of the <see cref="InvoiceStorageFoundationServiceExceptionsTests"/> class.</summary>
  public InvoiceStorageFoundationServiceExceptionsTests()
  {
    _sut = new InvoiceStorageFoundationService(_broker.Object, NullLoggerFactory.Instance);
  }

  /// <summary>Verifies that an <see cref="InvoiceNotFoundException"/> from the broker is wrapped into an <see cref="InvoiceFoundationDependencyValidationException"/>.</summary>
  [Fact]
  public async Task ReadInvoiceObject_WhenBrokerThrowsNotFound_ThrowsFoundationDependencyValidationException()
  {
    _broker.Setup(b => b.ReadInvoiceAsync(It.IsAny<Guid>(), It.IsAny<Guid?>(), It.IsAny<CancellationToken>()))
      .ThrowsAsync(new InvoiceNotFoundException(Guid.NewGuid()));

    var ex = await Assert.ThrowsAsync<InvoiceFoundationDependencyValidationException>(
      () => _sut.ReadInvoiceObject(Guid.NewGuid(), Guid.NewGuid()));

    Assert.IsType<InvoiceNotFoundException>(ex.InnerException);
  }

  /// <summary>Verifies that an <see cref="InvoiceAlreadyExistsException"/> from the broker is wrapped into an <see cref="InvoiceFoundationDependencyValidationException"/>.</summary>
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

  /// <summary>Verifies that an <see cref="InvoiceCosmosDbRateLimitException"/> from the broker is wrapped into an <see cref="InvoiceFoundationDependencyException"/>.</summary>
  [Fact]
  public async Task ReadInvoiceObject_WhenBrokerThrowsRateLimit_ThrowsFoundationDependencyException()
  {
    _broker.Setup(b => b.ReadInvoiceAsync(It.IsAny<Guid>(), It.IsAny<Guid?>(), It.IsAny<CancellationToken>()))
      .ThrowsAsync(new InvoiceCosmosDbRateLimitException(TimeSpan.FromSeconds(2), new Exception()));

    await Assert.ThrowsAsync<InvoiceFoundationDependencyException>(
      () => _sut.ReadInvoiceObject(Guid.NewGuid(), Guid.NewGuid()));
  }

  /// <summary>Verifies that an <see cref="InvoiceFailedStorageException"/> from the broker is wrapped into an <see cref="InvoiceFoundationDependencyException"/>.</summary>
  [Fact]
  public async Task ReadInvoiceObject_WhenBrokerThrowsFailedStorage_ThrowsFoundationDependencyException()
  {
    _broker.Setup(b => b.ReadInvoiceAsync(It.IsAny<Guid>(), It.IsAny<Guid?>(), It.IsAny<CancellationToken>()))
      .ThrowsAsync(new InvoiceFailedStorageException("down"));

    await Assert.ThrowsAsync<InvoiceFoundationDependencyException>(
      () => _sut.ReadInvoiceObject(Guid.NewGuid(), Guid.NewGuid()));
  }

  /// <summary>Verifies that an unclassified exception from the broker is wrapped into an <see cref="InvoiceFoundationServiceException"/>.</summary>
  [Fact]
  public async Task ReadInvoiceObject_WhenBrokerThrowsUnknown_ThrowsFoundationServiceException()
  {
    _broker.Setup(b => b.ReadInvoiceAsync(It.IsAny<Guid>(), It.IsAny<Guid?>(), It.IsAny<CancellationToken>()))
      .ThrowsAsync(new InvalidOperationException("boom"));

    await Assert.ThrowsAsync<InvoiceFoundationServiceException>(
      () => _sut.ReadInvoiceObject(Guid.NewGuid(), Guid.NewGuid()));
  }
}
