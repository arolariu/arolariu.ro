namespace arolariu.Backend.Domain.Tests.Invoices.Services.Orchestration;

using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading;
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
/// Extended unit tests for <see cref="MerchantOrchestrationService"/> covering additional
/// edge cases, exception scenarios, and boundary conditions for comprehensive code coverage.
/// </summary>
public sealed class MerchantOrchestrationServiceExtendedTests
{
  private readonly Mock<IMerchantStorageFoundationService> mockStorageService;
  private readonly Mock<ILoggerFactory> mockLoggerFactory;
  private readonly Mock<ILogger<IMerchantOrchestrationService>> mockLogger;
  private readonly MerchantOrchestrationService service;

  /// <summary>
  /// Initializes test fixtures with mocked dependencies.
  /// </summary>
  public MerchantOrchestrationServiceExtendedTests()
  {
    mockStorageService = new Mock<IMerchantStorageFoundationService>();
    mockLoggerFactory = new Mock<ILoggerFactory>();
    mockLogger = new Mock<ILogger<IMerchantOrchestrationService>>();

    mockLoggerFactory
        .Setup(factory => factory.CreateLogger(It.IsAny<string>()))
        .Returns(mockLogger.Object);

    service = new MerchantOrchestrationService(
        mockStorageService.Object,
        mockLoggerFactory.Object);
  }

  #region Constructor Tests

  /// <summary>
  /// Validates successful instantiation with valid dependencies.
  /// </summary>
  [Fact]
  public void Constructor_ValidDependencies_CreatesInstance()
  {
    // Act
    var svc = new MerchantOrchestrationService(
        mockStorageService.Object,
        mockLoggerFactory.Object);

    // Assert
    Assert.NotNull(svc);
  }

  #endregion

  #region CreateMerchantObject Extended Tests

  /// <summary>
  /// Validates merchant creation with minimal data.
  /// </summary>
  [Fact]
  public async Task CreateMerchantObject_MinimalMerchant_CreatesSuccessfully()
  {
    // Arrange
    var merchant = MerchantTestDataBuilder.CreateRandomMerchant();
    var parentCompanyId = Guid.NewGuid();

    mockStorageService
        .Setup(s => s.CreateMerchantObject(merchant, parentCompanyId, It.IsAny<CancellationToken>()))
        .Returns(Task.CompletedTask);

    // Act
    await service.CreateMerchantObject(merchant, parentCompanyId, CancellationToken.None);

    // Assert
    mockStorageService.Verify(s => s.CreateMerchantObject(merchant, parentCompanyId, It.IsAny<CancellationToken>()), Times.Once);
  }

  /// <summary>
  /// Validates merchant creation with empty Guid parent company.
  /// </summary>
  [Fact]
  public async Task CreateMerchantObject_EmptyGuidParentCompany_CreatesSuccessfully()
  {
    // Arrange
    var merchant = MerchantTestDataBuilder.CreateRandomMerchant();

    mockStorageService
        .Setup(s => s.CreateMerchantObject(merchant, Guid.Empty, It.IsAny<CancellationToken>()))
        .Returns(Task.CompletedTask);

    // Act
    await service.CreateMerchantObject(merchant, Guid.Empty, CancellationToken.None);

    // Assert
    mockStorageService.Verify(s => s.CreateMerchantObject(merchant, Guid.Empty, It.IsAny<CancellationToken>()), Times.Once);
  }

  /// <summary>
  /// Validates merchant creation with null parent company ID.
  /// </summary>
  [Fact]
  public async Task CreateMerchantObject_NullParentCompanyId_CreatesSuccessfully()
  {
    // Arrange
    var merchant = MerchantTestDataBuilder.CreateRandomMerchant();

    mockStorageService
        .Setup(s => s.CreateMerchantObject(merchant, null, It.IsAny<CancellationToken>()))
        .Returns(Task.CompletedTask);

    // Act
    await service.CreateMerchantObject(merchant, null, CancellationToken.None);

    // Assert
    mockStorageService.Verify(s => s.CreateMerchantObject(merchant, null, It.IsAny<CancellationToken>()), Times.Once);
  }

