namespace arolariu.Backend.Domain.Tests.Invoices.Brokers;

using System;
using System.Collections.Generic;
using System.Diagnostics.CodeAnalysis;
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
[SuppressMessage("Design", "CA1515", Justification = "xUnit requires public classes for discovery.")]
[SuppressMessage("Naming", "CA1707", Justification = "Underscore naming mandated for test clarity.")]
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
    var actualInvoice = await invoiceNoSqlBroker.CreateInvoiceAsync(expectedInvoice).ConfigureAwait(false);

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
    var exception = await Assert.ThrowsAsync<CosmosException>(() => invoiceNoSqlBroker.CreateInvoiceAsync(invoice).AsTask()).ConfigureAwait(false);

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
    var actualInvoice = await invoiceNoSqlBroker.ReadInvoiceAsync(expectedInvoice.id, expectedInvoice.UserIdentifier).ConfigureAwait(false);

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
    var feedResponseMock = new Mock<FeedResponse<Invoice>>();
    feedResponseMock.Setup(response => response.GetEnumerator())
      .Returns(new List<Invoice> { expectedInvoice }.GetEnumerator());

    var mockFeedIterator = new Mock<FeedIterator<Invoice>>();
    mockFeedIterator.Setup(iterator => iterator.HasMoreResults).Returns(true);
    mockFeedIterator.Setup(iterator => iterator.ReadNextAsync(It.IsAny<System.Threading.CancellationToken>()))
      .ReturnsAsync(feedResponseMock.Object)
    .Callback(() => mockFeedIterator.Setup(iterator => iterator.HasMoreResults).Returns(false));

    mockInvoicesContainer.Setup(container => container.GetItemQueryIterator<Invoice>(
        It.Is<QueryDefinition>(qd => qd.QueryText == "SELECT * FROM c WHERE c.id = @invoiceIdentifier")
      ))
  .Returns(mockFeedIterator.Object);

    // When
    var actualInvoice = await invoiceNoSqlBroker.ReadInvoiceAsync(expectedInvoice.id).ConfigureAwait(false);

    // Then
    Assert.NotNull(actualInvoice);
    Assert.Equal(expectedInvoice.id, actualInvoice.id);
  }

  #endregion

  #region ReadInvoicesAsync Tests

  /// <summary>
  /// Retrieves all invoices returning a non-null enumerable with expected count.
  /// </summary>
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
    It.Is<QueryDefinition>(qd => qd.QueryText == "SELECT * FROM c")
    ))
.Returns(mockFeedIterator.Object);

    // When
    var actualInvoices = await invoiceNoSqlBroker.ReadInvoicesAsync().ConfigureAwait(false);

    // Then
    Assert.NotNull(actualInvoices);
    Assert.Equal(expectedInvoices.Count, actualInvoices.Count());
  }

  #endregion

  #region Test Data

  /// <summary>
  /// Provides theory data consisting of several randomized invoices.
  /// </summary>
  /// <returns>Collection of randomized <see cref="Invoice"/> instances.</returns>
  public static TheoryData<Invoice> GetInvoiceTestData()
  {
    return InvoiceBuilder.GetInvoiceTheoryData();
  }

  #endregion
}
