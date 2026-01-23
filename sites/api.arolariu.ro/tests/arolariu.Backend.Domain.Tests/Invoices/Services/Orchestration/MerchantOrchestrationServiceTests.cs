namespace arolariu.Backend.Domain.Tests.Invoices.Services.Orchestration;

using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;

using arolariu.Backend.Domain.Invoices.DDD.Entities.Merchants;
using arolariu.Backend.Domain.Invoices.DDD.Entities.Merchants.Exceptions.Outer.Foundation;
using arolariu.Backend.Domain.Invoices.DDD.Entities.Merchants.Exceptions.Outer.Orchestration;
using arolariu.Backend.Domain.Invoices.Services.Foundation.MerchantStorage;
using arolariu.Backend.Domain.Invoices.Services.Orchestration.MerchantService;
using arolariu.Backend.Domain.Tests.Builders;

using Microsoft.Extensions.Logging;

using Moq;

using Xunit;

/// <summary>
/// Comprehensive unit tests for <see cref="MerchantOrchestrationService"/> targeting 95%+ code coverage.
/// Tests validate orchestration logic, exception handling, telemetry integration and foundation service coordination.
/// Method naming follows MethodName_Condition_ExpectedResult pattern per repository standards.
/// </summary>
public sealed class MerchantOrchestrationServiceTests
{
  private readonly Mock<IMerchantStorageFoundationService> mockStorageService;
  private readonly Mock<ILoggerFactory> mockLoggerFactory;
  private readonly Mock<ILogger<IMerchantOrchestrationService>> mockLogger;
  private readonly MerchantOrchestrationService orchestrationService;

  /// <summary>
  /// Initializes test fixtures with mocked dependencies for isolated orchestration service testing.
  /// </summary>
  public MerchantOrchestrationServiceTests()
  {
    mockStorageService = new Mock<IMerchantStorageFoundationService>();
    mockLoggerFactory = new Mock<ILoggerFactory>();
    mockLogger = new Mock<ILogger<IMerchantOrchestrationService>>();

    mockLoggerFactory
        .Setup(factory => factory.CreateLogger(It.IsAny<string>()))
        .Returns(mockLogger.Object);

    mockLoggerFactory
        .Setup(factory => factory.CreateLogger(It.Is<string>(s => s.Contains("IMerchantOrchestrationService"))))
        .Returns(mockLogger.Object);

    orchestrationService = new MerchantOrchestrationService(
        mockStorageService.Object,
        mockLoggerFactory.Object);
  }

  #region Constructor Tests

  /// <summary>
  /// Verifies constructor throws ArgumentNullException when storage service is null.
  /// </summary>
  [Fact]
  public void Constructor_NullStorageService_ThrowsArgumentNullException() =>
      Assert.Throws<ArgumentNullException>(() =>
          new MerchantOrchestrationService(null!, mockLoggerFactory.Object));

  /// <summary>
  /// Validates successful instantiation with all valid dependencies.
  /// </summary>
  [Fact]
  public void Constructor_ValidDependencies_CreatesInstance()
  {
    // Arrange & Act
    var service = new MerchantOrchestrationService(
        mockStorageService.Object,
        mockLoggerFactory.Object);

    // Assert
    Assert.NotNull(service);
  }

  #endregion

  #region CreateMerchantObject Tests

  /// <summary>
  /// Validates successful merchant creation through orchestration layer.
  /// </summary>
  [Fact]
  public async Task CreateMerchantObject_ValidMerchant_CallsFoundationService()
  {
    // Arrange
    var merchant = MerchantTestDataBuilder.CreateRandomMerchant();
    var parentCompanyId = Guid.NewGuid();

    mockStorageService
        .Setup(s => s.CreateMerchantObject(merchant, parentCompanyId))
        .Returns(Task.CompletedTask);

    // Act
    await orchestrationService.CreateMerchantObject(merchant, parentCompanyId);

    // Assert
    mockStorageService.Verify(s => s.CreateMerchantObject(merchant, parentCompanyId), Times.Once);
  }

