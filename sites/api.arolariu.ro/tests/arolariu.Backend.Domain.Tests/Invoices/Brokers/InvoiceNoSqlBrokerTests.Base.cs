namespace arolariu.Backend.Domain.Tests.Invoices.Brokers;

using Microsoft.Azure.Cosmos;

using Moq;

public abstract class InvoiceNoSqlBrokerTestsBase
{
	protected readonly Mock<CosmosClient> mockCosmosClient;
	protected readonly Mock<Database> mockDatabase;
	protected readonly Mock<Container> mockInvoicesContainer;
	protected readonly Mock<Container> mockMerchantsContainer;

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
