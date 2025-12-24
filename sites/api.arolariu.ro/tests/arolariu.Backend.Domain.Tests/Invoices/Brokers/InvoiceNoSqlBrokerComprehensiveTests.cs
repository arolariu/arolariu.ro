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
/// Comprehensive invoice broker tests covering create, read (by id &amp; partition key / by id only),
/// and bulk read scenarios against the Cosmos EF Core broker abstraction.
/// Follows MethodName_Condition_ExpectedResult pattern; underscores intentional.
/// </summary>
public sealed partial class InvoiceNoSqlBrokerComprehensiveTests : InvoiceNoSqlBrokerTestsBase, IDisposable
{
  private readonly InvoiceNoSqlBroker invoiceNoSqlBroker;
  private readonly DbContextOptions<InvoiceNoSqlBroker> dbContextOptions;

  /// <summary>
  /// Initializes a new test fixture with an in-memory Cosmos emulator configuration and a mocked client.
  /// </summary>
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

  /// <summary>
  /// Disposes the underlying broker context and suppresses finalization (test cleanup).
  /// </summary>
  public void Dispose()
  {
    invoiceNoSqlBroker?.Dispose();
    GC.SuppressFinalize(this);
  }

  #region CreateInvoiceAsync Tests

  /// <summary>
  /// Verifies that a valid invoice is created and returned with matching identity and basic fields.
  /// </summary>
  /// <param name="expectedInvoice">The invoice instance to persist.</param>
  [Theory]
  [MemberData(nameof(GetInvoiceTestData))]
  public async Task ShouldCreateInvoice_WhenInvoiceIsValid(Invoice expectedInvoice)
  {
    ArgumentNullException.ThrowIfNull(expectedInvoice);

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
  }

  /// <summary>
  /// Ensures a CosmosException surfaces when the underlying container throws during creation.
  /// </summary>
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
    var exception = await Assert.ThrowsAsync<CosmosException>(() => invoiceNoSqlBroker.CreateInvoiceAsync(invoice).AsTask());

