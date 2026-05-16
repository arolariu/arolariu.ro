namespace arolariu.Backend.Domain.Tests.Invoices.Services.Foundation;

using System;
using System.Threading;
using System.Threading.Tasks;

using arolariu.Backend.Domain.Invoices.Brokers.DatabaseBroker;
using arolariu.Backend.Domain.Invoices.DDD.Entities.Merchants;
using arolariu.Backend.Domain.Invoices.DDD.Entities.Merchants.Exceptions.Inner;
using arolariu.Backend.Domain.Invoices.DDD.Entities.Merchants.Exceptions.Outer.Foundation;
using arolariu.Backend.Domain.Invoices.Services.Foundation.MerchantStorage;

using Microsoft.Extensions.Logging.Abstractions;

using Moq;

using Xunit;

/// <summary>
/// Verifies that inner exceptions propagated from the Cosmos broker are classified
/// into the proper Foundation-tier outer exceptions by the TryCatch boundary.
/// </summary>
public class MerchantStorageFoundationServiceExceptionsTests
{
  private readonly Mock<IInvoiceNoSqlBroker> _broker = new();
  private readonly MerchantStorageFoundationService _sut;

  /// <summary>Initializes a new instance of the <see cref="MerchantStorageFoundationServiceExceptionsTests"/> class.</summary>
  public MerchantStorageFoundationServiceExceptionsTests()
  {
    _sut = new MerchantStorageFoundationService(_broker.Object, NullLoggerFactory.Instance);
  }

  /// <summary>Verifies that a <see cref="MerchantNotFoundException"/> from the broker is wrapped into a <see cref="MerchantFoundationServiceDependencyValidationException"/>.</summary>
  [Fact]
  public async Task ReadMerchantObject_WhenBrokerThrowsNotFound_ThrowsMerchantNotFoundException()
  {
    _broker.Setup(b => b.ReadMerchantAsync(It.IsAny<Guid>(), It.IsAny<Guid?>(), It.IsAny<CancellationToken>()))
      .ThrowsAsync(new MerchantNotFoundException(Guid.NewGuid()));

    // Pass-through: Preserve INotFoundException marker for correct HTTP 404 mapping
    var ex = await Assert.ThrowsAsync<MerchantNotFoundException>(
      () => _sut.ReadMerchantObject(Guid.NewGuid(), Guid.NewGuid()));

    Assert.IsType<MerchantNotFoundException>(ex);
  }

  /// <summary>Verifies that a <see cref="MerchantAlreadyExistsException"/> from the broker is passed through to preserve IAlreadyExistsException marker for correct HTTP 409 mapping.</summary>
  [Fact]
  public async Task CreateMerchantObject_WhenBrokerThrowsAlreadyExists_ThrowsMerchantAlreadyExistsException()
  {
    _broker.Setup(b => b.CreateMerchantAsync(It.IsAny<Merchant>(), It.IsAny<CancellationToken>()))
      .ThrowsAsync(new MerchantAlreadyExistsException(Guid.NewGuid()));
    var merchant = new Merchant { id = Guid.NewGuid(), ParentCompanyId = Guid.NewGuid() };

    // Pass-through: Preserve IAlreadyExistsException marker for correct HTTP 409 mapping
    var ex = await Assert.ThrowsAsync<MerchantAlreadyExistsException>(
      () => _sut.CreateMerchantObject(merchant));

    Assert.IsType<MerchantAlreadyExistsException>(ex);
  }

  /// <summary>Verifies that a <see cref="MerchantUnauthorizedAccessException"/> from the broker is passed through to preserve IUnauthorizedException marker for correct HTTP 401 mapping.</summary>
  [Fact]
  public async Task ReadMerchantObject_WhenBrokerThrowsUnauthorized_ThrowsMerchantUnauthorizedAccessException()
  {
    _broker.Setup(b => b.ReadMerchantAsync(It.IsAny<Guid>(), It.IsAny<Guid?>(), It.IsAny<CancellationToken>()))
      .ThrowsAsync(new MerchantUnauthorizedAccessException("unauthorized"));

    // Pass-through: Preserve IUnauthorizedException marker for correct HTTP 401 mapping
    var ex = await Assert.ThrowsAsync<MerchantUnauthorizedAccessException>(
      () => _sut.ReadMerchantObject(Guid.NewGuid(), Guid.NewGuid()));

    Assert.IsType<MerchantUnauthorizedAccessException>(ex);
  }

