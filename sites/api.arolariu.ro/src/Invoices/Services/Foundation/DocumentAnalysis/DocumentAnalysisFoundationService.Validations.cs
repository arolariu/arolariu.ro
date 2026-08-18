namespace arolariu.Backend.Domain.Invoices.Services.Foundation.DocumentAnalysis;

using System;
using System.Collections.Generic;

using arolariu.Backend.Common.Options;
using arolariu.Backend.Domain.Invoices.Brokers.DocumentIntelligenceBroker;
using arolariu.Backend.Domain.Invoices.DDD.AggregatorRoots.Invoices;
using arolariu.Backend.Domain.Invoices.DTOs.Requests;

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
    int index,
    ApplicationOptions storageOptions)
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

    if (!InvoiceScanStorageLocationPolicy.TryValidate(scan.Location, storageOptions, out string validationMessage))
    {
      throw new ArgumentException(validationMessage, nameof(scan));
    }
  }

  private static void ValidateReceiptDocumentIsSet(ReceiptDocument receiptDocument) =>
    ArgumentNullException.ThrowIfNull(receiptDocument);
}