    Assert.Equal("Creation failed", exception.Message);
  }

  #endregion

  #region ReadInvoiceAsync Tests

  /// <summary>
  /// Reads an invoice when providing both identifier and partition key (user identifier) returning expected data.
  /// </summary>
  /// <param name="expectedInvoice">The seeded invoice instance.</param>
  [Theory]
  [MemberData(nameof(GetInvoiceTestData))]
  public async Task ShouldReadInvoiceWithUserIdentifier_WhenInvoiceExists(Invoice expectedInvoice)
  {
    ArgumentNullException.ThrowIfNull(expectedInvoice);

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
  }

  /// <summary>
  /// Reads an invoice by identifier only (query path) when it exists, returning the correct instance.
  /// </summary>
  /// <param name="expectedInvoice">The seeded invoice instance.</param>
  [Theory]
  [MemberData(nameof(GetInvoiceTestData))]
  public async Task ShouldReadInvoiceWithoutUserIdentifier_WhenInvoiceExists(Invoice expectedInvoice)
  {
    ArgumentNullException.ThrowIfNull(expectedInvoice);

    // Given
    var invoiceList = new List<Invoice> { expectedInvoice };
    var feedResponseMock = new Mock<FeedResponse<Invoice>>();
    feedResponseMock.Setup(response => response.Resource).Returns(invoiceList);
    feedResponseMock.Setup(response => response.GetEnumerator())
      .Returns(invoiceList.GetEnumerator());

    var mockFeedIterator = new Mock<FeedIterator<Invoice>>();
    mockFeedIterator.Setup(iterator => iterator.HasMoreResults).Returns(true);
    mockFeedIterator.Setup(iterator => iterator.ReadNextAsync(It.IsAny<System.Threading.CancellationToken>()))
      .ReturnsAsync(feedResponseMock.Object)
      .Callback(() => mockFeedIterator.Setup(iterator => iterator.HasMoreResults).Returns(false));

    mockInvoicesContainer.Setup(container => container.GetItemQueryIterator<Invoice>(
        It.IsAny<QueryDefinition>(),
        It.IsAny<string>(),
        It.IsAny<QueryRequestOptions>()
      ))
      .Returns(mockFeedIterator.Object);

    // When
    var actualInvoice = await invoiceNoSqlBroker.ReadInvoiceAsync(expectedInvoice.id);

    // Then
    Assert.NotNull(actualInvoice);
    Assert.Equal(expectedInvoice.id, actualInvoice.id);
  }

  #endregion

  #region ReadInvoicesAsync Tests

  /// <summary>
  /// Verifies that reading invoices for a user returns all non-soft-deleted invoices.
  /// </summary>
  [Fact]
  public async Task ShouldReadInvoices_WhenInvoicesExist()
  {
    // Given
    var userIdentifier = Guid.NewGuid();
    var expectedInvoices = InvoiceBuilder.CreateMultipleRandomInvoices(3);
    expectedInvoices.ForEach(i => i.UserIdentifier = userIdentifier);

    var feedResponseMock = new Mock<FeedResponse<Invoice>>();
    feedResponseMock.Setup(response => response.GetEnumerator())
      .Returns(expectedInvoices.GetEnumerator());

    var mockFeedIterator = new Mock<FeedIterator<Invoice>>();
    mockFeedIterator.Setup(iterator => iterator.HasMoreResults).Returns(true);
    mockFeedIterator.Setup(iterator => iterator.ReadNextAsync(It.IsAny<System.Threading.CancellationToken>()))
      .ReturnsAsync(feedResponseMock.Object)
      .Callback(() => mockFeedIterator.Setup(iterator => iterator.HasMoreResults).Returns(false));

    mockInvoicesContainer.Setup(container => container.GetItemQueryIterator<Invoice>(
        It.IsAny<QueryDefinition>(),
        It.IsAny<string>(),
        It.IsAny<QueryRequestOptions>()
      ))
      .Returns(mockFeedIterator.Object);

    // When
    var actualInvoices = await invoiceNoSqlBroker.ReadInvoicesAsync(userIdentifier);

    // Then
    Assert.NotNull(actualInvoices);
    Assert.Equal(expectedInvoices.Count, actualInvoices.Count());
  }

  /// <summary>
  /// Verifies soft-deleted invoices are filtered out from the results.
  /// </summary>
  [Fact]
  public async Task ShouldFilterSoftDeletedInvoices_WhenReadingInvoices()
  {
    // Given
    var userIdentifier = Guid.NewGuid();
    var activeInvoice = InvoiceBuilder.CreateRandomInvoice();
    activeInvoice.UserIdentifier = userIdentifier;

    var deletedInvoice = InvoiceBuilder.CreateRandomInvoice();
    deletedInvoice.UserIdentifier = userIdentifier;
    deletedInvoice.SoftDelete();

    var allInvoices = new List<Invoice> { activeInvoice, deletedInvoice };

    var feedResponseMock = new Mock<FeedResponse<Invoice>>();
    feedResponseMock.Setup(response => response.GetEnumerator())
      .Returns(allInvoices.GetEnumerator());

    var mockFeedIterator = new Mock<FeedIterator<Invoice>>();
    mockFeedIterator.Setup(iterator => iterator.HasMoreResults).Returns(true);
    mockFeedIterator.Setup(iterator => iterator.ReadNextAsync(It.IsAny<System.Threading.CancellationToken>()))
      .ReturnsAsync(feedResponseMock.Object)
      .Callback(() => mockFeedIterator.Setup(iterator => iterator.HasMoreResults).Returns(false));

    mockInvoicesContainer.Setup(container => container.GetItemQueryIterator<Invoice>(
        It.IsAny<QueryDefinition>(),
        It.IsAny<string>(),
        It.IsAny<QueryRequestOptions>()
      ))
      .Returns(mockFeedIterator.Object);

    // When
    var actualInvoices = await invoiceNoSqlBroker.ReadInvoicesAsync(userIdentifier);

    // Then
    Assert.Single(actualInvoices);
    Assert.All(actualInvoices, inv => Assert.False(inv.IsSoftDeleted));
  }

  /// <summary>
  /// Verifies empty result when no invoices exist for user.
  /// </summary>
  [Fact]
  public async Task ShouldReturnEmpty_WhenNoInvoicesExistForUser()
  {
    // Given
    var userIdentifier = Guid.NewGuid();

    var emptyList = new List<Invoice>();
    var feedResponseMock = new Mock<FeedResponse<Invoice>>();
    feedResponseMock.Setup(response => response.Resource).Returns(emptyList);
    feedResponseMock.Setup(response => response.GetEnumerator())
      .Returns(emptyList.GetEnumerator());

    var mockFeedIterator = new Mock<FeedIterator<Invoice>>();
    mockFeedIterator.Setup(iterator => iterator.HasMoreResults).Returns(true);
    mockFeedIterator.Setup(iterator => iterator.ReadNextAsync(It.IsAny<System.Threading.CancellationToken>()))
      .ReturnsAsync(feedResponseMock.Object)
      .Callback(() => mockFeedIterator.Setup(iterator => iterator.HasMoreResults).Returns(false));

    mockInvoicesContainer.Setup(container => container.GetItemQueryIterator<Invoice>(
        It.IsAny<QueryDefinition>(),
        It.IsAny<string>(),
        It.IsAny<QueryRequestOptions>()
      ))
      .Returns(mockFeedIterator.Object);

    // When
    var actualInvoices = await invoiceNoSqlBroker.ReadInvoicesAsync(userIdentifier);

    // Then
    Assert.NotNull(actualInvoices);
    Assert.Empty(actualInvoices);
  }

  /// <summary>
  /// Verifies pagination is handled correctly when HasMoreResults is true.
  /// </summary>
  [Fact]
  public async Task ShouldHandlePagination_WhenMultiplePagesExist()
  {
    // Given
    var userIdentifier = Guid.NewGuid();
    var firstPageInvoices = InvoiceBuilder.CreateMultipleRandomInvoices(2);
    var secondPageInvoices = InvoiceBuilder.CreateMultipleRandomInvoices(2);
    firstPageInvoices.ForEach(i => i.UserIdentifier = userIdentifier);
    secondPageInvoices.ForEach(i => i.UserIdentifier = userIdentifier);

    var firstFeedResponseMock = new Mock<FeedResponse<Invoice>>();
    firstFeedResponseMock.Setup(response => response.Resource).Returns(firstPageInvoices);
    firstFeedResponseMock.Setup(response => response.GetEnumerator())
      .Returns(firstPageInvoices.GetEnumerator());

    var secondFeedResponseMock = new Mock<FeedResponse<Invoice>>();
    secondFeedResponseMock.Setup(response => response.Resource).Returns(secondPageInvoices);
    secondFeedResponseMock.Setup(response => response.GetEnumerator())
      .Returns(secondPageInvoices.GetEnumerator());

    var callCount = 0;
    var mockFeedIterator = new Mock<FeedIterator<Invoice>>();
    mockFeedIterator.Setup(iterator => iterator.HasMoreResults)
      .Returns(() => callCount < 2);
    mockFeedIterator.Setup(iterator => iterator.ReadNextAsync(It.IsAny<System.Threading.CancellationToken>()))
      .ReturnsAsync(() =>
      {
        callCount++;
        return callCount == 1 ? firstFeedResponseMock.Object : secondFeedResponseMock.Object;
      });

    mockInvoicesContainer.Setup(container => container.GetItemQueryIterator<Invoice>(
        It.IsAny<QueryDefinition>(),
        It.IsAny<string>(),
        It.IsAny<QueryRequestOptions>()
      ))
      .Returns(mockFeedIterator.Object);

    // When
    var actualInvoices = await invoiceNoSqlBroker.ReadInvoicesAsync(userIdentifier);

    // Then
    Assert.NotNull(actualInvoices);
    Assert.Equal(4, actualInvoices.Count());
  }

  #endregion

  #region ReadInvoiceAsync with Soft Delete Tests

  /// <summary>
  /// Verifies that reading a soft-deleted invoice throws InvalidOperationException when using partition key.
  /// </summary>
  [Fact]
  public async Task ShouldThrowInvalidOperationException_WhenInvoiceIsSoftDeletedWithPartitionKey()
  {
    // Given
    var deletedInvoice = InvoiceBuilder.CreateRandomInvoice();
    deletedInvoice.SoftDelete();

    var itemResponseMock = new Mock<ItemResponse<Invoice>>();
    itemResponseMock.Setup(response => response.Resource).Returns(deletedInvoice);

    mockInvoicesContainer.Setup(container => container.ReadItemAsync<Invoice>(
        deletedInvoice.id.ToString(),
        new PartitionKey(deletedInvoice.UserIdentifier.ToString()),
        It.IsAny<ItemRequestOptions>(),
        It.IsAny<System.Threading.CancellationToken>()
      ))
      .ReturnsAsync(itemResponseMock.Object);

    // When & Then
    var exception = await Assert.ThrowsAsync<InvalidOperationException>(
      () => invoiceNoSqlBroker.ReadInvoiceAsync(deletedInvoice.id, deletedInvoice.UserIdentifier).AsTask());

    Assert.Contains(deletedInvoice.id.ToString(), exception.Message, StringComparison.Ordinal);
  }

  /// <summary>
  /// Verifies that reading a soft-deleted invoice throws InvalidOperationException when using query path.
  /// </summary>
  [Fact]
  public async Task ShouldThrowInvalidOperationException_WhenInvoiceIsSoftDeletedWithoutPartitionKey()
  {
    // Given
    var deletedInvoice = InvoiceBuilder.CreateRandomInvoice();
    deletedInvoice.SoftDelete();

    var invoiceList = new List<Invoice> { deletedInvoice };
    var feedResponseMock = new Mock<FeedResponse<Invoice>>();
    feedResponseMock.Setup(response => response.Resource).Returns(invoiceList);
    feedResponseMock.Setup(response => response.GetEnumerator())
      .Returns(invoiceList.GetEnumerator());

    var mockFeedIterator = new Mock<FeedIterator<Invoice>>();
    mockFeedIterator.Setup(iterator => iterator.HasMoreResults).Returns(true);
    mockFeedIterator.Setup(iterator => iterator.ReadNextAsync(It.IsAny<System.Threading.CancellationToken>()))
      .ReturnsAsync(feedResponseMock.Object)
      .Callback(() => mockFeedIterator.Setup(iterator => iterator.HasMoreResults).Returns(false));

    mockInvoicesContainer.Setup(container => container.GetItemQueryIterator<Invoice>(
        It.IsAny<QueryDefinition>(),
        It.IsAny<string>(),
        It.IsAny<QueryRequestOptions>()
      ))
      .Returns(mockFeedIterator.Object);

    // When & Then
    var exception = await Assert.ThrowsAsync<InvalidOperationException>(
      () => invoiceNoSqlBroker.ReadInvoiceAsync(deletedInvoice.id).AsTask());

    Assert.Contains(deletedInvoice.id.ToString(), exception.Message, StringComparison.Ordinal);
  }

  /// <summary>
  /// Verifies null is returned when invoice not found via query path.
  /// </summary>
  [Fact]
  public async Task ShouldReturnNull_WhenInvoiceNotFoundWithoutPartitionKey()
  {
    // Given
    var invoiceId = Guid.NewGuid();

    var emptyList = new List<Invoice>();
    var feedResponseMock = new Mock<FeedResponse<Invoice>>();
    feedResponseMock.Setup(response => response.Resource).Returns(emptyList);
    feedResponseMock.Setup(response => response.GetEnumerator())
      .Returns(emptyList.GetEnumerator());

    var mockFeedIterator = new Mock<FeedIterator<Invoice>>();
    mockFeedIterator.Setup(iterator => iterator.HasMoreResults).Returns(true);
    mockFeedIterator.Setup(iterator => iterator.ReadNextAsync(It.IsAny<System.Threading.CancellationToken>()))
      .ReturnsAsync(feedResponseMock.Object)
      .Callback(() => mockFeedIterator.Setup(iterator => iterator.HasMoreResults).Returns(false));

    mockInvoicesContainer.Setup(container => container.GetItemQueryIterator<Invoice>(
        It.IsAny<QueryDefinition>(),
        It.IsAny<string>(),
        It.IsAny<QueryRequestOptions>()
      ))
      .Returns(mockFeedIterator.Object);

    // When
    var actualInvoice = await invoiceNoSqlBroker.ReadInvoiceAsync(invoiceId);

    // Then
    Assert.Null(actualInvoice);
  }

  #endregion

  #region UpdateInvoiceAsync Tests

  /// <summary>
  /// Verifies updating an invoice by identifier uses upsert and returns updated invoice.
  /// </summary>
  [Theory]
  [MemberData(nameof(GetInvoiceTestData))]
  public async Task ShouldUpdateInvoiceById_WhenValidInvoiceProvided(Invoice originalInvoice)
  {
    ArgumentNullException.ThrowIfNull(originalInvoice);

    // Given
    var updatedInvoice = InvoiceBuilder.CreateInvoiceWithSpecificProperties(
      id: originalInvoice.id,
      userIdentifier: originalInvoice.UserIdentifier,
      name: "Updated Invoice Name");

    var itemResponseMock = new Mock<ItemResponse<Invoice>>();
    itemResponseMock.Setup(response => response.Resource).Returns(updatedInvoice);

    mockInvoicesContainer.Setup(container => container.UpsertItemAsync(
        updatedInvoice,
        new PartitionKey(updatedInvoice.UserIdentifier.ToString()),
        It.IsAny<ItemRequestOptions>(),
        It.IsAny<System.Threading.CancellationToken>()
      ))
      .ReturnsAsync(itemResponseMock.Object);

    // When
    var actualInvoice = await invoiceNoSqlBroker.UpdateInvoiceAsync(originalInvoice.id, updatedInvoice);

    // Then
    Assert.NotNull(actualInvoice);
    Assert.Equal(updatedInvoice.id, actualInvoice.id);
    Assert.Equal("Updated Invoice Name", actualInvoice.Name);

    mockInvoicesContainer.Verify(container => container.UpsertItemAsync(
        updatedInvoice,
        It.IsAny<PartitionKey?>(),
        It.IsAny<ItemRequestOptions>(),
        It.IsAny<System.Threading.CancellationToken>()
      ), Times.Once);
  }

  /// <summary>
  /// Verifies updating invoice using current and updated objects performs upsert.
  /// </summary>
  [Theory]
  [MemberData(nameof(GetInvoiceTestData))]
  public async Task ShouldUpdateInvoiceWithObjects_WhenValidInvoicesProvided(Invoice originalInvoice)
  {
    ArgumentNullException.ThrowIfNull(originalInvoice);

    // Given
    var updatedInvoice = InvoiceBuilder.CreateInvoiceWithSpecificProperties(
      id: originalInvoice.id,
      userIdentifier: originalInvoice.UserIdentifier,
      name: "Updated Name Via Objects");

    var itemResponseMock = new Mock<ItemResponse<Invoice>>();
    itemResponseMock.Setup(response => response.Resource).Returns(updatedInvoice);

    mockInvoicesContainer.Setup(container => container.UpsertItemAsync(
        updatedInvoice,
        new PartitionKey(updatedInvoice.UserIdentifier.ToString()),
        It.IsAny<ItemRequestOptions>(),
        It.IsAny<System.Threading.CancellationToken>()
      ))
      .ReturnsAsync(itemResponseMock.Object);

    // When
    var actualInvoice = await invoiceNoSqlBroker.UpdateInvoiceAsync(originalInvoice, updatedInvoice);

    // Then
    Assert.NotNull(actualInvoice);
    Assert.Equal(updatedInvoice.id, actualInvoice.id);
    Assert.Equal("Updated Name Via Objects", actualInvoice.Name);
  }

  /// <summary>
  /// Verifies CosmosException propagates when update fails.
  /// </summary>
  [Fact]
  public async Task ShouldThrowCosmosException_WhenUpdateFails()
  {
    // Given
    var invoice = InvoiceBuilder.CreateRandomInvoice();
    var cosmosException = new CosmosException("Update failed", System.Net.HttpStatusCode.InternalServerError, 500, "", 0);

    mockInvoicesContainer.Setup(container => container.UpsertItemAsync(
        It.IsAny<Invoice>(),
        It.IsAny<PartitionKey?>(),
        It.IsAny<ItemRequestOptions>(),
        It.IsAny<System.Threading.CancellationToken>()
      ))
      .ThrowsAsync(cosmosException);

    // When & Then
    var exception = await Assert.ThrowsAsync<CosmosException>(
      () => invoiceNoSqlBroker.UpdateInvoiceAsync(invoice.id, invoice).AsTask());

    Assert.Equal("Update failed", exception.Message);
  }

  #endregion

  #region DeleteInvoiceAsync Tests

  /// <summary>
  /// Verifies deleting an invoice with partition key performs soft delete.
  /// </summary>
  [Theory]
  [MemberData(nameof(GetInvoiceTestData))]
  public async Task ShouldSoftDeleteInvoice_WhenInvoiceExistsWithPartitionKey(Invoice expectedInvoice)
  {
    ArgumentNullException.ThrowIfNull(expectedInvoice);

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

    var replaceResponseMock = new Mock<ItemResponse<Invoice>>();
    mockInvoicesContainer.Setup(container => container.ReplaceItemAsync(
        It.Is<Invoice>(inv => inv.IsSoftDeleted),
        expectedInvoice.id.ToString(),
        new PartitionKey(expectedInvoice.UserIdentifier.ToString()),
        It.IsAny<ItemRequestOptions>(),
        It.IsAny<System.Threading.CancellationToken>()
      ))
      .ReturnsAsync(replaceResponseMock.Object);

    // When
    await invoiceNoSqlBroker.DeleteInvoiceAsync(expectedInvoice.id, expectedInvoice.UserIdentifier);

    // Then
    mockInvoicesContainer.Verify(container => container.ReplaceItemAsync(
        It.Is<Invoice>(inv => inv.IsSoftDeleted),
        expectedInvoice.id.ToString(),
        It.IsAny<PartitionKey?>(),
        It.IsAny<ItemRequestOptions>(),
        It.IsAny<System.Threading.CancellationToken>()
      ), Times.Once);
  }

  /// <summary>
  /// Verifies deleting an invoice without partition key performs query then soft delete.
  /// </summary>
  [Theory]
  [MemberData(nameof(GetInvoiceTestData))]
  public async Task ShouldSoftDeleteInvoice_WhenInvoiceExistsWithoutPartitionKey(Invoice expectedInvoice)
  {
    ArgumentNullException.ThrowIfNull(expectedInvoice);

    // Given
    var invoiceList = new List<Invoice> { expectedInvoice };
    var feedResponseMock = new Mock<FeedResponse<Invoice>>();
    feedResponseMock.Setup(response => response.Resource).Returns(invoiceList);
    feedResponseMock.Setup(response => response.GetEnumerator())
      .Returns(invoiceList.GetEnumerator());

    var mockFeedIterator = new Mock<FeedIterator<Invoice>>();
    mockFeedIterator.Setup(iterator => iterator.HasMoreResults).Returns(true);
    mockFeedIterator.Setup(iterator => iterator.ReadNextAsync(It.IsAny<System.Threading.CancellationToken>()))
      .ReturnsAsync(feedResponseMock.Object)
      .Callback(() => mockFeedIterator.Setup(iterator => iterator.HasMoreResults).Returns(false));

    mockInvoicesContainer.Setup(container => container.GetItemQueryIterator<Invoice>(
        It.IsAny<QueryDefinition>(),
        It.IsAny<string>(),
        It.IsAny<QueryRequestOptions>()
      ))
      .Returns(mockFeedIterator.Object);

    var replaceResponseMock = new Mock<ItemResponse<Invoice>>();
    mockInvoicesContainer.Setup(container => container.ReplaceItemAsync(
        It.Is<Invoice>(inv => inv.IsSoftDeleted),
        expectedInvoice.id.ToString(),
        new PartitionKey(expectedInvoice.UserIdentifier.ToString()),
        It.IsAny<ItemRequestOptions>(),
        It.IsAny<System.Threading.CancellationToken>()
      ))
      .ReturnsAsync(replaceResponseMock.Object);

    // When
    await invoiceNoSqlBroker.DeleteInvoiceAsync(expectedInvoice.id);

    // Then
    mockInvoicesContainer.Verify(container => container.ReplaceItemAsync(
        It.Is<Invoice>(inv => inv.IsSoftDeleted),
        expectedInvoice.id.ToString(),
        It.IsAny<PartitionKey?>(),
        It.IsAny<ItemRequestOptions>(),
        It.IsAny<System.Threading.CancellationToken>()
      ), Times.Once);
  }

  /// <summary>
  /// Verifies no exception when invoice not found for deletion without partition key.
  /// </summary>
  [Fact]
  public async Task ShouldNotThrow_WhenInvoiceNotFoundForDeletionWithoutPartitionKey()
  {
    // Given
    var invoiceId = Guid.NewGuid();

    var emptyList = new List<Invoice>();
    var feedResponseMock = new Mock<FeedResponse<Invoice>>();
    feedResponseMock.Setup(response => response.Resource).Returns(emptyList);
    feedResponseMock.Setup(response => response.GetEnumerator())
      .Returns(emptyList.GetEnumerator());

    var mockFeedIterator = new Mock<FeedIterator<Invoice>>();
    mockFeedIterator.Setup(iterator => iterator.HasMoreResults).Returns(true);
    mockFeedIterator.Setup(iterator => iterator.ReadNextAsync(It.IsAny<System.Threading.CancellationToken>()))
      .ReturnsAsync(feedResponseMock.Object)
      .Callback(() => mockFeedIterator.Setup(iterator => iterator.HasMoreResults).Returns(false));

    mockInvoicesContainer.Setup(container => container.GetItemQueryIterator<Invoice>(
        It.IsAny<QueryDefinition>(),
        It.IsAny<string>(),
        It.IsAny<QueryRequestOptions>()
      ))
      .Returns(mockFeedIterator.Object);

    // When & Then - should not throw
    await invoiceNoSqlBroker.DeleteInvoiceAsync(invoiceId);

    mockInvoicesContainer.Verify(container => container.ReplaceItemAsync(
        It.IsAny<Invoice>(),
        It.IsAny<string>(),
        It.IsAny<PartitionKey?>(),
        It.IsAny<ItemRequestOptions>(),
        It.IsAny<System.Threading.CancellationToken>()
      ), Times.Never);
  }

  #endregion

  #region DeleteInvoicesAsync Tests

  /// <summary>
  /// Verifies all invoices for a user are soft-deleted along with their products.
  /// </summary>
  [Fact]
  public async Task ShouldSoftDeleteAllInvoices_WhenInvoicesExistForUser()
  {
    // Given
    var userIdentifier = Guid.NewGuid();
    var invoices = InvoiceBuilder.CreateMultipleRandomInvoices(3);
    invoices.ForEach(i => i.UserIdentifier = userIdentifier);

    var feedResponseMock = new Mock<FeedResponse<Invoice>>();
    feedResponseMock.Setup(response => response.Resource).Returns(invoices);
    feedResponseMock.Setup(response => response.GetEnumerator())
      .Returns(invoices.GetEnumerator());

    var mockFeedIterator = new Mock<FeedIterator<Invoice>>();
    mockFeedIterator.Setup(iterator => iterator.HasMoreResults).Returns(true);
    mockFeedIterator.Setup(iterator => iterator.ReadNextAsync(It.IsAny<System.Threading.CancellationToken>()))
      .ReturnsAsync(feedResponseMock.Object)
      .Callback(() => mockFeedIterator.Setup(iterator => iterator.HasMoreResults).Returns(false));

    mockInvoicesContainer.Setup(container => container.GetItemQueryIterator<Invoice>(
        It.IsAny<QueryDefinition>(),
        It.IsAny<string>(),
        It.IsAny<QueryRequestOptions>()
      ))
      .Returns(mockFeedIterator.Object);

    var replaceResponseMock = new Mock<ItemResponse<Invoice>>();
    mockInvoicesContainer.Setup(container => container.ReplaceItemAsync(
        It.IsAny<Invoice>(),
        It.IsAny<string>(),
        It.IsAny<PartitionKey?>(),
        It.IsAny<ItemRequestOptions>(),
        It.IsAny<System.Threading.CancellationToken>()
      ))
      .ReturnsAsync(replaceResponseMock.Object);

    // When
    await invoiceNoSqlBroker.DeleteInvoicesAsync(userIdentifier);

    // Then
    mockInvoicesContainer.Verify(container => container.ReplaceItemAsync(
        It.Is<Invoice>(inv => inv.IsSoftDeleted),
        It.IsAny<string>(),
        It.IsAny<PartitionKey?>(),
        It.IsAny<ItemRequestOptions>(),
        It.IsAny<System.Threading.CancellationToken>()
      ), Times.Exactly(3));
  }

  /// <summary>
  /// Verifies products within invoices are also marked as soft-deleted.
  /// </summary>
  [Fact]
  public async Task ShouldSoftDeleteProducts_WhenDeletingAllInvoicesForUser()
  {
    // Given
    var userIdentifier = Guid.NewGuid();
    var invoice = InvoiceBuilder.CreateRandomInvoice();
    invoice.UserIdentifier = userIdentifier;

    var invoiceList = new List<Invoice> { invoice };
    var feedResponseMock = new Mock<FeedResponse<Invoice>>();
    feedResponseMock.Setup(response => response.Resource).Returns(invoiceList);
    feedResponseMock.Setup(response => response.GetEnumerator())
      .Returns(invoiceList.GetEnumerator());

    var mockFeedIterator = new Mock<FeedIterator<Invoice>>();
    mockFeedIterator.Setup(iterator => iterator.HasMoreResults).Returns(true);
    mockFeedIterator.Setup(iterator => iterator.ReadNextAsync(It.IsAny<System.Threading.CancellationToken>()))
      .ReturnsAsync(feedResponseMock.Object)
      .Callback(() => mockFeedIterator.Setup(iterator => iterator.HasMoreResults).Returns(false));

    mockInvoicesContainer.Setup(container => container.GetItemQueryIterator<Invoice>(
        It.IsAny<QueryDefinition>(),
        It.IsAny<string>(),
        It.IsAny<QueryRequestOptions>()
      ))
      .Returns(mockFeedIterator.Object);

    Invoice? capturedInvoice = null;
    var replaceResponseMock = new Mock<ItemResponse<Invoice>>();
    mockInvoicesContainer.Setup(container => container.ReplaceItemAsync(
        It.IsAny<Invoice>(),
        It.IsAny<string>(),
        It.IsAny<PartitionKey?>(),
        It.IsAny<ItemRequestOptions>(),
        It.IsAny<System.Threading.CancellationToken>()
      ))
      .Callback<Invoice, string, PartitionKey?, ItemRequestOptions?, System.Threading.CancellationToken>(
        (inv, _, _, _, _) => capturedInvoice = inv)
      .ReturnsAsync(replaceResponseMock.Object);

    // When
    await invoiceNoSqlBroker.DeleteInvoicesAsync(userIdentifier);

    // Then
    Assert.NotNull(capturedInvoice);
    Assert.True(capturedInvoice.IsSoftDeleted);
    Assert.All(capturedInvoice.Items, product => Assert.True(product.Metadata.IsSoftDeleted));
  }

  /// <summary>
  /// Verifies no operations when no invoices exist for user.
  /// </summary>
  [Fact]
  public async Task ShouldNotThrow_WhenNoInvoicesExistForUserDeletion()
  {
    // Given
    var userIdentifier = Guid.NewGuid();

    var emptyList = new List<Invoice>();
    var feedResponseMock = new Mock<FeedResponse<Invoice>>();
    feedResponseMock.Setup(response => response.Resource).Returns(emptyList);
    feedResponseMock.Setup(response => response.GetEnumerator())
      .Returns(emptyList.GetEnumerator());

    var mockFeedIterator = new Mock<FeedIterator<Invoice>>();
    mockFeedIterator.Setup(iterator => iterator.HasMoreResults).Returns(true);
    mockFeedIterator.Setup(iterator => iterator.ReadNextAsync(It.IsAny<System.Threading.CancellationToken>()))
      .ReturnsAsync(feedResponseMock.Object)
      .Callback(() => mockFeedIterator.Setup(iterator => iterator.HasMoreResults).Returns(false));

    mockInvoicesContainer.Setup(container => container.GetItemQueryIterator<Invoice>(
        It.IsAny<QueryDefinition>(),
        It.IsAny<string>(),
        It.IsAny<QueryRequestOptions>()
      ))
      .Returns(mockFeedIterator.Object);

    // When & Then - should not throw
    await invoiceNoSqlBroker.DeleteInvoicesAsync(userIdentifier);

    mockInvoicesContainer.Verify(container => container.ReplaceItemAsync(
        It.IsAny<Invoice>(),
        It.IsAny<string>(),
        It.IsAny<PartitionKey?>(),
        It.IsAny<ItemRequestOptions>(),
        It.IsAny<System.Threading.CancellationToken>()
      ), Times.Never);
  }

  /// <summary>
  /// Verifies pagination handling when deleting all invoices across multiple pages.
  /// </summary>
  [Fact]
  public async Task ShouldHandlePagination_WhenDeletingAllInvoicesForUser()
  {
    // Given
    var userIdentifier = Guid.NewGuid();
    var firstPageInvoices = InvoiceBuilder.CreateMultipleRandomInvoices(2);
    var secondPageInvoices = InvoiceBuilder.CreateMultipleRandomInvoices(2);
    firstPageInvoices.ForEach(i => i.UserIdentifier = userIdentifier);
    secondPageInvoices.ForEach(i => i.UserIdentifier = userIdentifier);

    var firstFeedResponseMock = new Mock<FeedResponse<Invoice>>();
    firstFeedResponseMock.Setup(response => response.Resource).Returns(firstPageInvoices);
    firstFeedResponseMock.Setup(response => response.GetEnumerator())
      .Returns(firstPageInvoices.GetEnumerator());

    var secondFeedResponseMock = new Mock<FeedResponse<Invoice>>();
    secondFeedResponseMock.Setup(response => response.Resource).Returns(secondPageInvoices);
    secondFeedResponseMock.Setup(response => response.GetEnumerator())
      .Returns(secondPageInvoices.GetEnumerator());

    var callCount = 0;
    var mockFeedIterator = new Mock<FeedIterator<Invoice>>();
    mockFeedIterator.Setup(iterator => iterator.HasMoreResults)
      .Returns(() => callCount < 2);
    mockFeedIterator.Setup(iterator => iterator.ReadNextAsync(It.IsAny<System.Threading.CancellationToken>()))
      .ReturnsAsync(() =>
      {
        callCount++;
        return callCount == 1 ? firstFeedResponseMock.Object : secondFeedResponseMock.Object;
      });

    mockInvoicesContainer.Setup(container => container.GetItemQueryIterator<Invoice>(
        It.IsAny<QueryDefinition>(),
        It.IsAny<string>(),
        It.IsAny<QueryRequestOptions>()
      ))
      .Returns(mockFeedIterator.Object);

    var replaceResponseMock = new Mock<ItemResponse<Invoice>>();
    mockInvoicesContainer.Setup(container => container.ReplaceItemAsync(
        It.IsAny<Invoice>(),
        It.IsAny<string>(),
        It.IsAny<PartitionKey?>(),
        It.IsAny<ItemRequestOptions>(),
        It.IsAny<System.Threading.CancellationToken>()
      ))
      .ReturnsAsync(replaceResponseMock.Object);

    // When
    await invoiceNoSqlBroker.DeleteInvoicesAsync(userIdentifier);

    // Then
    mockInvoicesContainer.Verify(container => container.ReplaceItemAsync(
        It.Is<Invoice>(inv => inv.IsSoftDeleted),
        It.IsAny<string>(),
        It.IsAny<PartitionKey?>(),
        It.IsAny<ItemRequestOptions>(),
        It.IsAny<System.Threading.CancellationToken>()
      ), Times.Exactly(4));
  }

  #endregion

  #region Test Data

  /// <summary>
  /// Provides theory data consisting of several randomized invoices.
  /// </summary>
  /// <returns>Collection of randomized <see cref="Invoice"/> instances.</returns>
  public static TheoryData<Invoice> GetInvoiceTestData() => InvoiceBuilder.GetInvoiceTheoryData();

  #endregion
}
