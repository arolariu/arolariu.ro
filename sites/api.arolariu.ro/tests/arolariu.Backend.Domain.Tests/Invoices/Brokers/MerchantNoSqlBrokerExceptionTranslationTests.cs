namespace arolariu.Backend.Domain.Tests.Invoices.Brokers;

using System;
using System.Net;
using System.Threading;
using System.Threading.Tasks;

using arolariu.Backend.Domain.Invoices.Brokers.DataBrokers.DatabaseBroker;
using arolariu.Backend.Domain.Invoices.DDD.Entities.Merchants;
using arolariu.Backend.Domain.Invoices.DDD.Entities.Merchants.Exceptions.Inner;

using Microsoft.Azure.Cosmos;
using Microsoft.EntityFrameworkCore;

using Moq;

using Xunit;

/// <summary>
/// Tests the translation layer that wraps CosmosException into typed merchant inner exceptions.
/// </summary>
public sealed class MerchantNoSqlBrokerExceptionTranslationTests : InvoiceNoSqlBrokerTestsBase
{
  private InvoiceNoSqlBroker BuildBroker()
  {
    var options = new DbContextOptionsBuilder<InvoiceNoSqlBroker>()
      .UseCosmos("https://localhost:8081", "test-key", "primary")
      .Options;
    return new InvoiceNoSqlBroker(mockCosmosClient.Object, options);
  }

  private static CosmosException MakeCosmosException(HttpStatusCode code) =>
    new("cosmos failure", code, 0, "activity", 0);

  [Fact]
  public async Task ReadMerchantAsync_WhenCosmos404_ThrowsMerchantNotFoundException()
  {
    var broker = BuildBroker();
    var merchantId = Guid.NewGuid();
    var parentCompanyId = Guid.NewGuid();
    mockMerchantsContainer
      .Setup(c => c.ReadItemAsync<Merchant>(merchantId.ToString(), new PartitionKey(parentCompanyId.ToString()),
        It.IsAny<ItemRequestOptions>(), It.IsAny<CancellationToken>()))
      .ThrowsAsync(MakeCosmosException(HttpStatusCode.NotFound));

    await Assert.ThrowsAsync<MerchantNotFoundException>(
      async () => await broker.ReadMerchantAsync(merchantId, parentCompanyId).ConfigureAwait(false));
  }

  [Fact]
  public async Task CreateMerchantAsync_WhenCosmos409_ThrowsMerchantAlreadyExistsException()
  {
    var broker = BuildBroker();
    var merchant = new Merchant { id = Guid.NewGuid(), ParentCompanyId = Guid.NewGuid() };
    mockMerchantsContainer
      .Setup(c => c.CreateItemAsync(merchant, It.IsAny<PartitionKey?>(),
        It.IsAny<ItemRequestOptions>(), It.IsAny<CancellationToken>()))
      .ThrowsAsync(MakeCosmosException(HttpStatusCode.Conflict));

    await Assert.ThrowsAsync<MerchantAlreadyExistsException>(
      async () => await broker.CreateMerchantAsync(merchant).ConfigureAwait(false));
  }

  [Fact]
  public async Task ReadMerchantAsync_WhenCosmos429_ThrowsMerchantCosmosDbRateLimitException()
  {
    var broker = BuildBroker();
    var merchantId = Guid.NewGuid();
    var parentCompanyId = Guid.NewGuid();
    mockMerchantsContainer
      .Setup(c => c.ReadItemAsync<Merchant>(merchantId.ToString(), new PartitionKey(parentCompanyId.ToString()),
        It.IsAny<ItemRequestOptions>(), It.IsAny<CancellationToken>()))
      .ThrowsAsync(MakeCosmosException((HttpStatusCode)429));

    await Assert.ThrowsAsync<MerchantCosmosDbRateLimitException>(
      async () => await broker.ReadMerchantAsync(merchantId, parentCompanyId).ConfigureAwait(false));
  }

  [Fact]
  public async Task ReadMerchantAsync_WhenCosmos503_ThrowsMerchantFailedStorageException()
  {
    var broker = BuildBroker();
    var merchantId = Guid.NewGuid();
    var parentCompanyId = Guid.NewGuid();
    mockMerchantsContainer
      .Setup(c => c.ReadItemAsync<Merchant>(merchantId.ToString(), new PartitionKey(parentCompanyId.ToString()),
        It.IsAny<ItemRequestOptions>(), It.IsAny<CancellationToken>()))
      .ThrowsAsync(MakeCosmosException(HttpStatusCode.ServiceUnavailable));

    await Assert.ThrowsAsync<MerchantFailedStorageException>(
      async () => await broker.ReadMerchantAsync(merchantId, parentCompanyId).ConfigureAwait(false));
  }

  [Fact]
  public async Task ReadMerchantAsync_WhenCosmos401_ThrowsMerchantUnauthorizedAccessException()
  {
    var broker = BuildBroker();
    var merchantId = Guid.NewGuid();
    var parentCompanyId = Guid.NewGuid();
    mockMerchantsContainer
      .Setup(c => c.ReadItemAsync<Merchant>(merchantId.ToString(), new PartitionKey(parentCompanyId.ToString()),
        It.IsAny<ItemRequestOptions>(), It.IsAny<CancellationToken>()))
      .ThrowsAsync(MakeCosmosException(HttpStatusCode.Unauthorized));

    await Assert.ThrowsAsync<MerchantUnauthorizedAccessException>(
      async () => await broker.ReadMerchantAsync(merchantId, parentCompanyId).ConfigureAwait(false));
  }

  [Fact]
  public async Task ReadMerchantAsync_WhenCosmos403_ThrowsMerchantForbiddenAccessException()
  {
    var broker = BuildBroker();
    var merchantId = Guid.NewGuid();
    var parentCompanyId = Guid.NewGuid();
    mockMerchantsContainer
      .Setup(c => c.ReadItemAsync<Merchant>(merchantId.ToString(), new PartitionKey(parentCompanyId.ToString()),
        It.IsAny<ItemRequestOptions>(), It.IsAny<CancellationToken>()))
      .ThrowsAsync(MakeCosmosException(HttpStatusCode.Forbidden));

    await Assert.ThrowsAsync<MerchantForbiddenAccessException>(
      async () => await broker.ReadMerchantAsync(merchantId, parentCompanyId).ConfigureAwait(false));
  }

  [Fact]
  public async Task ReadMerchantAsync_WhenMerchantSoftDeleted_ThrowsMerchantLockedException()
  {
    var broker = BuildBroker();
    var merchantId = Guid.NewGuid();
    var parentCompanyId = Guid.NewGuid();
    var softDeleted = new Merchant { id = merchantId, ParentCompanyId = parentCompanyId };
    softDeleted.SoftDelete();
    var responseMock = new Mock<ItemResponse<Merchant>>();
    responseMock.SetupGet(r => r.Resource).Returns(softDeleted);
    responseMock.SetupGet(r => r.RequestCharge).Returns(0);
    mockMerchantsContainer
      .Setup(c => c.ReadItemAsync<Merchant>(merchantId.ToString(), new PartitionKey(parentCompanyId.ToString()),
        It.IsAny<ItemRequestOptions>(), It.IsAny<CancellationToken>()))
      .ReturnsAsync(responseMock.Object);

    await Assert.ThrowsAsync<MerchantLockedException>(
      async () => await broker.ReadMerchantAsync(merchantId, parentCompanyId));
  }
}
