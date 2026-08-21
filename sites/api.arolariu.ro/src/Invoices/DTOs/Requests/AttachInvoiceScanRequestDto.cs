namespace arolariu.Backend.Domain.Invoices.DTOs.Requests;

using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.Diagnostics.CodeAnalysis;

using arolariu.Backend.Domain.Invoices.DDD.AggregatorRoots.Invoices;

/// <summary>
/// Represents a scan attachment request for an existing invoice.
/// </summary>
/// <remarks>
/// The route already identifies the invoice; this body carries only the scan type, uploaded location, and optional
/// metadata needed to attach one additional scan.
/// <para>
/// <b>Immutability:</b> This is a <c>readonly record struct</c> ensuring thread-safety
/// and value semantics for equality comparisons.
/// </para>
/// <para>
/// <b>Supported Formats:</b> See <see cref="ScanType"/> for supported formats:
/// JPG/JPEG, PNG, BMP, TIFF, HEIF, and PDF. HEIC is not accepted because Azure Document Intelligence does not
/// document it as an input type; clients must convert it to HEIF before submitting the scan.
/// </para>
/// <para>
/// <b>AI Processing:</b> After adding a scan, trigger analysis via the
/// <see cref="InvoiceAnalysisRequestDto"/> to extract data from the new scan.
/// </para>
/// </remarks>
/// <param name="Type">
/// The scan format type. Required. Must match the actual file format to ensure
/// proper processing by Document Intelligence.
/// </param>
/// <param name="Location">
/// The URI where the scan image/document is stored. Required.
/// The backend stores this location and later passes it to analysis when requested.
/// </param>
/// <param name="Metadata">
/// Optional metadata associated with this scan. May include:
/// <list type="bullet">
///   <item><description><c>pageNumber</c>: For multi-page documents.</description></item>
///   <item><description><c>scanQuality</c>: DPI or quality indicator.</description></item>
///   <item><description><c>source</c>: Scanning device or application.</description></item>
/// </list>
/// </param>
/// <example>
/// <code>
/// // Attach an existing scan location to the invoice.
/// var request = new AttachInvoiceScanRequestDto(
///     Type: ScanType.JPG,
///     Location: scanUri,
///     Metadata: new Dictionary&lt;string, object&gt; { ["pageNumber"] = 2 });
///
/// var scan = request.ToInvoiceScan();
/// invoice.Scans.Add(scan);
/// </code>
/// </example>
/// <seealso cref="InvoiceScan"/>
/// <seealso cref="ScanType"/>
[Serializable]
[ExcludeFromCodeCoverage]
public readonly record struct AttachInvoiceScanRequestDto(
  [Required] ScanType Type,
  [Required] Uri Location,
  IDictionary<string, object>? Metadata)
{
  /// <summary>
  /// Converts this DTO to an <see cref="InvoiceScan"/> domain value object.
  /// </summary>
  /// <remarks>
  /// <para>
  /// <b>Direct Mapping:</b> All fields are passed directly to the
  /// <see cref="InvoiceScan"/> constructor without transformation.
  /// </para>
  /// <para>
  /// <b>Metadata Handling:</b> The metadata dictionary is passed by reference.
  /// If immutability is required, the caller should provide a copy.
  /// </para>
  /// </remarks>
  /// <returns>
  /// A new <see cref="InvoiceScan"/> instance ready to be added to an invoice.
  /// </returns>
  public InvoiceScan ToInvoiceScan() => new(Type, Location, Metadata);
}
