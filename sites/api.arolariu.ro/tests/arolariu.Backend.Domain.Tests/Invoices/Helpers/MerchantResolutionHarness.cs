namespace arolariu.Backend.Domain.Tests.Invoices.Helpers;

using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;

using arolariu.Backend.Domain.Invoices.Brokers.DataBrokers.DatabaseBroker;
using arolariu.Backend.Domain.Invoices.DDD.Entities.Merchants;
using arolariu.Backend.Domain.Invoices.Services.Foundation.MerchantStorage;
using arolariu.Backend.Domain.Invoices.Services.Orchestration.MerchantService;
using arolariu.Backend.Domain.Tests.Builders;

using Microsoft.Azure.Cosmos;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;

using Moq;

internal sealed class MerchantResolutionHarness : IDisposable
{
  private readonly Mock<CosmosClient> mockCosmosClient;
  private readonly Mock<Database> mockDatabase;
  private readonly Mock<Container> mockMerchantsContainer;
  private readonly CosmosDatabaseBroker broker;
  private readonly ILoggerFactory loggerFactory;

  private MerchantResolutionHarness(
    IEnumerable<IEnumerable<Merchant>> merchantPages,
    Action<int, CancellationToken>? onPageRead = null)
  {
    mockCosmosClient = new Mock<CosmosClient>();
    mockDatabase = new Mock<Database>();
    mockMerchantsContainer = new Mock<Container>();

    mockCosmosClient
      .Setup(client => client.GetDatabase(It.IsAny<string>()))
      .Returns(mockDatabase.Object);

    mockDatabase
      .Setup(database => database.GetContainer("merchants"))
      .Returns(mockMerchantsContainer.Object);

    ConfigureMerchantQuery(merchantPages, onPageRead);

    var options = new DbContextOptionsBuilder<CosmosDatabaseBroker>()
      .UseCosmos("https://localhost:8081", "test-key", "primary")
      .Options;

    loggerFactory = LoggerFactory.Create(_ => { });

    broker = new CosmosDatabaseBroker(mockCosmosClient.Object, options);

    var storageService = new MerchantStorageFoundationService(
      broker,
      loggerFactory);

    Service = new MerchantOrchestrationService(
      storageService,
      loggerFactory);
  }

  internal IMerchantOrchestrationService Service { get; }
  internal int QueryIteratorInvocationCount { get; private set; }
  internal int FeedReadInvocationCount { get; private set; }
  internal CancellationToken LastObservedCancellationToken { get; private set; }

  internal static MerchantResolutionHarness WithStoredMerchant(
    string name,
    bool isSoftDeleted = false)
  {
    var merchant = MerchantTestDataBuilder.CreateMerchantWithSpecificProperties(name: name);

    if (isSoftDeleted)
    {
      merchant.SoftDelete();
    }

    return new MerchantResolutionHarness([[merchant]]);
  }

  internal static MerchantResolutionHarness WithStoredMerchants(params Merchant[] merchants) =>
    new([merchants]);

  internal static MerchantResolutionHarness WithStoredMerchantPages(
    params Merchant[][] merchantPages) =>
    new(merchantPages);

  internal static MerchantResolutionHarness WithStoredMerchantPages(
    Action<int, CancellationToken> onPageRead,
    params Merchant[][] merchantPages) =>
    new(merchantPages, onPageRead);

  internal async Task<Merchant?> FindAsync(
    string normalizedName,
    CancellationToken cancellationToken = default) =>
    await Service
      .FindMerchantByNormalizedNameObject(normalizedName, cancellationToken)
      .ConfigureAwait(false);

  public void Dispose()
  {
    broker.Dispose();
    loggerFactory.Dispose();
    GC.SuppressFinalize(this);
  }

  private void ConfigureMerchantQuery(
    IEnumerable<IEnumerable<Merchant>> merchantsPages,
    Action<int, CancellationToken>? onPageRead)
  {
    IReadOnlyList<FeedResponse<Merchant>> feedResponses =
    [
      .. merchantsPages.Select(CreateFeedResponse),
    ];

    var feedIteratorMock = new Mock<FeedIterator<Merchant>>();
    var hasMoreResultsSequence = feedIteratorMock.SetupSequence(iterator => iterator.HasMoreResults);

    foreach (FeedResponse<Merchant> _ in feedResponses)
    {
      hasMoreResultsSequence = hasMoreResultsSequence.Returns(true);
    }

    hasMoreResultsSequence.Returns(false);

    int pageIndex = 0;

    feedIteratorMock
      .Setup(iterator => iterator.ReadNextAsync(It.IsAny<CancellationToken>()))
      .Returns((CancellationToken cancellationToken) =>
      {
        LastObservedCancellationToken = cancellationToken;
        FeedReadInvocationCount++;
        onPageRead?.Invoke(pageIndex, cancellationToken);

        FeedResponse<Merchant> response = feedResponses[pageIndex];
        pageIndex++;

        return Task.FromResult(response);
      });

    mockMerchantsContainer
      .Setup(container => container.GetItemQueryIterator<Merchant>(
        It.IsAny<QueryDefinition>(),
        It.IsAny<string>(),
        It.IsAny<QueryRequestOptions>()))
      .Callback(() => QueryIteratorInvocationCount++)
      .Returns(feedIteratorMock.Object);
  }

  private static FeedResponse<Merchant> CreateFeedResponse(IEnumerable<Merchant> merchants)
  {
    IReadOnlyList<Merchant> merchantList = [.. merchants];
    var feedResponseMock = new Mock<FeedResponse<Merchant>>();
    feedResponseMock.SetupGet(response => response.Resource).Returns(merchantList);
    feedResponseMock.SetupGet(response => response.RequestCharge).Returns(1.0);
    feedResponseMock.Setup(response => response.GetEnumerator()).Returns(() => merchantList.GetEnumerator());
    return feedResponseMock.Object;
  }
}
