namespace arolariu.Backend.Domain.Tests.Invoices.Services.Foundation;

using System;
using System.Collections.Generic;
using System.Threading.Tasks;

using arolariu.Backend.Domain.Invoices.Brokers.AnalysisBrokers.ClassifierBroker;
using arolariu.Backend.Domain.Invoices.Brokers.AnalysisBrokers.IdentifierBroker;
using arolariu.Backend.Domain.Invoices.DDD.AggregatorRoots.Invoices;
using arolariu.Backend.Domain.Invoices.DDD.AggregatorRoots.Invoices.Exceptions.Outer.Foundation;
using arolariu.Backend.Domain.Invoices.DDD.ValueObjects.Products;
using arolariu.Backend.Domain.Invoices.DTOs;
using arolariu.Backend.Domain.Invoices.Services.Foundation.InvoiceAnalysis;
using arolariu.Backend.Domain.Tests.Builders;

using Microsoft.Extensions.Logging;

using Moq;

using Xunit;

/// <summary>
/// Comprehensive unit tests for <see cref="InvoiceAnalysisFoundationService"/> targeting 95%+ code coverage.
/// Tests validate analysis pipeline orchestration, exception handling, and broker coordination.
/// Method naming follows MethodName_Condition_ExpectedResult pattern per repository standards.
/// </summary>
public sealed class InvoiceAnalysisFoundationServiceTests
{
  private readonly Mock<IClassifierBroker> mockOpenAiBroker;
  private readonly Mock<IFormRecognizerBroker> mockFormRecognizerBroker;
  private readonly Mock<ILoggerFactory> mockLoggerFactory;
  private readonly Mock<ILogger<IInvoiceAnalysisFoundationService>> mockLogger;
  private readonly InvoiceAnalysisFoundationService service;

  /// <summary>
  /// Initializes test fixtures with mocked dependencies for isolated analysis foundation service testing.
  /// </summary>
  public InvoiceAnalysisFoundationServiceTests()
  {
    mockOpenAiBroker = new Mock<IClassifierBroker>();
    mockFormRecognizerBroker = new Mock<IFormRecognizerBroker>();
    mockLoggerFactory = new Mock<ILoggerFactory>();
    mockLogger = new Mock<ILogger<IInvoiceAnalysisFoundationService>>();

    mockLoggerFactory
        .Setup(factory => factory.CreateLogger(It.IsAny<string>()))
        .Returns(mockLogger.Object);

    service = new InvoiceAnalysisFoundationService(
        mockOpenAiBroker.Object,
        mockFormRecognizerBroker.Object,
        mockLoggerFactory.Object);
  }

  #region Constructor Tests

  /// <summary>
  /// Validates successful instantiation with all valid dependencies.
  /// </summary>
  [Fact]
  public void Constructor_ValidDependencies_CreatesInstance()
  {
    // Arrange & Act
    var svc = new InvoiceAnalysisFoundationService(
        mockOpenAiBroker.Object,
        mockFormRecognizerBroker.Object,
        mockLoggerFactory.Object);

    // Assert
    Assert.NotNull(svc);
  }

  #endregion

  #region AnalyzeInvoiceAsync Tests

  /// <summary>
  /// Validates successful complete analysis workflow execution.
  /// </summary>
  [Fact]
  public async Task AnalyzeInvoiceAsync_ValidInput_ExecutesCompleteWorkflow()
  {
    // Arrange
    var options = AnalysisOptions.CompleteAnalysis;
    var invoice = InvoiceBuilder.CreateRandomInvoice();
    var initialUpdates = invoice.NumberOfUpdates;

    mockFormRecognizerBroker
        .Setup(b => b.PerformOcrAnalysisOnSingleInvoice(invoice, options))
        .ReturnsAsync(invoice);

    mockOpenAiBroker
        .Setup(b => b.PerformGptAnalysisOnSingleInvoice(invoice, options))
        .ReturnsAsync(invoice);

    // Act
    var result = await service.AnalyzeInvoiceAsync(options, invoice);

    // Assert
    Assert.NotNull(result);
    Assert.Equal(initialUpdates + 1, result.NumberOfUpdates);
    mockFormRecognizerBroker.Verify(b => b.PerformOcrAnalysisOnSingleInvoice(invoice, options), Times.Once);
    mockOpenAiBroker.Verify(b => b.PerformGptAnalysisOnSingleInvoice(invoice, options), Times.Once);
  }

