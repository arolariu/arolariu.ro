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

  /// <summary>Verifies that an <see cref="InvoiceUnauthorizedAccessException"/> from the broker is wrapped into an <see cref="InvoiceFoundationDependencyValidationException"/> (caller-correctable 401, not 503).</summary>
  [Fact]
  public async Task TryCatchAsync_UnauthorizedAccess_Wraps_As_DependencyValidation()
  {
    _broker.Setup(b => b.ReadInvoiceAsync(It.IsAny<Guid>(), It.IsAny<Guid?>(), It.IsAny<CancellationToken>()))
      .ThrowsAsync(new InvoiceUnauthorizedAccessException("unauthorized"));

    var ex = await Assert.ThrowsAsync<InvoiceFoundationDependencyValidationException>(
      () => _sut.ReadInvoiceObject(Guid.NewGuid(), Guid.NewGuid()));

    Assert.IsType<InvoiceUnauthorizedAccessException>(ex.InnerException);
  }

  /// <summary>Verifies that an <see cref="InvoiceForbiddenAccessException"/> from the broker is wrapped into an <see cref="InvoiceFoundationDependencyValidationException"/> (caller-correctable 403, not 503).</summary>
  [Fact]
  public async Task TryCatchAsync_ForbiddenAccess_Wraps_As_DependencyValidation()
  {
    _broker.Setup(b => b.ReadInvoiceAsync(It.IsAny<Guid>(), It.IsAny<Guid?>(), It.IsAny<CancellationToken>()))
      .ThrowsAsync(new InvoiceForbiddenAccessException(Guid.NewGuid(), Guid.NewGuid()));

    var ex = await Assert.ThrowsAsync<InvoiceFoundationDependencyValidationException>(
      () => _sut.ReadInvoiceObject(Guid.NewGuid(), Guid.NewGuid()));

    Assert.IsType<InvoiceForbiddenAccessException>(ex.InnerException);
  }

  /// <summary>Verifies that an <see cref="InvoiceCosmosDbRateLimitException"/> from the broker is wrapped into an <see cref="InvoiceFoundationDependencyValidationException"/> (caller-correctable 429, not 503).</summary>
  [Fact]
  public async Task TryCatchAsync_CosmosRateLimit_Wraps_As_DependencyValidation()
  {
    _broker.Setup(b => b.ReadInvoiceAsync(It.IsAny<Guid>(), It.IsAny<Guid?>(), It.IsAny<CancellationToken>()))
      .ThrowsAsync(new InvoiceCosmosDbRateLimitException(TimeSpan.FromSeconds(2), new Exception()));

    var ex = await Assert.ThrowsAsync<InvoiceFoundationDependencyValidationException>(
      () => _sut.ReadInvoiceObject(Guid.NewGuid(), Guid.NewGuid()));

    Assert.IsType<InvoiceCosmosDbRateLimitException>(ex.InnerException);
  }

  /// <summary>Regression guard: <see cref="InvoiceFailedStorageException"/> must remain in the Dependency tier (downstream unreachable, 503).</summary>
  [Fact]
  public async Task TryCatchAsync_FailedStorage_StaysIn_DependencyTier()
  {
    _broker.Setup(b => b.ReadInvoiceAsync(It.IsAny<Guid>(), It.IsAny<Guid?>(), It.IsAny<CancellationToken>()))
      .ThrowsAsync(new InvoiceFailedStorageException("down"));

    var ex = await Assert.ThrowsAsync<InvoiceFoundationDependencyException>(
      () => _sut.ReadInvoiceObject(Guid.NewGuid(), Guid.NewGuid()));

    Assert.IsType<InvoiceFailedStorageException>(ex.InnerException);
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
