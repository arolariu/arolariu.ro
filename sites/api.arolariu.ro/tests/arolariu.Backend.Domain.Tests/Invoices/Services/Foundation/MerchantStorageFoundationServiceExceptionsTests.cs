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

  public MerchantStorageFoundationServiceExceptionsTests()
  {
    _sut = new MerchantStorageFoundationService(_broker.Object, NullLoggerFactory.Instance);
  }

  [Fact]
  public async Task ReadMerchantObject_WhenBrokerThrowsNotFound_ThrowsFoundationDependencyValidationException()
  {
    _broker.Setup(b => b.ReadMerchantAsync(It.IsAny<Guid>(), It.IsAny<Guid?>(), It.IsAny<CancellationToken>()))
      .ThrowsAsync(new MerchantNotFoundException(Guid.NewGuid()));

    var ex = await Assert.ThrowsAsync<MerchantFoundationServiceDependencyValidationException>(
      () => _sut.ReadMerchantObject(Guid.NewGuid(), Guid.NewGuid()));

    Assert.IsType<MerchantNotFoundException>(ex.InnerException);
  }

  [Fact]
  public async Task CreateMerchantObject_WhenBrokerThrowsAlreadyExists_ThrowsFoundationDependencyValidationException()
  {
    _broker.Setup(b => b.CreateMerchantAsync(It.IsAny<Merchant>(), It.IsAny<CancellationToken>()))
      .ThrowsAsync(new MerchantAlreadyExistsException(Guid.NewGuid()));
    var merchant = new Merchant { id = Guid.NewGuid(), ParentCompanyId = Guid.NewGuid() };

    var ex = await Assert.ThrowsAsync<MerchantFoundationServiceDependencyValidationException>(
      () => _sut.CreateMerchantObject(merchant));

    Assert.IsType<MerchantAlreadyExistsException>(ex.InnerException);
  }

  [Fact]
  public async Task ReadMerchantObject_WhenBrokerThrowsRateLimit_ThrowsFoundationDependencyException()
  {
    _broker.Setup(b => b.ReadMerchantAsync(It.IsAny<Guid>(), It.IsAny<Guid?>(), It.IsAny<CancellationToken>()))
      .ThrowsAsync(new MerchantCosmosDbRateLimitException(TimeSpan.FromSeconds(2), new Exception()));

    await Assert.ThrowsAsync<MerchantFoundationServiceDependencyException>(
      () => _sut.ReadMerchantObject(Guid.NewGuid(), Guid.NewGuid()));
  }

  [Fact]
  public async Task ReadMerchantObject_WhenBrokerThrowsFailedStorage_ThrowsFoundationDependencyException()
  {
    _broker.Setup(b => b.ReadMerchantAsync(It.IsAny<Guid>(), It.IsAny<Guid?>(), It.IsAny<CancellationToken>()))
      .ThrowsAsync(new MerchantFailedStorageException("down"));

    await Assert.ThrowsAsync<MerchantFoundationServiceDependencyException>(
      () => _sut.ReadMerchantObject(Guid.NewGuid(), Guid.NewGuid()));
  }

  [Fact]
  public async Task ReadMerchantObject_WhenBrokerThrowsUnknown_ThrowsFoundationServiceException()
  {
    _broker.Setup(b => b.ReadMerchantAsync(It.IsAny<Guid>(), It.IsAny<Guid?>(), It.IsAny<CancellationToken>()))
      .ThrowsAsync(new InvalidOperationException("boom"));

    await Assert.ThrowsAsync<MerchantFoundationServiceException>(
      () => _sut.ReadMerchantObject(Guid.NewGuid(), Guid.NewGuid()));
  }
}
