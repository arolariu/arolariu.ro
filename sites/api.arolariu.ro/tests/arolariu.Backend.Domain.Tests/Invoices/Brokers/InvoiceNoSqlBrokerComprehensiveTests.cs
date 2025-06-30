namespace arolariu.Backend.Domain.Tests.Invoices.Brokers;

using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;

using arolariu.Backend.Domain.Invoices.Brokers.DataBrokers.DatabaseBroker;
using arolariu.Backend.Domain.Invoices.DDD.AggregatorRoots.Invoices;
using arolariu.Backend.Domain.Tests.Builders;

using Microsoft.Azure.Cosmos;
using Microsoft.EntityFrameworkCore;

using Moq;

using Xunit;

/// <summary>
/// Comprehensive test suite for InvoiceNoSqlBroker following "The Standard" test patterns.
/// Tests cover all CRUD operations, exception scenarios, and edge cases.
/// </summary>
public partial class InvoiceNoSqlBrokerComprehensiveTests : InvoiceNoSqlBrokerTestsBase
{
    private readonly InvoiceNoSqlBroker invoiceNoSqlBroker;
    private readonly DbContextOptions<InvoiceNoSqlBroker> dbContextOptions;

    public InvoiceNoSqlBrokerComprehensiveTests()
    {
        dbContextOptions = new DbContextOptionsBuilder<InvoiceNoSqlBroker>()
            .UseCosmos(
                accountEndpoint: "https://localhost:8081/",
                accountKey: "testKey",
                databaseName: "TestDb")
            .Options;

        invoiceNoSqlBroker = new InvoiceNoSqlBroker(mockCosmosClient.Object, dbContextOptions);
    }

    #region CreateInvoiceAsync Tests

    [Theory]
    [MemberData(nameof(GetInvoiceTestData))]
    public async Task ShouldCreateInvoice_WhenInvoiceIsValid(Invoice expectedInvoice)
    {
        // Given
        var itemResponseMock = new Mock<ItemResponse<Invoice>>();
        itemResponseMock.Setup(response => response.Resource).Returns(expectedInvoice);

        mockInvoicesContainer.Setup(container => container.CreateItemAsync(
                It.IsAny<Invoice>(),
                It.IsAny<PartitionKey?>(),
                It.IsAny<ItemRequestOptions>(),
                It.IsAny<System.Threading.CancellationToken>()
            ))
            .ReturnsAsync(itemResponseMock.Object);

        // When
        var actualInvoice = await invoiceNoSqlBroker.CreateInvoiceAsync(expectedInvoice);

        // Then
        Assert.NotNull(actualInvoice);
        Assert.Equal(expectedInvoice.id, actualInvoice.id);
        Assert.Equal(expectedInvoice.UserIdentifier, actualInvoice.UserIdentifier);
        Assert.Equal(expectedInvoice.Name, actualInvoice.Name);
        
        mockInvoicesContainer.Verify(container => container.CreateItemAsync(
                expectedInvoice,
                It.IsAny<PartitionKey?>(),
                It.IsAny<ItemRequestOptions>(),
                It.IsAny<System.Threading.CancellationToken>()
            ), Times.Once);
    }

    [Fact]
    public async Task ShouldThrowCosmosException_WhenCreateFails()
    {
        // Given
        var invoice = InvoiceBuilder.CreateRandomInvoice();
        var cosmosException = new CosmosException("Creation failed", System.Net.HttpStatusCode.BadRequest, 400, "", 0);

        mockInvoicesContainer.Setup(container => container.CreateItemAsync(
                It.IsAny<Invoice>(),
                It.IsAny<PartitionKey?>(),
                It.IsAny<ItemRequestOptions>(),
                It.IsAny<System.Threading.CancellationToken>()
            ))
            .ThrowsAsync(cosmosException);

        // When & Then
        var exception = await Assert.ThrowsAsync<CosmosException>(() => 
            invoiceNoSqlBroker.CreateInvoiceAsync(invoice).AsTask());
        
        Assert.Equal("Creation failed", exception.Message);
    }

    #endregion

    #region ReadInvoiceAsync Tests

