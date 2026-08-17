namespace arolariu.Backend.Domain.Tests.Invoices.Services.Foundation;

using System;
using System.Collections.Generic;
using System.Net.Http;
using System.Threading;
using System.Threading.Tasks;

using arolariu.Backend.Domain.Invoices.DDD.Analysis.Contracts;
using arolariu.Backend.Domain.Invoices.DDD.Analysis.Exceptions.Inner;
using arolariu.Backend.Domain.Invoices.DDD.Analysis.Exceptions.Outer.Foundation;
using arolariu.Backend.Domain.Invoices.DDD.ValueObjects.Classifications;
using arolariu.Backend.Domain.Invoices.DDD.ValueObjects.Products;
using arolariu.Backend.Domain.Invoices.Services.Foundation.GenerativeAnalysis;
using arolariu.Backend.Domain.Tests.Invoices.Helpers;

using Azure;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Logging.Abstractions;
using Microsoft.VisualStudio.TestTools.UnitTesting;

/// <summary>
/// Verifies exception classification branches in the generative analysis foundation service.
/// </summary>
[TestClass]
public sealed class GenerativeAnalysisExceptionClassificationTests
{
  /// <summary>
  /// Verifies caller validation exceptions from the broker are wrapped as foundation validation exceptions.
  /// </summary>
  [TestMethod]
  public async Task GenerateInvoiceSummaryAsync_ArgumentException_ThrowsValidationException()
  {
    Exception exception = await Assert.ThrowsExactlyAsync<AnalysisFoundationValidationException>(
      () => ExecuteSummaryFailureAsync(new ArgumentException("Invalid caller input.")));

    Assert.IsInstanceOfType<ArgumentException>(exception.InnerException);
  }

  /// <summary>
  /// Verifies taxonomy lookup failures are wrapped as dependency validation exceptions.
  /// </summary>
  [TestMethod]
  public async Task GenerateInvoiceSummaryAsync_TaxonomyCodeNotFoundException_ThrowsDependencyValidationException()
  {
    Exception exception = await Assert.ThrowsExactlyAsync<AnalysisFoundationDependencyValidationException>(
      () => ExecuteSummaryFailureAsync(new TaxonomyCodeNotFoundException(ClassificationSystem.Gs1Gpc, "00000000")));

    Assert.IsInstanceOfType<TaxonomyCodeNotFoundException>(exception.InnerException);
  }

  /// <summary>
  /// Verifies non-retryable HTTP 4xx statuses other than 408 and 429 are wrapped as dependency validation exceptions.
  /// </summary>
  [TestMethod]
  [DataRow(400)]
  [DataRow(404)]
  [DataRow(499)]
  public async Task GenerateInvoiceSummaryAsync_DependencyValidationStatus_ThrowsDependencyValidationException(int statusCode)
  {
    var exception = await Assert.ThrowsExactlyAsync<AnalysisFoundationDependencyValidationException>(
      () => ExecuteSummaryFailureAsync(new RequestFailedException(statusCode, "Dependency validation failure.")));

    Assert.AreEqual(statusCode, ((RequestFailedException)exception.InnerException!).Status);
  }

  /// <summary>
  /// Verifies non-validation request failures are wrapped as dependency exceptions.
  /// </summary>
  [TestMethod]
  [DataRow(399)]
  [DataRow(408)]
  [DataRow(429)]
  [DataRow(503)]
  public async Task GenerateInvoiceSummaryAsync_DependencyFailureStatus_ThrowsDependencyException(int statusCode)
  {
    var exception = await Assert.ThrowsExactlyAsync<AnalysisFoundationDependencyException>(
      () => ExecuteSummaryFailureAsync(new RequestFailedException(statusCode, "Dependency failure.")));

    Assert.AreEqual(statusCode, ((RequestFailedException)exception.InnerException!).Status);
  }

  /// <summary>
  /// Verifies invalid structured output from the broker is marked as a refusal and wrapped as a dependency exception.
  /// </summary>
  [TestMethod]
  public async Task GenerateInvoiceSummaryAsync_InvalidStructuredOutputException_ThrowsDependencyException()
  {
    var exception = await Assert.ThrowsExactlyAsync<AnalysisFoundationDependencyException>(
      () => ExecuteSummaryFailureAsync(new InvalidStructuredOutputException("Provider refused.")));

    Assert.IsInstanceOfType<InvalidStructuredOutputException>(exception.InnerException);
    Assert.IsTrue(GenerativeAnalysisRefusalMarker.IsRefusal(exception.InnerException));
  }

