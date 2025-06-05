namespace arolariu.Backend.Domain.Tests.Invoices.Brokers;

using System;
using System.Collections.Generic;
using System.Threading.Tasks;

using arolariu.Backend.Domain.Invoices.Brokers.DataBrokers.DatabaseBroker;
using arolariu.Backend.Domain.Invoices.DDD.AggregatorRoots.Invoices;

using Microsoft.Azure.Cosmos;
using Microsoft.EntityFrameworkCore;

using Moq;

using Xunit;

public partial class InvoiceNoSqlBrokerTests : InvoiceNoSqlBrokerTestsBase
{
	private readonly InvoiceNoSqlBroker invoiceNoSqlBroker;
	private readonly DbContextOptions<InvoiceNoSqlBroker> dbContextOptions;

	public InvoiceNoSqlBrokerTests()
	{
		dbContextOptions = new DbContextOptionsBuilder<InvoiceNoSqlBroker>()
			.UseCosmos(
				accountEndpoint: "https://localhost:8081/",
				accountKey: "testKey",
				databaseName: "TestDb")
			.Options;

		invoiceNoSqlBroker = new InvoiceNoSqlBroker(mockCosmosClient.Object, dbContextOptions);
	}

	[Fact]
	public async Task CreateInvoiceAsync_ShouldCreateInvoice_WhenInvoiceIsValid()
	{
		// Arrange
		var invoiceId = Guid.NewGuid();
		var userId = Guid.NewGuid();
		var photoLocation = new Uri("https://example.com/photo.jpg");
		var invoice = new Invoice
		{
			id = invoiceId,
			UserIdentifier = userId,
			PhotoLocation = photoLocation,
			Name = "Test Invoice", // Initialize Name
			Description = "A description for the test invoice" // Initialize Description
		};
		var itemResponseMock = new Mock<ItemResponse<Invoice>>();
		itemResponseMock.Setup(response => response.Resource).Returns(invoice);

		mockInvoicesContainer.Setup(container => container.CreateItemAsync(
				It.IsAny<Invoice>(),
				It.IsAny<PartitionKey?>(),
				It.IsAny<ItemRequestOptions>(),
				It.IsAny<System.Threading.CancellationToken>()
			))
			.ReturnsAsync(itemResponseMock.Object);

		// Act
		var result = await invoiceNoSqlBroker.CreateInvoiceAsync(invoice);

		// Assert
		Assert.NotNull(result);
		Assert.Equal(invoice, result);
		mockInvoicesContainer.Verify(container => container.CreateItemAsync(
				invoice,
				It.IsAny<PartitionKey?>(),
				It.IsAny<ItemRequestOptions>(),
				It.IsAny<System.Threading.CancellationToken>()
			), Times.Once);
	}

	[Fact]
	public async Task ReadInvoiceAsync_WithUserIdentifier_ShouldReturnInvoice_WhenInvoiceExists()
	{
		// Arrange
		var invoiceId = Guid.NewGuid();
		var userId = Guid.NewGuid();
		var photoLocation = new Uri("https://example.com/photo.jpg");
		var invoice = new Invoice
		{
			id = invoiceId,
			UserIdentifier = userId,
			PhotoLocation = photoLocation,
			Name = "Test Invoice", // Initialize Name
			Description = "A description for the test invoice" // Initialize Description
		};
		var itemResponseMock = new Mock<ItemResponse<Invoice>>();
		itemResponseMock.Setup(response => response.Resource).Returns(invoice);

		mockInvoicesContainer.Setup(container => container.ReadItemAsync<Invoice>(
				invoiceId.ToString(),
				new PartitionKey(userId.ToString()),
				It.IsAny<ItemRequestOptions>(),
				It.IsAny<System.Threading.CancellationToken>()
			))
			.ReturnsAsync(itemResponseMock.Object);

		// Act
		var result = await invoiceNoSqlBroker.ReadInvoiceAsync(invoiceId, userId);

		// Assert
		Assert.NotNull(result);
		Assert.Equal(invoiceId, result.id);
		mockInvoicesContainer.Verify(container => container.ReadItemAsync<Invoice>(
				invoiceId.ToString(),
				new PartitionKey(userId.ToString()),
				It.IsAny<ItemRequestOptions>(),
				It.IsAny<System.Threading.CancellationToken>()
			), Times.Once);
	}

	[Fact]
	public async Task ReadInvoiceAsync_WithoutUserIdentifier_ShouldReturnInvoice_WhenInvoiceExists()
	{
		// Arrange
		var invoiceId = Guid.NewGuid();
		var userId = Guid.NewGuid(); // Added to satisfy required UserIdentifier
		var photoLocation = new Uri("https://example.com/photo.jpg"); // Added to satisfy required PhotoLocation
		var invoice = new Invoice
		{
			id = invoiceId,
			UserIdentifier = userId,
			PhotoLocation = photoLocation,
			Name = "Test Invoice", // Initialize Name
			Description = "A description for the test invoice" // Initialize Description
		};
		var feedResponseMock = new Mock<FeedResponse<Invoice>>();
		feedResponseMock.Setup(response => response.GetEnumerator()).Returns(new List<Invoice> { invoice }.GetEnumerator());

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

		// Act
		var result = await invoiceNoSqlBroker.ReadInvoiceAsync(invoiceId);

		// Assert
		Assert.NotNull(result);
		Assert.Equal(invoiceId, result.id);
		mockInvoicesContainer.Verify(container => container.GetItemQueryIterator<Invoice>(
				It.Is<QueryDefinition>(qd => qd.QueryText == "SELECT * FROM c WHERE c.id = @invoiceIdentifier"),
				null,
				It.IsAny<QueryRequestOptions>()
			), Times.Once);
	}
}