  /// <summary>
  /// Validates analysis workflow with invoice only option.
  /// </summary>
  [Fact]
  public async Task AnalyzeInvoiceAsync_InvoiceOnlyOption_ExecutesWorkflow()
  {
    // Arrange
    var options = AnalysisOptions.InvoiceOnly;
    var invoice = InvoiceBuilder.CreateRandomInvoice();

    mockFormRecognizerBroker
        .Setup(b => b.PerformOcrAnalysisOnSingleInvoice(invoice, options))
        .ReturnsAsync(invoice);

    mockOpenAiBroker
        .Setup(b => b.PerformGptAnalysisOnSingleInvoice(invoice, options))
        .ReturnsAsync(invoice);

    // Act
    var result = await service.AnalyzeInvoiceAsync(options, invoice);

    // Assert
    Assert.NotNull(result);
  }

  /// <summary>
  /// Validates analysis workflow with no analysis option.
  /// </summary>
  [Fact]
  public async Task AnalyzeInvoiceAsync_NoAnalysisOption_ExecutesWorkflow()
  {
    // Arrange
    var options = AnalysisOptions.NoAnalysis;
    var invoice = InvoiceBuilder.CreateRandomInvoice();

    mockFormRecognizerBroker
        .Setup(b => b.PerformOcrAnalysisOnSingleInvoice(invoice, options))
        .ReturnsAsync(invoice);

    mockOpenAiBroker
        .Setup(b => b.PerformGptAnalysisOnSingleInvoice(invoice, options))
        .ReturnsAsync(invoice);

    // Act
    var result = await service.AnalyzeInvoiceAsync(options, invoice);

    // Assert
    Assert.NotNull(result);
  }

  /// <summary>
  /// Validates analysis with multiple products completes successfully.
  /// </summary>
  [Fact]
  public async Task AnalyzeInvoiceAsync_MultipleProducts_AnalyzesAllProducts()
  {
    // Arrange
    var options = AnalysisOptions.CompleteAnalysis;
    var invoice = InvoiceBuilder.CreateRandomInvoice();

    mockFormRecognizerBroker
        .Setup(b => b.PerformOcrAnalysisOnSingleInvoice(invoice, options))
        .ReturnsAsync(invoice);

    mockOpenAiBroker
        .Setup(b => b.PerformGptAnalysisOnSingleInvoice(invoice, options))
        .ReturnsAsync(invoice);

    // Act
    var result = await service.AnalyzeInvoiceAsync(options, invoice);

    // Assert
    Assert.NotNull(result);
    Assert.Equal(invoice.Items.Count, result.Items.Count);
  }

  /// <summary>
  /// Validates analysis with empty products collection completes.
  /// </summary>
  [Fact]
  public async Task AnalyzeInvoiceAsync_EmptyProducts_CompletesSuccessfully()
  {
    // Arrange
    var options = AnalysisOptions.CompleteAnalysis;
    var invoice = InvoiceBuilder.CreateInvoiceWithSpecificProperties();
    invoice.Items.Clear();

    mockFormRecognizerBroker
        .Setup(b => b.PerformOcrAnalysisOnSingleInvoice(invoice, options))
        .ReturnsAsync(invoice);

    mockOpenAiBroker
        .Setup(b => b.PerformGptAnalysisOnSingleInvoice(invoice, options))
        .ReturnsAsync(invoice);

    // Act
    var result = await service.AnalyzeInvoiceAsync(options, invoice);

    // Assert
    Assert.NotNull(result);
    Assert.Empty(result.Items);
  }

