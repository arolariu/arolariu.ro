namespace arolariu.Backend.Domain.Tests.Invoices.Brokers;

using System;
using System.Net;
using System.Threading;
using System.Threading.Tasks;

using arolariu.Backend.Domain.Invoices.Brokers.DataBrokers.DatabaseBroker;
using arolariu.Backend.Domain.Invoices.DDD.AggregatorRoots.Invoices;
using arolariu.Backend.Domain.Invoices.DDD.AggregatorRoots.Invoices.Exceptions.Inner;

using Microsoft.Azure.Cosmos;
using Microsoft.EntityFrameworkCore;

using Moq;

using Xunit;

/// <summary>
/// Tests the translation layer that wraps CosmosException into typed invoice inner exceptions.
/// </summary>
public sealed class InvoiceNoSqlBrokerExceptionTranslationTests : InvoiceNoSqlBrokerTestsBase
{
  private InvoiceNoSqlBroker BuildBroker()
  {
    var options = new DbContextOptionsBuilder<InvoiceNoSqlBroker>()
      .UseCosmos("https://localhost:8081", "test-key", "primary")
      .Options;
    return new InvoiceNoSqlBroker(mockCosmosClient.Object, options);
  }

  private static CosmosException MakeCosmosException(HttpStatusCode code) =>
    new("cosmos failure", code, 0, "activity", 0);

  /// <summary>
  /// Verifies that a Cosmos 404 (NotFound) during read is translated into <see cref="InvoiceNotFoundException"/>.
  /// </summary>
  [Fact]
  public async Task ReadInvoiceAsync_WhenCosmos404_ThrowsInvoiceNotFoundException()
  {
    var broker = BuildBroker();
    var invoiceId = Guid.NewGuid();
    var userId = Guid.NewGuid();
    mockInvoicesContainer
      .Setup(c => c.ReadItemAsync<Invoice>(invoiceId.ToString(), new PartitionKey(userId.ToString()),
        It.IsAny<ItemRequestOptions>(), It.IsAny<CancellationToken>()))
      .ThrowsAsync(MakeCosmosException(HttpStatusCode.NotFound));

    await Assert.ThrowsAsync<InvoiceNotFoundException>(
      async () => await broker.ReadInvoiceAsync(invoiceId, userId).ConfigureAwait(false));
  }

  /// <summary>
  /// Verifies that a Cosmos 409 (Conflict) during create is translated into <see cref="InvoiceAlreadyExistsException"/>.
  /// </summary>
  [Fact]
  public async Task CreateInvoiceAsync_WhenCosmos409_ThrowsInvoiceAlreadyExistsException()
  {
    var broker = BuildBroker();
    var invoice = new Invoice { id = Guid.NewGuid(), UserIdentifier = Guid.NewGuid() };
    mockInvoicesContainer
      .Setup(c => c.CreateItemAsync(invoice, It.IsAny<PartitionKey?>(),
        It.IsAny<ItemRequestOptions>(), It.IsAny<CancellationToken>()))
      .ThrowsAsync(MakeCosmosException(HttpStatusCode.Conflict));

    await Assert.ThrowsAsync<InvoiceAlreadyExistsException>(
      async () => await broker.CreateInvoiceAsync(invoice).ConfigureAwait(false));
  }

  /// <summary>
  /// Verifies that a Cosmos 429 (TooManyRequests) during read is translated into <see cref="InvoiceCosmosDbRateLimitException"/>.
  /// </summary>
  [Fact]
  public async Task ReadInvoiceAsync_WhenCosmos429_ThrowsInvoiceCosmosDbRateLimitException()
  {
    var broker = BuildBroker();
    var invoiceId = Guid.NewGuid();
    var userId = Guid.NewGuid();
    mockInvoicesContainer
      .Setup(c => c.ReadItemAsync<Invoice>(invoiceId.ToString(), new PartitionKey(userId.ToString()),
        It.IsAny<ItemRequestOptions>(), It.IsAny<CancellationToken>()))
      .ThrowsAsync(MakeCosmosException((HttpStatusCode)429));

    await Assert.ThrowsAsync<InvoiceCosmosDbRateLimitException>(
      async () => await broker.ReadInvoiceAsync(invoiceId, userId).ConfigureAwait(false));
  }

