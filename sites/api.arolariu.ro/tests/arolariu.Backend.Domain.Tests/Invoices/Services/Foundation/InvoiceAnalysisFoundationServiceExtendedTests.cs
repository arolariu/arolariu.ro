namespace arolariu.Backend.Domain.Tests.Invoices.Services.Foundation;

using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;

using arolariu.Backend.Domain.Invoices.Brokers.AnalysisBrokers.ClassifierBroker;
using arolariu.Backend.Domain.Invoices.Brokers.AnalysisBrokers.IdentifierBroker;
using arolariu.Backend.Domain.Invoices.Brokers.TranslatorBroker;
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
/// Extended unit tests for <see cref="InvoiceAnalysisFoundationService"/> covering additional
/// edge cases, exception scenarios, and boundary conditions for comprehensive code coverage.
/// </summary>
public sealed class InvoiceAnalysisFoundationServiceExtendedTests
{
  private readonly Mock<IClassifierBroker> mockOpenAiBroker;
  private readonly Mock<ITranslatorBroker> mockTranslatorBroker;
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
    mockTranslatorBroker = new Mock<ITranslatorBroker>();
    mockFormRecognizerBroker = new Mock<IFormRecognizerBroker>();
    mockLoggerFactory = new Mock<ILoggerFactory>();
    mockLogger = new Mock<ILogger<IInvoiceAnalysisFoundationService>>();

    mockLoggerFactory
        .Setup(factory => factory.CreateLogger(It.IsAny<string>()))
        .Returns(mockLogger.Object);