  /// <summary>
  /// Validates foundation validation exception is wrapped into orchestration validation exception.
  /// </summary>
  [Fact]
  public async Task CreateMerchantObject_FoundationValidationException_ThrowsOrchestrationValidationException()
  {
    // Arrange
    var merchant = MerchantTestDataBuilder.CreateRandomMerchant();

    mockStorageService
        .Setup(s => s.CreateMerchantObject(merchant, null, It.IsAny<CancellationToken>()))
        .ThrowsAsync(new MerchantFoundationServiceValidationException(new InvalidOperationException("Validation error")));

    // Act & Assert
    await Assert.ThrowsAsync<MerchantOrchestrationServiceValidationException>(() =>
        service.CreateMerchantObject(merchant, null, CancellationToken.None));
  }

  /// <summary>
  /// Validates foundation dependency exception is wrapped into orchestration dependency exception.
  /// </summary>
  [Fact]
  public async Task CreateMerchantObject_FoundationDependencyException_ThrowsOrchestrationDependencyException()
  {
    // Arrange
    var merchant = MerchantTestDataBuilder.CreateRandomMerchant();

    mockStorageService
        .Setup(s => s.CreateMerchantObject(merchant, null, It.IsAny<CancellationToken>()))
        .ThrowsAsync(new MerchantFoundationServiceDependencyException(new InvalidOperationException("Dependency error")));

    // Act & Assert
    await Assert.ThrowsAsync<MerchantOrchestrationServiceDependencyException>(() =>
        service.CreateMerchantObject(merchant, null, CancellationToken.None));
  }

  /// <summary>
  /// Validates foundation service exception is wrapped into orchestration service exception.
  /// </summary>
  [Fact]
  public async Task CreateMerchantObject_FoundationServiceException_ThrowsOrchestrationServiceException()
  {
    // Arrange
    var merchant = MerchantTestDataBuilder.CreateRandomMerchant();

    mockStorageService
        .Setup(s => s.CreateMerchantObject(merchant, null, It.IsAny<CancellationToken>()))
        .ThrowsAsync(new MerchantFoundationServiceException(new InvalidOperationException("Service error")));

    // Act & Assert
    await Assert.ThrowsAsync<MerchantOrchestrationServiceException>(() =>
        service.CreateMerchantObject(merchant, null, CancellationToken.None));
  }

  /// <summary>
  /// Validates generic exception is wrapped into orchestration service exception.
  /// </summary>
  [Fact]
  public async Task CreateMerchantObject_GenericException_ThrowsOrchestrationServiceException()
  {
    // Arrange
    var merchant = MerchantTestDataBuilder.CreateRandomMerchant();

    mockStorageService
        .Setup(s => s.CreateMerchantObject(merchant, null, It.IsAny<CancellationToken>()))
        .ThrowsAsync(new InvalidOperationException("Unexpected error"));

    // Act & Assert
    await Assert.ThrowsAsync<MerchantOrchestrationServiceException>(() =>
        service.CreateMerchantObject(merchant, null, CancellationToken.None));
  }

  #endregion

  #region ReadMerchantObject Extended Tests

  /// <summary>
  /// Validates reading merchant with specific identifiers.
  /// </summary>
  [Fact]
  public async Task ReadMerchantObject_ValidIdentifiers_ReturnsMerchant()
  {
    // Arrange
    var merchantId = Guid.NewGuid();
    var parentCompanyId = Guid.NewGuid();
    var expectedMerchant = MerchantTestDataBuilder.CreateRandomMerchant();

    mockStorageService
        .Setup(s => s.ReadMerchantObject(merchantId, parentCompanyId, It.IsAny<CancellationToken>()))
        .ReturnsAsync(expectedMerchant);

    // Act
    var result = await service.ReadMerchantObject(merchantId, parentCompanyId, CancellationToken.None);

    // Assert
    Assert.NotNull(result);
    Assert.Same(expectedMerchant, result);
  }