    [Theory]
    [MemberData(nameof(GetInvoiceTestData))]
    public async Task ShouldReadInvoiceWithUserIdentifier_WhenInvoiceExists(Invoice expectedInvoice)
    {
        // Given
        var itemResponseMock = new Mock<ItemResponse<Invoice>>();
        itemResponseMock.Setup(response => response.Resource).Returns(expectedInvoice);

        mockInvoicesContainer.Setup(container => container.ReadItemAsync<Invoice>(
                expectedInvoice.id.ToString(),
                new PartitionKey(expectedInvoice.UserIdentifier.ToString()),
                It.IsAny<ItemRequestOptions>(),
                It.IsAny<System.Threading.CancellationToken>()
            ))
            .ReturnsAsync(itemResponseMock.Object);

        // When
        var actualInvoice = await invoiceNoSqlBroker.ReadInvoiceAsync(expectedInvoice.id, expectedInvoice.UserIdentifier);

        // Then
        Assert.NotNull(actualInvoice);
        Assert.Equal(expectedInvoice.id, actualInvoice.id);
        Assert.Equal(expectedInvoice.UserIdentifier, actualInvoice.UserIdentifier);
        
        mockInvoicesContainer.Verify(container => container.ReadItemAsync<Invoice>(
                expectedInvoice.id.ToString(),
                new PartitionKey(expectedInvoice.UserIdentifier.ToString()),
                It.IsAny<ItemRequestOptions>(),
                It.IsAny<System.Threading.CancellationToken>()
            ), Times.Once);
    }

    [Theory]
    [MemberData(nameof(GetInvoiceTestData))]
    public async Task ShouldReadInvoiceWithoutUserIdentifier_WhenInvoiceExists(Invoice expectedInvoice)
    {
        // Given
        var feedResponseMock = new Mock<FeedResponse<Invoice>>();
        feedResponseMock.Setup(response => response.GetEnumerator())
            .Returns(new List<Invoice> { expectedInvoice }.GetEnumerator());

        var mockFeedIterator = new Mock<FeedIterator<Invoice>>();
        mockFeedIterator.Setup(iterator => iterator.HasMoreResults).Returns(true);
        mockFeedIterator.Setup(iterator => iterator.ReadNextAsync(It.IsAny<System.Threading.CancellationToken>()))
            .ReturnsAsync(feedResponseMock.Object)
            .Callback(() => mockFeedIterator.Setup(iterator => iterator.HasMoreResults).Returns(false));

        mockInvoicesContainer.Setup(container => container.GetItemQueryIterator<Invoice>(
                It.Is<QueryDefinition>(qd => qd.QueryText == "SELECT * FROM c WHERE c.id = @invoiceIdentifier"),
                It.IsAny<string>(),
                It.IsAny<QueryRequestOptions>()
            ))
            .Returns(mockFeedIterator.Object);

        // When
        var actualInvoice = await invoiceNoSqlBroker.ReadInvoiceAsync(expectedInvoice.id);

        // Then
        Assert.NotNull(actualInvoice);
        Assert.Equal(expectedInvoice.id, actualInvoice.id);
        
        mockInvoicesContainer.Verify(container => container.GetItemQueryIterator<Invoice>(
                It.Is<QueryDefinition>(qd => qd.QueryText == "SELECT * FROM c WHERE c.id = @invoiceIdentifier"),
                It.IsAny<string>(),
                It.IsAny<QueryRequestOptions>()
            ), Times.Once);
    }

    #endregion

    #region ReadInvoicesAsync Tests

    [Fact]
    public async Task ShouldReadAllInvoices_WhenInvoicesExist()
    {
        // Given
        var expectedInvoices = InvoiceBuilder.CreateMultipleRandomInvoices(3);
        var feedResponseMock = new Mock<FeedResponse<Invoice>>();
        feedResponseMock.Setup(response => response.GetEnumerator())
            .Returns(expectedInvoices.GetEnumerator());

        var mockFeedIterator = new Mock<FeedIterator<Invoice>>();
        mockFeedIterator.Setup(iterator => iterator.HasMoreResults).Returns(true);
        mockFeedIterator.Setup(iterator => iterator.ReadNextAsync(It.IsAny<System.Threading.CancellationToken>()))
            .ReturnsAsync(feedResponseMock.Object)
            .Callback(() => mockFeedIterator.Setup(iterator => iterator.HasMoreResults).Returns(false));

        mockInvoicesContainer.Setup(container => container.GetItemQueryIterator<Invoice>(
                It.Is<QueryDefinition>(qd => qd.QueryText == "SELECT * FROM c"),
                It.IsAny<string>(),
                It.IsAny<QueryRequestOptions>()
            ))
            .Returns(mockFeedIterator.Object);

        // When
        var actualInvoices = await invoiceNoSqlBroker.ReadInvoicesAsync();

        // Then
        Assert.NotNull(actualInvoices);
        Assert.Equal(expectedInvoices.Count, actualInvoices.Count());
        
        mockInvoicesContainer.Verify(container => container.GetItemQueryIterator<Invoice>(
                It.Is<QueryDefinition>(qd => qd.QueryText == "SELECT * FROM c"),
                It.IsAny<string>(),
                It.IsAny<QueryRequestOptions>()
            ), Times.Once);
    }

    #endregion

    #region Test Data

    public static TheoryData<Invoice> GetInvoiceTestData() =>
        InvoiceBuilder.GetInvoiceTheoryData();

    #endregion
}
