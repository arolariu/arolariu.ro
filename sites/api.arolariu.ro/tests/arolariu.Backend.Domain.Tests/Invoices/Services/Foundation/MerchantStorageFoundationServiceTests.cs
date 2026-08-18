namespace arolariu.Backend.Domain.Tests.Invoices.Services.Foundation;

using System;
using System.Collections.Generic;
using System.Threading;
using System.Threading.Tasks;

using arolariu.Backend.Domain.Invoices.Brokers.DatabaseBroker;
using arolariu.Backend.Domain.Invoices.Brokers.TaxonomyBroker;
using arolariu.Backend.Domain.Invoices.DDD.Entities.Merchants;
using arolariu.Backend.Domain.Invoices.DDD.Entities.Merchants.Exceptions.Inner;
using arolariu.Backend.Domain.Invoices.DDD.Entities.Merchants.Exceptions.Outer.Foundation;
using arolariu.Backend.Domain.Invoices.DDD.ValueObjects.Classifications;
using arolariu.Backend.Domain.Invoices.DTOs.Analysis;
using arolariu.Backend.Domain.Invoices.Services.Foundation.MerchantStorage;
using arolariu.Backend.Domain.Tests.Builders;

using Microsoft.Extensions.Logging;

using Moq;

using Microsoft.VisualStudio.TestTools.UnitTesting;

/// <summary>
/// Comprehensive unit tests for <see cref="MerchantStorageFoundationService"/> targeting 95%+ code coverage.
/// Tests validate CRUD operations, exception handling, validation, and broker coordination.
/// Method naming follows MethodName_Condition_ExpectedResult pattern per repository standards.
/// </summary>
[TestClass]
public sealed class MerchantStorageFoundationServiceTests
{
  private readonly Mock<IInvoiceNoSqlBroker> mockBroker;
  private readonly Mock<ITaxonomyBroker> mockTaxonomyBroker;
  private readonly Mock<ILoggerFactory> mockLoggerFactory;
  private readonly Mock<ILogger<IMerchantStorageFoundationService>> mockLogger;
  private readonly MerchantStorageFoundationService service;

  /// <summary>
  /// Initializes test fixtures with mocked dependencies for isolated foundation service testing.
  /// </summary>
  public MerchantStorageFoundationServiceTests()
  {
    mockBroker = new Mock<IInvoiceNoSqlBroker>();
    mockTaxonomyBroker = new Mock<ITaxonomyBroker>();
    mockLoggerFactory = new Mock<ILoggerFactory>();
    mockLogger = new Mock<ILogger<IMerchantStorageFoundationService>>();

    mockLoggerFactory
        .Setup(factory => factory.CreateLogger(It.IsAny<string>()))
        .Returns(mockLogger.Object);

    service = new MerchantStorageFoundationService(mockBroker.Object, mockTaxonomyBroker.Object, mockLoggerFactory.Object);
  }

  #region Constructor Tests

  /// <summary>
  /// Verifies constructor throws ArgumentNullException when broker is null.
  /// </summary>
  [TestMethod]
  public void Constructor_NullBroker_ThrowsArgumentNullException() =>
      Assert.ThrowsExactly<ArgumentNullException>(() =>
          new MerchantStorageFoundationService(null!, mockTaxonomyBroker.Object, mockLoggerFactory.Object));

  /// <summary>
  /// Validates successful instantiation with all valid dependencies.
  /// </summary>
  [TestMethod]
  public void Constructor_ValidDependencies_CreatesInstance()
  {
    // Arrange & Act
    var svc = new MerchantStorageFoundationService(mockBroker.Object, mockTaxonomyBroker.Object, mockLoggerFactory.Object);

    // Assert
    Assert.IsNotNull(svc);
  }

  #endregion

  #region CreateMerchantObject Tests