    service = new InvoiceAnalysisFoundationService(
        mockOpenAiBroker.Object,
        mockTranslatorBroker.Object,
        mockFormRecognizerBroker.Object,
        mockLoggerFactory.Object);
  }

  #region Exception Handling Extended Tests

  /// <summary>
  /// Validates TimeoutException from OCR broker is wrapped correctly.
  /// </summary>
  [Fact]
  public async Task AnalyzeInvoiceAsync_OcrBrokerTimesOut_ThrowsFoundationServiceException()
  {
    // Arrange
    var options = AnalysisOptions.CompleteAnalysis;
    var invoice = InvoiceBuilder.CreateRandomInvoice();

    mockFormRecognizerBroker
        .Setup(b => b.PerformOcrAnalysisOnSingleInvoice(invoice, options))
        .ThrowsAsync(new TimeoutException("OCR service timeout"));

    // Act & Assert
    var exception = await Assert.ThrowsAsync<InvoiceFoundationServiceException>(() =>
        service.AnalyzeInvoiceAsync(options, invoice));
    Assert.NotNull(exception.InnerException);
  }

  /// <summary>
  /// Validates TimeoutException from translator broker is wrapped correctly.
  /// </summary>
  [Fact]
  public async Task AnalyzeInvoiceAsync_TranslatorTimesOut_ThrowsFoundationServiceException()
  {
    // Arrange
    var options = AnalysisOptions.CompleteAnalysis;
    var invoice = InvoiceBuilder.CreateRandomInvoice();

    mockFormRecognizerBroker
        .Setup(b => b.PerformOcrAnalysisOnSingleInvoice(invoice, options))
        .ReturnsAsync(invoice);

    mockTranslatorBroker
        .Setup(b => b.Translate(It.IsAny<string>(), It.IsAny<string>()))
        .ThrowsAsync(new TimeoutException("Translation service timeout"));

    // Act & Assert
    await Assert.ThrowsAsync<InvoiceFoundationServiceException>(() =>
        service.AnalyzeInvoiceAsync(options, invoice));
  }

  /// <summary>
  /// Validates TimeoutException from GPT broker is wrapped correctly.
  /// </summary>
  [Fact]
  public async Task AnalyzeInvoiceAsync_GptBrokerTimesOut_ThrowsFoundationServiceException()
  {
    // Arrange
    var options = AnalysisOptions.CompleteAnalysis;
    var invoice = InvoiceBuilder.CreateRandomInvoice();

    mockFormRecognizerBroker
        .Setup(b => b.PerformOcrAnalysisOnSingleInvoice(invoice, options))
        .ReturnsAsync(invoice);

    mockTranslatorBroker
        .Setup(b => b.Translate(It.IsAny<string>(), It.IsAny<string>()))
        .ReturnsAsync("Translated");

    mockOpenAiBroker
        .Setup(b => b.PerformGptAnalysisOnSingleInvoice(invoice, options))
        .ThrowsAsync(new TimeoutException("GPT service timeout"));

    // Act & Assert
    await Assert.ThrowsAsync<InvoiceFoundationServiceException>(() =>
        service.AnalyzeInvoiceAsync(options, invoice));
  }

  /// <summary>
  /// Validates HttpRequestException from OCR broker is wrapped correctly.
  /// </summary>
  [Fact]
  public async Task AnalyzeInvoiceAsync_OcrNetworkError_ThrowsFoundationServiceException()
  {
    // Arrange
    var options = AnalysisOptions.CompleteAnalysis;
    var invoice = InvoiceBuilder.CreateRandomInvoice();

    mockFormRecognizerBroker
        .Setup(b => b.PerformOcrAnalysisOnSingleInvoice(invoice, options))
        .ThrowsAsync(new System.Net.Http.HttpRequestException("Network error"));

    // Act & Assert
    await Assert.ThrowsAsync<InvoiceFoundationServiceException>(() =>
        service.AnalyzeInvoiceAsync(options, invoice));
  }

  /// <summary>
  /// Validates HttpRequestException from translator broker is wrapped correctly.
  /// </summary>
  [Fact]
  public async Task AnalyzeInvoiceAsync_TranslatorNetworkError_ThrowsFoundationServiceException()
  {
    // Arrange
    var options = AnalysisOptions.CompleteAnalysis;
    var invoice = InvoiceBuilder.CreateRandomInvoice();

    mockFormRecognizerBroker
        .Setup(b => b.PerformOcrAnalysisOnSingleInvoice(invoice, options))
        .ReturnsAsync(invoice);

    mockTranslatorBroker
        .Setup(b => b.Translate(It.IsAny<string>(), It.IsAny<string>()))
        .ThrowsAsync(new System.Net.Http.HttpRequestException("Network error"));

    // Act & Assert
    await Assert.ThrowsAsync<InvoiceFoundationServiceException>(() =>
        service.AnalyzeInvoiceAsync(options, invoice));
  }

  /// <summary>
  /// Validates NotSupportedException is wrapped correctly.
  /// </summary>
  [Fact]
  public async Task AnalyzeInvoiceAsync_NotSupportedException_ThrowsFoundationServiceException()
  {
    // Arrange
    var options = AnalysisOptions.CompleteAnalysis;
    var invoice = InvoiceBuilder.CreateRandomInvoice();

    mockFormRecognizerBroker
        .Setup(b => b.PerformOcrAnalysisOnSingleInvoice(invoice, options))
        .ThrowsAsync(new NotSupportedException("Not supported"));

    // Act & Assert
    await Assert.ThrowsAsync<InvoiceFoundationServiceException>(() =>
        service.AnalyzeInvoiceAsync(options, invoice));
  }

  /// <summary>
  /// Validates InvalidOperationException is wrapped correctly.
  /// </summary>
  [Fact]
  public async Task AnalyzeInvoiceAsync_InvalidOperationException_ThrowsFoundationServiceException()
  {
    // Arrange
    var options = AnalysisOptions.CompleteAnalysis;
    var invoice = InvoiceBuilder.CreateRandomInvoice();

    mockFormRecognizerBroker
        .Setup(b => b.PerformOcrAnalysisOnSingleInvoice(invoice, options))
        .ThrowsAsync(new InvalidOperationException("Invalid operation"));

    // Act & Assert
    var exception = await Assert.ThrowsAsync<InvoiceFoundationServiceException>(() =>
        service.AnalyzeInvoiceAsync(options, invoice));
    Assert.IsType<InvalidOperationException>(exception.InnerException);
  }

  /// <summary>
  /// Validates FormatException during translation is wrapped correctly.
  /// </summary>
  [Fact]
  public async Task AnalyzeInvoiceAsync_TranslatorFormatException_ThrowsFoundationServiceException()
  {
    // Arrange
    var options = AnalysisOptions.CompleteAnalysis;
    var invoice = InvoiceBuilder.CreateRandomInvoice();

    mockFormRecognizerBroker
        .Setup(b => b.PerformOcrAnalysisOnSingleInvoice(invoice, options))
        .ReturnsAsync(invoice);

    mockTranslatorBroker
        .Setup(b => b.Translate(It.IsAny<string>(), It.IsAny<string>()))
        .ThrowsAsync(new FormatException("Invalid format"));

    // Act & Assert
    await Assert.ThrowsAsync<InvoiceFoundationServiceException>(() =>
        service.AnalyzeInvoiceAsync(options, invoice));
  }

  #endregion

  #region Workflow Ordering Tests

  /// <summary>
  /// Validates OCR is called before translation.
  /// </summary>
  [Fact]
  public async Task AnalyzeInvoiceAsync_ValidInput_OcrCalledBeforeTranslation()
  {
    // Arrange
    var options = AnalysisOptions.CompleteAnalysis;
    var invoice = InvoiceBuilder.CreateRandomInvoice();
    var callOrder = new List<string>();

    mockFormRecognizerBroker
        .Setup(b => b.PerformOcrAnalysisOnSingleInvoice(invoice, options))
        .Callback(() => callOrder.Add("OCR"))
        .ReturnsAsync(invoice);

    mockTranslatorBroker
        .Setup(b => b.Translate(It.IsAny<string>(), It.IsAny<string>()))
        .Callback(() => callOrder.Add("Translate"))
        .ReturnsAsync("Translated");

    mockOpenAiBroker
        .Setup(b => b.PerformGptAnalysisOnSingleInvoice(invoice, options))
        .Callback(() => callOrder.Add("GPT"))
        .ReturnsAsync(invoice);

    // Act
    await service.AnalyzeInvoiceAsync(options, invoice);

    // Assert
    Assert.True(callOrder.IndexOf("OCR") < callOrder.IndexOf("GPT"));
  }

  /// <summary>
  /// Validates GPT is called after translation.
  /// </summary>
  [Fact]
  public async Task AnalyzeInvoiceAsync_ValidInput_GptCalledAfterTranslation()
  {
    // Arrange
    var options = AnalysisOptions.CompleteAnalysis;
    var invoice = InvoiceBuilder.CreateRandomInvoice();
    var callOrder = new List<string>();

    mockFormRecognizerBroker
        .Setup(b => b.PerformOcrAnalysisOnSingleInvoice(invoice, options))
        .Callback(() => callOrder.Add("OCR"))
        .ReturnsAsync(invoice);

    mockTranslatorBroker
        .Setup(b => b.Translate(It.IsAny<string>(), It.IsAny<string>()))
        .Callback(() => callOrder.Add("Translate"))
        .ReturnsAsync("Translated");

    mockOpenAiBroker
        .Setup(b => b.PerformGptAnalysisOnSingleInvoice(invoice, options))
        .Callback(() => callOrder.Add("GPT"))
        .ReturnsAsync(invoice);

    // Act
    await service.AnalyzeInvoiceAsync(options, invoice);

    // Assert
    Assert.Contains("GPT", callOrder);
  }

  #endregion

  #region Translation Loop Tests

  /// <summary>
  /// Validates translation is called for each product.
  /// </summary>
  [Theory]
  [InlineData(1)]
  [InlineData(5)]
  [InlineData(10)]
  [InlineData(50)]
  public async Task AnalyzeInvoiceAsync_MultipleProducts_TranslatesEachProduct(int productCount)
  {
    // Arrange
    var options = AnalysisOptions.CompleteAnalysis;
    var invoice = InvoiceBuilder.CreateInvoiceWithSpecificProperties();
    invoice.Items.Clear();
    for (int i = 0; i < productCount; i++)
    {
      invoice.Items.Add(new Product { RawName = $"Product {i}" });
    }

    mockFormRecognizerBroker
        .Setup(b => b.PerformOcrAnalysisOnSingleInvoice(invoice, options))
        .ReturnsAsync(invoice);

    mockTranslatorBroker
        .Setup(b => b.Translate(It.IsAny<string>(), It.IsAny<string>()))
        .ReturnsAsync("Translated");

    mockOpenAiBroker
        .Setup(b => b.PerformGptAnalysisOnSingleInvoice(invoice, options))
        .ReturnsAsync(invoice);

    // Act
    await service.AnalyzeInvoiceAsync(options, invoice);

    // Assert
    mockTranslatorBroker.Verify(b => b.Translate(It.IsAny<string>(), It.IsAny<string>()), Times.Exactly(productCount));
  }

  /// <summary>
  /// Validates each product gets translated name set.
  /// </summary>
  [Fact]
  public async Task AnalyzeInvoiceAsync_MultipleProducts_SetsGenericNameOnEachProduct()
  {
    // Arrange
    var options = AnalysisOptions.CompleteAnalysis;
    var invoice = InvoiceBuilder.CreateInvoiceWithSpecificProperties();
    invoice.Items.Clear();
    invoice.Items.Add(new Product { RawName = "Product A" });
    invoice.Items.Add(new Product { RawName = "Product B" });
    invoice.Items.Add(new Product { RawName = "Product C" });

    mockFormRecognizerBroker
        .Setup(b => b.PerformOcrAnalysisOnSingleInvoice(invoice, options))
        .ReturnsAsync(invoice);

    mockTranslatorBroker
        .Setup(b => b.Translate(It.IsAny<string>(), It.IsAny<string>()))
        .ReturnsAsync("Translated Product");

    mockOpenAiBroker
        .Setup(b => b.PerformGptAnalysisOnSingleInvoice(invoice, options))
        .ReturnsAsync(invoice);

    // Act
    var result = await service.AnalyzeInvoiceAsync(options, invoice);

    // Assert
    Assert.All(result.Items, item => Assert.Equal("Translated Product", item.GenericName));
  }

  /// <summary>
  /// Validates translation failure partway through products still throws.
  /// </summary>
  [Fact]
  public async Task AnalyzeInvoiceAsync_TranslationFailsOnSecondProduct_ThrowsFoundationServiceException()
  {
    // Arrange
    var options = AnalysisOptions.CompleteAnalysis;
    var invoice = InvoiceBuilder.CreateInvoiceWithSpecificProperties();
    invoice.Items.Clear();
    invoice.Items.Add(new Product { RawName = "Product A" });
    invoice.Items.Add(new Product { RawName = "Product B" });
    var callCount = 0;

    mockFormRecognizerBroker
        .Setup(b => b.PerformOcrAnalysisOnSingleInvoice(invoice, options))
        .ReturnsAsync(invoice);

    mockTranslatorBroker
        .Setup(b => b.Translate(It.IsAny<string>(), It.IsAny<string>()))
        .ReturnsAsync(() =>
        {
          callCount++;
          if (callCount == 2)
            throw new InvalidOperationException("Translation failed on second product");
          return "Translated";
        });

    // Act & Assert
    await Assert.ThrowsAsync<InvoiceFoundationServiceException>(() =>
        service.AnalyzeInvoiceAsync(options, invoice));
  }

  #endregion

  #region Analysis Options Tests

  /// <summary>
  /// Validates all analysis options are passed to OCR broker correctly.
  /// </summary>
  [Theory]
  [InlineData(AnalysisOptions.NoAnalysis)]
  [InlineData(AnalysisOptions.InvoiceOnly)]
  [InlineData(AnalysisOptions.InvoiceItemsOnly)]
  [InlineData(AnalysisOptions.InvoiceMerchantOnly)]
  [InlineData(AnalysisOptions.CompleteAnalysis)]
  public async Task AnalyzeInvoiceAsync_DifferentOptions_PassesCorrectOptionsToOcr(AnalysisOptions options)
  {
    // Arrange
    var invoice = InvoiceBuilder.CreateRandomInvoice();

    mockFormRecognizerBroker
        .Setup(b => b.PerformOcrAnalysisOnSingleInvoice(invoice, options))
        .ReturnsAsync(invoice);

    mockTranslatorBroker
        .Setup(b => b.Translate(It.IsAny<string>(), It.IsAny<string>()))
        .ReturnsAsync("Translated");

    mockOpenAiBroker
        .Setup(b => b.PerformGptAnalysisOnSingleInvoice(invoice, options))
        .ReturnsAsync(invoice);

    // Act
    await service.AnalyzeInvoiceAsync(options, invoice);

    // Assert
    mockFormRecognizerBroker.Verify(b => b.PerformOcrAnalysisOnSingleInvoice(invoice, options), Times.Once);
  }

  /// <summary>
  /// Validates all analysis options are passed to GPT broker correctly.
  /// </summary>
  [Theory]
  [InlineData(AnalysisOptions.NoAnalysis)]
  [InlineData(AnalysisOptions.InvoiceOnly)]
  [InlineData(AnalysisOptions.InvoiceItemsOnly)]
  [InlineData(AnalysisOptions.InvoiceMerchantOnly)]
  [InlineData(AnalysisOptions.CompleteAnalysis)]
  public async Task AnalyzeInvoiceAsync_DifferentOptions_PassesCorrectOptionsToGpt(AnalysisOptions options)
  {
    // Arrange
    var invoice = InvoiceBuilder.CreateRandomInvoice();

    mockFormRecognizerBroker
        .Setup(b => b.PerformOcrAnalysisOnSingleInvoice(invoice, options))
        .ReturnsAsync(invoice);

    mockTranslatorBroker
        .Setup(b => b.Translate(It.IsAny<string>(), It.IsAny<string>()))
        .ReturnsAsync("Translated");

    mockOpenAiBroker
        .Setup(b => b.PerformGptAnalysisOnSingleInvoice(invoice, options))
        .ReturnsAsync(invoice);

    // Act
    await service.AnalyzeInvoiceAsync(options, invoice);

    // Assert
    mockOpenAiBroker.Verify(b => b.PerformGptAnalysisOnSingleInvoice(invoice, options), Times.Once);
  }

  #endregion

  #region Invoice Mutation Tests

  /// <summary>
  /// Validates invoice returned by OCR broker is passed to translation.
  /// </summary>
  [Fact]
  public async Task AnalyzeInvoiceAsync_OcrReturnsModifiedInvoice_PassesToTranslation()
  {
    // Arrange
    var options = AnalysisOptions.CompleteAnalysis;
    var originalInvoice = InvoiceBuilder.CreateInvoiceWithSpecificProperties();
    originalInvoice.Items.Clear();
    var modifiedInvoice = InvoiceBuilder.CreateInvoiceWithSpecificProperties();
    modifiedInvoice.Items.Clear();
    modifiedInvoice.Items.Add(new Product { RawName = "OCR Detected Product" });

    mockFormRecognizerBroker
        .Setup(b => b.PerformOcrAnalysisOnSingleInvoice(originalInvoice, options))
        .ReturnsAsync(modifiedInvoice);

    mockTranslatorBroker
        .Setup(b => b.Translate("OCR Detected Product", It.IsAny<string>()))
        .ReturnsAsync("Translated OCR Product");

    mockOpenAiBroker
        .Setup(b => b.PerformGptAnalysisOnSingleInvoice(modifiedInvoice, options))
        .ReturnsAsync(modifiedInvoice);

    // Act
    var result = await service.AnalyzeInvoiceAsync(options, originalInvoice);

    // Assert
    mockTranslatorBroker.Verify(b => b.Translate("OCR Detected Product", It.IsAny<string>()), Times.Once);
  }

  /// <summary>
  /// Validates NumberOfUpdates starts at initial value before increment.
  /// </summary>
  [Fact]
  public async Task AnalyzeInvoiceAsync_InvoiceWithExistingUpdates_IncrementsFromExistingValue()
  {
    // Arrange
    var options = AnalysisOptions.CompleteAnalysis;
    var invoice = InvoiceBuilder.CreateRandomInvoice();
    invoice.NumberOfUpdates = 5;

    mockFormRecognizerBroker
        .Setup(b => b.PerformOcrAnalysisOnSingleInvoice(invoice, options))
        .ReturnsAsync(invoice);

    mockTranslatorBroker
        .Setup(b => b.Translate(It.IsAny<string>(), It.IsAny<string>()))
        .ReturnsAsync("Translated");

    mockOpenAiBroker
        .Setup(b => b.PerformGptAnalysisOnSingleInvoice(invoice, options))
        .ReturnsAsync(invoice);

    // Act
    var result = await service.AnalyzeInvoiceAsync(options, invoice);

    // Assert
    Assert.Equal(6, result.NumberOfUpdates);
  }

  #endregion

  #region Concurrent Operations Tests

  /// <summary>
  /// Validates concurrent analysis calls complete successfully.
  /// </summary>
  [Fact]
  public async Task AnalyzeInvoiceAsync_ConcurrentCalls_AllComplete()
  {
    // Arrange
    var options = AnalysisOptions.CompleteAnalysis;
    var invoices = InvoiceBuilder.CreateMultipleRandomInvoices(10);

    mockFormRecognizerBroker
        .Setup(b => b.PerformOcrAnalysisOnSingleInvoice(It.IsAny<Invoice>(), options))
        .ReturnsAsync((Invoice inv, AnalysisOptions opt) => inv);

    mockTranslatorBroker
        .Setup(b => b.Translate(It.IsAny<string>(), It.IsAny<string>()))
        .ReturnsAsync("Translated");

    mockOpenAiBroker
        .Setup(b => b.PerformGptAnalysisOnSingleInvoice(It.IsAny<Invoice>(), options))
        .ReturnsAsync((Invoice inv, AnalysisOptions opt) => inv);

    // Act
    var tasks = invoices.Select(inv => service.AnalyzeInvoiceAsync(options, inv));
    var results = await Task.WhenAll(tasks);

    // Assert
    Assert.Equal(10, results.Length);
    Assert.All(results, r => Assert.NotNull(r));
  }

  /// <summary>
  /// Validates concurrent analysis with failures handles correctly.
  /// </summary>
  [Fact]
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

    mockTranslatorBroker
        .Setup(b => b.Translate(It.IsAny<string>(), It.IsAny<string>()))
        .ReturnsAsync("Translated");

    mockOpenAiBroker
        .Setup(b => b.PerformGptAnalysisOnSingleInvoice(invoice1, options))
        .ReturnsAsync(invoice1);

    // Act
    var task1 = service.AnalyzeInvoiceAsync(options, invoice1);
    var task2 = service.AnalyzeInvoiceAsync(options, invoice2);

    // Assert
    var result1 = await task1;
    Assert.NotNull(result1);
    await Assert.ThrowsAsync<InvoiceFoundationServiceException>(() => task2);
  }

  #endregion

  #region Edge Case Tests

  /// <summary>
  /// Validates analysis with single character product name.
  /// </summary>
  [Fact]
  public async Task AnalyzeInvoiceAsync_SingleCharacterProductName_TranslatesSuccessfully()
  {
    // Arrange
    var options = AnalysisOptions.CompleteAnalysis;
    var invoice = InvoiceBuilder.CreateInvoiceWithSpecificProperties();
    invoice.Items.Clear();
    invoice.Items.Add(new Product { RawName = "A" });

    mockFormRecognizerBroker
        .Setup(b => b.PerformOcrAnalysisOnSingleInvoice(invoice, options))
        .ReturnsAsync(invoice);

    mockTranslatorBroker
        .Setup(b => b.Translate("A", It.IsAny<string>()))
        .ReturnsAsync("Translated A");

    mockOpenAiBroker
        .Setup(b => b.PerformGptAnalysisOnSingleInvoice(invoice, options))
        .ReturnsAsync(invoice);

    // Act
    var result = await service.AnalyzeInvoiceAsync(options, invoice);

    // Assert
    Assert.Equal("Translated A", result.Items.First().GenericName);
  }

  /// <summary>
  /// Validates analysis with very long product name.
  /// </summary>
  [Fact]
  public async Task AnalyzeInvoiceAsync_VeryLongProductName_TranslatesSuccessfully()
  {
    // Arrange
    var options = AnalysisOptions.CompleteAnalysis;
    var invoice = InvoiceBuilder.CreateInvoiceWithSpecificProperties();
    var longName = new string('X', 1000);
    invoice.Items.Clear();
    invoice.Items.Add(new Product { RawName = longName });

    mockFormRecognizerBroker
        .Setup(b => b.PerformOcrAnalysisOnSingleInvoice(invoice, options))
        .ReturnsAsync(invoice);

    mockTranslatorBroker
        .Setup(b => b.Translate(longName, It.IsAny<string>()))
        .ReturnsAsync("Translated Long Name");

    mockOpenAiBroker
        .Setup(b => b.PerformGptAnalysisOnSingleInvoice(invoice, options))
        .ReturnsAsync(invoice);

    // Act
    var result = await service.AnalyzeInvoiceAsync(options, invoice);

    // Assert
    Assert.Equal("Translated Long Name", result.Items.First().GenericName);
  }

  /// <summary>
  /// Validates analysis with unicode product name.
  /// </summary>
  [Fact]
  public async Task AnalyzeInvoiceAsync_UnicodeProductName_TranslatesSuccessfully()
  {
    // Arrange
    var options = AnalysisOptions.CompleteAnalysis;
    var invoice = InvoiceBuilder.CreateInvoiceWithSpecificProperties();
    var unicodeName = "日本語製品名 中文产品 عربي";
    invoice.Items.Clear();
    invoice.Items.Add(new Product { RawName = unicodeName });

    mockFormRecognizerBroker
        .Setup(b => b.PerformOcrAnalysisOnSingleInvoice(invoice, options))
        .ReturnsAsync(invoice);

    mockTranslatorBroker
        .Setup(b => b.Translate(unicodeName, It.IsAny<string>()))
        .ReturnsAsync("Translated Unicode");

    mockOpenAiBroker
        .Setup(b => b.PerformGptAnalysisOnSingleInvoice(invoice, options))
        .ReturnsAsync(invoice);

    // Act
    var result = await service.AnalyzeInvoiceAsync(options, invoice);

    // Assert
    Assert.Equal("Translated Unicode", result.Items.First().GenericName);
  }

  /// <summary>
  /// Validates analysis with special characters in product name.
  /// </summary>
  [Fact]
  public async Task AnalyzeInvoiceAsync_SpecialCharactersInProductName_TranslatesSuccessfully()
  {
    // Arrange
    var options = AnalysisOptions.CompleteAnalysis;
    var invoice = InvoiceBuilder.CreateInvoiceWithSpecificProperties();
    var specialName = "Product™ © ® € £ ¥ ½ ¼ ¾";
    invoice.Items.Clear();
    invoice.Items.Add(new Product { RawName = specialName });

    mockFormRecognizerBroker
        .Setup(b => b.PerformOcrAnalysisOnSingleInvoice(invoice, options))
        .ReturnsAsync(invoice);

    mockTranslatorBroker
        .Setup(b => b.Translate(specialName, It.IsAny<string>()))
        .ReturnsAsync("Translated Special");

    mockOpenAiBroker
        .Setup(b => b.PerformGptAnalysisOnSingleInvoice(invoice, options))
        .ReturnsAsync(invoice);

    // Act
    var result = await service.AnalyzeInvoiceAsync(options, invoice);

    // Assert
    Assert.Equal("Translated Special", result.Items.First().GenericName);
  }

  /// <summary>
  /// Validates analysis with whitespace-only product name.
  /// </summary>
  [Fact]
  public async Task AnalyzeInvoiceAsync_WhitespaceProductName_TranslatesSuccessfully()
  {
    // Arrange
    var options = AnalysisOptions.CompleteAnalysis;
    var invoice = InvoiceBuilder.CreateInvoiceWithSpecificProperties();
    invoice.Items.Clear();
    invoice.Items.Add(new Product { RawName = "   " });

    mockFormRecognizerBroker
        .Setup(b => b.PerformOcrAnalysisOnSingleInvoice(invoice, options))
        .ReturnsAsync(invoice);

    mockTranslatorBroker
        .Setup(b => b.Translate("   ", It.IsAny<string>()))
        .ReturnsAsync("");

    mockOpenAiBroker
        .Setup(b => b.PerformGptAnalysisOnSingleInvoice(invoice, options))
        .ReturnsAsync(invoice);

    // Act
    var result = await service.AnalyzeInvoiceAsync(options, invoice);

    // Assert
    Assert.Equal("", result.Items.First().GenericName);
  }

  #endregion
}
