namespace arolariu.Backend.Domain.Invoices.DTOs.Responses;

using System;
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
/// </remarks>
/// <param name="Type">
/// The scan format type. Supported types include JPG, PNG, PDF, TIFF.
/// Determines how the scan is processed during analysis.
/// </param>
/// <param name="Location">
/// The persisted URI location associated with the scan.
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
  Uri Location)
{
  /// <summary>
  /// Creates an <see cref="InvoiceScanResponseDto"/> from a domain <see cref="InvoiceScan"/>.
  /// </summary>
  /// <remarks>The scan metadata bag remains internal and is not part of the response contract.</remarks>
  /// <param name="scan">
  /// The domain scan to convert. All properties are directly mapped.
  /// </param>
  /// <returns>
  /// A new <see cref="InvoiceScanResponseDto"/> instance with copied values.
  /// </returns>
  public static InvoiceScanResponseDto FromInvoiceScan(InvoiceScan scan) => new(
    Type: scan.Type,
    Location: scan.Location);
}