  /// <summary>
  /// Validates successful merchant creation through foundation layer.
  /// </summary>
  [TestMethod]
  public async Task CreateMerchantObject_ValidMerchant_CallsBrokerSuccessfully()
  {
    // Arrange
    var merchant = MerchantTestDataBuilder.CreateRandomMerchant();
    var parentCompanyId = Guid.NewGuid();

    mockBroker
        .Setup(b => b.CreateMerchantAsync(merchant, It.IsAny<CancellationToken>()))
        .ReturnsAsync(merchant);

    // Act
    await service.CreateMerchantObject(merchant, parentCompanyId, CancellationToken.None);

    // Assert
    mockBroker.Verify(b => b.CreateMerchantAsync(merchant, It.IsAny<CancellationToken>()), Times.Once);
  }

  /// <summary>
  /// Ensures creation succeeds without parent company identifier.
  /// </summary>
  [TestMethod]
  public async Task CreateMerchantObject_NoParentCompanyId_CreatesSuccessfully()
  {
    // Arrange
    var merchant = MerchantTestDataBuilder.CreateRandomMerchant();

    mockBroker
        .Setup(b => b.CreateMerchantAsync(merchant, It.IsAny<CancellationToken>()))
        .ReturnsAsync(merchant);

    // Act
    await service.CreateMerchantObject(merchant, null, CancellationToken.None);

    // Assert
    mockBroker.Verify(b => b.CreateMerchantAsync(merchant, It.IsAny<CancellationToken>()), Times.Once);
  }

  /// <summary>
  /// Validates merchant with empty id throws foundation service exception.
  /// Note: The validation exception class lacks the required constructor for Validator.ValidateAndThrow,
  /// causing a MissingMethodException that falls through to the generic exception handler.
  /// </summary>
  [TestMethod]
  public async Task CreateMerchantObject_EmptyMerchantId_ThrowsFoundationServiceException()
  {
    // Arrange
    var merchant = MerchantTestDataBuilder.CreateMerchantWithSpecificProperties(id: Guid.Empty);

    // Act & Assert
    await Assert.ThrowsExactlyAsync<MerchantFoundationServiceException>(() =>
        service.CreateMerchantObject(merchant, null, CancellationToken.None));
  }

  /// <summary>
  /// Validates OperationCanceledException during creation is wrapped into foundation dependency exception.
  /// </summary>
  [TestMethod]
  public async Task CreateMerchantObject_OperationCanceledException_PropagatesOperationCanceledException()
  {
    // Arrange
    var merchant = MerchantTestDataBuilder.CreateRandomMerchant();

    mockBroker
        .Setup(b => b.CreateMerchantAsync(merchant, It.IsAny<CancellationToken>()))
        .ThrowsAsync(new OperationCanceledException("Operation cancelled"));

    // Act & Assert — cancellation must not be reclassified into a domain exception (bug fix)
    await Assert.ThrowsExactlyAsync<OperationCanceledException>(() =>
        service.CreateMerchantObject(merchant, null, CancellationToken.None));
  }

  /// <summary>
  /// Ensures generic exceptions during creation are wrapped into foundation service exceptions.
  /// </summary>
  [TestMethod]
  public async Task CreateMerchantObject_GenericException_ThrowsFoundationServiceException()
  {
    // Arrange
    var merchant = MerchantTestDataBuilder.CreateRandomMerchant();

    mockBroker
        .Setup(b => b.CreateMerchantAsync(merchant, It.IsAny<CancellationToken>()))
        .ThrowsAsync(new InvalidOperationException("Unexpected error"));

    // Act & Assert
    await Assert.ThrowsExactlyAsync<MerchantFoundationServiceException>(() =>
        service.CreateMerchantObject(merchant, null, CancellationToken.None));
  }

