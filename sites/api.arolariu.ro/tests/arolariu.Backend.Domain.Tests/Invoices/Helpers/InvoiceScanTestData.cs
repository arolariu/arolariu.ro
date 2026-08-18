namespace arolariu.Backend.Domain.Tests.Invoices.Helpers;

using System;

using arolariu.Backend.Common.Options;
using arolariu.Backend.Domain.Invoices.DDD.AggregatorRoots.Invoices;

/// <summary>
/// Provides deterministic invoice scan fixtures for document-analysis tests.
/// </summary>
internal static class InvoiceScanTestData
{
  /// <summary>
  /// Creates storage options that approve the deterministic scan fixtures in this test assembly.
  /// </summary>
  /// <returns>A fixed options manager for document-analysis tests.</returns>
  internal static IOptionsManager CreateOptionsManager() =>
    new InvoiceScanTestOptionsManager(
      new LocalOptions
      {
        StorageAccountName = "unit-tests",
        StorageAccountEndpoint = "https://unit-tests.arolariu.ro/scans",
      });

  /// <summary>
  /// Creates the first deterministic invoice scan fixture.
  /// </summary>
  /// <returns>The first invoice scan.</returns>
  public static InvoiceScan First() =>
    new(
      ScanType.JPG,
      new Uri("https://unit-tests.arolariu.ro/scans/receipt-1.jpg"),
      null);

  /// <summary>
  /// Creates the second deterministic invoice scan fixture.
  /// </summary>
  /// <returns>The second invoice scan.</returns>
  public static InvoiceScan Second() =>
    new(
      ScanType.JPG,
      new Uri("https://unit-tests.arolariu.ro/scans/receipt-2.jpg"),
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