  /// <summary>
  /// Validates reading merchant with null parent company ID.
  /// </summary>
  [Fact]
  public async Task ReadMerchantObject_NullParentCompanyId_ReturnsMerchant()
  {
    // Arrange
    var merchantId = Guid.NewGuid();
    var expectedMerchant = MerchantTestDataBuilder.CreateRandomMerchant();

    mockStorageService
        .Setup(s => s.ReadMerchantObject(merchantId, null, It.IsAny<CancellationToken>()))
        .ReturnsAsync(expectedMerchant);

    // Act
    var result = await service.ReadMerchantObject(merchantId, null, CancellationToken.None);

    // Assert
    Assert.NotNull(result);
  }

  /// <summary>
  /// Validates reading merchant with empty Guid identifiers.
  /// </summary>
  [Fact]
  public async Task ReadMerchantObject_EmptyGuidIdentifiers_ReturnsMerchant()
  {
    // Arrange
    var expectedMerchant = MerchantTestDataBuilder.CreateRandomMerchant();

    mockStorageService
        .Setup(s => s.ReadMerchantObject(Guid.Empty, Guid.Empty, It.IsAny<CancellationToken>()))
        .ReturnsAsync(expectedMerchant);

    // Act
    var result = await service.ReadMerchantObject(Guid.Empty, Guid.Empty, CancellationToken.None);

    // Assert
    Assert.NotNull(result);
  }

  /// <summary>
  /// Validates foundation dependency exception during read is wrapped.
  /// </summary>
  [Fact]
  public async Task ReadMerchantObject_FoundationDependencyException_ThrowsOrchestrationDependencyException()
  {
    // Arrange
    var merchantId = Guid.NewGuid();

    mockStorageService
        .Setup(s => s.ReadMerchantObject(merchantId, null, It.IsAny<CancellationToken>()))
        .ThrowsAsync(new MerchantFoundationServiceDependencyException(new InvalidOperationException("Dependency error")));

    // Act & Assert
    await Assert.ThrowsAsync<MerchantOrchestrationServiceDependencyException>(() =>
        service.ReadMerchantObject(merchantId, null, CancellationToken.None));
  }

  /// <summary>
  /// Validates generic exception during read is wrapped.
  /// </summary>
  [Fact]
  public async Task ReadMerchantObject_GenericException_ThrowsOrchestrationServiceException()
  {
    // Arrange
    var merchantId = Guid.NewGuid();

    mockStorageService
        .Setup(s => s.ReadMerchantObject(merchantId, null, It.IsAny<CancellationToken>()))
        .ThrowsAsync(new InvalidOperationException("Unexpected error"));

    // Act & Assert
    await Assert.ThrowsAsync<MerchantOrchestrationServiceException>(() =>
        service.ReadMerchantObject(merchantId, null, CancellationToken.None));
  }

  #endregion

  #region ReadAllMerchantObjects Extended Tests

  /// <summary>
  /// Validates bulk read returns all merchants.
  /// </summary>
  [Fact]
  public async Task ReadAllMerchantObjects_ValidParentCompanyId_ReturnsAllMerchants()
  {
    // Arrange
    var parentCompanyId = Guid.NewGuid();
    var expectedMerchants = Enumerable.Range(0, 10)
        .Select(_ => MerchantTestDataBuilder.CreateRandomMerchant())
        .ToList();

    mockStorageService
        .Setup(s => s.ReadAllMerchantObjects(parentCompanyId, It.IsAny<CancellationToken>()))
        .ReturnsAsync(expectedMerchants);

    // Act
    var result = await service.ReadAllMerchantObjects(parentCompanyId, CancellationToken.None);

    // Assert
    Assert.Equal(10, result.Count());
  }

  /// <summary>
  /// Validates bulk read returns empty collection when no merchants exist.
  /// </summary>
  [Fact]
  public async Task ReadAllMerchantObjects_NoMerchants_ReturnsEmptyCollection()
  {
    // Arrange
    var parentCompanyId = Guid.NewGuid();

    mockStorageService
        .Setup(s => s.ReadAllMerchantObjects(parentCompanyId, It.IsAny<CancellationToken>()))
        .ReturnsAsync(new List<Merchant>());

    // Act
    var result = await service.ReadAllMerchantObjects(parentCompanyId, CancellationToken.None);

    // Assert
    Assert.Empty(result);
  }

