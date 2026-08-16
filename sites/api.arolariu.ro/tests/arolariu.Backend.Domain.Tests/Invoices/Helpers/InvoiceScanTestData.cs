namespace arolariu.Backend.Domain.Tests.Invoices.Helpers;

using System;

using arolariu.Backend.Domain.Invoices.DDD.AggregatorRoots.Invoices;

/// <summary>
/// Provides deterministic invoice scan fixtures for document-analysis tests.
/// </summary>
internal static class InvoiceScanTestData
{
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
