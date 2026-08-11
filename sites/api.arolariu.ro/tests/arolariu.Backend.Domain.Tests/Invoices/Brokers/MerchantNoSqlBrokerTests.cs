namespace arolariu.Backend.Domain.Tests.Invoices.Brokers;

using System;
using System.Collections.Generic;
using System.Linq;
using System.Net;
using System.Threading;
using System.Threading.Tasks;

using arolariu.Backend.Domain.Invoices.Brokers.DataBrokers.DatabaseBroker;
using arolariu.Backend.Domain.Invoices.DDD.Entities.Merchants;
using arolariu.Backend.Domain.Invoices.DDD.Entities.Merchants.Exceptions.Inner;
using arolariu.Backend.Domain.Tests.Builders;

using Microsoft.Azure.Cosmos;
using Microsoft.EntityFrameworkCore;

using Moq;

using Microsoft.VisualStudio.TestTools.UnitTesting;

/// <summary>
/// Comprehensive test suite for <see cref="InvoiceNoSqlBroker"/> merchant operations following project test standards.
/// Covers CRUD operations, exception pathways and query filtering scenarios. Method names follow
/// the MethodName_Condition_ExpectedResult pattern by design; CA1707 suppressed accordingly.
/// </summary>
[TestClass]
public sealed partial class MerchantNoSqlBrokerTests : InvoiceNoSqlBrokerTestsBase, IDisposable
{
  private readonly InvoiceNoSqlBroker merchantNoSqlBroker;
  private readonly DbContextOptions<InvoiceNoSqlBroker> dbContextOptions;

  /// <summary>Initializes a new instance configuring an in-memory Cosmos emulator context.</summary>
  public MerchantNoSqlBrokerTests()
  {
    dbContextOptions = new DbContextOptionsBuilder<InvoiceNoSqlBroker>()
      .UseCosmos(
        accountEndpoint: "https://localhost:8081/",
        accountKey: "testKey",
        databaseName: "TestDb")
      .Options;

    merchantNoSqlBroker = new InvoiceNoSqlBroker(mockCosmosClient.Object, dbContextOptions);
  }

  /// <summary>Disposes the underlying broker context and suppresses finalization.</summary>
  public void Dispose()
  {
    merchantNoSqlBroker?.Dispose();
    GC.SuppressFinalize(this);
  }

  #region CreateMerchantAsync Tests

  /// <summary>Verifies a valid merchant is persisted via CreateMerchantAsync.</summary>
  [TestMethod]
  [DynamicData(nameof(GetMerchantTestData))]
  public async Task ShouldCreateMerchant_WhenMerchantIsValid(Merchant expectedMerchant)
  {
    ArgumentNullException.ThrowIfNull(expectedMerchant);
    // Given
    var itemResponseMock = new Mock<ItemResponse<Merchant>>();
    itemResponseMock.Setup(response => response.Resource).Returns(expectedMerchant);

    mockMerchantsContainer.Setup(container => container.CreateItemAsync(
        It.IsAny<Merchant>(),
     It.IsAny<PartitionKey?>(),
        It.IsAny<ItemRequestOptions>(),
  It.IsAny<System.Threading.CancellationToken>()
      ))
      .ReturnsAsync(itemResponseMock.Object);

    // When
    var actualMerchant = await merchantNoSqlBroker.CreateMerchantAsync(expectedMerchant, CancellationToken.None);

    // Then
    Assert.IsNotNull(actualMerchant);
    Assert.AreEqual(expectedMerchant.id, actualMerchant.id);
    Assert.AreEqual(expectedMerchant.ParentCompanyId, actualMerchant.ParentCompanyId);
    Assert.AreEqual(expectedMerchant.Name, actualMerchant.Name);

    mockMerchantsContainer.Verify(container => container.CreateItemAsync(
        expectedMerchant,
        It.IsAny<PartitionKey?>(),
        It.IsAny<ItemRequestOptions>(),
        It.IsAny<System.Threading.CancellationToken>()
      ), Times.Once);
  }

