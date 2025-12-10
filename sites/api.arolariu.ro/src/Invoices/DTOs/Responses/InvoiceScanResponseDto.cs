namespace arolariu.Backend.Domain.Invoices.DTOs.Responses;

using System;
using System.Collections.Generic;
using System.Diagnostics.CodeAnalysis;

using arolariu.Backend.Domain.Invoices.DDD.AggregatorRoots.Invoices;

/// <summary>
/// Response DTO representing an invoice scan (receipt image or document).
/// </summary>
/// <remarks>
/// <para>
/// <b>Purpose:</b> Provides a clean API contract for invoice scan data, decoupled
/// from the internal <see cref="InvoiceScan"/> domain value object.
/// </para>
/// <para>
/// <b>Immutability:</b> This is a <c>readonly record struct</c> ensuring thread-safety
/// and value semantics for equality comparisons.
/// </para>
/// <para>
/// <b>Storage:</b> The <see cref="Location"/> URI typically points to Azure Blob Storage
/// where the original scan image/document is stored.
/// </para>
/// <para>
/// <b>Metadata:</b> May contain OCR confidence scores, extraction timestamps, or other
/// processing artifacts from the Document Intelligence service.
/// </para>
/// </remarks>
/// <param name="Type">
/// The scan format type. Supported types include JPG, PNG, PDF, TIFF.
/// Determines how the scan is processed during analysis.
/// </param>
/// <param name="Location">
/// The URI location where the scan is stored. Must be a valid, accessible URI.
/// Typically an Azure Blob Storage URL with SAS token for authorized access.
/// </param>
/// <param name="Metadata">
/// Optional key-value metadata associated with this scan. May include:
/// OCR confidence scores, extraction timestamps, page counts (for PDFs), or custom fields.
/// Null if no metadata is associated.
/// </param>
/// <example>
/// <code>
/// // Converting from domain object
/// InvoiceScan domainScan = invoice.Scans.First();
/// InvoiceScanResponseDto dto = InvoiceScanResponseDto.FromInvoiceScan(domainScan);
///
/// // Accessing scan data
/// Console.WriteLine($"Scan type: {dto.Type}, Location: {dto.Location}");
/// </code>
/// </example>
/// <seealso cref="InvoiceScan"/>
/// <seealso cref="ScanType"/>
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
  /// <remarks>
  /// <para>
  /// <b>Factory Pattern:</b> Preferred method for creating DTOs from domain objects.
  /// Ensures consistent mapping and proper handling of nullable metadata.
  /// </para>
  /// <para>
  /// <b>Metadata Copying:</b> If metadata exists, a new dictionary is created to prevent
  /// external mutation of the original domain object's data.
  /// </para>
  /// </remarks>
  /// <param name="scan">
  /// The domain scan to convert. All properties are directly mapped.
  /// </param>
  /// <returns>
  /// A new <see cref="InvoiceScanResponseDto"/> instance with copied values.
  /// </returns>
  public static InvoiceScanResponseDto FromInvoiceScan(InvoiceScan scan) => new(
    Type: scan.Type,
    Location: scan.Location,
    Metadata: scan.Metadata is not null ? new Dictionary<string, object>(scan.Metadata) : null);
}
