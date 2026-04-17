namespace arolariu.Backend.Domain.Tests.Invoices.Services.Foundation;

using System;
using System.Threading.Tasks;

using arolariu.Backend.Domain.Invoices.Brokers.AnalysisBrokers.ClassifierBroker;
using arolariu.Backend.Domain.Invoices.Brokers.AnalysisBrokers.IdentifierBroker;
using arolariu.Backend.Domain.Invoices.DDD.AggregatorRoots.Invoices;
using arolariu.Backend.Domain.Invoices.DDD.AggregatorRoots.Invoices.Exceptions.Inner;
using arolariu.Backend.Domain.Invoices.DDD.AggregatorRoots.Invoices.Exceptions.Outer.Foundation;
using arolariu.Backend.Domain.Invoices.DTOs;
using arolariu.Backend.Domain.Invoices.Services.Foundation.InvoiceAnalysis;

using Microsoft.Extensions.Logging.Abstractions;

using Moq;

using Xunit;

/// <summary>
/// Verifies that inner exceptions propagated from the analysis brokers (OCR + GPT) are
/// classified into the correct Foundation-tier outer exceptions by the TryCatch boundary.
/// Mirrors the tiering contract validated in <see cref="InvoiceStorageFoundationServiceExceptionsTests"/>.
/// </summary>
public class InvoiceAnalysisFoundationServiceExceptionsTests
{
  private readonly Mock<IClassifierBroker> _classifierBroker = new();
  private readonly Mock<IFormRecognizerBroker> _formRecognizerBroker = new();
  private readonly InvoiceAnalysisFoundationService _sut;

  /// <summary>Initializes a new instance of the <see cref="InvoiceAnalysisFoundationServiceExceptionsTests"/> class.</summary>
  public InvoiceAnalysisFoundationServiceExceptionsTests()
  {
    _sut = new InvoiceAnalysisFoundationService(
      _classifierBroker.Object,
      _formRecognizerBroker.Object,
      NullLoggerFactory.Instance);
  }

  /// <summary>Verifies that an <see cref="InvoiceIdNotSetException"/> from the OCR broker is wrapped into an <see cref="InvoiceFoundationValidationException"/>.</summary>
  [Fact]
  public async Task AnalyzeInvoiceAsync_WhenBrokerThrowsIdNotSet_ThrowsFoundationValidationException()
  {
    _formRecognizerBroker
      .Setup(b => b.PerformOcrAnalysisOnSingleInvoice(It.IsAny<Invoice>(), It.IsAny<AnalysisOptions>()))
      .ThrowsAsync(new InvoiceIdNotSetException());

    var ex = await Assert.ThrowsAsync<InvoiceFoundationValidationException>(
      () => _sut.AnalyzeInvoiceAsync(AnalysisOptions.CompleteAnalysis, new Invoice { id = Guid.NewGuid(), UserIdentifier = Guid.NewGuid() }));

    Assert.IsType<InvoiceIdNotSetException>(ex.InnerException);
  }

  /// <summary>Verifies that an <see cref="InvoiceCosmosDbRateLimitException"/> from the OCR broker is wrapped into an <see cref="InvoiceFoundationDependencyValidationException"/> (caller-correctable 429, not 500).</summary>
  [Fact]
  public async Task AnalyzeInvoiceAsync_WhenBrokerThrowsCosmosRateLimit_ThrowsFoundationDependencyValidationException()
  {
    _formRecognizerBroker
      .Setup(b => b.PerformOcrAnalysisOnSingleInvoice(It.IsAny<Invoice>(), It.IsAny<AnalysisOptions>()))
      .ThrowsAsync(new InvoiceCosmosDbRateLimitException(TimeSpan.FromSeconds(5), new InvalidOperationException()));

    var ex = await Assert.ThrowsAsync<InvoiceFoundationDependencyValidationException>(
      () => _sut.AnalyzeInvoiceAsync(AnalysisOptions.CompleteAnalysis, new Invoice { id = Guid.NewGuid(), UserIdentifier = Guid.NewGuid() }));

    Assert.IsType<InvoiceCosmosDbRateLimitException>(ex.InnerException);
  }

  /// <summary>Verifies that an <see cref="OperationCanceledException"/> from the OCR broker is wrapped into an <see cref="InvoiceFoundationDependencyException"/> (transient downstream cancellation, not a generic 500).</summary>
  [Fact]
  public async Task AnalyzeInvoiceAsync_WhenBrokerThrowsOperationCanceled_ThrowsFoundationDependencyException()
  {
    _formRecognizerBroker
      .Setup(b => b.PerformOcrAnalysisOnSingleInvoice(It.IsAny<Invoice>(), It.IsAny<AnalysisOptions>()))
      .ThrowsAsync(new OperationCanceledException());

    await Assert.ThrowsAsync<InvoiceFoundationDependencyException>(
      () => _sut.AnalyzeInvoiceAsync(AnalysisOptions.CompleteAnalysis, new Invoice { id = Guid.NewGuid(), UserIdentifier = Guid.NewGuid() }));
  }

  /// <summary>Verifies that an unclassified exception from the OCR broker is wrapped into an <see cref="InvoiceFoundationServiceException"/> (catch-all tier, 500).</summary>
  [Fact]
  public async Task AnalyzeInvoiceAsync_WhenBrokerThrowsUnknown_ThrowsFoundationServiceException()
  {
    _formRecognizerBroker
      .Setup(b => b.PerformOcrAnalysisOnSingleInvoice(It.IsAny<Invoice>(), It.IsAny<AnalysisOptions>()))
      .ThrowsAsync(new InvalidOperationException("ai model failure"));

    var ex = await Assert.ThrowsAsync<InvoiceFoundationServiceException>(
      () => _sut.AnalyzeInvoiceAsync(AnalysisOptions.CompleteAnalysis, new Invoice { id = Guid.NewGuid(), UserIdentifier = Guid.NewGuid() }));

    Assert.IsType<InvalidOperationException>(ex.InnerException);
  }
}
