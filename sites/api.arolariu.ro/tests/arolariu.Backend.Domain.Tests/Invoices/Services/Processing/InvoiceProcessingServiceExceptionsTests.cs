namespace arolariu.Backend.Domain.Tests.Invoices.Services.Processing;

using System;
using System.Threading;
using System.Threading.Tasks;

using arolariu.Backend.Domain.Invoices.DDD.AggregatorRoots.Invoices;
using arolariu.Backend.Domain.Invoices.DDD.AggregatorRoots.Invoices.Exceptions.Outer.Orchestration;
using arolariu.Backend.Domain.Invoices.DDD.AggregatorRoots.Invoices.Exceptions.Outer.Processing;
using arolariu.Backend.Domain.Invoices.Services.Orchestration.InvoiceService;
using arolariu.Backend.Domain.Invoices.Services.Orchestration.MerchantService;
using arolariu.Backend.Domain.Invoices.Services.Processing;
using arolariu.Backend.Domain.Tests.Builders;

using Microsoft.Extensions.Logging;

using Moq;

using Xunit;

/// <summary>
/// Unit tests validating that <see cref="InvoiceProcessingService"/> classifies each upstream
/// orchestration outer exception tier to its matching processing outer tier via the unified
/// Classify switch. Exercises 4 commonly-hit delegates across all 4 orchestration tiers.
/// </summary>
public sealed class InvoiceProcessingServiceExceptionsTests
{
  private readonly Mock<IInvoiceOrchestrationService> mockInvoiceOrchestrationService;
  private readonly Mock<IMerchantOrchestrationService> mockMerchantOrchestrationService;
  private readonly Mock<ILoggerFactory> mockLoggerFactory;
  private readonly Mock<ILogger<IInvoiceProcessingService>> mockLogger;
  private readonly InvoiceProcessingService processingService;

  /// <summary>
  /// Initializes mocked dependencies for exception-classification scenarios.
  /// </summary>
  public InvoiceProcessingServiceExceptionsTests()
  {
    mockInvoiceOrchestrationService = new Mock<IInvoiceOrchestrationService>();
    mockMerchantOrchestrationService = new Mock<IMerchantOrchestrationService>();
    mockLoggerFactory = new Mock<ILoggerFactory>();
    mockLogger = new Mock<ILogger<IInvoiceProcessingService>>();

    mockLoggerFactory
      .Setup(factory => factory.CreateLogger(It.IsAny<string>()))
      .Returns(mockLogger.Object);

    processingService = new InvoiceProcessingService(
      mockInvoiceOrchestrationService.Object,
      mockMerchantOrchestrationService.Object,
      mockLoggerFactory.Object);
  }

  #region CreateInvoice (CallbackFunctionForTasksWithNoReturn delegate)

  /// <summary>
  /// Orchestration validation failures must surface as processing validation.
  /// </summary>
  [Fact]
  public async Task CreateInvoice_WhenOrchestrationThrowsValidation_ThrowsProcessingValidation()
  {
    var invoice = InvoiceBuilder.CreateRandomInvoice();
    var inner = new InvalidOperationException("validation-inner");
    mockInvoiceOrchestrationService
      .Setup(s => s.CreateInvoiceObject(It.IsAny<Invoice>(), It.IsAny<Guid?>(), It.IsAny<CancellationToken>()))
      .ThrowsAsync(new InvoiceOrchestrationValidationException(inner));

    await Assert.ThrowsAsync<InvoiceProcessingServiceValidationException>(
      () => processingService.CreateInvoice(invoice));
  }

  /// <summary>
  /// Orchestration dependency-validation failures must bubble distinctly as processing dependency-validation.
  /// </summary>
  [Fact]
  public async Task CreateInvoice_WhenOrchestrationThrowsDependencyValidation_ThrowsProcessingDependencyValidation()
  {
    var invoice = InvoiceBuilder.CreateRandomInvoice();
    var inner = new InvalidOperationException("depval-inner");
    mockInvoiceOrchestrationService
      .Setup(s => s.CreateInvoiceObject(It.IsAny<Invoice>(), It.IsAny<Guid?>(), It.IsAny<CancellationToken>()))
      .ThrowsAsync(new InvoiceOrchestrationDependencyValidationException(inner));

    await Assert.ThrowsAsync<InvoiceProcessingServiceDependencyValidationException>(
      () => processingService.CreateInvoice(invoice));
  }

