namespace arolariu.Backend.Domain.Tests.Invoices.Helpers;

using System;

using arolariu.Backend.Common.Options;
using arolariu.Backend.Domain.Invoices.Brokers.DocumentIntelligenceBroker;
using arolariu.Backend.Domain.Invoices.Brokers.GenerativeAnalysisBroker;
using arolariu.Backend.Domain.Invoices.DDD.AggregatorRoots.Invoices;
using arolariu.Backend.Domain.Invoices.Services.Foundation.Analysis;

using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Logging.Abstractions;

using Moq;

/// <summary>
/// Provides deterministic invoice scan fixtures for document-analysis tests.
/// </summary>
internal static class InvoiceScanTestData
{
  /// <summary>Creates the unified Analysis Foundation for document-focused tests.</summary>
  internal static AnalysisFoundationService CreateAnalysisService(
    IDocumentIntelligenceBroker documentIntelligenceBroker,
    ILoggerFactory? loggerFactory = null) =>
    new(
      documentIntelligenceBroker,
      Mock.Of<IGenerativeAnalysisBroker>(),
      TaxonomyBrokerTestFactory.Create(),
      loggerFactory ?? NullLoggerFactory.Instance);

  /// <summary>Creates the unified Analysis Foundation for generative-focused tests.</summary>
  internal static AnalysisFoundationService CreateAnalysisService(
    IGenerativeAnalysisBroker generativeAnalysisBroker,
    ILoggerFactory? loggerFactory = null) =>
    new(
      Mock.Of<IDocumentIntelligenceBroker>(),
      generativeAnalysisBroker,
      TaxonomyBrokerTestFactory.Create(),
      loggerFactory ?? NullLoggerFactory.Instance);

  /// <summary>
  /// Creates storage options that approve the deterministic scan fixtures in this test assembly.
  /// </summary>
  /// <returns>A fixed options manager for document-analysis tests.</returns>
  internal static IOptionsManager CreateOptionsManager() =>
    new InvoiceScanTestOptionsManager(
      new LocalOptions
      {
        StorageAccountName = "unit-tests",
        StorageAccountEndpoint = "https://unit-tests.arolariu.ro",
      });

  /// <summary>
  /// Creates the first deterministic invoice scan fixture.
  /// </summary>
  /// <returns>The first invoice scan.</returns>
  public static InvoiceScan First() =>
    new(
      ScanType.JPG,
      new Uri("https://unit-tests.arolariu.ro/invoices/scans/receipt-1.jpg"),
      null);

  /// <summary>
  /// Creates the second deterministic invoice scan fixture.
  /// </summary>
  /// <returns>The second invoice scan.</returns>
  public static InvoiceScan Second() =>
    new(
      ScanType.JPG,
      new Uri("https://unit-tests.arolariu.ro/invoices/scans/receipt-2.jpg"),
      null);
}

/// <summary>
/// Provides fixed application options to document-analysis unit tests.
/// </summary>
internal sealed class InvoiceScanTestOptionsManager(ApplicationOptions options) : IOptionsManager
{
  /// <inheritdoc/>
  public ApplicationOptions GetApplicationOptions() => options;
}
