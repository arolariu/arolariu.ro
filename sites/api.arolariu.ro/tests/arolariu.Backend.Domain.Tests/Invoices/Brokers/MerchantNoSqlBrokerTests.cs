namespace arolariu.Backend.Domain.Tests.Invoices.Brokers;

using System;
using System.Collections.Generic;
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
/// Comprehensive test suite for MerchantNoSqlBroker following "The Standard" test patterns.
/// Tests cover all CRUD operations, exception scenarios, and edge cases.
/// </summary>
public partial class MerchantNoSqlBrokerTests : InvoiceNoSqlBrokerTestsBase
{
    private readonly InvoiceNoSqlBroker merchantNoSqlBroker;
    private readonly DbContextOptions<InvoiceNoSqlBroker> dbContextOptions;

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

    #region CreateMerchantAsync Tests

    [Theory]
    [MemberData(nameof(GetMerchantTestData))]
    public async Task ShouldCreateMerchant_WhenMerchantIsValid(Merchant expectedMerchant)
    {
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

    [Fact]
    public async Task ShouldThrowArgumentNullException_WhenMerchantIsNull()
    {
        // Given
        Merchant? nullMerchant = null;

        // When & Then
        await Assert.ThrowsAsync<ArgumentNullException>(() => 
            merchantNoSqlBroker.CreateMerchantAsync(nullMerchant!).AsTask());
    }

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
        var exception = await Assert.ThrowsAsync<CosmosException>(() => 
            merchantNoSqlBroker.CreateMerchantAsync(merchant).AsTask());
        
        Assert.Equal("Creation failed", exception.Message);
    }

    #endregion

    #region ReadMerchantAsync Tests

    [Theory]
    [MemberData(nameof(GetMerchantTestData))]
    public async Task ShouldReadMerchant_WhenMerchantExists(Merchant expectedMerchant)
    {
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
        
        mockMerchantsContainer.Verify(container => container.GetItemQueryIterator<Merchant>(
                It.Is<QueryDefinition>(qd => qd.QueryText == $"SELECT * FROM c WHERE c.id = '{expectedMerchant.id}'"),
                It.IsAny<string>(),
                It.IsAny<QueryRequestOptions>()
            ), Times.Once);
    }

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

        // Then
        Assert.Null(actualMerchant);
    }

    #endregion

    #region ReadMerchantsAsync Tests

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
        
        mockMerchantsContainer.Verify(container => container.GetItemQueryIterator<Merchant>(
                It.Is<QueryDefinition>(qd => qd.QueryText == "SELECT * FROM c"),
                It.IsAny<string>(),
                It.IsAny<QueryRequestOptions>()
            ), Times.Once);
    }

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

    [Theory]
    [MemberData(nameof(GetMerchantTestData))]
    public async Task ShouldUpdateMerchantById_WhenValidMerchantProvided(Merchant originalMerchant)
    {
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
        
        mockMerchantsContainer.Verify(container => container.ReplaceItemAsync(
                updatedMerchant,
                originalMerchant.id.ToString(),
                new PartitionKey(originalMerchant.ParentCompanyId.ToString()),
                It.IsAny<ItemRequestOptions>(),
                It.IsAny<System.Threading.CancellationToken>()
            ), Times.Once);
    }

    [Theory]
    [MemberData(nameof(GetMerchantTestData))]
    public async Task ShouldUpdateMerchantWithObjects_WhenValidMerchantsProvided(Merchant originalMerchant)
    {
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
        
        mockMerchantsContainer.Verify(container => container.UpsertItemAsync(
                updatedMerchant,
                new PartitionKey(originalMerchant.ParentCompanyId.ToString()),
                It.IsAny<ItemRequestOptions>(),
                It.IsAny<System.Threading.CancellationToken>()
            ), Times.Once);
    }

    #endregion

    #region DeleteMerchantAsync Tests

    [Theory]
    [MemberData(nameof(GetMerchantTestData))]
    public async Task ShouldDeleteMerchant_WhenMerchantExists(Merchant expectedMerchant)
    {
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

        // Then
        mockMerchantsContainer.Verify(container => container.GetItemQueryIterator<Merchant>(
                It.Is<QueryDefinition>(qd => qd.QueryText == $"SELECT * FROM c WHERE c.id = '{expectedMerchant.id}'"),
                It.IsAny<string>(),
                It.IsAny<QueryRequestOptions>()
            ), Times.Once);

        mockMerchantsContainer.Verify(container => container.DeleteItemAsync<Merchant>(
                expectedMerchant.id.ToString(),
                new PartitionKey(expectedMerchant.ParentCompanyId.ToString()),
                It.IsAny<ItemRequestOptions>(),
                It.IsAny<System.Threading.CancellationToken>()
            ), Times.Once);
    }

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

        // Then
        mockMerchantsContainer.Verify(container => container.DeleteItemAsync<Merchant>(
                It.IsAny<string>(),
                It.IsAny<PartitionKey>(),
                It.IsAny<ItemRequestOptions>(),
                It.IsAny<System.Threading.CancellationToken>()
            ), Times.Never);
    }

    #endregion

    #region Test Data

    public static TheoryData<Merchant> GetMerchantTestData() =>
        MerchantTestDataBuilder.GetMerchantTheoryData();

    #endregion
}