  /// <summary>
  /// Ensures creation succeeds without parent company identifier.
  /// </summary>
  [Fact]
  public async Task CreateMerchantObject_NoParentCompanyId_CreatesSuccessfully()
  {
    // Arrange
    var merchant = MerchantTestDataBuilder.CreateRandomMerchant();

    mockStorageService
        .Setup(s => s.CreateMerchantObject(merchant, null))
        .Returns(Task.CompletedTask);

    // Act
    await orchestrationService.CreateMerchantObject(merchant, null);

    // Assert
    mockStorageService.Verify(s => s.CreateMerchantObject(merchant, null), Times.Once);
  }

  /// <summary>
  /// Confirms foundation validation exceptions propagate as orchestration validation exceptions during creation.
  /// </summary>
  [Fact]
  public async Task CreateMerchantObject_FoundationValidationException_ThrowsOrchestrationValidationException()
  {
    // Arrange
    var merchant = MerchantTestDataBuilder.CreateRandomMerchant();
    var innerException = new ArgumentNullException("merchant");
    var foundationException = new MerchantFoundationServiceValidationException(innerException);

    mockStorageService
        .Setup(s => s.CreateMerchantObject(merchant, null))
        .ThrowsAsync(foundationException);

    // Act & Assert
    await Assert.ThrowsAsync<MerchantOrchestrationServiceValidationException>(() =>
        orchestrationService.CreateMerchantObject(merchant, null));
  }

  /// <summary>
  /// Validates foundation dependency exceptions during creation are wrapped appropriately.
  /// </summary>
  [Fact]
  public async Task CreateMerchantObject_FoundationDependencyException_ThrowsOrchestrationDependencyException()
  {
    // Arrange
    var merchant = MerchantTestDataBuilder.CreateRandomMerchant();
    var innerException = new InvalidOperationException("Database unavailable");
    var foundationException = new MerchantFoundationServiceDependencyException(innerException);

    mockStorageService
        .Setup(s => s.CreateMerchantObject(merchant, null))
        .ThrowsAsync(foundationException);

    // Act & Assert
    await Assert.ThrowsAsync<MerchantOrchestrationServiceDependencyException>(() =>
        orchestrationService.CreateMerchantObject(merchant, null));
  }

  /// <summary>
  /// Validates foundation dependency validation exceptions during creation are wrapped appropriately.
  /// </summary>
  [Fact]
  public async Task CreateMerchantObject_FoundationDependencyValidationException_ThrowsOrchestrationDependencyValidationException()
  {
    // Arrange
    var merchant = MerchantTestDataBuilder.CreateRandomMerchant();
    var innerException = new ArgumentException("Invalid data");
    var foundationException = new MerchantFoundationServiceDependencyValidationException(innerException);

    mockStorageService
        .Setup(s => s.CreateMerchantObject(merchant, null))
        .ThrowsAsync(foundationException);

    // Act & Assert
    await Assert.ThrowsAsync<MerchantOrchestrationServiceDependencyValidationException>(() =>
        orchestrationService.CreateMerchantObject(merchant, null));
  }

  /// <summary>
  /// Validates foundation service exceptions during creation are wrapped appropriately.
  /// </summary>
  [Fact]
  public async Task CreateMerchantObject_FoundationServiceException_ThrowsOrchestrationServiceException()
  {
    // Arrange
    var merchant = MerchantTestDataBuilder.CreateRandomMerchant();
    var innerException = new InvalidOperationException("Service error");
    var foundationException = new MerchantFoundationServiceException(innerException);

    mockStorageService
        .Setup(s => s.CreateMerchantObject(merchant, null))
        .ThrowsAsync(foundationException);

    // Act & Assert
    await Assert.ThrowsAsync<MerchantOrchestrationServiceException>(() =>
        orchestrationService.CreateMerchantObject(merchant, null));
  }