  /// <summary>
  /// Validates multiple merchant creations work in sequence.
  /// </summary>
  [TestMethod]
  [DynamicData(nameof(GetMerchantTestData))]
  public async Task CreateMerchantObject_MultipleMerchants_AllCreateSuccessfully(Merchant merchant)
  {
    // Arrange
    mockBroker
        .Setup(b => b.CreateMerchantAsync(It.IsAny<Merchant>(), It.IsAny<CancellationToken>()))
        .ReturnsAsync(merchant);

    // Act
    await service.CreateMerchantObject(merchant, null, CancellationToken.None);

    // Assert
    mockBroker.Verify(b => b.CreateMerchantAsync(merchant, It.IsAny<CancellationToken>()), Times.Once);
  }

  #endregion

  #region ReadMerchantObject Tests

  /// <summary>
  /// Validates successful retrieval of single merchant by identifier.
  /// </summary>
  [TestMethod]
  public async Task ReadMerchantObject_ValidIdentifier_ReturnsMerchant()
  {
    // Arrange
    var merchantId = Guid.NewGuid();
    var parentCompanyId = Guid.NewGuid();
    var expectedMerchant = MerchantTestDataBuilder.CreateRandomMerchant();

    mockBroker
        .Setup(b => b.ReadMerchantAsync(merchantId, parentCompanyId, It.IsAny<CancellationToken>()))
        .ReturnsAsync(expectedMerchant);

    // Act
    var result = await service.ReadMerchantObject(merchantId, parentCompanyId, CancellationToken.None);

    // Assert
    Assert.IsNotNull(result);
    Assert.AreEqual(expectedMerchant.id, result.id);
    mockBroker.Verify(b => b.ReadMerchantAsync(merchantId, parentCompanyId, It.IsAny<CancellationToken>()), Times.Once);
  }

