namespace arolariu.Backend.Domain.Invoices.Services.Foundation.DocumentAnalysis;

using System;
using System.Collections.Generic;

using arolariu.Backend.Domain.Invoices.Brokers.DocumentIntelligenceBroker;
using arolariu.Backend.Domain.Invoices.DDD.AggregatorRoots.Invoices;

public sealed partial class DocumentAnalysisFoundationService
{
  private static void ValidateScansAreSet(IReadOnlyList<InvoiceScan> scans)
  {
    ArgumentNullException.ThrowIfNull(scans);

    if (scans.Count == 0)
    {
      throw new ArgumentException("At least one invoice scan is required for typed receipt extraction.", nameof(scans));
    }
  }

  private static void ValidateScanIsUsable(
    InvoiceScan scan,
    int index)
  {
    if (!InvoiceScan.NotDefault(scan))
    {
      throw new ArgumentException(
        $"Invoice scan at index {index} must not be the default sentinel value.",
        nameof(scan));
    }

    if (!InvoiceScan.IsSupportedByDocumentIntelligence(scan.Type))
    {
      throw new ArgumentException(
        $"Invoice scan at index {index} has an unsupported scan type.",
        nameof(scan));
    }

    if (scan.Location is null || !scan.Location.IsAbsoluteUri)
    {
      throw new ArgumentException(
        $"Invoice scan at index {index} must have an absolute location URI.",
        nameof(scan));
    }
  }

  private static void ValidateReceiptDocumentIsSet(ReceiptDocument receiptDocument) =>
    ArgumentNullException.ThrowIfNull(receiptDocument);
}
