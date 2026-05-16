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
  public async Task ReadInvoiceObject_WhenBrokerThrowsNotFound_ThrowsInvoiceNotFoundException()
  {
    _broker.Setup(b => b.ReadInvoiceAsync(It.IsAny<Guid>(), It.IsAny<Guid?>(), It.IsAny<CancellationToken>()))
      .ThrowsAsync(new InvoiceNotFoundException(Guid.NewGuid()));

    // Pass-through: Preserve INotFoundException marker for correct HTTP 404 mapping
    var ex = await Assert.ThrowsAsync<InvoiceNotFoundException>(
      () => _sut.ReadInvoiceObject(Guid.NewGuid(), Guid.NewGuid()));

    Assert.IsType<InvoiceNotFoundException>(ex);
  }

  /// <summary>Verifies that an <see cref="InvoiceAlreadyExistsException"/> from the broker is passed through to preserve IAlreadyExistsException marker for correct HTTP 409 mapping.</summary>
  [Fact]
  public async Task CreateInvoiceObject_WhenBrokerThrowsAlreadyExists_ThrowsInvoiceAlreadyExistsException()
  {
    _broker.Setup(b => b.CreateInvoiceAsync(It.IsAny<Invoice>(), It.IsAny<CancellationToken>()))
      .ThrowsAsync(new InvoiceAlreadyExistsException(Guid.NewGuid()));
    var invoice = new Invoice { id = Guid.NewGuid(), UserIdentifier = Guid.NewGuid() };

    // Pass-through: Preserve IAlreadyExistsException marker for correct HTTP 409 mapping
    var ex = await Assert.ThrowsAsync<InvoiceAlreadyExistsException>(
      () => _sut.CreateInvoiceObject(invoice));

    Assert.IsType<InvoiceAlreadyExistsException>(ex);
  }

  /// <summary>Verifies that an <see cref="InvoiceUnauthorizedAccessException"/> from the broker is passed through to preserve IUnauthorizedException marker for correct HTTP 401 mapping.</summary>
  [Fact]
  public async Task ReadInvoiceObject_WhenBrokerThrowsUnauthorized_ThrowsInvoiceUnauthorizedAccessException()
  {
    _broker.Setup(b => b.ReadInvoiceAsync(It.IsAny<Guid>(), It.IsAny<Guid?>(), It.IsAny<CancellationToken>()))
      .ThrowsAsync(new InvoiceUnauthorizedAccessException("unauthorized"));

    // Pass-through: Preserve IUnauthorizedException marker for correct HTTP 401 mapping
    var ex = await Assert.ThrowsAsync<InvoiceUnauthorizedAccessException>(
      () => _sut.ReadInvoiceObject(Guid.NewGuid(), Guid.NewGuid()));

    Assert.IsType<InvoiceUnauthorizedAccessException>(ex);
  }

  /// <summary>Verifies that an <see cref="InvoiceForbiddenAccessException"/> from the broker is passed through to preserve IForbiddenException marker for correct HTTP 403 mapping.</summary>
  [Fact]
  public async Task ReadInvoiceObject_WhenBrokerThrowsForbidden_ThrowsInvoiceForbiddenAccessException()
  {
    _broker.Setup(b => b.ReadInvoiceAsync(It.IsAny<Guid>(), It.IsAny<Guid?>(), It.IsAny<CancellationToken>()))
      .ThrowsAsync(new InvoiceForbiddenAccessException(Guid.NewGuid(), Guid.NewGuid()));

    // Pass-through: Preserve IForbiddenException marker for correct HTTP 403 mapping
    var ex = await Assert.ThrowsAsync<InvoiceForbiddenAccessException>(
      () => _sut.ReadInvoiceObject(Guid.NewGuid(), Guid.NewGuid()));

    Assert.IsType<InvoiceForbiddenAccessException>(ex);
  }

  /// <summary>Verifies that an <see cref="InvoiceCosmosDbRateLimitException"/> from the broker is passed through to preserve IRateLimitedException marker for correct HTTP 429 mapping.</summary>
  [Fact]
  public async Task ReadInvoiceObject_WhenBrokerThrowsRateLimit_ThrowsInvoiceCosmosDbRateLimitException()
  {
    _broker.Setup(b => b.ReadInvoiceAsync(It.IsAny<Guid>(), It.IsAny<Guid?>(), It.IsAny<CancellationToken>()))
      .ThrowsAsync(new InvoiceCosmosDbRateLimitException(TimeSpan.FromSeconds(2), new InvalidOperationException()));

    // Pass-through: Preserve IRateLimitedException marker for correct HTTP 429 mapping
    var ex = await Assert.ThrowsAsync<InvoiceCosmosDbRateLimitException>(
      () => _sut.ReadInvoiceObject(Guid.NewGuid(), Guid.NewGuid()));

    Assert.IsType<InvoiceCosmosDbRateLimitException>(ex);
  }

  /// <summary>Regression guard: <see cref="InvoiceFailedStorageException"/> must remain in the Dependency tier (downstream unreachable, 503).</summary>
  [Fact]
  public async Task ReadInvoiceObject_WhenBrokerThrowsFailedStorage_ThrowsFoundationDependencyException()
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