  /// <summary>
  /// Validates bulk read with empty Guid parent company ID.
  /// </summary>
  [Fact]
  public async Task ReadAllMerchantObjects_EmptyGuidParentCompanyId_ReturnsAllMerchants()
  {
    // Arrange
    var expectedMerchants = Enumerable.Range(0, 5)
        .Select(_ => MerchantTestDataBuilder.CreateRandomMerchant())
        .ToList();

    mockStorageService
        .Setup(s => s.ReadAllMerchantObjects(Guid.Empty, It.IsAny<CancellationToken>()))
        .ReturnsAsync(expectedMerchants);

    // Act
    var result = await service.ReadAllMerchantObjects(Guid.Empty, CancellationToken.None);

    // Assert
    Assert.Equal(5, result.Count());
  }

  /// <summary>
  /// Validates foundation dependency exception during bulk read is wrapped.
  /// </summary>
  [Fact]
  public async Task ReadAllMerchantObjects_FoundationDependencyException_ThrowsOrchestrationDependencyException()
  {
    // Arrange
    var parentCompanyId = Guid.NewGuid();

    mockStorageService
        .Setup(s => s.ReadAllMerchantObjects(parentCompanyId, It.IsAny<CancellationToken>()))
        .ThrowsAsync(new MerchantFoundationServiceDependencyException(new InvalidOperationException("Dependency error")));

    // Act & Assert
    await Assert.ThrowsAsync<MerchantOrchestrationServiceDependencyException>(() =>
        service.ReadAllMerchantObjects(parentCompanyId, CancellationToken.None));
  }

  /// <summary>
  /// Validates generic exception during bulk read is wrapped.
  /// </summary>
  [Fact]
  public async Task ReadAllMerchantObjects_GenericException_ThrowsOrchestrationServiceException()
  {
    // Arrange
    var parentCompanyId = Guid.NewGuid();

    mockStorageService
        .Setup(s => s.ReadAllMerchantObjects(parentCompanyId, It.IsAny<CancellationToken>()))
        .ThrowsAsync(new InvalidOperationException("Unexpected error"));

    // Act & Assert
    await Assert.ThrowsAsync<MerchantOrchestrationServiceException>(() =>
        service.ReadAllMerchantObjects(parentCompanyId, CancellationToken.None));
  }

  /// <summary>
  /// Validates bulk read with large collection.
  /// </summary>
  [Fact]
  public async Task ReadAllMerchantObjects_LargeCollection_ReturnsAllMerchants()
  {
    // Arrange
    var parentCompanyId = Guid.NewGuid();
    var expectedMerchants = Enumerable.Range(0, 1000)
        .Select(_ => MerchantTestDataBuilder.CreateRandomMerchant())
        .ToList();

    mockStorageService
        .Setup(s => s.ReadAllMerchantObjects(parentCompanyId, It.IsAny<CancellationToken>()))
        .ReturnsAsync(expectedMerchants);

    // Act
    var result = await service.ReadAllMerchantObjects(parentCompanyId, CancellationToken.None);

    // Assert
    Assert.Equal(1000, result.Count());
  }

  #endregion

  #region UpdateMerchantObject Extended Tests

  /// <summary>
  /// Validates merchant update with valid data.
  /// </summary>
  [Fact]
  public async Task UpdateMerchantObject_ValidData_ReturnsUpdatedMerchant()
  {
    // Arrange
    var merchant = MerchantTestDataBuilder.CreateRandomMerchant();
    var merchantId = Guid.NewGuid();
    var parentCompanyId = Guid.NewGuid();

    mockStorageService
        .Setup(s => s.UpdateMerchantObject(merchant, merchantId, parentCompanyId, It.IsAny<CancellationToken>()))
        .ReturnsAsync(merchant);

    // Act
    var result = await service.UpdateMerchantObject(merchant, merchantId, parentCompanyId, CancellationToken.None);

    // Assert
    Assert.NotNull(result);
  }