  /// <summary>
  /// Ensures generic exceptions during creation are wrapped into orchestration service exceptions.
  /// </summary>
  [Fact]
  public async Task CreateMerchantObject_GenericException_ThrowsOrchestrationServiceException()
  {
    // Arrange
    var merchant = MerchantTestDataBuilder.CreateRandomMerchant();
    var exception = new InvalidOperationException("Unexpected failure");

    mockStorageService
        .Setup(s => s.CreateMerchantObject(merchant, null))
        .ThrowsAsync(exception);

    // Act & Assert
    await Assert.ThrowsAsync<MerchantOrchestrationServiceException>(() =>
        orchestrationService.CreateMerchantObject(merchant, null));
  }

  #endregion

  #region ReadMerchantObject Tests

  /// <summary>
  /// Validates successful retrieval of single merchant by identifier.
  /// </summary>
  [Fact]
  public async Task ReadMerchantObject_ValidIdentifier_ReturnsMerchant()
  {
    // Arrange
    var merchantId = Guid.NewGuid();
    var parentCompanyId = Guid.NewGuid();
    var expectedMerchant = MerchantTestDataBuilder.CreateRandomMerchant();

    mockStorageService
        .Setup(s => s.ReadMerchantObject(merchantId, parentCompanyId))
        .ReturnsAsync(expectedMerchant);

    // Act
    var result = await orchestrationService.ReadMerchantObject(merchantId, parentCompanyId);

    // Assert
    Assert.NotNull(result);
    Assert.Equal(expectedMerchant.id, result.id);
    mockStorageService.Verify(s => s.ReadMerchantObject(merchantId, parentCompanyId), Times.Once);
  }

  /// <summary>
  /// Ensures read operation succeeds without parent company identifier.
  /// </summary>
  [Fact]
  public async Task ReadMerchantObject_NoParentCompanyId_ReturnsMerchant()
  {
    // Arrange
    var merchantId = Guid.NewGuid();
    var expectedMerchant = MerchantTestDataBuilder.CreateRandomMerchant();

    mockStorageService
        .Setup(s => s.ReadMerchantObject(merchantId, null))
        .ReturnsAsync(expectedMerchant);

    // Act
    var result = await orchestrationService.ReadMerchantObject(merchantId, null);

    // Assert
    Assert.NotNull(result);
    mockStorageService.Verify(s => s.ReadMerchantObject(merchantId, null), Times.Once);
  }

  /// <summary>
  /// Confirms foundation validation exceptions during read are wrapped appropriately.
  /// </summary>
  [Fact]
  public async Task ReadMerchantObject_FoundationValidationException_ThrowsOrchestrationValidationException()
  {
    // Arrange
    var merchantId = Guid.NewGuid();
    var innerException = new ArgumentException("Invalid identifier");
    var foundationException = new MerchantFoundationServiceValidationException(innerException);

    mockStorageService
        .Setup(s => s.ReadMerchantObject(merchantId, null))
        .ThrowsAsync(foundationException);

    // Act & Assert
    await Assert.ThrowsAsync<MerchantOrchestrationServiceValidationException>(() =>
        orchestrationService.ReadMerchantObject(merchantId, null));
  }

  /// <summary>
  /// Validates foundation dependency exceptions during read propagate correctly.
  /// </summary>
  [Fact]
  public async Task ReadMerchantObject_FoundationDependencyException_ThrowsOrchestrationDependencyException()
  {
    // Arrange
    var merchantId = Guid.NewGuid();
    var innerException = new InvalidOperationException("Database error");
    var foundationException = new MerchantFoundationServiceDependencyException(innerException);

    mockStorageService
        .Setup(s => s.ReadMerchantObject(merchantId, null))
        .ThrowsAsync(foundationException);

    // Act & Assert
    await Assert.ThrowsAsync<MerchantOrchestrationServiceDependencyException>(() =>
        orchestrationService.ReadMerchantObject(merchantId, null));
  }

