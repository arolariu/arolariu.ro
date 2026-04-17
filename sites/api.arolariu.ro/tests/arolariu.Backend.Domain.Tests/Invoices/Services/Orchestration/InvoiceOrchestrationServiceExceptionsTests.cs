namespace arolariu.Backend.Domain.Tests.Invoices.Services.Orchestration;

using System;
using System.Threading;
using System.Threading.Tasks;

using arolariu.Backend.Domain.Invoices.DDD.AggregatorRoots.Invoices;
using arolariu.Backend.Domain.Invoices.DDD.AggregatorRoots.Invoices.Exceptions.Outer.Foundation;
using arolariu.Backend.Domain.Invoices.DDD.AggregatorRoots.Invoices.Exceptions.Outer.Orchestration;
using arolariu.Backend.Domain.Invoices.Services.Foundation.InvoiceAnalysis;
using arolariu.Backend.Domain.Invoices.Services.Foundation.InvoiceStorage;
using arolariu.Backend.Domain.Invoices.Services.Orchestration.InvoiceService;
using arolariu.Backend.Domain.Tests.Builders;

using Microsoft.Extensions.Logging;

using Moq;

using Xunit;

/// <summary>
/// Unit tests validating that <see cref="InvoiceOrchestrationService"/> classifies each foundation
/// outer exception tier to its matching orchestration outer tier (no collapse).
/// </summary>
public sealed class InvoiceOrchestrationServiceExceptionsTests
{
  private readonly Mock<IInvoiceAnalysisFoundationService> mockAnalysisService;
  private readonly Mock<IInvoiceStorageFoundationService> mockStorageService;
  private readonly Mock<ILoggerFactory> mockLoggerFactory;
  private readonly Mock<ILogger<IInvoiceOrchestrationService>> mockLogger;
  private readonly InvoiceOrchestrationService orchestrationService;

  /// <summary>
  /// Initializes mocked dependencies for exception-classification scenarios.
  /// </summary>
  public InvoiceOrchestrationServiceExceptionsTests()
  {
    mockAnalysisService = new Mock<IInvoiceAnalysisFoundationService>();
    mockStorageService = new Mock<IInvoiceStorageFoundationService>();
    mockLoggerFactory = new Mock<ILoggerFactory>();
    mockLogger = new Mock<ILogger<IInvoiceOrchestrationService>>();

    mockLoggerFactory
      .Setup(factory => factory.CreateLogger(It.IsAny<string>()))
      .Returns(mockLogger.Object);

    orchestrationService = new InvoiceOrchestrationService(
      mockAnalysisService.Object,
      mockStorageService.Object,
      mockLoggerFactory.Object);
  }

  /// <summary>
  /// Foundation validation failures must surface as orchestration validation (no collapse into dependency-validation).
  /// </summary>
  [Fact]
  public async Task CreateInvoice_WhenFoundationThrowsValidation_ThrowsOrchestrationValidation()
  {
    var invoice = InvoiceBuilder.CreateRandomInvoice();
    var inner = new InvalidOperationException("validation-inner");
    mockStorageService
      .Setup(s => s.CreateInvoiceObject(It.IsAny<Invoice>(), It.IsAny<Guid?>(), It.IsAny<CancellationToken>()))
      .ThrowsAsync(new InvoiceFoundationValidationException(inner));

    await Assert.ThrowsAsync<InvoiceOrchestrationValidationException>(
      () => orchestrationService.CreateInvoiceObject(invoice));
  }

  /// <summary>
  /// Foundation dependency-validation failures must surface distinctly as orchestration dependency-validation.
  /// </summary>
  [Fact]
  public async Task CreateInvoice_WhenFoundationThrowsDependencyValidation_ThrowsOrchestrationDependencyValidation()
  {
    var invoice = InvoiceBuilder.CreateRandomInvoice();
    var inner = new InvalidOperationException("depval-inner");
    mockStorageService
      .Setup(s => s.CreateInvoiceObject(It.IsAny<Invoice>(), It.IsAny<Guid?>(), It.IsAny<CancellationToken>()))
      .ThrowsAsync(new InvoiceFoundationDependencyValidationException(inner));

    await Assert.ThrowsAsync<InvoiceOrchestrationDependencyValidationException>(
      () => orchestrationService.CreateInvoiceObject(invoice));
  }

  /// <summary>
  /// Foundation dependency failures must surface as orchestration dependency.
  /// </summary>
  [Fact]
  public async Task CreateInvoice_WhenFoundationThrowsDependency_ThrowsOrchestrationDependency()
  {
    var invoice = InvoiceBuilder.CreateRandomInvoice();
    var inner = new InvalidOperationException("dep-inner");
    mockStorageService
      .Setup(s => s.CreateInvoiceObject(It.IsAny<Invoice>(), It.IsAny<Guid?>(), It.IsAny<CancellationToken>()))
      .ThrowsAsync(new InvoiceFoundationDependencyException(inner));

    await Assert.ThrowsAsync<InvoiceOrchestrationDependencyException>(
      () => orchestrationService.CreateInvoiceObject(invoice));
  }

  /// <summary>
  /// Foundation service failures must surface as orchestration service failures.
  /// </summary>
  [Fact]
  public async Task CreateInvoice_WhenFoundationThrowsService_ThrowsOrchestrationService()
  {
    var invoice = InvoiceBuilder.CreateRandomInvoice();
    var inner = new InvalidOperationException("svc-inner");
    mockStorageService
      .Setup(s => s.CreateInvoiceObject(It.IsAny<Invoice>(), It.IsAny<Guid?>(), It.IsAny<CancellationToken>()))
      .ThrowsAsync(new InvoiceFoundationServiceException(inner));

    await Assert.ThrowsAsync<InvoiceOrchestrationServiceException>(
      () => orchestrationService.CreateInvoiceObject(invoice));
  }

  /// <summary>
  /// Unknown exceptions from the foundation must be treated as orchestration service failures (catch-all).
  /// </summary>
  [Fact]
  public async Task CreateInvoice_WhenFoundationThrowsUnknown_ThrowsOrchestrationService()
  {
    var invoice = InvoiceBuilder.CreateRandomInvoice();
    mockStorageService
      .Setup(s => s.CreateInvoiceObject(It.IsAny<Invoice>(), It.IsAny<Guid?>(), It.IsAny<CancellationToken>()))
      .ThrowsAsync(new InvalidOperationException("unknown"));

    await Assert.ThrowsAsync<InvoiceOrchestrationServiceException>(
      () => orchestrationService.CreateInvoiceObject(invoice));
  }
}