  /// <summary>
  /// Verifies that a Cosmos 503 (ServiceUnavailable) during read is translated into <see cref="InvoiceFailedStorageException"/>.
  /// </summary>
  [Fact]
  public async Task ReadInvoiceAsync_WhenCosmos503_ThrowsInvoiceFailedStorageException()
  {
    var broker = BuildBroker();
    var invoiceId = Guid.NewGuid();
    var userId = Guid.NewGuid();
    mockInvoicesContainer
      .Setup(c => c.ReadItemAsync<Invoice>(invoiceId.ToString(), new PartitionKey(userId.ToString()),
        It.IsAny<ItemRequestOptions>(), It.IsAny<CancellationToken>()))
      .ThrowsAsync(MakeCosmosException(HttpStatusCode.ServiceUnavailable));

    await Assert.ThrowsAsync<InvoiceFailedStorageException>(
      async () => await broker.ReadInvoiceAsync(invoiceId, userId).ConfigureAwait(false));
  }

  /// <summary>
  /// Verifies that a Cosmos 401 (Unauthorized) during read is translated into <see cref="InvoiceUnauthorizedAccessException"/>.
  /// </summary>
  [Fact]
  public async Task ReadInvoiceAsync_WhenCosmos401_ThrowsInvoiceUnauthorizedAccessException()
  {
    var broker = BuildBroker();
    var invoiceId = Guid.NewGuid();
    var userId = Guid.NewGuid();
    mockInvoicesContainer
      .Setup(c => c.ReadItemAsync<Invoice>(invoiceId.ToString(), new PartitionKey(userId.ToString()),
        It.IsAny<ItemRequestOptions>(), It.IsAny<CancellationToken>()))
      .ThrowsAsync(MakeCosmosException(HttpStatusCode.Unauthorized));

    await Assert.ThrowsAsync<InvoiceUnauthorizedAccessException>(
      async () => await broker.ReadInvoiceAsync(invoiceId, userId).ConfigureAwait(false));
  }

  /// <summary>
  /// Verifies that a Cosmos 403 (Forbidden) during read is translated into <see cref="InvoiceForbiddenAccessException"/>.
  /// </summary>
  [Fact]
  public async Task ReadInvoiceAsync_WhenCosmos403_ThrowsInvoiceForbiddenAccessException()
  {
    var broker = BuildBroker();
    var invoiceId = Guid.NewGuid();
    var userId = Guid.NewGuid();
    mockInvoicesContainer
      .Setup(c => c.ReadItemAsync<Invoice>(invoiceId.ToString(), new PartitionKey(userId.ToString()),
        It.IsAny<ItemRequestOptions>(), It.IsAny<CancellationToken>()))
      .ThrowsAsync(MakeCosmosException(HttpStatusCode.Forbidden));

    await Assert.ThrowsAsync<InvoiceForbiddenAccessException>(
      async () => await broker.ReadInvoiceAsync(invoiceId, userId).ConfigureAwait(false));
  }

  /// <summary>
  /// Verifies that a soft-deleted invoice returned by Cosmos is surfaced as <see cref="InvoiceLockedException"/>
  /// by the broker instead of being returned to the caller as a valid resource.
  /// </summary>
  [Fact]
  public async Task ReadInvoiceAsync_WhenInvoiceSoftDeleted_ThrowsInvoiceLockedException()
  {
    var broker = BuildBroker();
    var invoiceId = Guid.NewGuid();
    var userId = Guid.NewGuid();
    var softDeleted = new Invoice { id = invoiceId, UserIdentifier = userId };
    softDeleted.SoftDelete();
    var responseMock = new Mock<ItemResponse<Invoice>>();
    responseMock.SetupGet(r => r.Resource).Returns(softDeleted);
    responseMock.SetupGet(r => r.RequestCharge).Returns(0);
    mockInvoicesContainer
      .Setup(c => c.ReadItemAsync<Invoice>(invoiceId.ToString(), new PartitionKey(userId.ToString()),
        It.IsAny<ItemRequestOptions>(), It.IsAny<CancellationToken>()))
      .ReturnsAsync(responseMock.Object);

    await Assert.ThrowsAsync<InvoiceLockedException>(
      async () => await broker.ReadInvoiceAsync(invoiceId, userId));
  }
}