  /// <summary>
  /// Validates foundation service exceptions during read propagate correctly.
  /// </summary>
  [Fact]
  public async Task ReadMerchantObject_FoundationServiceException_ThrowsOrchestrationServiceException()
  {
    // Arrange
    var merchantId = Guid.NewGuid();
    var innerException = new InvalidOperationException("Service failure");
    var foundationException = new MerchantFoundationServiceException(innerException);

    mockStorageService
        .Setup(s => s.ReadMerchantObject(merchantId, null))
        .ThrowsAsync(foundationException);

    // Act & Assert
    await Assert.ThrowsAsync<MerchantOrchestrationServiceException>(() =>
        orchestrationService.ReadMerchantObject(merchantId, null));
  }

  /// <summary>
  /// Ensures generic exceptions during read are wrapped into orchestration service exceptions.
  /// </summary>
  [Fact]
  public async Task ReadMerchantObject_GenericException_ThrowsOrchestrationServiceException()
  {
    // Arrange
    var merchantId = Guid.NewGuid();
    var exception = new InvalidOperationException("Unexpected error");

    mockStorageService
        .Setup(s => s.ReadMerchantObject(merchantId, null))
        .ThrowsAsync(exception);

    // Act & Assert
    await Assert.ThrowsAsync<MerchantOrchestrationServiceException>(() =>
        orchestrationService.ReadMerchantObject(merchantId, null));
  }

  #endregion

  #region ReadAllMerchantObjects Tests

  /// <summary>
  /// Validates successful retrieval of all merchants for a parent company.
  /// </summary>
  [Fact]
  public async Task ReadAllMerchantObjects_WithParentCompanyId_ReturnsMerchantCollection()
  {
    // Arrange
    var parentCompanyId = Guid.NewGuid();
    var expectedMerchants = MerchantTestDataBuilder.CreateMultipleRandomMerchants(5);

    mockStorageService
        .Setup(s => s.ReadAllMerchantObjects(parentCompanyId))
        .ReturnsAsync(expectedMerchants);

    // Act
    var result = await orchestrationService.ReadAllMerchantObjects(parentCompanyId);

    // Assert
    Assert.NotNull(result);
    Assert.Equal(5, result.Count());
    mockStorageService.Verify(s => s.ReadAllMerchantObjects(parentCompanyId), Times.Once);
  }

  /// <summary>
  /// Validates empty collection is returned when no merchants exist.
  /// </summary>
  [Fact]
  public async Task ReadAllMerchantObjects_NoMerchants_ReturnsEmptyCollection()
  {
    // Arrange
    var parentCompanyId = Guid.NewGuid();
    var emptyList = new List<Merchant>();

    mockStorageService
        .Setup(s => s.ReadAllMerchantObjects(parentCompanyId))
        .ReturnsAsync(emptyList);

    // Act
    var result = await orchestrationService.ReadAllMerchantObjects(parentCompanyId);

    // Assert
    Assert.NotNull(result);
    Assert.Empty(result);
  }

  /// <summary>
  /// Confirms foundation dependency exceptions during bulk read are wrapped appropriately.
  /// </summary>
  [Fact]
  public async Task ReadAllMerchantObjects_FoundationDependencyException_ThrowsOrchestrationDependencyException()
  {
    // Arrange
    var parentCompanyId = Guid.NewGuid();
    var innerException = new InvalidOperationException("Query timeout");
    var foundationException = new MerchantFoundationServiceDependencyException(innerException);

    mockStorageService
        .Setup(s => s.ReadAllMerchantObjects(parentCompanyId))
        .ThrowsAsync(foundationException);

    // Act & Assert
    await Assert.ThrowsAsync<MerchantOrchestrationServiceDependencyException>(() =>
        orchestrationService.ReadAllMerchantObjects(parentCompanyId));
  }

  /// <summary>
  /// Validates generic exceptions during bulk read propagate as orchestration service exceptions.
  /// </summary>
  [Fact]
  public async Task ReadAllMerchantObjects_GenericException_ThrowsOrchestrationServiceException()
  {
    // Arrange
    var parentCompanyId = Guid.NewGuid();
    var exception = new InvalidOperationException("Unexpected error");

    mockStorageService
        .Setup(s => s.ReadAllMerchantObjects(parentCompanyId))
        .ThrowsAsync(exception);

    // Act & Assert
    await Assert.ThrowsAsync<MerchantOrchestrationServiceException>(() =>
        orchestrationService.ReadAllMerchantObjects(parentCompanyId));
  }

