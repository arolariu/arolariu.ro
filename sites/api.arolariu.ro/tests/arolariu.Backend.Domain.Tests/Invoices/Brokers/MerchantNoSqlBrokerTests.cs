namespace arolariu.Backend.Domain.Tests.Invoices.Brokers;

using System;
using System.Collections.Generic;
using System.Diagnostics.CodeAnalysis;
using System.Linq;
using System.Net;
using System.Threading.Tasks;

using arolariu.Backend.Domain.Invoices.Brokers.DataBrokers.DatabaseBroker;
using arolariu.Backend.Domain.Invoices.DDD.Entities.Merchants;
using arolariu.Backend.Domain.Tests.Builders;

using Microsoft.Azure.Cosmos;
using Microsoft.EntityFrameworkCore;

using Moq;

using Xunit;

/// <summary>
/// Comprehensive test suite for <see cref="InvoiceNoSqlBroker"/> merchant operations following project test standards.
/// Covers CRUD operations, exception pathways and query filtering scenarios. Method names follow
/// the MethodName_Condition_ExpectedResult pattern by design; CA1707 suppressed accordingly.
/// </summary>
[SuppressMessage("Design", "CA1515", Justification = "xUnit requires public visibility for discovery.")]
[SuppressMessage("Naming", "CA1707", Justification = "Underscore naming mandated for test clarity.")]
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
  [Theory]
  [MemberData(nameof(GetMerchantTestData))]
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
    var actualMerchant = await merchantNoSqlBroker.CreateMerchantAsync(expectedMerchant);

    // Then
    Assert.NotNull(actualMerchant);
    Assert.Equal(expectedMerchant.id, actualMerchant.id);
    Assert.Equal(expectedMerchant.ParentCompanyId, actualMerchant.ParentCompanyId);
    Assert.Equal(expectedMerchant.Name, actualMerchant.Name);

    mockMerchantsContainer.Verify(container => container.CreateItemAsync(
        expectedMerchant,
        It.IsAny<PartitionKey?>(),
        It.IsAny<ItemRequestOptions>(),
        It.IsAny<System.Threading.CancellationToken>()
      ), Times.Once);
  }

  /// <summary>Ensures passing null merchant throws <see cref="ArgumentNullException"/>.</summary>
  [Fact]
  public async Task ShouldThrowArgumentNullException_WhenMerchantIsNull()
  {
    // Given
    Merchant? nullMerchant = null;

    // When & Then
    await Assert.ThrowsAsync<ArgumentNullException>(() => merchantNoSqlBroker.CreateMerchantAsync(nullMerchant!).AsTask());
  }

  /// <summary>Validates Cosmos exception surfaces when container create fails.</summary>
  [Fact]
  public async Task ShouldThrowCosmosException_WhenCreateMerchantFails()
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
    var exception = await Assert.ThrowsAsync<CosmosException>(() => merchantNoSqlBroker.CreateMerchantAsync(merchant).AsTask());
    Assert.Equal("Creation failed", exception.Message);
  }

  #endregion

  #region ReadMerchantAsync Tests

  /// <summary>Ensures a merchant can be read when it exists.</summary>
  [Theory]
  [MemberData(nameof(GetMerchantTestData))]
  public async Task ShouldReadMerchant_WhenMerchantExists(Merchant expectedMerchant)
  {
    ArgumentNullException.ThrowIfNull(expectedMerchant);
    // Given
    var feedResponseMock = new Mock<FeedResponse<Merchant>>();
    feedResponseMock.Setup(response => response.GetEnumerator())
      .Returns(new List<Merchant> { expectedMerchant }.GetEnumerator());
    feedResponseMock.Setup(response => response.First()).Returns(expectedMerchant);
    feedResponseMock.Setup(response => response.StatusCode).Returns(HttpStatusCode.OK);

    var mockFeedIterator = new Mock<FeedIterator<Merchant>>();
    mockFeedIterator.Setup(iterator => iterator.HasMoreResults).Returns(true);
    mockFeedIterator.Setup(iterator => iterator.ReadNextAsync(It.IsAny<System.Threading.CancellationToken>()))
      .ReturnsAsync(feedResponseMock.Object)
      .Callback(() => mockFeedIterator.Setup(iterator => iterator.HasMoreResults).Returns(false));

    mockMerchantsContainer.Setup(container => container.GetItemQueryIterator<Merchant>(
        It.Is<QueryDefinition>(qd => qd.QueryText == $"SELECT * FROM c WHERE c.id = '{expectedMerchant.id}'"),
        It.IsAny<string>(),
        It.IsAny<QueryRequestOptions>()
      ))
      .Returns(mockFeedIterator.Object);

    // When
    var actualMerchant = await merchantNoSqlBroker.ReadMerchantAsync(expectedMerchant.id);

    // Then
    Assert.NotNull(actualMerchant);
    Assert.Equal(expectedMerchant.id, actualMerchant.id);
    Assert.Equal(expectedMerchant.ParentCompanyId, actualMerchant.ParentCompanyId);
  }

  /// <summary>Returns null when merchant does not exist.</summary>
  [Fact]
  public async Task ShouldReturnNull_WhenMerchantNotFound()
  {
    // Given
    var merchantId = Guid.NewGuid();
    var feedResponseMock = new Mock<FeedResponse<Merchant>>();
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
    var actualMerchant = await merchantNoSqlBroker.ReadMerchantAsync(merchantId);
    Assert.Null(actualMerchant);
  }

  #endregion

  #region ReadMerchantsAsync Tests

  /// <summary>Reads all merchants when present.</summary>
  [Fact]
  public async Task ShouldReadAllMerchants_WhenMerchantsExist()
  {
    // Given
    var expectedMerchants = MerchantTestDataBuilder.CreateMultipleRandomMerchants(3);
    var feedResponseMock = new Mock<FeedResponse<Merchant>>();
    feedResponseMock.Setup(response => response.GetEnumerator())
      .Returns(expectedMerchants.GetEnumerator());

    var mockFeedIterator = new Mock<FeedIterator<Merchant>>();
    mockFeedIterator.Setup(iterator => iterator.HasMoreResults).Returns(true);
    mockFeedIterator.Setup(iterator => iterator.ReadNextAsync(It.IsAny<System.Threading.CancellationToken>()))
      .ReturnsAsync(feedResponseMock.Object)
      .Callback(() => mockFeedIterator.Setup(iterator => iterator.HasMoreResults).Returns(false));

    mockMerchantsContainer.Setup(container => container.GetItemQueryIterator<Merchant>(
        It.Is<QueryDefinition>(qd => qd.QueryText == "SELECT * FROM c"),
        It.IsAny<string>(),
        It.IsAny<QueryRequestOptions>()
      ))
      .Returns(mockFeedIterator.Object);

    // When
    var actualMerchants = await merchantNoSqlBroker.ReadMerchantsAsync();

    // Then
    Assert.NotNull(actualMerchants);
    Assert.Equal(expectedMerchants.Count, actualMerchants.Count());
  }

  /// <summary>Reads merchants filtered by parent company id.</summary>
  [Fact]
  public async Task ShouldReadMerchantsByParentCompanyId_WhenMerchantsExist()
  {
    // Given
    var parentCompanyId = Guid.NewGuid();
    var expectedMerchants = MerchantTestDataBuilder.CreateMultipleRandomMerchants(2);
    expectedMerchants.ForEach(m => m.ParentCompanyId = parentCompanyId);

    var feedResponseMock = new Mock<FeedResponse<Merchant>>();
    feedResponseMock.Setup(response => response.GetEnumerator())
      .Returns(expectedMerchants.GetEnumerator());

    var mockFeedIterator = new Mock<FeedIterator<Merchant>>();
    mockFeedIterator.Setup(iterator => iterator.HasMoreResults).Returns(true);
    mockFeedIterator.Setup(iterator => iterator.ReadNextAsync(It.IsAny<System.Threading.CancellationToken>()))
      .ReturnsAsync(feedResponseMock.Object)
      .Callback(() => mockFeedIterator.Setup(iterator => iterator.HasMoreResults).Returns(false));

    mockMerchantsContainer.Setup(container => container.GetItemQueryIterator<Merchant>(
        It.Is<QueryDefinition>(qd => qd.QueryText == $"SELECT * FROM c WHERE c.parentCompanyId = '{parentCompanyId}'"),
        It.IsAny<string>(),
        It.IsAny<QueryRequestOptions>()
      ))
      .Returns(mockFeedIterator.Object);

    // When
    var actualMerchants = await merchantNoSqlBroker.ReadMerchantsAsync(parentCompanyId);

    // Then
    Assert.NotNull(actualMerchants);
    Assert.Equal(expectedMerchants.Count, actualMerchants.Count());
    Assert.All(actualMerchants, merchant => Assert.Equal(parentCompanyId, merchant.ParentCompanyId));
  }

  #endregion

  #region UpdateMerchantAsync Tests

  /// <summary>Updates a merchant by identifier, verifying replace semantics.</summary>
  [Theory]
  [MemberData(nameof(GetMerchantTestData))]
  public async Task ShouldUpdateMerchantById_WhenValidMerchantProvided(Merchant originalMerchant)
  {
    ArgumentNullException.ThrowIfNull(originalMerchant);
    // Given
    var updatedMerchant = MerchantTestDataBuilder.CreateMerchantWithSpecificProperties(
      id: originalMerchant.id,
      parentCompanyId: originalMerchant.ParentCompanyId,
      name: "Updated Merchant Name");

    // Setup ReadMerchantAsync mock
    var readFeedResponseMock = new Mock<FeedResponse<Merchant>>();
    readFeedResponseMock.Setup(response => response.GetEnumerator())
      .Returns(new List<Merchant> { originalMerchant }.GetEnumerator());
    readFeedResponseMock.Setup(response => response.First()).Returns(originalMerchant);
    readFeedResponseMock.Setup(response => response.StatusCode).Returns(HttpStatusCode.OK);

    var readMockFeedIterator = new Mock<FeedIterator<Merchant>>();
    readMockFeedIterator.Setup(iterator => iterator.HasMoreResults).Returns(true);
    readMockFeedIterator.Setup(iterator => iterator.ReadNextAsync(It.IsAny<System.Threading.CancellationToken>()))
      .ReturnsAsync(readFeedResponseMock.Object)
      .Callback(() => readMockFeedIterator.Setup(iterator => iterator.HasMoreResults).Returns(false));

    mockMerchantsContainer.Setup(container => container.GetItemQueryIterator<Merchant>(
        It.Is<QueryDefinition>(qd => qd.QueryText == $"SELECT * FROM c WHERE c.id = '{originalMerchant.id}'"),
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
    var actualMerchant = await merchantNoSqlBroker.UpdateMerchantAsync(originalMerchant.id, updatedMerchant);

    // Then
    Assert.NotNull(actualMerchant);
    Assert.Equal(updatedMerchant.id, actualMerchant.id);
    Assert.Equal("Updated Merchant Name", actualMerchant.Name);
  }

  /// <summary>Updates merchant via object upsert semantics.</summary>
  [Theory]
  [MemberData(nameof(GetMerchantTestData))]
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
    var actualMerchant = await merchantNoSqlBroker.UpdateMerchantAsync(originalMerchant, updatedMerchant);

    // Then
    Assert.NotNull(actualMerchant);
    Assert.Equal(updatedMerchant.id, actualMerchant.id);
    Assert.Equal("Updated Name", actualMerchant.Name);
  }

  #endregion

  #region DeleteMerchantAsync Tests

  /// <summary>Deletes a merchant when it exists.</summary>
  [Theory]
  [MemberData(nameof(GetMerchantTestData))]
  public async Task ShouldDeleteMerchant_WhenMerchantExists(Merchant expectedMerchant)
  {
    ArgumentNullException.ThrowIfNull(expectedMerchant);
    // Given
    var feedResponseMock = new Mock<FeedResponse<Merchant>>();
    feedResponseMock.Setup(response => response.GetEnumerator())
      .Returns(new List<Merchant> { expectedMerchant }.GetEnumerator());
    feedResponseMock.Setup(response => response.First()).Returns(expectedMerchant);
    feedResponseMock.Setup(response => response.StatusCode).Returns(HttpStatusCode.OK);

    var mockFeedIterator = new Mock<FeedIterator<Merchant>>();
    mockFeedIterator.Setup(iterator => iterator.HasMoreResults).Returns(true);
    mockFeedIterator.Setup(iterator => iterator.ReadNextAsync(It.IsAny<System.Threading.CancellationToken>()))
      .ReturnsAsync(feedResponseMock.Object)
      .Callback(() => mockFeedIterator.Setup(iterator => iterator.HasMoreResults).Returns(false));

    mockMerchantsContainer.Setup(container => container.GetItemQueryIterator<Merchant>(
        It.Is<QueryDefinition>(qd => qd.QueryText == $"SELECT * FROM c WHERE c.id = '{expectedMerchant.id}'"),
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
    await merchantNoSqlBroker.DeleteMerchantAsync(expectedMerchant.id);
  }

  /// <summary>Does nothing when merchant is not found.</summary>
  [Fact]
  public async Task ShouldNotDeleteMerchant_WhenMerchantNotFound()
  {
    // Given
    var merchantId = Guid.NewGuid();
    var feedResponseMock = new Mock<FeedResponse<Merchant>>();
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
    await merchantNoSqlBroker.DeleteMerchantAsync(merchantId);
  }

  #endregion

  #region Test Data

  /// <summary>Merchant theory data provider.</summary>
  public static TheoryData<Merchant> GetMerchantTestData()
  {
    return MerchantTestDataBuilder.GetMerchantTheoryData();
  }

  #endregion
}
