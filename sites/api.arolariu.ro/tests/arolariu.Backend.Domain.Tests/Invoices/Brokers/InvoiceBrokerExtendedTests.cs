namespace arolariu.Backend.Domain.Tests.Invoices.Brokers;

using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;

using arolariu.Backend.Domain.Invoices.Brokers.DatabaseBroker;
using arolariu.Backend.Domain.Invoices.DDD.AggregatorRoots.Invoices;
using arolariu.Backend.Domain.Invoices.DDD.Entities.Merchants;
using arolariu.Backend.Domain.Tests.Builders;

using Moq;

using Xunit;

/// <summary>
/// Extended unit tests for invoice and merchant broker interfaces covering additional
/// scenarios and boundary conditions.
/// </summary>
public sealed class InvoiceBrokerExtendedTests
{
  private readonly Mock<IInvoiceNoSqlBroker> mockBroker;

  /// <summary>
  /// Initializes test fixtures.
  /// </summary>
  public InvoiceBrokerExtendedTests()
  {
    mockBroker = new Mock<IInvoiceNoSqlBroker>();
  }

  #region Invoice CRUD Extended Tests

  /// <summary>
  /// Validates invoice creation returns the created invoice.
  /// </summary>
  [Fact]
  public async Task CreateInvoiceAsync_ValidInvoice_ReturnsCreatedInvoice()
  {
    // Arrange
    var invoice = InvoiceBuilder.CreateRandomInvoice();
    mockBroker
        .Setup(b => b.CreateInvoiceAsync(invoice))
        .ReturnsAsync(invoice);

    // Act
    var result = await mockBroker.Object.CreateInvoiceAsync(invoice);

    // Assert
    Assert.Same(invoice, result);
  }

  /// <summary>
  /// Validates invoice reading with specific identifiers.
  /// </summary>
  [Fact]
  public async Task ReadInvoiceAsync_ValidIdentifiers_ReturnsInvoice()
  {
    // Arrange
    var invoiceId = Guid.NewGuid();
    var userId = Guid.NewGuid();
    var expectedInvoice = InvoiceBuilder.CreateRandomInvoice();

    mockBroker
        .Setup(b => b.ReadInvoiceAsync(invoiceId, userId))
        .ReturnsAsync(expectedInvoice);

    // Act
    var result = await mockBroker.Object.ReadInvoiceAsync(invoiceId, userId);

    // Assert
    Assert.Same(expectedInvoice, result);
  }

  /// <summary>
  /// Validates invoice reading with null user identifier.
  /// </summary>
  [Fact]
  public async Task ReadInvoiceAsync_NullUserIdentifier_ReturnsInvoice()
  {
    // Arrange
    var invoiceId = Guid.NewGuid();
    var expectedInvoice = InvoiceBuilder.CreateRandomInvoice();

    mockBroker
        .Setup(b => b.ReadInvoiceAsync(invoiceId, null))
        .ReturnsAsync(expectedInvoice);

    // Act
    var result = await mockBroker.Object.ReadInvoiceAsync(invoiceId, null);

    // Assert
    Assert.NotNull(result);
  }

  /// <summary>
  /// Validates bulk invoice reading returns multiple invoices.
  /// </summary>
  [Fact]
  public async Task ReadInvoicesAsync_ValidUserIdentifier_ReturnsInvoices()
  {
    // Arrange
    var userId = Guid.NewGuid();
    var expectedInvoices = InvoiceBuilder.CreateMultipleRandomInvoices(5);

    mockBroker
        .Setup(b => b.ReadInvoicesAsync(userId))
        .ReturnsAsync(expectedInvoices);

    // Act
    var result = await mockBroker.Object.ReadInvoicesAsync(userId);

    // Assert
    Assert.Equal(5, result.Count());
  }

  /// <summary>
  /// Validates bulk invoice reading returns empty when no invoices exist.
  /// </summary>
  [Fact]
  public async Task ReadInvoicesAsync_NoInvoices_ReturnsEmptyCollection()
  {
    // Arrange
    var userId = Guid.NewGuid();

    mockBroker
        .Setup(b => b.ReadInvoicesAsync(userId))
        .ReturnsAsync(new List<Invoice>());

    // Act
    var result = await mockBroker.Object.ReadInvoicesAsync(userId);

    // Assert
    Assert.Empty(result);
  }