  /// <summary>
  /// Orchestration dependency failures must surface as processing dependency.
  /// </summary>
  [Fact]
  public async Task CreateInvoice_WhenOrchestrationThrowsDependency_ThrowsProcessingDependency()
  {
    var invoice = InvoiceBuilder.CreateRandomInvoice();
    var inner = new InvalidOperationException("dep-inner");
    mockInvoiceOrchestrationService
      .Setup(s => s.CreateInvoiceObject(It.IsAny<Invoice>(), It.IsAny<Guid?>(), It.IsAny<CancellationToken>()))
      .ThrowsAsync(new InvoiceOrchestrationDependencyException(inner));

    await Assert.ThrowsAsync<InvoiceProcessingServiceDependencyException>(
      () => processingService.CreateInvoice(invoice));
  }

  /// <summary>
  /// Orchestration service failures must surface as processing service failures.
  /// </summary>
  [Fact]
  public async Task CreateInvoice_WhenOrchestrationThrowsService_ThrowsProcessingService()
  {
    var invoice = InvoiceBuilder.CreateRandomInvoice();
    var inner = new InvalidOperationException("svc-inner");
    mockInvoiceOrchestrationService
      .Setup(s => s.CreateInvoiceObject(It.IsAny<Invoice>(), It.IsAny<Guid?>(), It.IsAny<CancellationToken>()))
      .ThrowsAsync(new InvoiceOrchestrationServiceException(inner));

    await Assert.ThrowsAsync<InvoiceProcessingServiceException>(
      () => processingService.CreateInvoice(invoice));
  }

  #endregion

  #region ReadInvoice (CallbackFunctionForTasksWithInvoiceReturn delegate)

  /// <summary>
  /// Orchestration validation failures must surface as processing validation on read path.
  /// </summary>
  [Fact]
  public async Task ReadInvoice_WhenOrchestrationThrowsValidation_ThrowsProcessingValidation()
  {
    var inner = new InvalidOperationException("validation-inner");
    mockInvoiceOrchestrationService
      .Setup(s => s.ReadInvoiceObject(It.IsAny<Guid>(), It.IsAny<Guid?>(), It.IsAny<CancellationToken>()))
      .ThrowsAsync(new InvoiceOrchestrationValidationException(inner));

    await Assert.ThrowsAsync<InvoiceProcessingServiceValidationException>(
      () => processingService.ReadInvoice(Guid.NewGuid()));
  }

  /// <summary>
  /// Orchestration dependency-validation failures must bubble distinctly on read path.
  /// </summary>
  [Fact]
  public async Task ReadInvoice_WhenOrchestrationThrowsDependencyValidation_ThrowsProcessingDependencyValidation()
  {
    var inner = new InvalidOperationException("depval-inner");
    mockInvoiceOrchestrationService
      .Setup(s => s.ReadInvoiceObject(It.IsAny<Guid>(), It.IsAny<Guid?>(), It.IsAny<CancellationToken>()))
      .ThrowsAsync(new InvoiceOrchestrationDependencyValidationException(inner));

    await Assert.ThrowsAsync<InvoiceProcessingServiceDependencyValidationException>(
      () => processingService.ReadInvoice(Guid.NewGuid()));
  }

  /// <summary>
  /// Orchestration dependency failures must surface as processing dependency on read path.
  /// </summary>
  [Fact]
  public async Task ReadInvoice_WhenOrchestrationThrowsDependency_ThrowsProcessingDependency()
  {
    var inner = new InvalidOperationException("dep-inner");
    mockInvoiceOrchestrationService
      .Setup(s => s.ReadInvoiceObject(It.IsAny<Guid>(), It.IsAny<Guid?>(), It.IsAny<CancellationToken>()))
      .ThrowsAsync(new InvoiceOrchestrationDependencyException(inner));

    await Assert.ThrowsAsync<InvoiceProcessingServiceDependencyException>(
      () => processingService.ReadInvoice(Guid.NewGuid()));
  }

