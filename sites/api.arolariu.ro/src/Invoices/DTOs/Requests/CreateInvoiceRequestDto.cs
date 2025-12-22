namespace arolariu.Backend.Domain.Invoices.DTOs.Requests;

using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.Diagnostics.CodeAnalysis;

using arolariu.Backend.Domain.Invoices.DDD.AggregatorRoots.Invoices;

/// <summary>
/// Request DTO for creating a new invoice in the system.
/// </summary>
/// <remarks>
/// <para>
/// <b>Purpose:</b> Captures the minimal required data to create a new invoice.
/// The invoice starts in a minimal state and is enriched through AI analysis.
/// </para>
/// <para>
/// <b>Immutability:</b> This is a <c>readonly record struct</c> ensuring thread-safety
/// and value semantics for equality comparisons.
/// </para>
/// <para>
/// <b>Initial Scan Requirement:</b> At least one scan (receipt image) is required.
/// The scan triggers the document analysis pipeline which extracts merchant,
/// line items, and payment information automatically.
/// </para>
/// <para>
/// <b>Metadata:</b> Optional key-value pairs for client-specific data such as
/// source application, import batch ID, or custom tags.
/// </para>
/// </remarks>
/// <param name="UserIdentifier">
/// The unique identifier of the user who owns this invoice. Required.
/// Must be a valid, authenticated user ID from the identity provider.
/// </param>
/// <param name="InitialScan">
/// The initial receipt scan to process. Required.
/// Supported formats: JPG, PNG, PDF (single page), TIFF.
/// Maximum file size determined by storage configuration.
/// </param>
/// <param name="Metadata">
/// Optional key-value metadata to attach to the invoice.
/// Values are converted to strings during persistence.
/// Null if no custom metadata is needed.
/// </param>
/// <example>
/// <code>
/// var request = new CreateInvoiceRequestDto(
///     UserIdentifier: userId,
///     InitialScan: new InvoiceScan(ScanType.JPG, blobUri, null),
///     Metadata: new Dictionary&lt;string, object&gt; { ["source"] = "mobile-app" });
///
/// var invoice = request.ToInvoice();
/// await invoiceService.CreateAsync(invoice);
/// </code>
/// </example>
/// <seealso cref="Invoice"/>
/// <seealso cref="InvoiceScan"/>
[Serializable]
[ExcludeFromCodeCoverage]
public readonly record struct CreateInvoiceRequestDto(
  [Required] Guid UserIdentifier,
  [Required] InvoiceScan InitialScan,
  IDictionary<string, object>? Metadata)
{
  /// <summary>
  /// Converts this DTO to a new <see cref="Invoice"/> domain aggregate.
  /// </summary>
  /// <remarks>
  /// <para>
  /// <b>Factory Method:</b> Creates a minimal invoice with default sentinel values.
  /// The invoice ID is auto-generated as a Version 7 GUID.
  /// </para>
  /// <para>
  /// <b>Metadata Conversion:</b> All metadata values are converted to strings
  /// via <see cref="object.ToString()"/>. Null values become empty strings.
  /// </para>
  /// </remarks>
  /// <returns>
  /// A new <see cref="Invoice"/> instance initialized with the provided values
  /// and ready for persistence or further processing.
  /// </returns>
  public Invoice ToInvoice()
  {
    Invoice invoice = new Invoice
    {
      id = Guid.NewGuid(),
      UserIdentifier = UserIdentifier,
      CreatedAt = DateTime.UtcNow,
      CreatedBy = UserIdentifier,
      Scans = [InitialScan],
    };


    if (Metadata is not null)
    {
      foreach (var (key, value) in Metadata)
      {
        string valueAsString = value.ToString() ?? string.Empty;
        invoice.AdditionalMetadata.Add(key, valueAsString);
      }
    }

    invoice.PerformUpdate(UserIdentifier);
    return invoice;
  }
}
