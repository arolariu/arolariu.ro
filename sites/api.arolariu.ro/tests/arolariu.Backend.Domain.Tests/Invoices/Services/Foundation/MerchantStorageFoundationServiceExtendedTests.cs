namespace arolariu.Backend.Domain.Tests.Invoices.Services.Foundation;

using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;

using arolariu.Backend.Domain.Invoices.Brokers.DatabaseBroker;
using arolariu.Backend.Domain.Invoices.DDD.Entities.Merchants;
using arolariu.Backend.Domain.Invoices.DDD.Entities.Merchants.Exceptions.Outer.Foundation;
using arolariu.Backend.Domain.Invoices.Services.Foundation.MerchantStorage;
using arolariu.Backend.Domain.Tests.Builders;

using Microsoft.Extensions.Logging;

using Moq;

using Microsoft.VisualStudio.TestTools.UnitTesting;

/// <summary>
/// Extended unit tests for <see cref="MerchantStorageFoundationService"/> covering additional edge cases,
/// boundary conditions, and exception scenarios for comprehensive code coverage.
/// Method naming follows MethodName_Condition_ExpectedResult pattern per repository standards.
/// </summary>
[TestClass]
public sealed class MerchantStorageFoundationServiceExtendedTests
{
  private readonly Mock<IDatabaseBroker> mockBroker;
  private readonly Mock<ILoggerFactory> mockLoggerFactory;
  private readonly Mock<ILogger<IMerchantStorageFoundationService>> mockLogger;
  private readonly MerchantStorageFoundationService service;

  /// <summary>
  /// Initializes test fixtures with mocked dependencies.
  /// </summary>
  public MerchantStorageFoundationServiceExtendedTests()
  {
    mockBroker = new Mock<IDatabaseBroker>();
    mockLoggerFactory = new Mock<ILoggerFactory>();
    mockLogger = new Mock<ILogger<IMerchantStorageFoundationService>>();

    mockLoggerFactory
        .Setup(factory => factory.CreateLogger(It.IsAny<string>()))
        .Returns(mockLogger.Object);

    service = new MerchantStorageFoundationService(
        mockBroker.Object,
        mockLoggerFactory.Object);
  }

  #region CreateMerchantObject Extended Tests

  /// <summary>
  /// Validates merchant creation with empty Guid parent company.
  /// </summary>
  [TestMethod]
  public async Task CreateMerchantObject_EmptyGuidParentCompany_CreatesSuccessfully()
  {
    // Arrange
    var merchant = MerchantTestDataBuilder.CreateRandomMerchant();

    mockBroker
        .Setup(b => b.CreateMerchantAsync(It.IsAny<Merchant>(), It.IsAny<CancellationToken>()))
        .ReturnsAsync(merchant);

    // Act
    await service.CreateMerchantObject(merchant, Guid.Empty, CancellationToken.None);

    // Assert
    mockBroker.Verify(b => b.CreateMerchantAsync(It.IsAny<Merchant>(), It.IsAny<CancellationToken>()), Times.Once);
  }

  /// <summary>
  /// Validates merchant creation with null parent company ID.
  /// </summary>
  [TestMethod]
  public async Task CreateMerchantObject_NullParentCompanyId_CreatesSuccessfully()
  {
    // Arrange
    var merchant = MerchantTestDataBuilder.CreateRandomMerchant();

    mockBroker
        .Setup(b => b.CreateMerchantAsync(It.IsAny<Merchant>(), It.IsAny<CancellationToken>()))
        .ReturnsAsync(merchant);

    // Act
    await service.CreateMerchantObject(merchant, null, CancellationToken.None);

    // Assert
    mockBroker.Verify(b => b.CreateMerchantAsync(It.IsAny<Merchant>(), It.IsAny<CancellationToken>()), Times.Once);
  }

  /// <summary>
  /// Validates generic exception during creation is wrapped.
  /// </summary>
  [TestMethod]
  public async Task CreateMerchantObject_GenericException_ThrowsFoundationServiceException()
  {
    // Arrange
    var merchant = MerchantTestDataBuilder.CreateRandomMerchant();

    mockBroker
        .Setup(b => b.CreateMerchantAsync(It.IsAny<Merchant>(), It.IsAny<CancellationToken>()))
        .ThrowsAsync(new InvalidOperationException("Unexpected error"));

    // Act & Assert
    await Assert.ThrowsExactlyAsync<MerchantFoundationServiceException>(() =>
        service.CreateMerchantObject(merchant, null, CancellationToken.None));
  }

