namespace arolariu.Backend.Domain.Invoices.DTOs.Responses;

using System;
using System.Collections.Generic;
using System.Diagnostics.CodeAnalysis;

using arolariu.Backend.Domain.Invoices.DDD.AggregatorRoots.Invoices;

/// <summary>
/// Response DTO representing an invoice scan record.
/// </summary>
/// <remarks>
/// <para><b>Purpose:</b> Provides a clean API contract for invoice scan data.</para>
/// <para><b>Conversion:</b> Use <see cref="FromInvoiceScan(InvoiceScan)"/> to create from a domain <see cref="InvoiceScan"/>.</para>
/// </remarks>
/// <param name="Type">The scan format type (JPG, PNG, PDF, etc.).</param>
/// <param name="Location">The URI location where the scan is stored.</param>
/// <param name="Metadata">Associated scan metadata (nullable).</param>
[Serializable]
[ExcludeFromCodeCoverage]
public readonly record struct InvoiceScanResponseDto(
  ScanType Type,
  Uri Location,
  IReadOnlyDictionary<string, object>? Metadata)
{
  /// <summary>
  /// Creates an <see cref="InvoiceScanResponseDto"/> from a domain <see cref="InvoiceScan"/>.
  /// </summary>
  /// <param name="scan">The domain scan to convert.</param>
  /// <returns>A DTO representing the invoice scan.</returns>
  public static InvoiceScanResponseDto FromInvoiceScan(InvoiceScan scan) => new(
    Type: scan.Type,
    Location: scan.Location,
    Metadata: scan.Metadata is not null ? new Dictionary<string, object>(scan.Metadata) : null);
}
