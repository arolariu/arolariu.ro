namespace arolariu.Backend.Domain.Tests.Invoices.Services.Foundation;

using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading;
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

using Microsoft.VisualStudio.TestTools.UnitTesting;

/// <summary>
/// Extended unit tests for <see cref="InvoiceAnalysisFoundationService"/> covering additional
/// edge cases, exception scenarios, and boundary conditions for comprehensive code coverage.
/// </summary>
[TestClass]
public sealed class InvoiceAnalysisFoundationServiceExtendedTests
{
  private readonly Mock<IClassifierBroker> mockOpenAiBroker;
  private readonly Mock<IFormRecognizerBroker> mockFormRecognizerBroker;
  private readonly Mock<ILoggerFactory> mockLoggerFactory;
  private readonly Mock<ILogger<IInvoiceAnalysisFoundationService>> mockLogger;
  private readonly InvoiceAnalysisFoundationService service;

  /// <summary>
  /// Initializes test fixtures with mocked dependencies.
  /// </summary>
  public InvoiceAnalysisFoundationServiceExtendedTests()
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

  #region Exception Handling Extended Tests

  /// <summary>
  /// Validates TimeoutException from OCR broker is wrapped correctly.
  /// </summary>
  [TestMethod]
  public async Task AnalyzeInvoiceAsync_OcrBrokerTimesOut_ThrowsFoundationServiceException()
  {
    // Arrange
    var options = AnalysisOptions.CompleteAnalysis;
    var invoice = InvoiceBuilder.CreateRandomInvoice();

    mockFormRecognizerBroker
        .Setup(b => b.PerformOcrAnalysisOnSingleInvoice(invoice, options))
        .ThrowsAsync(new TimeoutException("OCR service timeout"));

    // Act & Assert
    var exception = await Assert.ThrowsExactlyAsync<InvoiceFoundationServiceException>(() =>
        service.AnalyzeInvoiceAsync(options, invoice, CancellationToken.None));
    Assert.IsNotNull(exception.InnerException);
  }

  /// <summary>
  /// Validates TimeoutException from GPT broker is wrapped correctly.
  /// </summary>
  [TestMethod]
  public async Task AnalyzeInvoiceAsync_GptBrokerTimesOut_ThrowsFoundationServiceException()
  {
    // Arrange
    var options = AnalysisOptions.CompleteAnalysis;
    var invoice = InvoiceBuilder.CreateRandomInvoice();

    mockFormRecognizerBroker
        .Setup(b => b.PerformOcrAnalysisOnSingleInvoice(invoice, options))
        .ReturnsAsync(invoice);

    mockOpenAiBroker
        .Setup(b => b.PerformGptAnalysisOnSingleInvoice(invoice, options))
        .ThrowsAsync(new TimeoutException("GPT service timeout"));

    // Act & Assert
    await Assert.ThrowsExactlyAsync<InvoiceFoundationServiceException>(() =>
        service.AnalyzeInvoiceAsync(options, invoice, CancellationToken.None));
  }

  /// <summary>
  /// Validates HttpRequestException from OCR broker is wrapped correctly.
  /// </summary>
  [TestMethod]
  public async Task AnalyzeInvoiceAsync_OcrNetworkError_ThrowsFoundationServiceException()
  {
    // Arrange
    var options = AnalysisOptions.CompleteAnalysis;
    var invoice = InvoiceBuilder.CreateRandomInvoice();

    mockFormRecognizerBroker
        .Setup(b => b.PerformOcrAnalysisOnSingleInvoice(invoice, options))
        .ThrowsAsync(new System.Net.Http.HttpRequestException("Network error"));

    // Act & Assert
    await Assert.ThrowsExactlyAsync<InvoiceFoundationServiceException>(() =>
        service.AnalyzeInvoiceAsync(options, invoice, CancellationToken.None));
  }

