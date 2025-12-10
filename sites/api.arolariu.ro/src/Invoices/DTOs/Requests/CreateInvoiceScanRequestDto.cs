namespace arolariu.Backend.Domain.Invoices.DTOs.Requests;

using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.Diagnostics.CodeAnalysis;

using arolariu.Backend.Domain.Invoices.DDD.AggregatorRoots.Invoices;

/// <summary>
/// Request DTO for adding a new scan (receipt image/document) to an invoice.
/// </summary>
/// <remarks>
/// <para>
/// <b>Purpose:</b> Enables adding additional scans to an existing invoice.
/// Useful for multi-page receipts, supplementary documentation, or re-scans
/// with better quality.
/// </para>
/// <para>
/// <b>Immutability:</b> This is a <c>readonly record struct</c> ensuring thread-safety
/// and value semantics for equality comparisons.
/// </para>
/// <para>
/// <b>Supported Formats:</b> See <see cref="ScanType"/> for supported formats:
/// JPG, PNG, PDF (single page recommended), TIFF.
/// </para>
/// <para>
/// <b>Storage:</b> The <see cref="Location"/> URI should point to Azure Blob Storage.
/// The scan must be uploaded to storage before creating this DTO.
/// </para>
/// <para>
/// <b>AI Processing:</b> After adding a scan, trigger analysis via the
/// <see cref="AnalyzeInvoiceRequestDto"/> to extract data from the new scan.
/// </para>
/// </remarks>
/// <param name="Type">
/// The scan format type. Required. Must match the actual file format to ensure
/// proper processing by Document Intelligence.
/// </param>
/// <param name="Location">
/// The URI where the scan image/document is stored. Required.
/// Must be a valid, accessible URI (typically Azure Blob Storage with SAS token).
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
/// // Upload scan to blob storage first
/// var blobUri = await blobService.UploadAsync(scanBytes, "receipt.jpg");
///
/// // Create the scan request
/// var request = new CreateInvoiceScanRequestDto(
///     Type: ScanType.JPG,
///     Location: blobUri,
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
public readonly record struct CreateInvoiceScanRequestDto(
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
