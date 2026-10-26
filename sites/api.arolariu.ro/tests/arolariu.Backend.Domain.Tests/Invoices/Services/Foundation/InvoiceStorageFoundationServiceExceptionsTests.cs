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

using Microsoft.VisualStudio.TestTools.UnitTesting;

/// <summary>
/// Verifies that inner exceptions propagated from the Cosmos broker are classified
/// into the proper Foundation-tier outer exceptions by the TryCatch boundary.
/// </summary>
[TestClass]
public class InvoiceStorageFoundationServiceExceptionsTests
{
  private readonly Mock<IDatabaseBroker> _broker = new();
  private readonly InvoiceStorageFoundationService _sut;

  /// <summary>Initializes a new instance of the <see cref="InvoiceStorageFoundationServiceExceptionsTests"/> class.</summary>
  public InvoiceStorageFoundationServiceExceptionsTests()
  {
    _sut = new InvoiceStorageFoundationService(_broker.Object, NullLoggerFactory.Instance);
  }

  /// <summary>Verifies that an <see cref="InvoiceNotFoundException"/> from the broker is wrapped into an <see cref="InvoiceFoundationDependencyValidationException"/>.</summary>
  [TestMethod]
  public async Task ReadInvoiceObject_WhenBrokerThrowsNotFound_ThrowsFoundationDependencyValidationException()
  {
    _broker.Setup(b => b.ReadInvoiceAsync(It.IsAny<Guid>(), It.IsAny<Guid?>(), It.IsAny<CancellationToken>()))
      .ThrowsAsync(new InvoiceNotFoundException(Guid.NewGuid()));

    var ex = await Assert.ThrowsExactlyAsync<InvoiceFoundationDependencyValidationException>(
      () => _sut.ReadInvoiceObject(Guid.NewGuid(), Guid.NewGuid(), CancellationToken.None));

    Assert.IsExactInstanceOfType<InvoiceNotFoundException>(ex.InnerException);
  }

  /// <summary>Verifies that an <see cref="InvoiceAlreadyExistsException"/> from the broker is wrapped into an <see cref="InvoiceFoundationDependencyValidationException"/>.</summary>
  [TestMethod]
  public async Task CreateInvoiceObject_WhenBrokerThrowsAlreadyExists_ThrowsFoundationDependencyValidationException()
  {
    _broker.Setup(b => b.CreateInvoiceAsync(It.IsAny<Invoice>(), It.IsAny<CancellationToken>()))
      .ThrowsAsync(new InvoiceAlreadyExistsException(Guid.NewGuid()));
    var invoice = new Invoice { id = Guid.NewGuid(), UserIdentifier = Guid.NewGuid() };

    var ex = await Assert.ThrowsExactlyAsync<InvoiceFoundationDependencyValidationException>(
      () => _sut.CreateInvoiceObject(invoice, null, CancellationToken.None));

    Assert.IsExactInstanceOfType<InvoiceAlreadyExistsException>(ex.InnerException);
  }

  /// <summary>Verifies that an <see cref="InvoiceUnauthorizedAccessException"/> from the broker is wrapped into an <see cref="InvoiceFoundationDependencyValidationException"/> (caller-correctable 401, not 503).</summary>
  [TestMethod]
  public async Task ReadInvoiceObject_WhenBrokerThrowsUnauthorized_ThrowsFoundationDependencyValidationException()
  {
    _broker.Setup(b => b.ReadInvoiceAsync(It.IsAny<Guid>(), It.IsAny<Guid?>(), It.IsAny<CancellationToken>()))
      .ThrowsAsync(new InvoiceUnauthorizedAccessException("unauthorized"));

    var ex = await Assert.ThrowsExactlyAsync<InvoiceFoundationDependencyValidationException>(
      () => _sut.ReadInvoiceObject(Guid.NewGuid(), Guid.NewGuid(), CancellationToken.None));

    Assert.IsExactInstanceOfType<InvoiceUnauthorizedAccessException>(ex.InnerException);
  }