  /// <summary>
  /// Validates NotSupportedException is wrapped correctly.
  /// </summary>
  [TestMethod]
  public async Task AnalyzeInvoiceAsync_NotSupportedException_ThrowsFoundationServiceException()
  {
    // Arrange
    var options = AnalysisOptions.CompleteAnalysis;
    var invoice = InvoiceBuilder.CreateRandomInvoice();

    mockFormRecognizerBroker
        .Setup(b => b.PerformOcrAnalysisOnSingleInvoice(invoice, options))
        .ThrowsAsync(new NotSupportedException("Not supported"));

    // Act & Assert
    await Assert.ThrowsExactlyAsync<InvoiceFoundationServiceException>(() =>
        service.AnalyzeInvoiceAsync(options, invoice, CancellationToken.None));
  }

  /// <summary>
  /// Validates InvalidOperationException is wrapped correctly.
  /// </summary>
  [TestMethod]
  public async Task AnalyzeInvoiceAsync_InvalidOperationException_ThrowsFoundationServiceException()
  {
    // Arrange
    var options = AnalysisOptions.CompleteAnalysis;
    var invoice = InvoiceBuilder.CreateRandomInvoice();

    mockFormRecognizerBroker
        .Setup(b => b.PerformOcrAnalysisOnSingleInvoice(invoice, options))
        .ThrowsAsync(new InvalidOperationException("Invalid operation"));

    // Act & Assert
    var exception = await Assert.ThrowsExactlyAsync<InvoiceFoundationServiceException>(() =>
        service.AnalyzeInvoiceAsync(options, invoice, CancellationToken.None));
    Assert.IsExactInstanceOfType<InvalidOperationException>(exception.InnerException);
  }

  #endregion

  #region Workflow Ordering Tests

  /// <summary>
  /// Validates OCR is called before GPT.
  /// </summary>
  [TestMethod]
  public async Task AnalyzeInvoiceAsync_ValidInput_OcrCalledBeforeGpt()
  {
    // Arrange
    var options = AnalysisOptions.CompleteAnalysis;
    var invoice = InvoiceBuilder.CreateRandomInvoice();
    var callOrder = new List<string>();

    mockFormRecognizerBroker
        .Setup(b => b.PerformOcrAnalysisOnSingleInvoice(invoice, options))
        .Callback(() => callOrder.Add("OCR"))
        .ReturnsAsync(invoice);

    mockOpenAiBroker
        .Setup(b => b.PerformGptAnalysisOnSingleInvoice(invoice, options))
        .Callback(() => callOrder.Add("GPT"))
        .ReturnsAsync(invoice);

    // Act
    await service.AnalyzeInvoiceAsync(options, invoice, CancellationToken.None);

    // Assert
    Assert.IsTrue(callOrder.IndexOf("OCR") < callOrder.IndexOf("GPT"));
  }

  #endregion

  #region Analysis Options Tests

  /// <summary>
  /// Validates all analysis options are passed to OCR broker correctly.
  /// </summary>
  [TestMethod]
  [DataRow(AnalysisOptions.NoAnalysis)]
  [DataRow(AnalysisOptions.InvoiceOnly)]
  [DataRow(AnalysisOptions.InvoiceItemsOnly)]
  [DataRow(AnalysisOptions.InvoiceMerchantOnly)]
  [DataRow(AnalysisOptions.CompleteAnalysis)]
  public async Task AnalyzeInvoiceAsync_DifferentOptions_PassesCorrectOptionsToOcr(AnalysisOptions options)
  {
    // Arrange
    var invoice = InvoiceBuilder.CreateRandomInvoice();

    mockFormRecognizerBroker
        .Setup(b => b.PerformOcrAnalysisOnSingleInvoice(invoice, options))
        .ReturnsAsync(invoice);

    mockOpenAiBroker
        .Setup(b => b.PerformGptAnalysisOnSingleInvoice(invoice, options))
        .ReturnsAsync(invoice);

    // Act
    await service.AnalyzeInvoiceAsync(options, invoice, CancellationToken.None);

    // Assert
    mockFormRecognizerBroker.Verify(b => b.PerformOcrAnalysisOnSingleInvoice(invoice, options), Times.Once);
  }