  /// <summary>
  /// Validates TimeoutException during creation is wrapped.
  /// </summary>
  [TestMethod]
  public async Task CreateMerchantObject_TimeoutException_ThrowsFoundationServiceException()
  {
    // Arrange
    var merchant = MerchantTestDataBuilder.CreateRandomMerchant();

    mockBroker
        .Setup(b => b.CreateMerchantAsync(It.IsAny<Merchant>(), It.IsAny<CancellationToken>()))
        .ThrowsAsync(new TimeoutException("Connection timeout"));

    // Act & Assert
    await Assert.ThrowsExactlyAsync<MerchantFoundationServiceException>(() =>
        service.CreateMerchantObject(merchant, null, CancellationToken.None));
  }

  #endregion

  #region ReadMerchantObject Extended Tests

  /// <summary>
  /// Validates merchant read with specific parent company ID.
  /// </summary>
  [TestMethod]
  public async Task ReadMerchantObject_WithParentCompanyId_ReturnsMerchant()
  {
    // Arrange
    var merchantId = Guid.NewGuid();
    var parentCompanyId = Guid.NewGuid();
    var expectedMerchant = MerchantTestDataBuilder.CreateRandomMerchant();
    expectedMerchant.ParentCompanyId = parentCompanyId;

    mockBroker
        .Setup(b => b.ReadMerchantAsync(merchantId, parentCompanyId, It.IsAny<CancellationToken>()))
        .ReturnsAsync(expectedMerchant);

    // Act
    var result = await service.ReadMerchantObject(merchantId, parentCompanyId, CancellationToken.None);

    // Assert
    Assert.IsNotNull(result);
    Assert.AreEqual(parentCompanyId, result.ParentCompanyId);
  }

  /// <summary>
  /// Validates merchant read with null parent company ID.
  /// </summary>
  [TestMethod]
  public async Task ReadMerchantObject_NullParentCompanyId_ReturnsMerchant()
  {
    // Arrange
    var merchantId = Guid.NewGuid();
    var expectedMerchant = MerchantTestDataBuilder.CreateRandomMerchant();

    mockBroker
        .Setup(b => b.ReadMerchantAsync(merchantId, null, It.IsAny<CancellationToken>()))
        .ReturnsAsync(expectedMerchant);

    // Act
    var result = await service.ReadMerchantObject(merchantId, null, CancellationToken.None);

    // Assert
    Assert.IsNotNull(result);
  }

  /// <summary>
  /// Validates generic exception during read is wrapped.
  /// </summary>
  [TestMethod]
  public async Task ReadMerchantObject_GenericException_ThrowsFoundationServiceException()
  {
    // Arrange
    var merchantId = Guid.NewGuid();

    mockBroker
        .Setup(b => b.ReadMerchantAsync(merchantId, null, It.IsAny<CancellationToken>()))
        .ThrowsAsync(new InvalidOperationException("Unexpected error"));

    // Act & Assert
    await Assert.ThrowsExactlyAsync<MerchantFoundationServiceException>(() =>
        service.ReadMerchantObject(merchantId, null, CancellationToken.None));
  }

  #endregion

  #region ReadAllMerchantObjects Extended Tests

  /// <summary>
  /// Validates bulk read returns empty collection when no merchants exist.
  /// </summary>
  [TestMethod]
  public async Task ReadAllMerchantObjects_NoMerchants_ReturnsEmptyCollection()
  {
    // Arrange
    var parentCompanyId = Guid.NewGuid();

    mockBroker
        .Setup(b => b.ReadMerchantsAsync(parentCompanyId, It.IsAny<CancellationToken>()))
        .ReturnsAsync(new List<Merchant>());

    // Act
    var result = await service.ReadAllMerchantObjects(parentCompanyId, CancellationToken.None);

    // Assert
    Assert.IsNotNull(result);
    Assert.IsEmpty(result);
  }

  /// <summary>
  /// Validates bulk read returns large collection.
  /// </summary>
  [TestMethod]
  public async Task ReadAllMerchantObjects_LargeCollection_ReturnsAllMerchants()
  {
    // Arrange
    var parentCompanyId = Guid.NewGuid();
    var expectedMerchants = Enumerable.Range(0, 200)
        .Select(_ => MerchantTestDataBuilder.CreateRandomMerchant())
        .ToList();

    mockBroker
        .Setup(b => b.ReadMerchantsAsync(parentCompanyId, It.IsAny<CancellationToken>()))
        .ReturnsAsync(expectedMerchants);

    // Act
    var result = await service.ReadAllMerchantObjects(parentCompanyId, CancellationToken.None);

    // Assert
    Assert.AreEqual(200, result.Count());
  }

  /// <summary>
  /// Validates bulk read with single merchant.
  /// </summary>
  [TestMethod]
  public async Task ReadAllMerchantObjects_SingleMerchant_ReturnsSingleElement()
  {
    // Arrange
    var parentCompanyId = Guid.NewGuid();
    var expectedMerchants = new List<Merchant> { MerchantTestDataBuilder.CreateRandomMerchant() };

    mockBroker
        .Setup(b => b.ReadMerchantsAsync(parentCompanyId, It.IsAny<CancellationToken>()))
        .ReturnsAsync(expectedMerchants);

    // Act
    var result = await service.ReadAllMerchantObjects(parentCompanyId, CancellationToken.None);

    // Assert
    Assert.ContainsSingle(result);
  }