  /// <summary>Ensures passing null merchant throws an exception.</summary>
  [TestMethod]
  public async Task ShouldThrowException_WhenMerchantIsNull()
  {
    // Given
    Merchant? nullMerchant = null;

    // When & Then
    // Broker does not perform explicit null check, so NullReferenceException is thrown
    await Assert.ThrowsAsync<Exception>(() => merchantNoSqlBroker.CreateMerchantAsync(nullMerchant!, CancellationToken.None).AsTask());
  }

  /// <summary>Validates Cosmos exception surfaces when container create fails.</summary>
  [TestMethod]
  public async Task ShouldTranslateCosmosException_WhenCreateMerchantFails()
  {
    // Given
    var merchant = MerchantTestDataBuilder.CreateRandomMerchant();
    var cosmosException = new CosmosException("Creation failed", HttpStatusCode.BadRequest, 400, "", 0);

    mockMerchantsContainer.Setup(container => container.CreateItemAsync(
   It.IsAny<Merchant>(),
        It.IsAny<PartitionKey?>(),
        It.IsAny<ItemRequestOptions>(),
It.IsAny<System.Threading.CancellationToken>()
 ))
      .ThrowsAsync(cosmosException);

    // When & Then
    var exception = await Assert.ThrowsExactlyAsync<MerchantFailedStorageException>(() => merchantNoSqlBroker.CreateMerchantAsync(merchant, CancellationToken.None).AsTask());
    Assert.AreSame(cosmosException, exception.InnerException);
  }

  #endregion

  #region ReadMerchantAsync Tests

  /// <summary>Ensures a merchant can be read when it exists.</summary>
  [TestMethod]
  [DynamicData(nameof(GetMerchantTestData))]
  public async Task ShouldReadMerchant_WhenMerchantExists(Merchant expectedMerchant)
  {
    ArgumentNullException.ThrowIfNull(expectedMerchant);
    // Given
    var merchantList = new List<Merchant> { expectedMerchant };
    var feedResponseMock = new Mock<FeedResponse<Merchant>>();
    feedResponseMock.Setup(response => response.Resource).Returns(merchantList);
    feedResponseMock.Setup(response => response.GetEnumerator())
      .Returns(merchantList.GetEnumerator());
    feedResponseMock.Setup(response => response.StatusCode).Returns(HttpStatusCode.OK);

    var mockFeedIterator = new Mock<FeedIterator<Merchant>>();
    mockFeedIterator.Setup(iterator => iterator.HasMoreResults).Returns(true);
    mockFeedIterator.Setup(iterator => iterator.ReadNextAsync(It.IsAny<System.Threading.CancellationToken>()))
      .ReturnsAsync(feedResponseMock.Object)
      .Callback(() => mockFeedIterator.Setup(iterator => iterator.HasMoreResults).Returns(false));

    mockMerchantsContainer.Setup(container => container.GetItemQueryIterator<Merchant>(
        It.IsAny<QueryDefinition>(),
        It.IsAny<string>(),
        It.IsAny<QueryRequestOptions>()
      ))
      .Returns(mockFeedIterator.Object);

    // When
    var actualMerchant = await merchantNoSqlBroker.ReadMerchantAsync(expectedMerchant.id, null, CancellationToken.None);

    // Then
    Assert.IsNotNull(actualMerchant);
    Assert.AreEqual(expectedMerchant.id, actualMerchant.id);
    Assert.AreEqual(expectedMerchant.ParentCompanyId, actualMerchant.ParentCompanyId);
  }