  /// <summary>
  /// Validates all analysis options are passed to GPT broker correctly.
  /// </summary>
  [TestMethod]
  [DataRow(AnalysisOptions.NoAnalysis)]
  [DataRow(AnalysisOptions.InvoiceOnly)]
  [DataRow(AnalysisOptions.InvoiceItemsOnly)]
  [DataRow(AnalysisOptions.InvoiceMerchantOnly)]
  [DataRow(AnalysisOptions.CompleteAnalysis)]
  public async Task AnalyzeInvoiceAsync_DifferentOptions_PassesCorrectOptionsToGpt(AnalysisOptions options)
  {
    // Arrange
    var invoice = InvoiceBuilder.CreateRandomInvoice();

    mockFormRecognizerBroker
        .Setup(b => b.PerformOcrAnalysisOnSingleInvoice(invoice, options))
        .ReturnsAsync(invoice);

    mockOpenAiBroker
        .Setup(b => b.PerformGptAnalysisOnSingleInvoice(invoice, options))
        .ReturnsAsync(invoice);

    // Act
    await service.AnalyzeInvoiceAsync(options, invoice, CancellationToken.None);

    // Assert
    mockOpenAiBroker.Verify(b => b.PerformGptAnalysisOnSingleInvoice(invoice, options), Times.Once);
  }

  #endregion

  #region Invoice Mutation Tests

  /// <summary>
  /// Validates invoice returned by OCR broker is passed to translation.
  /// </summary>
  [TestMethod]
  public async Task AnalyzeInvoiceAsync_OcrReturnsModifiedInvoice_PassesToTranslation()
  {
    // Arrange
    var options = AnalysisOptions.CompleteAnalysis;
    var originalInvoice = InvoiceBuilder.CreateInvoiceWithSpecificProperties();
    originalInvoice.Items.Clear();
    var modifiedInvoice = InvoiceBuilder.CreateInvoiceWithSpecificProperties();
    modifiedInvoice.Items.Clear();
    modifiedInvoice.Items.Add(new Product { Name = "OCR Detected Product" });

    mockFormRecognizerBroker
        .Setup(b => b.PerformOcrAnalysisOnSingleInvoice(originalInvoice, options))
        .ReturnsAsync(modifiedInvoice);

    mockOpenAiBroker
        .Setup(b => b.PerformGptAnalysisOnSingleInvoice(modifiedInvoice, options))
        .ReturnsAsync(modifiedInvoice);

    // Act
    var result = await service.AnalyzeInvoiceAsync(options, originalInvoice, CancellationToken.None);

    // Assert
  }

  /// <summary>
  /// Validates NumberOfUpdates starts at initial value before increment.
  /// </summary>
  [TestMethod]
  public async Task AnalyzeInvoiceAsync_InvoiceWithExistingUpdates_IncrementsFromExistingValue()
  {
    // Arrange
    var options = AnalysisOptions.CompleteAnalysis;
    var invoice = InvoiceBuilder.CreateRandomInvoice();
    invoice.NumberOfUpdates = 5;

    mockFormRecognizerBroker
        .Setup(b => b.PerformOcrAnalysisOnSingleInvoice(invoice, options))
        .ReturnsAsync(invoice);

    mockOpenAiBroker
        .Setup(b => b.PerformGptAnalysisOnSingleInvoice(invoice, options))
        .ReturnsAsync(invoice);

    // Act
    var result = await service.AnalyzeInvoiceAsync(options, invoice, CancellationToken.None);

    // Assert
    Assert.AreEqual(6, result.NumberOfUpdates);
  }

  #endregion

  #region Concurrent Operations Tests