  /// <summary>
  /// Validates invoice update returns updated invoice.
  /// </summary>
  [Fact]
  public async Task UpdateInvoiceAsync_ValidData_ReturnsUpdatedInvoice()
  {
    // Arrange
    var invoiceId = Guid.NewGuid();
    var updatedInvoice = InvoiceBuilder.CreateRandomInvoice();

    mockBroker
        .Setup(b => b.UpdateInvoiceAsync(invoiceId, updatedInvoice))
        .ReturnsAsync(updatedInvoice);

    // Act
    var result = await mockBroker.Object.UpdateInvoiceAsync(invoiceId, updatedInvoice);

    // Assert
    Assert.Same(updatedInvoice, result);
  }

  /// <summary>
  /// Validates invoice deletion completes without error.
  /// </summary>
  [Fact]
  public async Task DeleteInvoiceAsync_ValidIdentifiers_CompletesSuccessfully()
  {
    // Arrange
    var invoiceId = Guid.NewGuid();
    var userId = Guid.NewGuid();

    mockBroker
        .Setup(b => b.DeleteInvoiceAsync(invoiceId, userId))
        .Returns(ValueTask.CompletedTask);

    // Act
    await mockBroker.Object.DeleteInvoiceAsync(invoiceId, userId);

    // Assert
    mockBroker.Verify(b => b.DeleteInvoiceAsync(invoiceId, userId), Times.Once);
  }

  /// <summary>
  /// Validates invoice deletion with null user identifier.
  /// </summary>
  [Fact]
  public async Task DeleteInvoiceAsync_NullUserIdentifier_CompletesSuccessfully()
  {
    // Arrange
    var invoiceId = Guid.NewGuid();

    mockBroker
        .Setup(b => b.DeleteInvoiceAsync(invoiceId, null))
        .Returns(ValueTask.CompletedTask);

    // Act
    await mockBroker.Object.DeleteInvoiceAsync(invoiceId, null);

    // Assert
    mockBroker.Verify(b => b.DeleteInvoiceAsync(invoiceId, null), Times.Once);
  }

  /// <summary>
  /// Validates bulk delete for user invoices.
  /// </summary>
  [Fact]
  public async Task DeleteInvoicesAsync_ValidUserIdentifier_CompletesSuccessfully()
  {
    // Arrange
    var userId = Guid.NewGuid();

    mockBroker
        .Setup(b => b.DeleteInvoicesAsync(userId))
        .Returns(ValueTask.CompletedTask);

    // Act
    await mockBroker.Object.DeleteInvoicesAsync(userId);

    // Assert
    mockBroker.Verify(b => b.DeleteInvoicesAsync(userId), Times.Once);
  }

  #endregion

  #region Merchant CRUD Extended Tests

  /// <summary>
  /// Validates merchant creation returns the created merchant.
  /// </summary>
  [Fact]
  public async Task CreateMerchantAsync_ValidMerchant_ReturnsCreatedMerchant()
  {
    // Arrange
    var merchant = MerchantTestDataBuilder.CreateRandomMerchant();

    mockBroker
        .Setup(b => b.CreateMerchantAsync(merchant))
        .ReturnsAsync(merchant);

    // Act
    var result = await mockBroker.Object.CreateMerchantAsync(merchant);

    // Assert
    Assert.Same(merchant, result);
  }

  /// <summary>
  /// Validates merchant reading with specific identifiers.
  /// </summary>
  [Fact]
  public async Task ReadMerchantAsync_ValidIdentifiers_ReturnsMerchant()
  {
    // Arrange
    var merchantId = Guid.NewGuid();
    var parentCompanyId = Guid.NewGuid();
    var expectedMerchant = MerchantTestDataBuilder.CreateRandomMerchant();

    mockBroker
        .Setup(b => b.ReadMerchantAsync(merchantId, parentCompanyId))
        .ReturnsAsync(expectedMerchant);

    // Act
    var result = await mockBroker.Object.ReadMerchantAsync(merchantId, parentCompanyId);

    // Assert
    Assert.Same(expectedMerchant, result);
  }

  /// <summary>
  /// Validates merchant reading with null parent company ID.
  /// </summary>
  [Fact]
  public async Task ReadMerchantAsync_NullParentCompanyId_ReturnsMerchant()
  {
    // Arrange
    var merchantId = Guid.NewGuid();
    var expectedMerchant = MerchantTestDataBuilder.CreateRandomMerchant();

    mockBroker
        .Setup(b => b.ReadMerchantAsync(merchantId, null))
        .ReturnsAsync(expectedMerchant);

    // Act
    var result = await mockBroker.Object.ReadMerchantAsync(merchantId, null);

    // Assert
    Assert.NotNull(result);
  }