  /// <summary>
  /// Validates generic exception during bulk read is wrapped.
  /// </summary>
  [TestMethod]
  public async Task ReadAllMerchantObjects_GenericException_ThrowsFoundationServiceException()
  {
    // Arrange
    var parentCompanyId = Guid.NewGuid();

    mockBroker
        .Setup(b => b.ReadMerchantsAsync(parentCompanyId, It.IsAny<CancellationToken>()))
        .ThrowsAsync(new InvalidOperationException("Unexpected error"));

    // Act & Assert
    await Assert.ThrowsExactlyAsync<MerchantFoundationServiceException>(() =>
        service.ReadAllMerchantObjects(parentCompanyId, CancellationToken.None));
  }

  #endregion

  #region UpdateMerchantObject Extended Tests

  /// <summary>
  /// Validates successful merchant update.
  /// </summary>
  [TestMethod]
  public async Task UpdateMerchantObject_ValidMerchant_ReturnsUpdatedMerchant()
  {
    // Arrange
    var merchant = MerchantTestDataBuilder.CreateRandomMerchant();
    var merchantId = Guid.NewGuid();
    var parentCompanyId = Guid.NewGuid();

    mockBroker
        .Setup(b => b.ReadMerchantAsync(merchantId, parentCompanyId, It.IsAny<CancellationToken>()))
        .ReturnsAsync(merchant);

    mockBroker
        .Setup(b => b.UpdateMerchantAsync(merchant, merchant, It.IsAny<CancellationToken>()))
        .ReturnsAsync(merchant);

    // Act
    var result = await service.UpdateMerchantObject(merchant, merchantId, parentCompanyId, CancellationToken.None);

    // Assert
    Assert.IsNotNull(result);
  }

  /// <summary>
  /// Validates generic exception during update is wrapped.
  /// </summary>
  [TestMethod]
  public async Task UpdateMerchantObject_GenericException_ThrowsFoundationServiceException()
  {
    // Arrange
    var merchant = MerchantTestDataBuilder.CreateRandomMerchant();
    var merchantId = Guid.NewGuid();

    mockBroker
        .Setup(b => b.ReadMerchantAsync(merchantId, null, It.IsAny<CancellationToken>()))
        .ThrowsAsync(new InvalidOperationException("Unexpected error"));

    // Act & Assert
    await Assert.ThrowsExactlyAsync<MerchantFoundationServiceException>(() =>
        service.UpdateMerchantObject(merchant, merchantId, null, CancellationToken.None));
  }

  #endregion

  #region DeleteMerchantObject Extended Tests

  /// <summary>
  /// Validates successful merchant deletion.
  /// </summary>
  [TestMethod]
  public async Task DeleteMerchantObject_ValidIdentifier_DeletesSuccessfully()
  {
    // Arrange
    var merchantId = Guid.NewGuid();
    var parentCompanyId = Guid.NewGuid();

    mockBroker
        .Setup(b => b.DeleteMerchantAsync(merchantId, parentCompanyId, It.IsAny<CancellationToken>()))
        .Returns(ValueTask.CompletedTask);

    // Act
    await service.DeleteMerchantObject(merchantId, parentCompanyId, CancellationToken.None);

    // Assert
    mockBroker.Verify(b => b.DeleteMerchantAsync(merchantId, parentCompanyId, It.IsAny<CancellationToken>()), Times.Once);
  }

  /// <summary>
  /// Validates generic exception during deletion is wrapped.
  /// </summary>
  [TestMethod]
  public async Task DeleteMerchantObject_GenericException_ThrowsFoundationServiceException()
  {
    // Arrange
    var merchantId = Guid.NewGuid();
    var parentCompanyId = Guid.NewGuid();

    mockBroker
        .Setup(b => b.DeleteMerchantAsync(merchantId, parentCompanyId, It.IsAny<CancellationToken>()))
        .ThrowsAsync(new InvalidOperationException("Unexpected error"));

    // Act & Assert
    await Assert.ThrowsExactlyAsync<MerchantFoundationServiceException>(() =>
        service.DeleteMerchantObject(merchantId, parentCompanyId, CancellationToken.None));
  }