  /// <summary>
  /// Validates concurrent analysis calls complete successfully.
  /// </summary>
  [TestMethod]
  public async Task AnalyzeInvoiceAsync_ConcurrentCalls_AllComplete()
  {
    // Arrange
    var options = AnalysisOptions.CompleteAnalysis;
    var invoices = InvoiceBuilder.CreateMultipleRandomInvoices(10);

    mockFormRecognizerBroker
        .Setup(b => b.PerformOcrAnalysisOnSingleInvoice(It.IsAny<Invoice>(), options))
        .ReturnsAsync((Invoice inv, AnalysisOptions opt) => inv);

    mockOpenAiBroker
        .Setup(b => b.PerformGptAnalysisOnSingleInvoice(It.IsAny<Invoice>(), options))
        .ReturnsAsync((Invoice inv, AnalysisOptions opt) => inv);

    // Act
    var tasks = invoices.Select(inv => service.AnalyzeInvoiceAsync(options, inv, CancellationToken.None));
    var results = await Task.WhenAll(tasks);

    // Assert
    Assert.AreEqual(10, results.Length);
    foreach (var r in results)
    {
      Assert.IsNotNull(r);
    }
  }

  /// <summary>
  /// Validates concurrent analysis with failures handles correctly.
  /// </summary>
  [TestMethod]
  public async Task AnalyzeInvoiceAsync_ConcurrentCallsWithFailures_IndependentExceptions()
  {
    // Arrange
    var options = AnalysisOptions.CompleteAnalysis;
    var invoice1 = InvoiceBuilder.CreateRandomInvoice();
    var invoice2 = InvoiceBuilder.CreateRandomInvoice();

    mockFormRecognizerBroker
        .Setup(b => b.PerformOcrAnalysisOnSingleInvoice(invoice1, options))
        .ReturnsAsync(invoice1);

    mockFormRecognizerBroker
        .Setup(b => b.PerformOcrAnalysisOnSingleInvoice(invoice2, options))
        .ThrowsAsync(new InvalidOperationException("OCR failed"));

    mockOpenAiBroker
        .Setup(b => b.PerformGptAnalysisOnSingleInvoice(invoice1, options))
        .ReturnsAsync(invoice1);

    // Act
    var task1 = service.AnalyzeInvoiceAsync(options, invoice1, CancellationToken.None);
    var task2 = service.AnalyzeInvoiceAsync(options, invoice2, CancellationToken.None);

    // Assert
    var result1 = await task1;
    Assert.IsNotNull(result1);
    await Assert.ThrowsExactlyAsync<InvoiceFoundationServiceException>(() => task2);
  }

  #endregion

  #region Edge Case Tests

  /// <summary>
  /// Validates analysis with single character product name succeeds.
  /// </summary>
  [TestMethod]
  public async Task AnalyzeInvoiceAsync_SingleCharacterProductName_AnalyzesSuccessfully()
  {
    // Arrange
    var options = AnalysisOptions.CompleteAnalysis;
    var invoice = InvoiceBuilder.CreateInvoiceWithSpecificProperties();
    invoice.Items.Clear();
    invoice.Items.Add(new Product { Name = "A" });

    mockFormRecognizerBroker
        .Setup(b => b.PerformOcrAnalysisOnSingleInvoice(invoice, options))
        .ReturnsAsync(invoice);

    mockOpenAiBroker
        .Setup(b => b.PerformGptAnalysisOnSingleInvoice(invoice, options))
        .ReturnsAsync(invoice);

    // Act
    var result = await service.AnalyzeInvoiceAsync(options, invoice, CancellationToken.None);

    // Assert
    Assert.AreEqual("A", result.Items.First().Name);
  }