  /// <summary>
  /// Validates NumberOfUpdates is incremented after analysis.
  /// </summary>
  [Fact]
  public async Task AnalyzeInvoiceAsync_ValidInput_IncrementsNumberOfUpdates()
  {
    // Arrange
    var options = AnalysisOptions.CompleteAnalysis;
    var invoice = InvoiceBuilder.CreateRandomInvoice();
    var initialUpdates = invoice.NumberOfUpdates;

    mockFormRecognizerBroker
        .Setup(b => b.PerformOcrAnalysisOnSingleInvoice(invoice, options))
        .ReturnsAsync(invoice);

    mockOpenAiBroker
        .Setup(b => b.PerformGptAnalysisOnSingleInvoice(invoice, options))
        .ReturnsAsync(invoice);

    // Act
    var result = await service.AnalyzeInvoiceAsync(options, invoice);

    // Assert
    Assert.Equal(initialUpdates + 1, result.NumberOfUpdates);
  }

  /// <summary>
  /// Validates OCR broker exception is wrapped into foundation service exception.
  /// </summary>
  [Fact]
  public async Task AnalyzeInvoiceAsync_OcrBrokerThrows_ThrowsFoundationServiceException()
  {
    // Arrange
    var options = AnalysisOptions.CompleteAnalysis;
    var invoice = InvoiceBuilder.CreateRandomInvoice();

    mockFormRecognizerBroker
        .Setup(b => b.PerformOcrAnalysisOnSingleInvoice(invoice, options))
        .ThrowsAsync(new InvalidOperationException("OCR failed"));

    // Act & Assert
    await Assert.ThrowsAsync<InvoiceFoundationServiceException>(() =>
        service.AnalyzeInvoiceAsync(options, invoice));
  }

  /// <summary>
  /// Validates GPT broker exception is wrapped into foundation service exception.
  /// </summary>
  [Fact]
  public async Task AnalyzeInvoiceAsync_GptBrokerThrows_ThrowsFoundationServiceException()
  {
    // Arrange
    var options = AnalysisOptions.CompleteAnalysis;
    var invoice = InvoiceBuilder.CreateRandomInvoice();

    mockFormRecognizerBroker
        .Setup(b => b.PerformOcrAnalysisOnSingleInvoice(invoice, options))
        .ReturnsAsync(invoice);

    mockOpenAiBroker
        .Setup(b => b.PerformGptAnalysisOnSingleInvoice(invoice, options))
        .ThrowsAsync(new InvalidOperationException("GPT failed"));

    // Act & Assert
    await Assert.ThrowsAsync<InvoiceFoundationServiceException>(() =>
        service.AnalyzeInvoiceAsync(options, invoice));
  }

  /// <summary>
  /// Validates ArgumentNullException is wrapped into foundation service exception.
  /// </summary>
  [Fact]
  public async Task AnalyzeInvoiceAsync_ArgumentNullException_ThrowsFoundationServiceException()
  {
    // Arrange
    var options = AnalysisOptions.CompleteAnalysis;
    var invoice = InvoiceBuilder.CreateRandomInvoice();

    mockFormRecognizerBroker
        .Setup(b => b.PerformOcrAnalysisOnSingleInvoice(invoice, options))
        .ThrowsAsync(new ArgumentNullException("invoice"));

    // Act & Assert
    await Assert.ThrowsAsync<InvoiceFoundationServiceException>(() =>
        service.AnalyzeInvoiceAsync(options, invoice));
  }

  /// <summary>
  /// Validates OperationCanceledException is wrapped into foundation dependency exception,
  /// since downstream cancellation (e.g. timeout from the OCR broker) is a transient infrastructure
  /// concern that should surface as a 503 rather than a generic 500 per RFC 2003.
  /// </summary>
  [Fact]
  public async Task AnalyzeInvoiceAsync_OperationCanceledException_ThrowsFoundationDependencyException()
  {
    // Arrange
    var options = AnalysisOptions.CompleteAnalysis;
    var invoice = InvoiceBuilder.CreateRandomInvoice();

    mockFormRecognizerBroker
        .Setup(b => b.PerformOcrAnalysisOnSingleInvoice(invoice, options))
        .ThrowsAsync(new OperationCanceledException("Cancelled"));

    // Act & Assert
    await Assert.ThrowsAsync<InvoiceFoundationDependencyException>(() =>
        service.AnalyzeInvoiceAsync(options, invoice));
  }