  /// <summary>
  /// Validates foundation validation exceptions during bulk read are wrapped appropriately.
  /// </summary>
  [Fact]
  public async Task ReadAllMerchantObjects_FoundationValidationException_ThrowsOrchestrationValidationException()
  {
    // Arrange
    var parentCompanyId = Guid.NewGuid();
    var innerException = new ArgumentException("Invalid parent company ID");
    var foundationException = new MerchantFoundationServiceValidationException(innerException);

    mockStorageService
        .Setup(s => s.ReadAllMerchantObjects(parentCompanyId))
        .ThrowsAsync(foundationException);

    // Act & Assert
    await Assert.ThrowsAsync<MerchantOrchestrationServiceValidationException>(() =>
        orchestrationService.ReadAllMerchantObjects(parentCompanyId));
  }

  #endregion

  #region UpdateMerchantObject Tests

  /// <summary>
  /// Validates successful merchant update through orchestration layer.
  /// </summary>
  [Fact]
  public async Task UpdateMerchantObject_ValidUpdate_ReturnsUpdatedMerchant()
  {
    // Arrange
    var merchantId = Guid.NewGuid();
    var parentCompanyId = Guid.NewGuid();
    var updatedMerchant = MerchantTestDataBuilder.CreateRandomMerchant();

    mockStorageService
        .Setup(s => s.UpdateMerchantObject(updatedMerchant, merchantId, parentCompanyId))
        .ReturnsAsync(updatedMerchant);

    // Act
    var result = await orchestrationService.UpdateMerchantObject(updatedMerchant, merchantId, parentCompanyId);

    // Assert
    Assert.NotNull(result);
    Assert.Equal(updatedMerchant.id, result.id);
    mockStorageService.Verify(s => s.UpdateMerchantObject(updatedMerchant, merchantId, parentCompanyId), Times.Once);
  }

  /// <summary>
  /// Ensures update succeeds without parent company identifier.
  /// </summary>
  [Fact]
  public async Task UpdateMerchantObject_NoParentCompanyId_UpdatesSuccessfully()
  {
    // Arrange
    var merchantId = Guid.NewGuid();
    var updatedMerchant = MerchantTestDataBuilder.CreateRandomMerchant();

    mockStorageService
        .Setup(s => s.UpdateMerchantObject(updatedMerchant, merchantId, null))
        .ReturnsAsync(updatedMerchant);

    // Act
    var result = await orchestrationService.UpdateMerchantObject(updatedMerchant, merchantId, null);

    // Assert
    Assert.NotNull(result);
    mockStorageService.Verify(s => s.UpdateMerchantObject(updatedMerchant, merchantId, null), Times.Once);
  }

  /// <summary>
  /// Confirms foundation validation exceptions during update are wrapped appropriately.
  /// </summary>
  [Fact]
  public async Task UpdateMerchantObject_FoundationValidationException_ThrowsOrchestrationValidationException()
  {
    // Arrange
    var merchantId = Guid.NewGuid();
    var updatedMerchant = MerchantTestDataBuilder.CreateRandomMerchant();
    var innerException = new ArgumentNullException("merchant");
    var foundationException = new MerchantFoundationServiceValidationException(innerException);

    mockStorageService
        .Setup(s => s.UpdateMerchantObject(updatedMerchant, merchantId, null))
        .ThrowsAsync(foundationException);

    // Act & Assert
    await Assert.ThrowsAsync<MerchantOrchestrationServiceValidationException>(() =>
        orchestrationService.UpdateMerchantObject(updatedMerchant, merchantId, null));
  }