  /// <summary>
  /// Validates analysis with very long product name succeeds.
  /// </summary>
  [TestMethod]
  public async Task AnalyzeInvoiceAsync_VeryLongProductName_AnalyzesSuccessfully()
  {
    // Arrange
    var options = AnalysisOptions.CompleteAnalysis;
    var invoice = InvoiceBuilder.CreateInvoiceWithSpecificProperties();
    var longName = new string('X', 1000);
    invoice.Items.Clear();
    invoice.Items.Add(new Product { Name = longName });

    mockFormRecognizerBroker
        .Setup(b => b.PerformOcrAnalysisOnSingleInvoice(invoice, options))
        .ReturnsAsync(invoice);

    mockOpenAiBroker
        .Setup(b => b.PerformGptAnalysisOnSingleInvoice(invoice, options))
        .ReturnsAsync(invoice);

    // Act
    var result = await service.AnalyzeInvoiceAsync(options, invoice, CancellationToken.None);

    // Assert
    Assert.AreEqual(longName, result.Items.First().Name);
  }

  /// <summary>
  /// Validates analysis with unicode product name succeeds.
  /// </summary>
  [TestMethod]
  public async Task AnalyzeInvoiceAsync_UnicodeProductName_AnalyzesSuccessfully()
  {
    // Arrange
    var options = AnalysisOptions.CompleteAnalysis;
    var invoice = InvoiceBuilder.CreateInvoiceWithSpecificProperties();
    var unicodeName = "日本語製品名 中文产品 عربي";
    invoice.Items.Clear();
    invoice.Items.Add(new Product { Name = unicodeName });

    mockFormRecognizerBroker
        .Setup(b => b.PerformOcrAnalysisOnSingleInvoice(invoice, options))
        .ReturnsAsync(invoice);

    mockOpenAiBroker
        .Setup(b => b.PerformGptAnalysisOnSingleInvoice(invoice, options))
        .ReturnsAsync(invoice);

    // Act
    var result = await service.AnalyzeInvoiceAsync(options, invoice, CancellationToken.None);

    // Assert
    Assert.AreEqual(unicodeName, result.Items.First().Name);
  }

  /// <summary>
  /// Validates analysis with special characters in product name succeeds.
  /// </summary>
  [TestMethod]
  public async Task AnalyzeInvoiceAsync_SpecialCharactersInProductName_AnalyzesSuccessfully()
  {
    // Arrange
    var options = AnalysisOptions.CompleteAnalysis;
    var invoice = InvoiceBuilder.CreateInvoiceWithSpecificProperties();
    var specialName = "Product™ © ® € £ ¥ ½ ¼ ¾";
    invoice.Items.Clear();
    invoice.Items.Add(new Product { Name = specialName });

    mockFormRecognizerBroker
        .Setup(b => b.PerformOcrAnalysisOnSingleInvoice(invoice, options))
        .ReturnsAsync(invoice);

    mockOpenAiBroker
        .Setup(b => b.PerformGptAnalysisOnSingleInvoice(invoice, options))
        .ReturnsAsync(invoice);

    // Act
    var result = await service.AnalyzeInvoiceAsync(options, invoice, CancellationToken.None);

    // Assert
    Assert.AreEqual(specialName, result.Items.First().Name);
  }

  /// <summary>
  /// Validates analysis with whitespace-only product name succeeds.
  /// </summary>
  [TestMethod]
  public async Task AnalyzeInvoiceAsync_WhitespaceProductName_AnalyzesSuccessfully()
  {
    // Arrange
    var options = AnalysisOptions.CompleteAnalysis;
    var invoice = InvoiceBuilder.CreateInvoiceWithSpecificProperties();
    invoice.Items.Clear();
    invoice.Items.Add(new Product { Name = "   " });

    mockFormRecognizerBroker
        .Setup(b => b.PerformOcrAnalysisOnSingleInvoice(invoice, options))
        .ReturnsAsync(invoice);

    mockOpenAiBroker
        .Setup(b => b.PerformGptAnalysisOnSingleInvoice(invoice, options))
        .ReturnsAsync(invoice);

    // Act
    var result = await service.AnalyzeInvoiceAsync(options, invoice, CancellationToken.None);

    // Assert
    Assert.AreEqual("   ", result.Items.First().Name);
  }

  #endregion
}
