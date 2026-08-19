namespace arolariu.Backend.Domain.Tests.Invoices.Services.Foundation;

using System;
using System.Diagnostics;
using System.Net.Http;
using System.Threading;
using System.Threading.Tasks;

using arolariu.Backend.Domain.Invoices.DDD.Analysis.Exceptions.Inner;
using arolariu.Backend.Domain.Invoices.DDD.Analysis.Exceptions.Outer.Foundation;
using arolariu.Backend.Domain.Invoices.Services.Foundation.DocumentAnalysis;
using arolariu.Backend.Domain.Tests.Invoices.Helpers;

using Azure;

using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Logging.Abstractions;
using Microsoft.VisualStudio.TestTools.UnitTesting;

/// <summary>
/// Verifies document-analysis foundation exception classification and wrapping behavior.
/// </summary>
[TestClass]
public sealed class DocumentAnalysisExceptionClassificationTests
{
  /// <summary>
  /// Verifies that local argument failures are wrapped as validation exceptions.
  /// </summary>
  [TestMethod]
  public async Task ExtractInvoiceAsync_WhenBrokerThrowsArgumentException_ThrowsValidationException()
  {
    var rawException = new ArgumentNullException("scanLocation");
    var service = CreateServiceThrowing(rawException);

    var exception = await Assert.ThrowsExactlyAsync<AnalysisFoundationValidationException>(
      () => service.ExtractInvoiceAsync([InvoiceScanTestData.First()], CancellationToken.None));

    Assert.AreSame(rawException, exception.InnerException);
  }

  /// <summary>
  /// Verifies that dependency-side client validation failures are wrapped as dependency-validation exceptions.
  /// </summary>
  [TestMethod]
  public async Task ExtractInvoiceAsync_WhenBrokerThrowsRequestFailedClientError_ThrowsDependencyValidationException()
  {
    var rawException = new RequestFailedException(status: 422, message: "unprocessable receipt");
    var service = CreateServiceThrowing(rawException);

    var exception = await Assert.ThrowsExactlyAsync<AnalysisFoundationDependencyValidationException>(
      () => service.ExtractInvoiceAsync([InvoiceScanTestData.First()], CancellationToken.None));

    Assert.AreSame(rawException, exception.InnerException);
  }

  /// <summary>
  /// Verifies that request timeout status is dependency failure rather than dependency-validation failure.
  /// </summary>
  [TestMethod]
  public async Task ExtractInvoiceAsync_WhenBrokerThrowsRequestTimeout_ThrowsDependencyException()
  {
    var rawException = new RequestFailedException(status: 408, message: "request timeout");
    var service = CreateServiceThrowing(rawException);

    var exception = await Assert.ThrowsExactlyAsync<AnalysisFoundationDependencyException>(
      () => service.ExtractInvoiceAsync([InvoiceScanTestData.First()], CancellationToken.None));

    Assert.AreSame(rawException, exception.InnerException);
  }

  /// <summary>
  /// Verifies that throttling status is dependency failure rather than dependency-validation failure.
  /// </summary>
  [TestMethod]
  public async Task ExtractInvoiceAsync_WhenBrokerThrowsRateLimit_ThrowsDependencyException()
  {
    var rawException = new RequestFailedException(status: 429, message: "rate limited");
    var service = CreateServiceThrowing(rawException);

    var exception = await Assert.ThrowsExactlyAsync<AnalysisFoundationDependencyException>(
      () => service.ExtractInvoiceAsync([InvoiceScanTestData.First()], CancellationToken.None));

    Assert.AreSame(rawException, exception.InnerException);
  }

  /// <summary>
  /// Verifies that server-side request failures are wrapped as dependency exceptions.
  /// </summary>
  [TestMethod]
  public async Task ExtractInvoiceAsync_WhenBrokerThrowsRequestFailedServerError_ThrowsDependencyException()
  {
    var rawException = new RequestFailedException(status: 500, message: "provider failed");
    var service = CreateServiceThrowing(rawException);

    var exception = await Assert.ThrowsExactlyAsync<AnalysisFoundationDependencyException>(
      () => service.ExtractInvoiceAsync([InvoiceScanTestData.First()], CancellationToken.None));

    Assert.AreSame(rawException, exception.InnerException);
  }

  /// <summary>
  /// Verifies that invalid structured provider output is wrapped as a dependency exception.
  /// </summary>
  [TestMethod]
  public async Task ExtractInvoiceAsync_WhenBrokerThrowsInvalidStructuredOutput_ThrowsDependencyException()
  {
    var rawException = new InvalidStructuredOutputException("invalid receipt payload");
    var service = CreateServiceThrowing(rawException);

    var exception = await Assert.ThrowsExactlyAsync<AnalysisFoundationDependencyException>(
      () => service.ExtractInvoiceAsync([InvoiceScanTestData.First()], CancellationToken.None));

    Assert.AreSame(rawException, exception.InnerException);
  }