  /// <summary>
  /// Validates foundation dependency validation exceptions during update propagate correctly.
  /// </summary>
  [Fact]
  public async Task UpdateMerchantObject_FoundationDependencyValidationException_ThrowsOrchestrationDependencyValidationException()
  {
    // Arrange
    var merchantId = Guid.NewGuid();
    var updatedMerchant = MerchantTestDataBuilder.CreateRandomMerchant();
    var innerException = new ArgumentException("Concurrent update");
    var foundationException = new MerchantFoundationServiceDependencyValidationException(innerException);

    mockStorageService
        .Setup(s => s.UpdateMerchantObject(updatedMerchant, merchantId, null))
        .ThrowsAsync(foundationException);

    // Act & Assert
    await Assert.ThrowsAsync<MerchantOrchestrationServiceDependencyValidationException>(() =>
        orchestrationService.UpdateMerchantObject(updatedMerchant, merchantId, null));
  }

  /// <summary>
  /// Validates foundation dependency exceptions during update propagate correctly.
  /// </summary>
  [Fact]
  public async Task UpdateMerchantObject_FoundationDependencyException_ThrowsOrchestrationDependencyException()
  {
    // Arrange
    var merchantId = Guid.NewGuid();
    var updatedMerchant = MerchantTestDataBuilder.CreateRandomMerchant();
    var innerException = new InvalidOperationException("Database error");
    var foundationException = new MerchantFoundationServiceDependencyException(innerException);

    mockStorageService
        .Setup(s => s.UpdateMerchantObject(updatedMerchant, merchantId, null))
        .ThrowsAsync(foundationException);

    // Act & Assert
    await Assert.ThrowsAsync<MerchantOrchestrationServiceDependencyException>(() =>
        orchestrationService.UpdateMerchantObject(updatedMerchant, merchantId, null));
  }

  /// <summary>
  /// Ensures generic exceptions during update are wrapped into orchestration service exceptions.
  /// </summary>
  [Fact]
  public async Task UpdateMerchantObject_GenericException_ThrowsOrchestrationServiceException()
  {
    // Arrange
    var merchantId = Guid.NewGuid();
    var updatedMerchant = MerchantTestDataBuilder.CreateRandomMerchant();
    var exception = new InvalidOperationException("Update failed");

    mockStorageService
        .Setup(s => s.UpdateMerchantObject(updatedMerchant, merchantId, null))
        .ThrowsAsync(exception);

    // Act & Assert
    await Assert.ThrowsAsync<MerchantOrchestrationServiceException>(() =>
        orchestrationService.UpdateMerchantObject(updatedMerchant, merchantId, null));
  }

  #endregion

  #region DeleteMerchantObject Tests

  /// <summary>
  /// Validates successful merchant deletion through orchestration layer.
  /// </summary>
  [Fact]
  public async Task DeleteMerchantObject_ValidIdentifiers_DeletesSuccessfully()
  {
    // Arrange
    var merchantId = Guid.NewGuid();
    var parentCompanyId = Guid.NewGuid();

    mockStorageService
        .Setup(s => s.DeleteMerchantObject(merchantId, parentCompanyId))
        .Returns(Task.CompletedTask);

    // Act
    await orchestrationService.DeleteMerchantObject(merchantId, parentCompanyId);

    // Assert
    mockStorageService.Verify(s => s.DeleteMerchantObject(merchantId, parentCompanyId), Times.Once);
  }

  /// <summary>
  /// Ensures deletion succeeds without parent company identifier.
  /// </summary>
  [Fact]
  public async Task DeleteMerchantObject_NoParentCompanyId_DeletesSuccessfully()
  {
    // Arrange
    var merchantId = Guid.NewGuid();

    mockStorageService
        .Setup(s => s.DeleteMerchantObject(merchantId, null))
        .Returns(Task.CompletedTask);

    // Act
    await orchestrationService.DeleteMerchantObject(merchantId, null);

    // Assert
    mockStorageService.Verify(s => s.DeleteMerchantObject(merchantId, null), Times.Once);
  }