  /// <summary>Returns null when merchant does not exist.</summary>
  [TestMethod]
  public async Task ShouldReturnNull_WhenMerchantNotFound()
  {
    // Given
    var merchantId = Guid.NewGuid();
    var emptyList = new List<Merchant>();
    var feedResponseMock = new Mock<FeedResponse<Merchant>>();
    feedResponseMock.Setup(response => response.Resource).Returns(emptyList);
    feedResponseMock.Setup(response => response.GetEnumerator()).Returns(emptyList.GetEnumerator());
    feedResponseMock.Setup(response => response.StatusCode).Returns(HttpStatusCode.NotFound);

    var mockFeedIterator = new Mock<FeedIterator<Merchant>>();
    mockFeedIterator.Setup(iterator => iterator.HasMoreResults).Returns(true);
    mockFeedIterator.Setup(iterator => iterator.ReadNextAsync(It.IsAny<System.Threading.CancellationToken>()))
          .ReturnsAsync(feedResponseMock.Object)
          .Callback(() => mockFeedIterator.Setup(iterator => iterator.HasMoreResults).Returns(false));

    mockMerchantsContainer.Setup(container => container.GetItemQueryIterator<Merchant>(
        It.IsAny<QueryDefinition>(),
        It.IsAny<string>(),
   It.IsAny<QueryRequestOptions>()
      ))
      .Returns(mockFeedIterator.Object);

    // When
    var actualMerchant = await merchantNoSqlBroker.ReadMerchantAsync(merchantId, null, CancellationToken.None);
    Assert.IsNull(actualMerchant);
  }

  #endregion

  #region ReadMerchantsAsync Tests

  /// <summary>Reads merchants filtered by parent company id.</summary>
  [TestMethod]
  public async Task ShouldReadMerchantsByParentCompanyId_WhenMerchantsExist()
  {
    // Given
    var parentCompanyId = Guid.NewGuid();
    var expectedMerchants = MerchantTestDataBuilder.CreateMultipleRandomMerchants(2);
    expectedMerchants.ForEach(m => m.ParentCompanyId = parentCompanyId);

    var feedResponseMock = new Mock<FeedResponse<Merchant>>();
    feedResponseMock.Setup(response => response.Resource).Returns(expectedMerchants);
    feedResponseMock.Setup(response => response.GetEnumerator())
   .Returns(expectedMerchants.GetEnumerator());

    var mockFeedIterator = new Mock<FeedIterator<Merchant>>();
    mockFeedIterator.Setup(iterator => iterator.HasMoreResults).Returns(true);
    mockFeedIterator.Setup(iterator => iterator.ReadNextAsync(It.IsAny<System.Threading.CancellationToken>()))
      .ReturnsAsync(feedResponseMock.Object)
      .Callback(() => mockFeedIterator.Setup(iterator => iterator.HasMoreResults).Returns(false));

    mockMerchantsContainer.Setup(container => container.GetItemQueryIterator<Merchant>(
        It.IsAny<QueryDefinition>(),
        It.IsAny<string>(),
        It.IsAny<QueryRequestOptions>()
      ))
      .Returns(mockFeedIterator.Object);

    // When
    var actualMerchants = await merchantNoSqlBroker.ReadMerchantsAsync(parentCompanyId, CancellationToken.None);

    // Then
    Assert.IsNotNull(actualMerchants);
    Assert.AreEqual(expectedMerchants.Count, actualMerchants.Count());
    foreach (var merchant in actualMerchants)
    {
      Assert.AreEqual(parentCompanyId, merchant.ParentCompanyId);
    }
  }

  #endregion

  #region UpdateMerchantAsync Tests