  /// <summary>
  /// Validates merchant update with null parent company ID.
  /// </summary>
  [Fact]
  public async Task UpdateMerchantObject_NullParentCompanyId_ReturnsUpdatedMerchant()
  {
    // Arrange
    var merchant = MerchantTestDataBuilder.CreateRandomMerchant();
    var merchantId = Guid.NewGuid();

    mockStorageService
        .Setup(s => s.UpdateMerchantObject(merchant, merchantId, null, It.IsAny<CancellationToken>()))
        .ReturnsAsync(merchant);

    // Act
    var result = await service.UpdateMerchantObject(merchant, merchantId, null, CancellationToken.None);

    // Assert
    Assert.NotNull(result);
  }

  /// <summary>
  /// Validates foundation validation exception during update is wrapped.
  /// </summary>
  [Fact]
  public async Task UpdateMerchantObject_FoundationValidationException_ThrowsOrchestrationValidationException()
  {
    // Arrange
    var merchant = MerchantTestDataBuilder.CreateRandomMerchant();
    var merchantId = Guid.NewGuid();

    mockStorageService
        .Setup(s => s.UpdateMerchantObject(merchant, merchantId, null, It.IsAny<CancellationToken>()))
        .ThrowsAsync(new MerchantFoundationServiceValidationException(new InvalidOperationException("Validation error")));

    // Act & Assert
    await Assert.ThrowsAsync<MerchantOrchestrationServiceValidationException>(() =>
        service.UpdateMerchantObject(merchant, merchantId, null, CancellationToken.None));
  }

  /// <summary>
  /// Validates foundation dependency exception during update is wrapped.
  /// </summary>
  [Fact]
  public async Task UpdateMerchantObject_FoundationDependencyException_ThrowsOrchestrationDependencyException()
  {
    // Arrange
    var merchant = MerchantTestDataBuilder.CreateRandomMerchant();
    var merchantId = Guid.NewGuid();

    mockStorageService
        .Setup(s => s.UpdateMerchantObject(merchant, merchantId, null, It.IsAny<CancellationToken>()))
        .ThrowsAsync(new MerchantFoundationServiceDependencyException(new InvalidOperationException("Dependency error")));

    // Act & Assert
    await Assert.ThrowsAsync<MerchantOrchestrationServiceDependencyException>(() =>
        service.UpdateMerchantObject(merchant, merchantId, null, CancellationToken.None));
  }

  /// <summary>
  /// Validates generic exception during update is wrapped.
  /// </summary>
  [Fact]
  public async Task UpdateMerchantObject_GenericException_ThrowsOrchestrationServiceException()
  {
    // Arrange
    var merchant = MerchantTestDataBuilder.CreateRandomMerchant();
    var merchantId = Guid.NewGuid();

    mockStorageService
        .Setup(s => s.UpdateMerchantObject(merchant, merchantId, null, It.IsAny<CancellationToken>()))
        .ThrowsAsync(new InvalidOperationException("Unexpected error"));

    // Act & Assert
    await Assert.ThrowsAsync<MerchantOrchestrationServiceException>(() =>
        service.UpdateMerchantObject(merchant, merchantId, null, CancellationToken.None));
  }

  #endregion

  #region DeleteMerchantObject Extended Tests

  /// <summary>
  /// Validates merchant deletion with valid identifiers.
  /// </summary>
  [Fact]
  public async Task DeleteMerchantObject_ValidIdentifiers_DeletesSuccessfully()
  {
    // Arrange
    var merchantId = Guid.NewGuid();
    var parentCompanyId = Guid.NewGuid();

    mockStorageService
        .Setup(s => s.DeleteMerchantObject(merchantId, parentCompanyId, It.IsAny<CancellationToken>()))
        .Returns(Task.CompletedTask);

    // Act
    await service.DeleteMerchantObject(merchantId, parentCompanyId, CancellationToken.None);

    // Assert
    mockStorageService.Verify(s => s.DeleteMerchantObject(merchantId, parentCompanyId, It.IsAny<CancellationToken>()), Times.Once);
  }