  /// <summary>Verifies that an <see cref="InvoiceForbiddenAccessException"/> from the broker is wrapped into an <see cref="InvoiceFoundationDependencyValidationException"/> (caller-correctable 403, not 503).</summary>
  [TestMethod]
  public async Task ReadInvoiceObject_WhenBrokerThrowsForbidden_ThrowsFoundationDependencyValidationException()
  {
    _broker.Setup(b => b.ReadInvoiceAsync(It.IsAny<Guid>(), It.IsAny<Guid?>(), It.IsAny<CancellationToken>()))
      .ThrowsAsync(new InvoiceForbiddenAccessException(Guid.NewGuid(), Guid.NewGuid()));

    var ex = await Assert.ThrowsExactlyAsync<InvoiceFoundationDependencyValidationException>(
      () => _sut.ReadInvoiceObject(Guid.NewGuid(), Guid.NewGuid(), CancellationToken.None));

    Assert.IsExactInstanceOfType<InvoiceForbiddenAccessException>(ex.InnerException);
  }

  /// <summary>Verifies that an <see cref="InvoiceCosmosDbRateLimitException"/> from the broker is wrapped into an <see cref="InvoiceFoundationDependencyValidationException"/> (caller-correctable 429, not 503).</summary>
  [TestMethod]
  public async Task ReadInvoiceObject_WhenBrokerThrowsRateLimit_ThrowsFoundationDependencyValidationException()
  {
    _broker.Setup(b => b.ReadInvoiceAsync(It.IsAny<Guid>(), It.IsAny<Guid?>(), It.IsAny<CancellationToken>()))
      .ThrowsAsync(new InvoiceCosmosDbRateLimitException(TimeSpan.FromSeconds(2), new InvalidOperationException()));

    var ex = await Assert.ThrowsExactlyAsync<InvoiceFoundationDependencyValidationException>(
      () => _sut.ReadInvoiceObject(Guid.NewGuid(), Guid.NewGuid(), CancellationToken.None));

    Assert.IsExactInstanceOfType<InvoiceCosmosDbRateLimitException>(ex.InnerException);
  }

  /// <summary>Regression guard: <see cref="InvoiceFailedStorageException"/> must remain in the Dependency tier (downstream unreachable, 503).</summary>
  [TestMethod]
  public async Task ReadInvoiceObject_WhenBrokerThrowsFailedStorage_ThrowsFoundationDependencyException()
  {
    _broker.Setup(b => b.ReadInvoiceAsync(It.IsAny<Guid>(), It.IsAny<Guid?>(), It.IsAny<CancellationToken>()))
      .ThrowsAsync(new InvoiceFailedStorageException("down"));

    var ex = await Assert.ThrowsExactlyAsync<InvoiceFoundationDependencyException>(
      () => _sut.ReadInvoiceObject(Guid.NewGuid(), Guid.NewGuid(), CancellationToken.None));

    Assert.IsExactInstanceOfType<InvoiceFailedStorageException>(ex.InnerException);
  }

  /// <summary>Verifies that an unclassified exception from the broker is wrapped into an <see cref="InvoiceFoundationServiceException"/>.</summary>
  [TestMethod]
  public async Task ReadInvoiceObject_WhenBrokerThrowsUnknown_ThrowsFoundationServiceException()
  {
    _broker.Setup(b => b.ReadInvoiceAsync(It.IsAny<Guid>(), It.IsAny<Guid?>(), It.IsAny<CancellationToken>()))
      .ThrowsAsync(new InvalidOperationException("boom"));

    await Assert.ThrowsExactlyAsync<InvoiceFoundationServiceException>(
      () => _sut.ReadInvoiceObject(Guid.NewGuid(), Guid.NewGuid(), CancellationToken.None));
  }
}