  /// <summary>Verifies that a <see cref="MerchantForbiddenAccessException"/> from the broker is passed through to preserve IForbiddenException marker for correct HTTP 403 mapping.</summary>
  [Fact]
  public async Task ReadMerchantObject_WhenBrokerThrowsForbidden_ThrowsMerchantForbiddenAccessException()
  {
    _broker.Setup(b => b.ReadMerchantAsync(It.IsAny<Guid>(), It.IsAny<Guid?>(), It.IsAny<CancellationToken>()))
      .ThrowsAsync(new MerchantForbiddenAccessException(Guid.NewGuid(), Guid.NewGuid()));

    // Pass-through: Preserve IForbiddenException marker for correct HTTP 403 mapping
    var ex = await Assert.ThrowsAsync<MerchantForbiddenAccessException>(
      () => _sut.ReadMerchantObject(Guid.NewGuid(), Guid.NewGuid()));

    Assert.IsType<MerchantForbiddenAccessException>(ex);
  }

  /// <summary>Verifies that a <see cref="MerchantCosmosDbRateLimitException"/> from the broker is passed through to preserve IRateLimitedException marker for correct HTTP 429 mapping.</summary>
  [Fact]
  public async Task ReadMerchantObject_WhenBrokerThrowsRateLimit_ThrowsMerchantCosmosDbRateLimitException()
  {
    _broker.Setup(b => b.ReadMerchantAsync(It.IsAny<Guid>(), It.IsAny<Guid?>(), It.IsAny<CancellationToken>()))
      .ThrowsAsync(new MerchantCosmosDbRateLimitException(TimeSpan.FromSeconds(2), new InvalidOperationException()));

    // Pass-through: Preserve IRateLimitedException marker for correct HTTP 429 mapping
    var ex = await Assert.ThrowsAsync<MerchantCosmosDbRateLimitException>(
      () => _sut.ReadMerchantObject(Guid.NewGuid(), Guid.NewGuid()));

    Assert.IsType<MerchantCosmosDbRateLimitException>(ex);
  }

  /// <summary>Regression guard: <see cref="MerchantFailedStorageException"/> must remain in the Dependency tier (downstream unreachable, 503).</summary>
  [Fact]
  public async Task ReadMerchantObject_WhenBrokerThrowsFailedStorage_ThrowsFoundationDependencyException()
  {
    _broker.Setup(b => b.ReadMerchantAsync(It.IsAny<Guid>(), It.IsAny<Guid?>(), It.IsAny<CancellationToken>()))
      .ThrowsAsync(new MerchantFailedStorageException("down"));

    var ex = await Assert.ThrowsAsync<MerchantFoundationServiceDependencyException>(
      () => _sut.ReadMerchantObject(Guid.NewGuid(), Guid.NewGuid()));

    Assert.IsType<MerchantFailedStorageException>(ex.InnerException);
  }

  /// <summary>Verifies that an unclassified exception from the broker is wrapped into a <see cref="MerchantFoundationServiceException"/>.</summary>
  [Fact]
  public async Task ReadMerchantObject_WhenBrokerThrowsUnknown_ThrowsFoundationServiceException()
  {
    _broker.Setup(b => b.ReadMerchantAsync(It.IsAny<Guid>(), It.IsAny<Guid?>(), It.IsAny<CancellationToken>()))
      .ThrowsAsync(new InvalidOperationException("boom"));

    await Assert.ThrowsAsync<MerchantFoundationServiceException>(
      () => _sut.ReadMerchantObject(Guid.NewGuid(), Guid.NewGuid()));
  }
}