  /// <summary>
  /// Validates merchant deletion with null parent company ID.
  /// </summary>
  [Fact]
  public async Task DeleteMerchantObject_NullParentCompanyId_DeletesSuccessfully()
  {
    // Arrange
    var merchantId = Guid.NewGuid();

    mockStorageService
        .Setup(s => s.DeleteMerchantObject(merchantId, null, It.IsAny<CancellationToken>()))
        .Returns(Task.CompletedTask);

    // Act
    await service.DeleteMerchantObject(merchantId, null, CancellationToken.None);

    // Assert
    mockStorageService.Verify(s => s.DeleteMerchantObject(merchantId, null, It.IsAny<CancellationToken>()), Times.Once);
  }

  /// <summary>
  /// Validates foundation validation exception during deletion is wrapped.
  /// </summary>
  [Fact]
  public async Task DeleteMerchantObject_FoundationValidationException_ThrowsOrchestrationValidationException()
  {
    // Arrange
    var merchantId = Guid.NewGuid();

    mockStorageService
        .Setup(s => s.DeleteMerchantObject(merchantId, null, It.IsAny<CancellationToken>()))
        .ThrowsAsync(new MerchantFoundationServiceValidationException(new InvalidOperationException("Validation error")));

    // Act & Assert
    await Assert.ThrowsAsync<MerchantOrchestrationServiceValidationException>(() =>
        service.DeleteMerchantObject(merchantId, null, CancellationToken.None));
  }

  /// <summary>
  /// Validates foundation dependency exception during deletion is wrapped.
  /// </summary>
  [Fact]
  public async Task DeleteMerchantObject_FoundationDependencyException_ThrowsOrchestrationDependencyException()
  {
    // Arrange
    var merchantId = Guid.NewGuid();

    mockStorageService
        .Setup(s => s.DeleteMerchantObject(merchantId, null, It.IsAny<CancellationToken>()))
        .ThrowsAsync(new MerchantFoundationServiceDependencyException(new InvalidOperationException("Dependency error")));

    // Act & Assert
    await Assert.ThrowsAsync<MerchantOrchestrationServiceDependencyException>(() =>
        service.DeleteMerchantObject(merchantId, null, CancellationToken.None));
  }

  /// <summary>
  /// Validates generic exception during deletion is wrapped.
  /// </summary>
  [Fact]
  public async Task DeleteMerchantObject_GenericException_ThrowsOrchestrationServiceException()
  {
    // Arrange
    var merchantId = Guid.NewGuid();

    mockStorageService
        .Setup(s => s.DeleteMerchantObject(merchantId, null, It.IsAny<CancellationToken>()))
        .ThrowsAsync(new InvalidOperationException("Unexpected error"));

    // Act & Assert
    await Assert.ThrowsAsync<MerchantOrchestrationServiceException>(() =>
        service.DeleteMerchantObject(merchantId, null, CancellationToken.None));
  }

  /// <summary>
  /// Validates idempotent deletion.
  /// </summary>
  [Fact]
  public async Task DeleteMerchantObject_MultipleCalls_AllComplete()
  {
    // Arrange
    var merchantId = Guid.NewGuid();
    var parentCompanyId = Guid.NewGuid();

    mockStorageService
        .Setup(s => s.DeleteMerchantObject(merchantId, parentCompanyId, It.IsAny<CancellationToken>()))
        .Returns(Task.CompletedTask);

    // Act
    await service.DeleteMerchantObject(merchantId, parentCompanyId, CancellationToken.None);
    await service.DeleteMerchantObject(merchantId, parentCompanyId, CancellationToken.None);
    await service.DeleteMerchantObject(merchantId, parentCompanyId, CancellationToken.None);

    // Assert
    mockStorageService.Verify(s => s.DeleteMerchantObject(merchantId, parentCompanyId, It.IsAny<CancellationToken>()), Times.Exactly(3));
  }

  #endregion

  #region Concurrent Operation Tests