  /// <summary>
  /// Verifies that network failures are wrapped as dependency exceptions.
  /// </summary>
  [TestMethod]
  public async Task ExtractInvoiceAsync_WhenBrokerThrowsHttpRequestException_ThrowsDependencyException()
  {
    var rawException = new HttpRequestException("network unavailable");
    var service = CreateServiceThrowing(rawException);

    var exception = await Assert.ThrowsExactlyAsync<AnalysisFoundationDependencyException>(
      () => service.ExtractInvoiceAsync([InvoiceScanTestData.First()], CancellationToken.None));

    Assert.AreSame(rawException, exception.InnerException);
  }

  /// <summary>
  /// Verifies that broker timeouts are wrapped as dependency exceptions.
  /// </summary>
  [TestMethod]
  public async Task ExtractInvoiceAsync_WhenBrokerThrowsTimeoutException_ThrowsDependencyException()
  {
    var rawException = new TimeoutException("provider timed out");
    var service = CreateServiceThrowing(rawException);

    var exception = await Assert.ThrowsExactlyAsync<AnalysisFoundationDependencyException>(
      () => service.ExtractInvoiceAsync([InvoiceScanTestData.First()], CancellationToken.None));

    Assert.AreSame(rawException, exception.InnerException);
  }

  /// <summary>
  /// Verifies that unexpected broker failures are wrapped as service exceptions.
  /// </summary>
  [TestMethod]
  public async Task ExtractInvoiceAsync_WhenBrokerThrowsUnexpectedException_ThrowsServiceException()
  {
    var rawException = new InvalidOperationException("unexpected failure");
    var service = CreateServiceThrowing(rawException);

    var exception = await Assert.ThrowsExactlyAsync<AnalysisFoundationServiceException>(
      () => service.ExtractInvoiceAsync([InvoiceScanTestData.First()], CancellationToken.None));

    Assert.AreSame(rawException, exception.InnerException);
  }

  /// <summary>
  /// Verifies provider exception content, including scan, product, merchant, and receipt sentinels, cannot reach logs
  /// or activities.
  /// </summary>
  [TestMethod]
  public async Task ExtractInvoiceAsync_WhenProviderExceptionContainsSensitiveContent_ExcludesItFromTelemetry()
  {
    const string scanSasSentinel =
      "https://scan.example.test/receipt.jpg?sv=2026-08-06&sig=FAKE-SAS";
    const string productNameSentinel = "PRIVATE-PRODUCT-SENTINEL";
    const string merchantNameSentinel = "PRIVATE-MERCHANT-SENTINEL";
    string sensitiveSentinel =
      $"{scanSasSentinel}&receipt=PRIVATE-RECEIPT-TEXT&product={productNameSentinel}&merchant={merchantNameSentinel}";
    using var capture = new AnalysisTelemetryPrivacyCapture();
    using ILoggerFactory loggerFactory = LoggerFactory.Create(builder => builder.AddProvider(capture));
    using var activities = new InvoiceActivityRecorder();
    var service = new DocumentAnalysisFoundationService(
      new ScriptedDocumentIntelligenceBroker(
        ScriptedDocumentIntelligenceBroker.Failure(new HttpRequestException(sensitiveSentinel))),
      loggerFactory);

    await Assert.ThrowsExactlyAsync<AnalysisFoundationDependencyException>(
      () => service.ExtractInvoiceAsync([InvoiceScanTestData.First()], CancellationToken.None));

    capture.AssertSurfaceExcludes(activities, scanSasSentinel);
    capture.AssertSurfaceExcludes(activities, productNameSentinel);
    capture.AssertSurfaceExcludes(activities, merchantNameSentinel);
  }

  /// <summary>
  /// Verifies that non-requested operation cancellation is converted into a timeout dependency exception.
  /// </summary>
  [TestMethod]
  public async Task ExtractInvoiceAsync_WhenBrokerCancelsWithoutRequestedToken_ThrowsDependencyExceptionWithTimeoutInnerException()
  {
    var service = CreateServiceThrowing(new TaskCanceledException("provider canceled"));

    var exception = await Assert.ThrowsExactlyAsync<AnalysisFoundationDependencyException>(
      () => service.ExtractInvoiceAsync([InvoiceScanTestData.First()], CancellationToken.None));

    Assert.IsInstanceOfType<TimeoutException>(exception.InnerException);
  }

  private static DocumentAnalysisFoundationService CreateServiceThrowing(Exception exception) =>
    new(
      new ScriptedDocumentIntelligenceBroker(ScriptedDocumentIntelligenceBroker.Failure(exception)),
      NullLoggerFactory.Instance);
}