  /// <summary>
  /// Confirms foundation validation exceptions during delete are wrapped appropriately.
  /// </summary>
  [Fact]
  public async Task DeleteMerchantObject_FoundationValidationException_ThrowsOrchestrationValidationException()
  {
    // Arrange
    var merchantId = Guid.NewGuid();
    var innerException = new ArgumentException("Invalid identifier");
    var foundationException = new MerchantFoundationServiceValidationException(innerException);

    mockStorageService
        .Setup(s => s.DeleteMerchantObject(merchantId, null))
        .ThrowsAsync(foundationException);

    // Act & Assert
    await Assert.ThrowsAsync<MerchantOrchestrationServiceValidationException>(() =>
        orchestrationService.DeleteMerchantObject(merchantId, null));
  }

  /// <summary>
  /// Validates foundation dependency exceptions during delete propagate correctly.
  /// </summary>
  [Fact]
  public async Task DeleteMerchantObject_FoundationDependencyException_ThrowsOrchestrationDependencyException()
  {
    // Arrange
    var merchantId = Guid.NewGuid();
    var innerException = new InvalidOperationException("Foreign key constraint");
    var foundationException = new MerchantFoundationServiceDependencyException(innerException);

    mockStorageService
        .Setup(s => s.DeleteMerchantObject(merchantId, null))
        .ThrowsAsync(foundationException);

    // Act & Assert
    await Assert.ThrowsAsync<MerchantOrchestrationServiceDependencyException>(() =>
        orchestrationService.DeleteMerchantObject(merchantId, null));
  }

  /// <summary>
  /// Ensures foundation service exceptions during delete are wrapped appropriately.
  /// </summary>
  [Fact]
  public async Task DeleteMerchantObject_FoundationServiceException_ThrowsOrchestrationServiceException()
  {
    // Arrange
    var merchantId = Guid.NewGuid();
    var innerException = new InvalidOperationException("Service error");
    var foundationException = new MerchantFoundationServiceException(innerException);

    mockStorageService
        .Setup(s => s.DeleteMerchantObject(merchantId, null))
        .ThrowsAsync(foundationException);

    // Act & Assert
    await Assert.ThrowsAsync<MerchantOrchestrationServiceException>(() =>
        orchestrationService.DeleteMerchantObject(merchantId, null));
  }

  /// <summary>
  /// Validates generic exceptions during delete are wrapped into orchestration service exceptions.
  /// </summary>
  [Fact]
  public async Task DeleteMerchantObject_GenericException_ThrowsOrchestrationServiceException()
  {
    // Arrange
    var merchantId = Guid.NewGuid();
    var exception = new InvalidOperationException("Deletion failed");

    mockStorageService
        .Setup(s => s.DeleteMerchantObject(merchantId, null))
        .ThrowsAsync(exception);

    // Act & Assert
    await Assert.ThrowsAsync<MerchantOrchestrationServiceException>(() =>
        orchestrationService.DeleteMerchantObject(merchantId, null));
  }

  /// <summary>
  /// Validates idempotency of delete operation (repeated calls succeed).
  /// </summary>
  [Fact]
  public async Task DeleteMerchantObject_IdempotentCalls_SucceedMultipleTimes()
  {
    // Arrange
    var merchantId = Guid.NewGuid();
    var parentCompanyId = Guid.NewGuid();

    mockStorageService
        .Setup(s => s.DeleteMerchantObject(merchantId, parentCompanyId))
        .Returns(Task.CompletedTask);

    // Act
    await orchestrationService.DeleteMerchantObject(merchantId, parentCompanyId);
    await orchestrationService.DeleteMerchantObject(merchantId, parentCompanyId);
    await orchestrationService.DeleteMerchantObject(merchantId, parentCompanyId);

    // Assert
    mockStorageService.Verify(s => s.DeleteMerchantObject(merchantId, parentCompanyId), Times.Exactly(3));
  }

  #endregion

  #region Test Data

  /// <summary>
  /// Provides theory data containing several randomized merchants for parameterized tests.
  /// </summary>
  public static TheoryData<Merchant> GetMerchantTestData() => MerchantTestDataBuilder.GetMerchantTheoryData();

  #endregion
}