  /// <summary>
  /// Validates concurrent create operations complete successfully.
  /// </summary>
  [Fact]
  public async Task CreateMerchantObject_ConcurrentOperations_AllComplete()
  {
    // Arrange
    var parentCompanyId = Guid.NewGuid();
    var merchants = Enumerable.Range(0, 10)
        .Select(_ => MerchantTestDataBuilder.CreateRandomMerchant())
        .ToList();

    mockStorageService
        .Setup(s => s.CreateMerchantObject(It.IsAny<Merchant>(), parentCompanyId, It.IsAny<CancellationToken>()))
        .Returns(Task.CompletedTask);

    // Act
    var tasks = merchants.Select(m => service.CreateMerchantObject(m, parentCompanyId, CancellationToken.None));
    await Task.WhenAll(tasks);

    // Assert
    mockStorageService.Verify(s => s.CreateMerchantObject(It.IsAny<Merchant>(), parentCompanyId, It.IsAny<CancellationToken>()), Times.Exactly(10));
  }

  /// <summary>
  /// Validates concurrent read operations complete successfully.
  /// </summary>
  [Fact]
  public async Task ReadMerchantObject_ConcurrentOperations_AllComplete()
  {
    // Arrange
    var expectedMerchant = MerchantTestDataBuilder.CreateRandomMerchant();

    mockStorageService
        .Setup(s => s.ReadMerchantObject(It.IsAny<Guid>(), null, It.IsAny<CancellationToken>()))
        .ReturnsAsync(expectedMerchant);

    // Act
    var tasks = Enumerable.Range(0, 10).Select(_ => service.ReadMerchantObject(Guid.NewGuid(), null, CancellationToken.None));
    var results = await Task.WhenAll(tasks);

    // Assert
    Assert.All(results, r => Assert.NotNull(r));
  }

  #endregion

  #region Edge Case Tests

  /// <summary>
  /// Validates TimeoutException is wrapped correctly.
  /// </summary>
  [Fact]
  public async Task CreateMerchantObject_TimeoutException_ThrowsOrchestrationServiceException()
  {
    // Arrange
    var merchant = MerchantTestDataBuilder.CreateRandomMerchant();

    mockStorageService
        .Setup(s => s.CreateMerchantObject(merchant, null, It.IsAny<CancellationToken>()))
        .ThrowsAsync(new TimeoutException("Timeout"));

    // Act & Assert
    await Assert.ThrowsAsync<MerchantOrchestrationServiceException>(() =>
        service.CreateMerchantObject(merchant, null, CancellationToken.None));
  }

  /// <summary>
  /// Validates ArgumentException is wrapped correctly.
  /// </summary>
  [Fact]
  public async Task ReadMerchantObject_ArgumentException_ThrowsOrchestrationServiceException()
  {
    // Arrange
    var merchantId = Guid.NewGuid();

    mockStorageService
        .Setup(s => s.ReadMerchantObject(merchantId, null, It.IsAny<CancellationToken>()))
        .ThrowsAsync(new ArgumentException("Invalid argument"));

    // Act & Assert
    await Assert.ThrowsAsync<MerchantOrchestrationServiceException>(() =>
        service.ReadMerchantObject(merchantId, null, CancellationToken.None));
  }

  /// <summary>
  /// Validates OperationCanceledException is wrapped correctly.
  /// </summary>
  [Fact]
  public async Task UpdateMerchantObject_OperationCanceledException_PropagatesOperationCanceledException()
  {
    // Arrange
    var merchant = MerchantTestDataBuilder.CreateRandomMerchant();
    var merchantId = Guid.NewGuid();

    mockStorageService
        .Setup(s => s.UpdateMerchantObject(merchant, merchantId, null, It.IsAny<CancellationToken>()))
        .ThrowsAsync(new OperationCanceledException("Cancelled"));

    // Act & Assert — cancellation must not be reclassified into a domain exception (bug fix)
    await Assert.ThrowsAsync<OperationCanceledException>(() =>
        service.UpdateMerchantObject(merchant, merchantId, null, CancellationToken.None));
  }

  #endregion
}