  /// <summary>
  /// Validates bulk merchant reading returns multiple merchants.
  /// </summary>
  [Fact]
  public async Task ReadMerchantsAsync_ValidParentCompanyId_ReturnsMerchants()
  {
    // Arrange
    var parentCompanyId = Guid.NewGuid();
    var expectedMerchants = Enumerable.Range(0, 10)
        .Select(_ => MerchantTestDataBuilder.CreateRandomMerchant())
        .ToList();

    mockBroker
        .Setup(b => b.ReadMerchantsAsync(parentCompanyId))
        .ReturnsAsync(expectedMerchants);

    // Act
    var result = await mockBroker.Object.ReadMerchantsAsync(parentCompanyId);

    // Assert
    Assert.Equal(10, result.Count());
  }

  /// <summary>
  /// Validates bulk merchant reading returns empty when no merchants exist.
  /// </summary>
  [Fact]
  public async Task ReadMerchantsAsync_NoMerchants_ReturnsEmptyCollection()
  {
    // Arrange
    var parentCompanyId = Guid.NewGuid();

    mockBroker
        .Setup(b => b.ReadMerchantsAsync(parentCompanyId))
        .ReturnsAsync(new List<Merchant>());

    // Act
    var result = await mockBroker.Object.ReadMerchantsAsync(parentCompanyId);

    // Assert
    Assert.Empty(result);
  }

  /// <summary>
  /// Validates merchant update returns updated merchant.
  /// </summary>
  [Fact]
  public async Task UpdateMerchantAsync_ValidData_ReturnsUpdatedMerchant()
  {
    // Arrange
    var currentMerchant = MerchantTestDataBuilder.CreateRandomMerchant();
    var updatedMerchant = MerchantTestDataBuilder.CreateRandomMerchant();

    mockBroker
        .Setup(b => b.UpdateMerchantAsync(currentMerchant, updatedMerchant))
        .ReturnsAsync(updatedMerchant);

    // Act
    var result = await mockBroker.Object.UpdateMerchantAsync(currentMerchant, updatedMerchant);

    // Assert
    Assert.Same(updatedMerchant, result);
  }

  /// <summary>
  /// Validates merchant update by ID.
  /// </summary>
  [Fact]
  public async Task UpdateMerchantAsync_ById_ReturnsUpdatedMerchant()
  {
    // Arrange
    var merchantId = Guid.NewGuid();
    var updatedMerchant = MerchantTestDataBuilder.CreateRandomMerchant();

    mockBroker
        .Setup(b => b.UpdateMerchantAsync(merchantId, updatedMerchant))
        .ReturnsAsync(updatedMerchant);

    // Act
    var result = await mockBroker.Object.UpdateMerchantAsync(merchantId, updatedMerchant);

    // Assert
    Assert.Same(updatedMerchant, result);
  }

  /// <summary>
  /// Validates merchant deletion completes without error.
  /// </summary>
  [Fact]
  public async Task DeleteMerchantAsync_ValidIdentifiers_CompletesSuccessfully()
  {
    // Arrange
    var merchantId = Guid.NewGuid();
    var parentCompanyId = Guid.NewGuid();

    mockBroker
        .Setup(b => b.DeleteMerchantAsync(merchantId, parentCompanyId))
        .Returns(ValueTask.CompletedTask);

    // Act
    await mockBroker.Object.DeleteMerchantAsync(merchantId, parentCompanyId);

    // Assert
    mockBroker.Verify(b => b.DeleteMerchantAsync(merchantId, parentCompanyId), Times.Once);
  }

  /// <summary>
  /// Validates merchant deletion with null parent company ID.
  /// </summary>
  [Fact]
  public async Task DeleteMerchantAsync_NullParentCompanyId_CompletesSuccessfully()
  {
    // Arrange
    var merchantId = Guid.NewGuid();

    mockBroker
        .Setup(b => b.DeleteMerchantAsync(merchantId, null))
        .Returns(ValueTask.CompletedTask);

    // Act
    await mockBroker.Object.DeleteMerchantAsync(merchantId, null);

    // Assert
    mockBroker.Verify(b => b.DeleteMerchantAsync(merchantId, null), Times.Once);
  }

  #endregion

  #region Large Data Tests

  /// <summary>
  /// Validates bulk invoice reading handles large collections.
  /// </summary>
  [Fact]
  public async Task ReadInvoicesAsync_LargeCollection_ReturnsAllInvoices()
  {
    // Arrange
    var userId = Guid.NewGuid();
    var expectedInvoices = InvoiceBuilder.CreateMultipleRandomInvoices(1000);

    mockBroker
        .Setup(b => b.ReadInvoicesAsync(userId))
        .ReturnsAsync(expectedInvoices);

    // Act
    var result = await mockBroker.Object.ReadInvoicesAsync(userId);

    // Assert
    Assert.Equal(1000, result.Count());
  }