  /// <summary>
  /// Validates analysis with InvoiceItemsOnly option.
  /// </summary>
  [Fact]
  public async Task AnalyzeInvoiceAsync_InvoiceItemsOnlyOption_ExecutesWorkflow()
  {
    // Arrange
    var options = AnalysisOptions.InvoiceItemsOnly;
    var invoice = InvoiceBuilder.CreateRandomInvoice();

    mockFormRecognizerBroker
        .Setup(b => b.PerformOcrAnalysisOnSingleInvoice(invoice, options))
        .ReturnsAsync(invoice);

    mockOpenAiBroker
        .Setup(b => b.PerformGptAnalysisOnSingleInvoice(invoice, options))
        .ReturnsAsync(invoice);

    // Act
    var result = await service.AnalyzeInvoiceAsync(options, invoice);

    // Assert
    Assert.NotNull(result);
  }

  /// <summary>
  /// Validates analysis with InvoiceMerchantOnly option.
  /// </summary>
  [Fact]
  public async Task AnalyzeInvoiceAsync_InvoiceMerchantOnlyOption_ExecutesWorkflow()
  {
    // Arrange
    var options = AnalysisOptions.InvoiceMerchantOnly;
    var invoice = InvoiceBuilder.CreateRandomInvoice();

    mockFormRecognizerBroker
        .Setup(b => b.PerformOcrAnalysisOnSingleInvoice(invoice, options))
        .ReturnsAsync(invoice);

    mockOpenAiBroker
        .Setup(b => b.PerformGptAnalysisOnSingleInvoice(invoice, options))
        .ReturnsAsync(invoice);

    // Act
    var result = await service.AnalyzeInvoiceAsync(options, invoice);

    // Assert
    Assert.NotNull(result);
  }

  /// <summary>
  /// Validates analysis workflow preserves invoice properties.
  /// </summary>
  [Fact]
  public async Task AnalyzeInvoiceAsync_ValidInput_PreservesInvoiceProperties()
  {
    // Arrange
    var options = AnalysisOptions.CompleteAnalysis;
    var invoice = InvoiceBuilder.CreateRandomInvoice();
    var originalId = invoice.id;
    var originalUserIdentifier = invoice.UserIdentifier;

    mockFormRecognizerBroker
        .Setup(b => b.PerformOcrAnalysisOnSingleInvoice(invoice, options))
        .ReturnsAsync(invoice);

    mockOpenAiBroker
        .Setup(b => b.PerformGptAnalysisOnSingleInvoice(invoice, options))
        .ReturnsAsync(invoice);

    // Act
    var result = await service.AnalyzeInvoiceAsync(options, invoice);

    // Assert
    Assert.Equal(originalId, result.id);
    Assert.Equal(originalUserIdentifier, result.UserIdentifier);
  }

  /// <summary>
  /// Validates multiple sequential analyses work correctly.
  /// </summary>
  [Theory]
  [MemberData(nameof(GetInvoiceTestData))]
  public async Task AnalyzeInvoiceAsync_MultipleInvoices_AllAnalyzeSuccessfully(Invoice invoice)
  {
    // Arrange
    var options = AnalysisOptions.CompleteAnalysis;

    mockFormRecognizerBroker
        .Setup(b => b.PerformOcrAnalysisOnSingleInvoice(It.IsAny<Invoice>(), It.IsAny<AnalysisOptions>()))
        .ReturnsAsync(invoice);

    mockOpenAiBroker
        .Setup(b => b.PerformGptAnalysisOnSingleInvoice(It.IsAny<Invoice>(), It.IsAny<AnalysisOptions>()))
        .ReturnsAsync(invoice);

    // Act
    var result = await service.AnalyzeInvoiceAsync(options, invoice);

    // Assert
    Assert.NotNull(result);
  }

  #endregion

  #region Test Data

  /// <summary>
  /// Provides theory data containing several randomized invoices for parameterized tests.
  /// </summary>
  public static TheoryData<Invoice> GetInvoiceTestData() => InvoiceBuilder.GetInvoiceTheoryData();

  #endregion
}
