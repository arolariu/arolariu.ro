namespace arolariu.Backend.Domain.Invoices.DTOs.Responses;

using System;
using System.Collections.Generic;
using System.Diagnostics.CodeAnalysis;

using arolariu.Backend.Domain.Invoices.DDD.AggregatorRoots.Invoices;
using arolariu.Backend.Domain.Invoices.DDD.ValueObjects;

/// <summary>
/// Response DTO representing an invoice returned from the API.
/// </summary>
/// <remarks>
/// <para><b>Purpose:</b> Provides a clean API contract separate from the internal domain model.</para>
/// <para><b>Conversion:</b> Use <see cref="FromInvoice(Invoice)"/> to create from a domain <see cref="Invoice"/>.</para>
/// <para><b>Immutability:</b> This is a readonly record struct ensuring thread-safety and value semantics.</para>
/// </remarks>
/// <param name="Id">The unique invoice identifier.</param>
/// <param name="UserIdentifier">The owner's user identifier.</param>
/// <param name="Name">The invoice display name.</param>
/// <param name="Description">A detailed description of the invoice.</param>
/// <param name="Category">The invoice category classification.</param>
/// <param name="PaymentInformation">Payment details including currency, total amount, and tax.</param>
/// <param name="MerchantReference">Reference to an associated merchant (Guid.Empty if none).</param>
/// <param name="IsImportant">Flag indicating if the invoice is marked as important.</param>
/// <param name="ItemCount">The number of products/items in this invoice.</param>
/// <param name="ScanCount">The number of scans associated with this invoice.</param>
/// <param name="CreatedAt">The timestamp when the invoice was created.</param>
/// <param name="LastUpdatedAt">The timestamp of the last update.</param>
[Serializable]
[ExcludeFromCodeCoverage]
public readonly record struct InvoiceSummaryDto(
  Guid Id,
  Guid UserIdentifier,
  string Name,
  string Description,
  InvoiceCategory Category,
  PaymentInformation PaymentInformation,
  Guid MerchantReference,
  bool IsImportant,
  int ItemCount,
  int ScanCount,
  DateTimeOffset CreatedAt,
  DateTimeOffset LastUpdatedAt)
{
  /// <summary>
  /// Creates an <see cref="InvoiceSummaryDto"/> from a domain <see cref="Invoice"/>.
  /// </summary>
  /// <param name="invoice">The domain invoice to convert.</param>
  /// <returns>A summary DTO representing the invoice.</returns>
  public static InvoiceSummaryDto FromInvoice(Invoice invoice)
  {
    ArgumentNullException.ThrowIfNull(invoice);
    return new(
      Id: invoice.id,
      UserIdentifier: invoice.UserIdentifier,
      Name: invoice.Name,
      Description: invoice.Description,
      Category: invoice.Category,
      PaymentInformation: invoice.PaymentInformation,
      MerchantReference: invoice.MerchantReference,
      IsImportant: invoice.IsImportant,
      ItemCount: invoice.Items.Count,
      ScanCount: invoice.Scans.Count,
      CreatedAt: invoice.CreatedAt,
      LastUpdatedAt: invoice.LastUpdatedAt);
  }
}