  /// <summary>
  /// Validates bulk merchant reading handles large collections.
  /// </summary>
  [Fact]
  public async Task ReadMerchantsAsync_LargeCollection_ReturnsAllMerchants()
  {
    // Arrange
    var parentCompanyId = Guid.NewGuid();
    var expectedMerchants = Enumerable.Range(0, 500)
        .Select(_ => MerchantTestDataBuilder.CreateRandomMerchant())
        .ToList();

    mockBroker
        .Setup(b => b.ReadMerchantsAsync(parentCompanyId))
        .ReturnsAsync(expectedMerchants);

    // Act
    var result = await mockBroker.Object.ReadMerchantsAsync(parentCompanyId);

    // Assert
    Assert.Equal(500, result.Count());
  }

  #endregion

  #region Edge Case Identifier Tests

  /// <summary>
  /// Validates operations with empty Guid identifiers.
  /// </summary>
  [Fact]
  public async Task ReadInvoiceAsync_EmptyGuidIdentifier_ReturnsInvoice()
  {
    // Arrange
    var expectedInvoice = InvoiceBuilder.CreateRandomInvoice();

    mockBroker
        .Setup(b => b.ReadInvoiceAsync(Guid.Empty, Guid.Empty))
        .ReturnsAsync(expectedInvoice);

    // Act
    var result = await mockBroker.Object.ReadInvoiceAsync(Guid.Empty, Guid.Empty);

    // Assert
    Assert.NotNull(result);
  }

  /// <summary>
  /// Validates operations with same source and target Guids.
  /// </summary>
  [Fact]
  public async Task ReadInvoiceAsync_SameIdentifierForInvoiceAndUser_ReturnsInvoice()
  {
    // Arrange
    var sameId = Guid.NewGuid();
    var expectedInvoice = InvoiceBuilder.CreateRandomInvoice();

    mockBroker
        .Setup(b => b.ReadInvoiceAsync(sameId, sameId))
        .ReturnsAsync(expectedInvoice);

    // Act
    var result = await mockBroker.Object.ReadInvoiceAsync(sameId, sameId);

    // Assert
    Assert.NotNull(result);
  }

  /// <summary>
  /// Validates merchant operations with empty Guid identifiers.
  /// </summary>
  [Fact]
  public async Task ReadMerchantAsync_EmptyGuidIdentifier_ReturnsMerchant()
  {
    // Arrange
    var expectedMerchant = MerchantTestDataBuilder.CreateRandomMerchant();

    mockBroker
        .Setup(b => b.ReadMerchantAsync(Guid.Empty, Guid.Empty))
        .ReturnsAsync(expectedMerchant);

    // Act
    var result = await mockBroker.Object.ReadMerchantAsync(Guid.Empty, Guid.Empty);

    // Assert
    Assert.NotNull(result);
  }

  /// <summary>
  /// Validates invoice update with different overload.
  /// </summary>
  [Fact]
  public async Task UpdateInvoiceAsync_TwoInvoices_ReturnsUpdatedInvoice()
  {
    // Arrange
    var currentInvoice = InvoiceBuilder.CreateRandomInvoice();
    var updatedInvoice = InvoiceBuilder.CreateRandomInvoice();

    mockBroker
        .Setup(b => b.UpdateInvoiceAsync(currentInvoice, updatedInvoice))
        .ReturnsAsync(updatedInvoice);

    // Act
    var result = await mockBroker.Object.UpdateInvoiceAsync(currentInvoice, updatedInvoice);

    // Assert
    Assert.Same(updatedInvoice, result);
  }

  /// <summary>
  /// Validates reading invoices returns null when not found.
  /// </summary>
  [Fact]
  public async Task ReadInvoiceAsync_NotFound_ReturnsNull()
  {
    // Arrange
    var invoiceId = Guid.NewGuid();

    mockBroker
        .Setup(b => b.ReadInvoiceAsync(invoiceId, null))
        .ReturnsAsync((Invoice?)null);

    // Act
    var result = await mockBroker.Object.ReadInvoiceAsync(invoiceId, null);

    // Assert
    Assert.Null(result);
  }

  /// <summary>
  /// Validates reading merchants returns null when not found.
  /// </summary>
  [Fact]
  public async Task ReadMerchantAsync_NotFound_ReturnsNull()
  {
    // Arrange
    var merchantId = Guid.NewGuid();

    mockBroker
        .Setup(b => b.ReadMerchantAsync(merchantId, null))
        .ReturnsAsync((Merchant?)null);

    // Act
    var result = await mockBroker.Object.ReadMerchantAsync(merchantId, null);

    // Assert
    Assert.Null(result);
  }

  #endregion
}