  /// <summary>
  /// Orchestration service failures must surface as processing service on read path.
  /// </summary>
  [Fact]
  public async Task ReadInvoice_WhenOrchestrationThrowsService_ThrowsProcessingService()
  {
    var inner = new InvalidOperationException("svc-inner");
    mockInvoiceOrchestrationService
      .Setup(s => s.ReadInvoiceObject(It.IsAny<Guid>(), It.IsAny<Guid?>(), It.IsAny<CancellationToken>()))
      .ThrowsAsync(new InvoiceOrchestrationServiceException(inner));

    await Assert.ThrowsAsync<InvoiceProcessingServiceException>(
      () => processingService.ReadInvoice(Guid.NewGuid()));
  }

  #endregion

  #region UpdateInvoice (CallbackFunctionForTasksWithInvoiceReturn delegate)

  /// <summary>
  /// Orchestration validation failures must surface as processing validation on update path.
  /// </summary>
  [Fact]
  public async Task UpdateInvoice_WhenOrchestrationThrowsValidation_ThrowsProcessingValidation()
  {
    var invoice = InvoiceBuilder.CreateRandomInvoice();
    var inner = new InvalidOperationException("validation-inner");
    mockInvoiceOrchestrationService
      .Setup(s => s.UpdateInvoiceObject(It.IsAny<Invoice>(), It.IsAny<Guid>(), It.IsAny<Guid?>(), It.IsAny<CancellationToken>()))
      .ThrowsAsync(new InvoiceOrchestrationValidationException(inner));

    await Assert.ThrowsAsync<InvoiceProcessingServiceValidationException>(
      () => processingService.UpdateInvoice(invoice, invoice.id));
  }

  /// <summary>
  /// Orchestration dependency-validation failures must bubble distinctly on update path.
  /// </summary>
  [Fact]
  public async Task UpdateInvoice_WhenOrchestrationThrowsDependencyValidation_ThrowsProcessingDependencyValidation()
  {
    var invoice = InvoiceBuilder.CreateRandomInvoice();
    var inner = new InvalidOperationException("depval-inner");
    mockInvoiceOrchestrationService
      .Setup(s => s.UpdateInvoiceObject(It.IsAny<Invoice>(), It.IsAny<Guid>(), It.IsAny<Guid?>(), It.IsAny<CancellationToken>()))
      .ThrowsAsync(new InvoiceOrchestrationDependencyValidationException(inner));

    await Assert.ThrowsAsync<InvoiceProcessingServiceDependencyValidationException>(
      () => processingService.UpdateInvoice(invoice, invoice.id));
  }

  /// <summary>
  /// Orchestration dependency failures must surface as processing dependency on update path.
  /// </summary>
  [Fact]
  public async Task UpdateInvoice_WhenOrchestrationThrowsDependency_ThrowsProcessingDependency()
  {
    var invoice = InvoiceBuilder.CreateRandomInvoice();
    var inner = new InvalidOperationException("dep-inner");
    mockInvoiceOrchestrationService
      .Setup(s => s.UpdateInvoiceObject(It.IsAny<Invoice>(), It.IsAny<Guid>(), It.IsAny<Guid?>(), It.IsAny<CancellationToken>()))
      .ThrowsAsync(new InvoiceOrchestrationDependencyException(inner));

    await Assert.ThrowsAsync<InvoiceProcessingServiceDependencyException>(
      () => processingService.UpdateInvoice(invoice, invoice.id));
  }

  /// <summary>
  /// Orchestration service failures must surface as processing service on update path.
  /// </summary>
  [Fact]
  public async Task UpdateInvoice_WhenOrchestrationThrowsService_ThrowsProcessingService()
  {
    var invoice = InvoiceBuilder.CreateRandomInvoice();
    var inner = new InvalidOperationException("svc-inner");
    mockInvoiceOrchestrationService
      .Setup(s => s.UpdateInvoiceObject(It.IsAny<Invoice>(), It.IsAny<Guid>(), It.IsAny<Guid?>(), It.IsAny<CancellationToken>()))
      .ThrowsAsync(new InvoiceOrchestrationServiceException(inner));

    await Assert.ThrowsAsync<InvoiceProcessingServiceException>(
      () => processingService.UpdateInvoice(invoice, invoice.id));
  }