  /// <summary>Updates a merchant by identifier, verifying replace semantics.</summary>
  [TestMethod]
  [DynamicData(nameof(GetMerchantTestData))]
  public async Task ShouldUpdateMerchantById_WhenValidMerchantProvided(Merchant originalMerchant)
  {
    ArgumentNullException.ThrowIfNull(originalMerchant);
    // Given
    var updatedMerchant = MerchantTestDataBuilder.CreateMerchantWithSpecificProperties(
      id: originalMerchant.id,
      parentCompanyId: originalMerchant.ParentCompanyId,
      name: "Updated Merchant Name");

    // Setup ReadMerchantAsync mock
    var merchantList = new List<Merchant> { originalMerchant };
    var readFeedResponseMock = new Mock<FeedResponse<Merchant>>();
    readFeedResponseMock.Setup(response => response.Resource).Returns(merchantList);
    readFeedResponseMock.Setup(response => response.GetEnumerator())
      .Returns(merchantList.GetEnumerator());
    readFeedResponseMock.Setup(response => response.StatusCode).Returns(HttpStatusCode.OK);

    var readMockFeedIterator = new Mock<FeedIterator<Merchant>>();
    readMockFeedIterator.Setup(iterator => iterator.HasMoreResults).Returns(true);
    readMockFeedIterator.Setup(iterator => iterator.ReadNextAsync(It.IsAny<System.Threading.CancellationToken>()))
         .ReturnsAsync(readFeedResponseMock.Object)
         .Callback(() => readMockFeedIterator.Setup(iterator => iterator.HasMoreResults).Returns(false));

    mockMerchantsContainer.Setup(container => container.GetItemQueryIterator<Merchant>(
        It.IsAny<QueryDefinition>(),
        It.IsAny<string>(),
        It.IsAny<QueryRequestOptions>()
      ))
      .Returns(readMockFeedIterator.Object);

    // Setup ReplaceItemAsync mock
    var itemResponseMock = new Mock<ItemResponse<Merchant>>();
    itemResponseMock.Setup(response => response.Resource).Returns(updatedMerchant);

    mockMerchantsContainer.Setup(container => container.ReplaceItemAsync(
        updatedMerchant,
        originalMerchant.id.ToString(),
        new PartitionKey(originalMerchant.ParentCompanyId.ToString()),
        It.IsAny<ItemRequestOptions>(),
        It.IsAny<System.Threading.CancellationToken>()
      ))
      .ReturnsAsync(itemResponseMock.Object);

    // When
    var actualMerchant = await merchantNoSqlBroker.UpdateMerchantAsync(originalMerchant.id, updatedMerchant, CancellationToken.None);

    // Then
    Assert.IsNotNull(actualMerchant);
    Assert.AreEqual(updatedMerchant.id, actualMerchant.id);
    Assert.AreEqual("Updated Merchant Name", actualMerchant.Name);
  }

  /// <summary>Updates merchant via object upsert semantics.</summary>
  [TestMethod]
  [DynamicData(nameof(GetMerchantTestData))]
  public async Task ShouldUpdateMerchantWithObjects_WhenValidMerchantsProvided(Merchant originalMerchant)
  {
    ArgumentNullException.ThrowIfNull(originalMerchant);
    // Given
    var updatedMerchant = MerchantTestDataBuilder.CreateMerchantWithSpecificProperties(
      id: originalMerchant.id,
      parentCompanyId: originalMerchant.ParentCompanyId,
      name: "Updated Name");

    var itemResponseMock = new Mock<ItemResponse<Merchant>>();
    itemResponseMock.Setup(response => response.Resource).Returns(updatedMerchant);

    mockMerchantsContainer.Setup(container => container.UpsertItemAsync(
     updatedMerchant,
        new PartitionKey(originalMerchant.ParentCompanyId.ToString()),
        It.IsAny<ItemRequestOptions>(),
    It.IsAny<System.Threading.CancellationToken>()
      ))
      .ReturnsAsync(itemResponseMock.Object);

    // When
    var actualMerchant = await merchantNoSqlBroker.UpdateMerchantAsync(originalMerchant, updatedMerchant, CancellationToken.None);

    // Then
    Assert.IsNotNull(actualMerchant);
    Assert.AreEqual(updatedMerchant.id, actualMerchant.id);
    Assert.AreEqual("Updated Name", actualMerchant.Name);
  }

  #endregion

  #region DeleteMerchantAsync Tests

