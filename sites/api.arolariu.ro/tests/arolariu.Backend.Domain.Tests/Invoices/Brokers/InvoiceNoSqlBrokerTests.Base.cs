namespace arolariu.Backend.Domain.Tests.Invoices.Brokers;

using System.Diagnostics.CodeAnalysis;

using Microsoft.Azure.Cosmos;

using Moq;

/// <summary>
/// Abstract base class providing common Cosmos DB mocks for invoice and merchant NoSQL broker tests.
/// Initializes mocked <see cref="CosmosClient"/>, <see cref="Database"/> and invoice / merchant containers.
/// </summary>
[SuppressMessage("Design", "CA1515", Justification = "Public visibility required for inheritance across test classes.")]
[SuppressMessage("Design", "CA1051", Justification = "Protected readonly fields intentionally exposed for derived test usage.")]
public abstract class InvoiceNoSqlBrokerTestsBase
{
  /// <summary>Mocked top-level Cosmos client used to retrieve database references.</summary>
  protected readonly Mock<CosmosClient> mockCosmosClient;
  /// <summary>Mocked database reference returned by the Cosmos client.</summary>
  protected readonly Mock<Database> mockDatabase;
  /// <summary>Mocked invoices container used for invoice aggregate persistence operations.</summary>
  protected readonly Mock<Container> mockInvoicesContainer;
  /// <summary>Mocked merchants container used for merchant entity persistence operations.</summary>
  protected readonly Mock<Container> mockMerchantsContainer;

  /// <summary>Initializes the suite of Cosmos mocks and sets up common expectations.</summary>
  protected InvoiceNoSqlBrokerTestsBase()
  {
    mockCosmosClient = new Mock<CosmosClient>();
    mockDatabase = new Mock<Database>();
    mockInvoicesContainer = new Mock<Container>();
    mockMerchantsContainer = new Mock<Container>();

    mockCosmosClient.Setup(client => client.GetDatabase(It.IsAny<string>()))
    .Returns(mockDatabase.Object);

    mockDatabase.Setup(db => db.GetContainer("invoices"))
    .Returns(mockInvoicesContainer.Object);

    mockDatabase.Setup(db => db.GetContainer("merchants"))
    .Returns(mockMerchantsContainer.Object);
  }
}