  #endregion

  #region DeleteInvoice (CallbackFunctionForTasksWithNoReturn delegate)

  /// <summary>
  /// Orchestration validation failures must surface as processing validation on delete path.
  /// </summary>
  [Fact]
  public async Task DeleteInvoice_WhenOrchestrationThrowsValidation_ThrowsProcessingValidation()
  {
    var inner = new InvalidOperationException("validation-inner");
    mockInvoiceOrchestrationService
      .Setup(s => s.DeleteInvoiceObject(It.IsAny<Guid>(), It.IsAny<Guid?>(), It.IsAny<CancellationToken>()))
      .ThrowsAsync(new InvoiceOrchestrationValidationException(inner));

    await Assert.ThrowsAsync<InvoiceProcessingServiceValidationException>(
      () => processingService.DeleteInvoice(Guid.NewGuid()));
  }

  /// <summary>
  /// Orchestration dependency-validation failures must bubble distinctly on delete path.
  /// </summary>
  [Fact]
  public async Task DeleteInvoice_WhenOrchestrationThrowsDependencyValidation_ThrowsProcessingDependencyValidation()
  {
    var inner = new InvalidOperationException("depval-inner");
    mockInvoiceOrchestrationService
      .Setup(s => s.DeleteInvoiceObject(It.IsAny<Guid>(), It.IsAny<Guid?>(), It.IsAny<CancellationToken>()))
      .ThrowsAsync(new InvoiceOrchestrationDependencyValidationException(inner));

    await Assert.ThrowsAsync<InvoiceProcessingServiceDependencyValidationException>(
      () => processingService.DeleteInvoice(Guid.NewGuid()));
  }

  /// <summary>
  /// Orchestration dependency failures must surface as processing dependency on delete path.
  /// </summary>
  [Fact]
  public async Task DeleteInvoice_WhenOrchestrationThrowsDependency_ThrowsProcessingDependency()
  {
    var inner = new InvalidOperationException("dep-inner");
    mockInvoiceOrchestrationService
      .Setup(s => s.DeleteInvoiceObject(It.IsAny<Guid>(), It.IsAny<Guid?>(), It.IsAny<CancellationToken>()))
      .ThrowsAsync(new InvoiceOrchestrationDependencyException(inner));

    await Assert.ThrowsAsync<InvoiceProcessingServiceDependencyException>(
      () => processingService.DeleteInvoice(Guid.NewGuid()));
  }

  /// <summary>
  /// Orchestration service failures must surface as processing service on delete path.
  /// </summary>
  [Fact]
  public async Task DeleteInvoice_WhenOrchestrationThrowsService_ThrowsProcessingService()
  {
    var inner = new InvalidOperationException("svc-inner");
    mockInvoiceOrchestrationService
      .Setup(s => s.DeleteInvoiceObject(It.IsAny<Guid>(), It.IsAny<Guid?>(), It.IsAny<CancellationToken>()))
      .ThrowsAsync(new InvoiceOrchestrationServiceException(inner));

    await Assert.ThrowsAsync<InvoiceProcessingServiceException>(
      () => processingService.DeleteInvoice(Guid.NewGuid()));
  }

  #endregion

  #region Unknown exception fallthrough

  /// <summary>
  /// Unknown exceptions from orchestration must fall through to processing service (catch-all).
  /// </summary>
  [Fact]
  public async Task CreateInvoice_WhenOrchestrationThrowsUnknown_ThrowsProcessingService()
  {
    var invoice = InvoiceBuilder.CreateRandomInvoice();
    mockInvoiceOrchestrationService
      .Setup(s => s.CreateInvoiceObject(It.IsAny<Invoice>(), It.IsAny<Guid?>(), It.IsAny<CancellationToken>()))
      .ThrowsAsync(new InvalidOperationException("unknown"));

    await Assert.ThrowsAsync<InvoiceProcessingServiceException>(
      () => processingService.CreateInvoice(invoice));
  }

  #endregion
}