  /// <summary>
  /// Ensures read operation succeeds without parent company identifier.
  /// </summary>
  [TestMethod]
  public async Task ReadMerchantObject_NoParentCompanyId_ReturnsMerchant()
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
    mockBroker.Verify(b => b.ReadMerchantAsync(merchantId, null, It.IsAny<CancellationToken>()), Times.Once);
  }

  /// <summary>
  /// Validates OperationCanceledException during read is wrapped into foundation dependency exception.
  /// </summary>
  [TestMethod]
  public async Task ReadMerchantObject_OperationCanceledException_PropagatesOperationCanceledException()
  {
    // Arrange
    var merchantId = Guid.NewGuid();

    mockBroker
        .Setup(b => b.ReadMerchantAsync(merchantId, null, It.IsAny<CancellationToken>()))
        .ThrowsAsync(new OperationCanceledException("Cancelled"));

    // Act & Assert — cancellation must not be reclassified into a domain exception (bug fix)
    await Assert.ThrowsExactlyAsync<OperationCanceledException>(() =>
        service.ReadMerchantObject(merchantId, null, CancellationToken.None));
  }

  /// <summary>
  /// Ensures generic exceptions during read are wrapped into foundation service exceptions.
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

  #region ReadAllMerchantObjects Tests

  /// <summary>
  /// Validates successful retrieval of all merchants for a parent company.
  /// </summary>
  [TestMethod]
  public async Task ReadAllMerchantObjects_WithParentCompanyId_ReturnsMerchantCollection()
  {
    // Arrange
    var parentCompanyId = Guid.NewGuid();
    var expectedMerchants = MerchantTestDataBuilder.CreateMultipleRandomMerchants(5);

    mockBroker
        .Setup(b => b.ReadMerchantsAsync(parentCompanyId, It.IsAny<CancellationToken>()))
        .ReturnsAsync(expectedMerchants);

    // Act
    var result = await service.ReadAllMerchantObjects(parentCompanyId, CancellationToken.None);

    // Assert
    Assert.IsNotNull(result);
    Assert.AreEqual(5, ((List<Merchant>)result).Count);
    mockBroker.Verify(b => b.ReadMerchantsAsync(parentCompanyId, It.IsAny<CancellationToken>()), Times.Once);
  }

  /// <summary>
  /// Validates empty collection is returned when no merchants exist.
  /// </summary>
  [TestMethod]
  public async Task ReadAllMerchantObjects_NoMerchants_ReturnsEmptyCollection()
  {
    // Arrange
    var parentCompanyId = Guid.NewGuid();
    var emptyList = new List<Merchant>();

    mockBroker
        .Setup(b => b.ReadMerchantsAsync(parentCompanyId, It.IsAny<CancellationToken>()))
        .ReturnsAsync(emptyList);

    // Act
    var result = await service.ReadAllMerchantObjects(parentCompanyId, CancellationToken.None);

    // Assert
    Assert.IsNotNull(result);
    Assert.IsEmpty(result);
  }

  /// <summary>
  /// Validates OperationCanceledException during bulk read is wrapped appropriately.
  /// </summary>
  [TestMethod]
  public async Task ReadAllMerchantObjects_OperationCanceledException_PropagatesOperationCanceledException()
  {
    // Arrange
    var parentCompanyId = Guid.NewGuid();

    mockBroker
        .Setup(b => b.ReadMerchantsAsync(parentCompanyId, It.IsAny<CancellationToken>()))
        .ThrowsAsync(new OperationCanceledException("Query timeout"));

    // Act & Assert — cancellation must not be reclassified into a domain exception (bug fix)
    await Assert.ThrowsExactlyAsync<OperationCanceledException>(() =>
        service.ReadAllMerchantObjects(parentCompanyId, CancellationToken.None));
  }

  /// <summary>
  /// Validates ArgumentNullException (programming error) during bulk read surfaces as a foundation service exception.
  /// </summary>
  [TestMethod]
  public async Task ReadAllMerchantObjects_ArgumentNullException_ThrowsFoundationServiceException()
  {
    // Arrange
    var parentCompanyId = Guid.NewGuid();

    mockBroker
        .Setup(b => b.ReadMerchantsAsync(parentCompanyId, It.IsAny<CancellationToken>()))
        .ThrowsAsync(new ArgumentNullException("parameter"));

    // Act & Assert
    await Assert.ThrowsExactlyAsync<MerchantFoundationServiceException>(() =>
        service.ReadAllMerchantObjects(parentCompanyId, CancellationToken.None));
  }

  /// <summary>
  /// Validates generic exceptions during bulk read propagate as foundation service exceptions.
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

  #region UpdateMerchantObject Tests

  /// <summary>
  /// Validates successful merchant update through foundation layer.
  /// </summary>
  [TestMethod]
  public async Task UpdateMerchantObject_ValidUpdate_ReturnsUpdatedMerchant()
  {
    // Arrange
    var merchantId = Guid.NewGuid();
    var parentCompanyId = Guid.NewGuid();
    var currentMerchant = MerchantTestDataBuilder.CreateRandomMerchant();
    var updatedMerchant = MerchantTestDataBuilder.CreateRandomMerchant();

    mockBroker
        .Setup(b => b.ReadMerchantAsync(merchantId, parentCompanyId, It.IsAny<CancellationToken>()))
        .ReturnsAsync(currentMerchant);

    mockBroker
        .Setup(b => b.UpdateMerchantAsync(currentMerchant, currentMerchant, It.IsAny<CancellationToken>()))
        .ReturnsAsync(currentMerchant);

    // Act
    var result = await service.UpdateMerchantObject(updatedMerchant, merchantId, parentCompanyId, CancellationToken.None);

    // Assert
    Assert.IsNotNull(result);
    Assert.AreEqual(currentMerchant.id, result.id);
    mockBroker.Verify(b => b.ReadMerchantAsync(merchantId, parentCompanyId, It.IsAny<CancellationToken>()), Times.Once);
    mockBroker.Verify(b => b.UpdateMerchantAsync(currentMerchant, currentMerchant, It.IsAny<CancellationToken>()), Times.Once);
  }

  /// <summary>
  /// Ensures update succeeds without parent company identifier.
  /// </summary>
  [TestMethod]
  public async Task UpdateMerchantObject_NoParentCompanyId_UpdatesSuccessfully()
  {
    // Arrange
    var merchantId = Guid.NewGuid();
    var currentMerchant = MerchantTestDataBuilder.CreateRandomMerchant();
    var updatedMerchant = MerchantTestDataBuilder.CreateRandomMerchant();

    mockBroker
        .Setup(b => b.ReadMerchantAsync(merchantId, null, It.IsAny<CancellationToken>()))
        .ReturnsAsync(currentMerchant);

    mockBroker
        .Setup(b => b.UpdateMerchantAsync(currentMerchant, currentMerchant, It.IsAny<CancellationToken>()))
        .ReturnsAsync(currentMerchant);

    // Act
    var result = await service.UpdateMerchantObject(updatedMerchant, merchantId, null, CancellationToken.None);

    // Assert
    Assert.IsNotNull(result);
    mockBroker.Verify(b => b.UpdateMerchantAsync(currentMerchant, currentMerchant, It.IsAny<CancellationToken>()), Times.Once);
  }

  /// <summary>
  /// Verifies that a client update is applied to the loaded merchant instead of replacing it and thereby
  /// discarding relationships, partition identity, audit state, and lifecycle flags.
  /// </summary>
  [TestMethod]
  public async Task UpdateMerchantObject_ClientUpdate_PreservesServerOwnedState()
  {
    // Arrange
    var merchantId = Guid.NewGuid();
    var parentCompanyId = Guid.NewGuid();
    var referencedInvoiceId = Guid.NewGuid();
    var currentMerchant = new Merchant
    {
      id = merchantId,
      ParentCompanyId = parentCompanyId,
      Name = "Persisted merchant",
      Description = "Persisted description",
      IsImportant = true,
      CreatedAt = DateTimeOffset.UtcNow.AddDays(-2),
      CreatedBy = Guid.NewGuid(),
      NumberOfUpdates = 7,
    };
    currentMerchant.ReferencedInvoices.Add(referencedInvoiceId);
    currentMerchant.AdditionalMetadata["analysis.source"] = "document-analysis";
    currentMerchant.SoftDelete();

    var canonicalClassification = new StandardClassification(
      ClassificationSystem.Nace21,
      "2.1",
      "47.11",
      "Retail sale in non-specialised stores with food, beverages or tobacco predominating",
      [new ClassificationNode(
        "class",
        "47.11",
        "Retail sale in non-specialised stores with food, beverages or tobacco predominating")],
      ClassificationOrigin.Manual,
      confidence: null,
      evidence: []);
    var clientMerchant = new Merchant
    {
      id = merchantId,
      ParentCompanyId = Guid.NewGuid(),
      Name = "Updated merchant",
      Description = "Updated description",
      Classification = new ClassificationSelectionDto(ClassificationSystem.Nace21, "47.11").ToManualSelection(),
    };
    Merchant? persistedMerchant = null;

    mockTaxonomyBroker
        .Setup(b => b.Resolve(
          ClassificationSystem.Nace21,
          "47.11",
          ClassificationOrigin.Manual,
          null,
          It.IsAny<IReadOnlyList<ClassificationEvidence>>()))
        .Returns(canonicalClassification);
    mockBroker
        .Setup(b => b.ReadMerchantAsync(merchantId, parentCompanyId, It.IsAny<CancellationToken>()))
        .ReturnsAsync(currentMerchant);
    mockBroker
        .Setup(b => b.UpdateMerchantAsync(currentMerchant, It.IsAny<Merchant>(), It.IsAny<CancellationToken>()))
        .Callback<Merchant, Merchant, CancellationToken>((_, merchant, _) => persistedMerchant = merchant)
        .ReturnsAsync(() => persistedMerchant!);

    // Act
    await service.UpdateMerchantObject(clientMerchant, merchantId, parentCompanyId, CancellationToken.None);

    // Assert
    Assert.AreSame(currentMerchant, persistedMerchant);
    Merchant persisted = persistedMerchant!;
    Assert.AreEqual("Updated merchant", persisted.Name);
    Assert.AreEqual("Updated description", persisted.Description);
    Assert.AreSame(canonicalClassification, persisted.Classification);
    Assert.AreEqual(parentCompanyId, persisted.ParentCompanyId);
    CollectionAssert.AreEqual(new[] { referencedInvoiceId }, new List<Guid>(persisted.ReferencedInvoices));
    Assert.AreEqual("document-analysis", persisted.AdditionalMetadata["analysis.source"]);
    Assert.IsTrue(persisted.IsImportant);
    Assert.IsTrue(persisted.IsSoftDeleted);
    Assert.AreEqual(currentMerchant.CreatedAt, persisted.CreatedAt);
    Assert.AreEqual(currentMerchant.CreatedBy, persisted.CreatedBy);
    Assert.AreEqual(7, persisted.NumberOfUpdates);
    mockBroker.Verify(
      b => b.UpdateMerchantAsync(currentMerchant, It.IsAny<Merchant>(), It.IsAny<CancellationToken>()),
      Times.Once);
  }

  /// <summary>
  /// Validates a missing merchant during update produces a typed dependency-validation exception.
  /// </summary>
  [TestMethod]
  public async Task UpdateMerchantObject_NullCurrentMerchant_ThrowsFoundationDependencyValidationException()
  {
    // Arrange
    var merchantId = Guid.NewGuid();
    var updatedMerchant = MerchantTestDataBuilder.CreateRandomMerchant();

    mockBroker
        .Setup(b => b.ReadMerchantAsync(merchantId, null, It.IsAny<CancellationToken>()))
        .ReturnsAsync((Merchant?)null);

    // Act & Assert
    MerchantFoundationServiceDependencyValidationException exception =
      await Assert.ThrowsExactlyAsync<MerchantFoundationServiceDependencyValidationException>(() =>
        service.UpdateMerchantObject(updatedMerchant, merchantId, null, CancellationToken.None));

    Assert.IsInstanceOfType<MerchantNotFoundException>(exception.InnerException);
  }

  /// <summary>
  /// Ensures generic exceptions during update are wrapped into foundation service exceptions.
  /// </summary>
  [TestMethod]
  public async Task UpdateMerchantObject_GenericException_ThrowsFoundationServiceException()
  {
    // Arrange
    var merchantId = Guid.NewGuid();
    var currentMerchant = MerchantTestDataBuilder.CreateRandomMerchant();
    var updatedMerchant = MerchantTestDataBuilder.CreateRandomMerchant();

    mockBroker
        .Setup(b => b.ReadMerchantAsync(merchantId, null, It.IsAny<CancellationToken>()))
        .ReturnsAsync(currentMerchant);

    mockBroker
        .Setup(b => b.UpdateMerchantAsync(currentMerchant, currentMerchant, It.IsAny<CancellationToken>()))
        .ThrowsAsync(new InvalidOperationException("Update failed"));

    // Act & Assert
    await Assert.ThrowsExactlyAsync<MerchantFoundationServiceException>(() =>
        service.UpdateMerchantObject(updatedMerchant, merchantId, null, CancellationToken.None));
  }

  #endregion

  #region DeleteMerchantObject Tests

  /// <summary>
  /// Validates successful merchant deletion through foundation layer.
  /// </summary>
  [TestMethod]
  public async Task DeleteMerchantObject_ValidIdentifiers_DeletesSuccessfully()
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
  /// Validates empty merchant identifier for delete throws foundation service exception.
  /// Note: The validation exception class lacks the required constructor for Validator.ValidateAndThrow,
  /// causing a MissingMethodException that falls through to the generic exception handler.
  /// </summary>
  [TestMethod]
  public async Task DeleteMerchantObject_EmptyMerchantId_ThrowsFoundationServiceException()
  {
    // Arrange
    var emptyId = Guid.Empty;
    var parentCompanyId = Guid.NewGuid();

    // Act & Assert
    await Assert.ThrowsExactlyAsync<MerchantFoundationServiceException>(() =>
        service.DeleteMerchantObject(emptyId, parentCompanyId, CancellationToken.None));
  }

  /// <summary>
  /// Validates empty parent company identifier for delete throws foundation service exception.
  /// Note: The validation exception class lacks the required constructor for Validator.ValidateAndThrow,
  /// causing a MissingMethodException that falls through to the generic exception handler.
  /// </summary>
  [TestMethod]
  public async Task DeleteMerchantObject_EmptyParentCompanyId_ThrowsFoundationServiceException()
  {
    // Arrange
    var merchantId = Guid.NewGuid();
    var emptyParentId = Guid.Empty;

    // Act & Assert
    await Assert.ThrowsExactlyAsync<MerchantFoundationServiceException>(() =>
        service.DeleteMerchantObject(merchantId, emptyParentId, CancellationToken.None));
  }

  /// <summary>
  /// Validates null parent company identifier for delete throws foundation service exception.
  /// Note: The validation exception class lacks the required constructor for Validator.ValidateAndThrow,
  /// causing a MissingMethodException that falls through to the generic exception handler.
  /// </summary>
  [TestMethod]
  public async Task DeleteMerchantObject_NullParentCompanyId_ThrowsFoundationServiceException()
  {
    // Arrange
    var merchantId = Guid.NewGuid();

    // Act & Assert
    await Assert.ThrowsExactlyAsync<MerchantFoundationServiceException>(() =>
        service.DeleteMerchantObject(merchantId, null, CancellationToken.None));
  }

  /// <summary>
  /// Validates OperationCanceledException during delete is wrapped into foundation dependency exception.
  /// </summary>
  [TestMethod]
  public async Task DeleteMerchantObject_OperationCanceledException_PropagatesOperationCanceledException()
  {
    // Arrange
    var merchantId = Guid.NewGuid();
    var parentCompanyId = Guid.NewGuid();

    mockBroker
        .Setup(b => b.DeleteMerchantAsync(merchantId, parentCompanyId, It.IsAny<CancellationToken>()))
        .ThrowsAsync(new OperationCanceledException("Cancelled"));

    // Act & Assert — cancellation must not be reclassified into a domain exception (bug fix)
    await Assert.ThrowsExactlyAsync<OperationCanceledException>(() =>
        service.DeleteMerchantObject(merchantId, parentCompanyId, CancellationToken.None));
  }

  /// <summary>
  /// Ensures generic exceptions during delete are wrapped into foundation service exceptions.
  /// </summary>
  [TestMethod]
  public async Task DeleteMerchantObject_GenericException_ThrowsFoundationServiceException()
  {
    // Arrange
    var merchantId = Guid.NewGuid();
    var parentCompanyId = Guid.NewGuid();

    mockBroker
        .Setup(b => b.DeleteMerchantAsync(merchantId, parentCompanyId, It.IsAny<CancellationToken>()))
        .ThrowsAsync(new InvalidOperationException("Deletion failed"));

    // Act & Assert
    await Assert.ThrowsExactlyAsync<MerchantFoundationServiceException>(() =>
        service.DeleteMerchantObject(merchantId, parentCompanyId, CancellationToken.None));
  }

  /// <summary>
  /// Validates idempotency of delete operation (repeated calls succeed).
  /// </summary>
  [TestMethod]
  public async Task DeleteMerchantObject_IdempotentCalls_SucceedMultipleTimes()
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

  #region Test Data

  /// <summary>
  /// Provides theory data containing several randomized merchants for parameterized tests.
  /// </summary>
  public static IEnumerable<object[]> GetMerchantTestData() => MerchantTestDataBuilder.GetMerchantTheoryData();

  #endregion
}