  /// <summary>
  /// Verifies transient HTTP request failures are wrapped as dependency exceptions after retries are exhausted.
  /// </summary>
  [TestMethod]
  public async Task GenerateInvoiceSummaryAsync_HttpRequestException_ThrowsDependencyException()
  {
    Exception exception = await Assert.ThrowsExactlyAsync<AnalysisFoundationDependencyException>(
      () => ExecuteSummaryFailureAsync(new HttpRequestException("Network unavailable.")));

    Assert.IsInstanceOfType<HttpRequestException>(exception.InnerException);
  }

  /// <summary>
  /// Verifies transient timeout failures are wrapped as dependency exceptions after retries are exhausted.
  /// </summary>
  [TestMethod]
  public async Task GenerateInvoiceSummaryAsync_TimeoutException_ThrowsDependencyException()
  {
    Exception exception = await Assert.ThrowsExactlyAsync<AnalysisFoundationDependencyException>(
      () => ExecuteSummaryFailureAsync(new TimeoutException("Provider timed out.")));

    Assert.IsInstanceOfType<TimeoutException>(exception.InnerException);
  }

  /// <summary>
  /// Verifies operation cancellation without a requested cancellation token is converted into a dependency timeout.
  /// </summary>
  [TestMethod]
  public async Task GenerateInvoiceSummaryAsync_UnexpectedOperationCanceledException_ThrowsDependencyException()
  {
    var exception = await Assert.ThrowsExactlyAsync<AnalysisFoundationDependencyException>(
      () => ExecuteSummaryFailureAsync(new TaskCanceledException("Unexpected timeout.")));

    Assert.IsInstanceOfType<TimeoutException>(exception.InnerException);
  }

  /// <summary>
  /// Verifies unknown exceptions are wrapped by the service exception path.
  /// </summary>
  [TestMethod]
  public async Task GenerateInvoiceSummaryAsync_UnknownException_ThrowsServiceException()
  {
    Exception exception = await Assert.ThrowsExactlyAsync<AnalysisFoundationServiceException>(
      () => ExecuteSummaryFailureAsync(new InvalidOperationException("Unexpected failure.")));

    Assert.IsInstanceOfType<InvalidOperationException>(exception.InnerException);
  }

  /// <summary>
  /// Verifies provider prompt and response content embedded in an exception cannot reach logs or activities.
  /// </summary>
  [TestMethod]
  public async Task GenerateInvoiceSummaryAsync_WhenProviderExceptionContainsSensitiveContent_ExcludesItFromTelemetry()
  {
    const string sensitiveSentinel =
      "https://scan.example.test/receipt.jpg?sig=FAKE-SAS|PROMPT=PRIVATE-PROMPT|RESPONSE=PRIVATE-RECEIPT";
    using var capture = new AnalysisTelemetryPrivacyCapture();
    using ILoggerFactory loggerFactory = LoggerFactory.Create(builder => builder.AddProvider(capture));
    using var activities = new InvoiceActivityRecorder();
    var broker = new ScriptedGenerativeAiBroker(
      ScriptedGenerativeAiBroker.Failure(new InvalidOperationException(sensitiveSentinel)));
    var service = new GenerativeAnalysisFoundationService(
      broker,
      TaxonomyBrokerTestFactory.Create(),
      loggerFactory,
      new GenerativeAnalysisRetryPolicy((_, _) => Task.CompletedTask, () => 0));

    await Assert.ThrowsExactlyAsync<AnalysisFoundationServiceException>(
      () => service.GenerateInvoiceSummaryAsync(CreateProducts(), Guid.NewGuid(), CancellationToken.None));

    capture.AssertSurfaceExcludes(activities, sensitiveSentinel);
  }

  private static async Task ExecuteSummaryFailureAsync(Exception exception)
  {
    var scriptedResponses = new List<ScriptedGenerativeAiBroker.ScriptedGenerativeResponse>
    {
      ScriptedGenerativeAiBroker.Failure(exception),
    };

    if (GenerativeAnalysisRetryPolicy.IsTransientDependencyFailure(exception))
    {
      scriptedResponses.Add(ScriptedGenerativeAiBroker.Failure(exception));
      scriptedResponses.Add(ScriptedGenerativeAiBroker.Failure(exception));
    }

    var broker = new ScriptedGenerativeAiBroker(scriptedResponses.ToArray());
    var retryPolicy = new GenerativeAnalysisRetryPolicy((_, _) => Task.CompletedTask, () => 0);
    var service = new GenerativeAnalysisFoundationService(
      broker,
      TaxonomyBrokerTestFactory.Create(),
      NullLoggerFactory.Instance,
      retryPolicy);

    _ = await service.GenerateInvoiceSummaryAsync(CreateProducts(), Guid.NewGuid(), CancellationToken.None);
  }

  private static IReadOnlyList<ProductAnalysisInput> CreateProducts() =>
    [new ProductAnalysisInput("item-0001", new Product { Name = "lapte" })];
}
