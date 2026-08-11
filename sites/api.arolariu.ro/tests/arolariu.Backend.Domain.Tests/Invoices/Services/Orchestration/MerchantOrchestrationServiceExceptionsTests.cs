namespace arolariu.Backend.Domain.Tests.Invoices.Services.Orchestration;

using System;
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

using Microsoft.VisualStudio.TestTools.UnitTesting;

/// <summary>
/// Unit tests validating that <see cref="MerchantOrchestrationService"/> classifies each foundation
/// outer exception tier to its matching orchestration outer tier (no collapse).
/// </summary>
[TestClass]
public sealed class MerchantOrchestrationServiceExceptionsTests
{
  private readonly Mock<IMerchantStorageFoundationService> mockStorageService;
  private readonly Mock<ILoggerFactory> mockLoggerFactory;
  private readonly Mock<ILogger<IMerchantOrchestrationService>> mockLogger;
  private readonly MerchantOrchestrationService orchestrationService;

  /// <summary>
  /// Initializes mocked dependencies for exception-classification scenarios.
  /// </summary>
  public MerchantOrchestrationServiceExceptionsTests()
  {
    mockStorageService = new Mock<IMerchantStorageFoundationService>();
    mockLoggerFactory = new Mock<ILoggerFactory>();
    mockLogger = new Mock<ILogger<IMerchantOrchestrationService>>();

    mockLoggerFactory
      .Setup(factory => factory.CreateLogger(It.IsAny<string>()))
      .Returns(mockLogger.Object);

    orchestrationService = new MerchantOrchestrationService(
      mockStorageService.Object,
      mockLoggerFactory.Object);
  }

  /// <summary>
  /// Foundation validation failures must surface as orchestration validation (no collapse into dependency-validation).
  /// </summary>
  [TestMethod]
  public async Task CreateMerchant_WhenFoundationThrowsValidation_ThrowsOrchestrationValidation()
  {
    var merchant = MerchantTestDataBuilder.CreateRandomMerchant();
    var inner = new InvalidOperationException("validation-inner");
    mockStorageService
      .Setup(s => s.CreateMerchantObject(It.IsAny<Merchant>(), It.IsAny<Guid?>(), It.IsAny<CancellationToken>()))
      .ThrowsAsync(new MerchantFoundationServiceValidationException(inner));

    await Assert.ThrowsExactlyAsync<MerchantOrchestrationServiceValidationException>(
      () => orchestrationService.CreateMerchantObject(merchant, null, CancellationToken.None));
  }

  /// <summary>
  /// Foundation dependency-validation failures must surface distinctly as orchestration dependency-validation.
  /// </summary>
  [TestMethod]
  public async Task CreateMerchant_WhenFoundationThrowsDependencyValidation_ThrowsOrchestrationDependencyValidation()
  {
    var merchant = MerchantTestDataBuilder.CreateRandomMerchant();
    var inner = new InvalidOperationException("depval-inner");
    mockStorageService
      .Setup(s => s.CreateMerchantObject(It.IsAny<Merchant>(), It.IsAny<Guid?>(), It.IsAny<CancellationToken>()))
      .ThrowsAsync(new MerchantFoundationServiceDependencyValidationException(inner));

    await Assert.ThrowsExactlyAsync<MerchantOrchestrationServiceDependencyValidationException>(
      () => orchestrationService.CreateMerchantObject(merchant, null, CancellationToken.None));
  }

  /// <summary>
  /// Foundation dependency failures must surface as orchestration dependency.
  /// </summary>
  [TestMethod]
  public async Task CreateMerchant_WhenFoundationThrowsDependency_ThrowsOrchestrationDependency()
  {
    var merchant = MerchantTestDataBuilder.CreateRandomMerchant();
    var inner = new InvalidOperationException("dep-inner");
    mockStorageService
      .Setup(s => s.CreateMerchantObject(It.IsAny<Merchant>(), It.IsAny<Guid?>(), It.IsAny<CancellationToken>()))
      .ThrowsAsync(new MerchantFoundationServiceDependencyException(inner));

    await Assert.ThrowsExactlyAsync<MerchantOrchestrationServiceDependencyException>(
      () => orchestrationService.CreateMerchantObject(merchant, null, CancellationToken.None));
  }

  /// <summary>
  /// Foundation service failures must surface as orchestration service failures.
  /// </summary>
  [TestMethod]
  public async Task CreateMerchant_WhenFoundationThrowsService_ThrowsOrchestrationService()
  {
    var merchant = MerchantTestDataBuilder.CreateRandomMerchant();
    var inner = new InvalidOperationException("svc-inner");
    mockStorageService
      .Setup(s => s.CreateMerchantObject(It.IsAny<Merchant>(), It.IsAny<Guid?>(), It.IsAny<CancellationToken>()))
      .ThrowsAsync(new MerchantFoundationServiceException(inner));

    await Assert.ThrowsExactlyAsync<MerchantOrchestrationServiceException>(
      () => orchestrationService.CreateMerchantObject(merchant, null, CancellationToken.None));
  }

  /// <summary>
  /// Unknown exceptions from the foundation must be treated as orchestration service failures (catch-all).
  /// </summary>
  [TestMethod]
  public async Task CreateMerchant_WhenFoundationThrowsUnknown_ThrowsOrchestrationService()
  {
    var merchant = MerchantTestDataBuilder.CreateRandomMerchant();
    mockStorageService
      .Setup(s => s.CreateMerchantObject(It.IsAny<Merchant>(), It.IsAny<Guid?>(), It.IsAny<CancellationToken>()))
      .ThrowsAsync(new InvalidOperationException("unknown"));

    await Assert.ThrowsExactlyAsync<MerchantOrchestrationServiceException>(
      () => orchestrationService.CreateMerchantObject(merchant, null, CancellationToken.None));
  }
}