  /// <summary>
  /// Validates idempotent deletion.
  /// </summary>
  [TestMethod]
  public async Task DeleteMerchantObject_MultipleCalls_ExecutesEachTime()
  {
    // Arrange
    var merchantId = Guid.NewGuid();
    var parentCompanyId = Guid.NewGuid();

    mockBroker
        .Setup(b => b.DeleteMerchantAsync(merchantId, parentCompanyId, It.IsAny<CancellationToken>()))
        .Returns(ValueTask.CompletedTask);

    // Act
    await service.DeleteMerchantObject(merchantId, parentCompanyId, CancellationToken.None);
    await service.DeleteMerchantObject(merchantId, parentCompanyId, CancellationToken.None);
    await service.DeleteMerchantObject(merchantId, parentCompanyId, CancellationToken.None);

    // Assert
    mockBroker.Verify(b => b.DeleteMerchantAsync(merchantId, parentCompanyId, It.IsAny<CancellationToken>()), Times.Exactly(3));
  }

  #endregion

  #region Concurrent Operation Tests

  /// <summary>
  /// Validates concurrent create operations complete successfully.
  /// </summary>
  [TestMethod]
  public async Task CreateMerchantObject_ConcurrentOperations_AllComplete()
  {
    // Arrange
    var merchants = Enumerable.Range(0, 10)
        .Select(_ => MerchantTestDataBuilder.CreateRandomMerchant())
        .ToList();

    mockBroker
        .Setup(b => b.CreateMerchantAsync(It.IsAny<Merchant>(), It.IsAny<CancellationToken>()))
        .ReturnsAsync((Merchant m, CancellationToken _) => m);

    // Act
    var tasks = merchants.Select(m => service.CreateMerchantObject(m, null, CancellationToken.None));
    await Task.WhenAll(tasks);

    // Assert
    mockBroker.Verify(b => b.CreateMerchantAsync(It.IsAny<Merchant>(), It.IsAny<CancellationToken>()), Times.Exactly(10));
  }

  /// <summary>
  /// Validates concurrent read operations complete successfully.
  /// </summary>
  [TestMethod]
  public async Task ReadMerchantObject_ConcurrentOperations_AllComplete()
  {
    // Arrange
    var expectedMerchant = MerchantTestDataBuilder.CreateRandomMerchant();

    mockBroker
        .Setup(b => b.ReadMerchantAsync(It.IsAny<Guid>(), null, It.IsAny<CancellationToken>()))
        .ReturnsAsync(expectedMerchant);

    // Act
    var tasks = Enumerable.Range(0, 10).Select(_ => service.ReadMerchantObject(Guid.NewGuid(), null, CancellationToken.None));
    var results = await Task.WhenAll(tasks);

    // Assert
    foreach (var result in results)
    {
      Assert.IsNotNull(result);
    }
  }

  #endregion

  #region Edge Case Tests

  /// <summary>
  /// Validates handling of OperationCanceledException.
  /// </summary>
  [TestMethod]
  public async Task CreateMerchantObject_OperationCanceledException_ThrowsFoundationDependencyException()
  {
    // Arrange
    var merchant = MerchantTestDataBuilder.CreateRandomMerchant();

    mockBroker
        .Setup(b => b.CreateMerchantAsync(It.IsAny<Merchant>(), It.IsAny<CancellationToken>()))
        .ThrowsAsync(new OperationCanceledException("Operation cancelled"));

    // Act & Assert — cancellation must not be reclassified into a domain exception (bug fix)
    await Assert.ThrowsExactlyAsync<OperationCanceledException>(() =>
        service.CreateMerchantObject(merchant, null, CancellationToken.None));
  }

  /// <summary>
  /// Validates handling of ArgumentException from broker.
  /// </summary>
  [TestMethod]
  public async Task CreateMerchantObject_ArgumentException_ThrowsFoundationServiceException()
  {
    // Arrange
    var merchant = MerchantTestDataBuilder.CreateRandomMerchant();

    mockBroker
        .Setup(b => b.CreateMerchantAsync(It.IsAny<Merchant>(), It.IsAny<CancellationToken>()))
        .ThrowsAsync(new ArgumentException("Invalid argument"));

    // Act & Assert
    await Assert.ThrowsExactlyAsync<MerchantFoundationServiceException>(() =>
        service.CreateMerchantObject(merchant, null, CancellationToken.None));
  }

  /// <summary>
  /// Validates handling of NullReferenceException.
  /// </summary>
  [TestMethod]
  public async Task ReadMerchantObject_NullReferenceException_ThrowsFoundationServiceException()
  {
    // Arrange
    var merchantId = Guid.NewGuid();

    mockBroker
        .Setup(b => b.ReadMerchantAsync(merchantId, null, It.IsAny<CancellationToken>()))
        .ThrowsAsync(new ArgumentNullException("parameter", "Null reference"));

    // Act & Assert
    await Assert.ThrowsExactlyAsync<MerchantFoundationServiceException>(() =>
        service.ReadMerchantObject(merchantId, null, CancellationToken.None));
  }

  #endregion
}