  /// <summary>Deletes a merchant when it exists.</summary>
  [TestMethod]
  [DynamicData(nameof(GetMerchantTestData))]
  public async Task ShouldDeleteMerchant_WhenMerchantExists(Merchant expectedMerchant)
  {
    ArgumentNullException.ThrowIfNull(expectedMerchant);
    // Given
    var merchantList = new List<Merchant> { expectedMerchant };
    var feedResponseMock = new Mock<FeedResponse<Merchant>>();
    feedResponseMock.Setup(response => response.Resource).Returns(merchantList);
    feedResponseMock.Setup(response => response.GetEnumerator())
      .Returns(merchantList.GetEnumerator());
    feedResponseMock.Setup(response => response.StatusCode).Returns(HttpStatusCode.OK);

    var mockFeedIterator = new Mock<FeedIterator<Merchant>>();
    mockFeedIterator.Setup(iterator => iterator.HasMoreResults).Returns(true);
    mockFeedIterator.Setup(iterator => iterator.ReadNextAsync(It.IsAny<System.Threading.CancellationToken>()))
      .ReturnsAsync(feedResponseMock.Object)
      .Callback(() => mockFeedIterator.Setup(iterator => iterator.HasMoreResults).Returns(false));

    mockMerchantsContainer.Setup(container => container.GetItemQueryIterator<Merchant>(
        It.IsAny<QueryDefinition>(),
        It.IsAny<string>(),
        It.IsAny<QueryRequestOptions>()
      ))
      .Returns(mockFeedIterator.Object);

    var deleteResponseMock = new Mock<ItemResponse<Merchant>>();
    mockMerchantsContainer.Setup(container => container.DeleteItemAsync<Merchant>(
        expectedMerchant.id.ToString(),
        new PartitionKey(expectedMerchant.ParentCompanyId.ToString()),
        It.IsAny<ItemRequestOptions>(),
        It.IsAny<System.Threading.CancellationToken>()
      ))
      .ReturnsAsync(deleteResponseMock.Object);

    // When
    await merchantNoSqlBroker.DeleteMerchantAsync(expectedMerchant.id, null, CancellationToken.None);
  }

  /// <summary>Does nothing when merchant is not found.</summary>
  [TestMethod]
  public async Task ShouldNotDeleteMerchant_WhenMerchantNotFound()
  {
    // Given
    var merchantId = Guid.NewGuid();
    var emptyList = new List<Merchant>();
    var feedResponseMock = new Mock<FeedResponse<Merchant>>();
    feedResponseMock.Setup(response => response.Resource).Returns(emptyList);
    feedResponseMock.Setup(response => response.GetEnumerator()).Returns(emptyList.GetEnumerator());
    feedResponseMock.Setup(response => response.StatusCode).Returns(HttpStatusCode.NotFound);

    var mockFeedIterator = new Mock<FeedIterator<Merchant>>();
    mockFeedIterator.Setup(iterator => iterator.HasMoreResults).Returns(true);
    mockFeedIterator.Setup(iterator => iterator.ReadNextAsync(It.IsAny<System.Threading.CancellationToken>()))
       .ReturnsAsync(feedResponseMock.Object)
          .Callback(() => mockFeedIterator.Setup(iterator => iterator.HasMoreResults).Returns(false));

    mockMerchantsContainer.Setup(container => container.GetItemQueryIterator<Merchant>(
        It.IsAny<QueryDefinition>(),
        It.IsAny<string>(),
        It.IsAny<QueryRequestOptions>()
      ))
      .Returns(mockFeedIterator.Object);

    // When
    await merchantNoSqlBroker.DeleteMerchantAsync(merchantId, null, CancellationToken.None);
  }

  #endregion

  #region Test Data

  /// <summary>Merchant theory data provider.</summary>
  public static IEnumerable<object[]> GetMerchantTestData() => MerchantTestDataBuilder.GetMerchantTheoryData();

  #endregion
}
