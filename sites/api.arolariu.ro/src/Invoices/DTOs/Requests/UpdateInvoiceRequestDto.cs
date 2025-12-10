namespace arolariu.Backend.Domain.Invoices.DTOs.Requests;

using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.Diagnostics.CodeAnalysis;

using arolariu.Backend.Domain.Invoices.DDD.AggregatorRoots.Invoices;
using arolariu.Backend.Domain.Invoices.DDD.ValueObjects;

/// <summary>
/// Request DTO for full invoice replacement operations (HTTP PUT semantics).
/// </summary>
/// <remarks>
/// <para>
/// <b>Purpose:</b> Replaces the entire invoice resource with the provided values.
/// This follows HTTP PUT semantics where the entire resource is replaced.
/// </para>
/// <para>
/// <b>Immutability:</b> This is a <c>readonly record struct</c> ensuring thread-safety
/// and value semantics for equality comparisons.
/// </para>
/// <para>
/// <b>Required Fields:</b> All fields except <see cref="MerchantReference"/> and
/// <see cref="AdditionalMetadata"/> are required. Validation is enforced via
/// <see cref="RequiredAttribute"/> and business rules in the service layer.
/// </para>
/// <para>
/// <b>Partial Updates:</b> For partial updates, use <see cref="PatchInvoiceRequestDto"/>
/// which supports HTTP PATCH semantics with null-as-unchanged behavior.
/// </para>
/// </remarks>
/// <param name="Name">
/// The invoice name or title. Required. Must be non-empty.
/// Typically a user-friendly identifier like "Groceries - May 2025".
/// </param>
/// <param name="Description">
/// A detailed description of the invoice. Required, but may be empty.
/// Useful for notes, context, or search purposes.
/// </param>
/// <param name="Category">
/// The invoice category classification (e.g., Groceries, Entertainment, Utilities).
/// Defaults to <see cref="InvoiceCategory.NOT_DEFINED"/> if not specified.
/// </param>
/// <param name="PaymentInformation">
/// Payment details including currency, total amount, tax, and payment method.
/// Required for proper financial tracking and reporting.
/// </param>
/// <param name="MerchantReference">
/// Optional reference to an associated merchant entity by ID.
/// Null if no merchant is linked or if merchant should be cleared.
/// </param>
/// <param name="IsImportant">
/// Flag indicating if the invoice is marked as important/favorite.
/// Important invoices may appear prominently in UI or be excluded from cleanup.
/// </param>
/// <param name="AdditionalMetadata">
/// Extensible key-value metadata for client-specific data.
/// Null or empty dictionary replaces any existing metadata.
/// </param>
/// <example>
/// <code>
/// var request = new UpdateInvoiceRequestDto(
///     Name: "Updated Invoice Name",
///     Description: "Monthly groceries",
///     Category: InvoiceCategory.GROCERIES,
///     PaymentInformation: new PaymentInformation(Currency.RON, 150.50m, 28.60m, PaymentMethod.Card),
///     MerchantReference: merchantId,
///     IsImportant: true,
///     AdditionalMetadata: null);
///
/// var invoice = request.ToInvoice(invoiceId, userId);
/// await invoiceService.UpdateAsync(invoice);
/// </code>
/// </example>
/// <seealso cref="Invoice"/>
/// <seealso cref="PatchInvoiceRequestDto"/>
/// <seealso cref="PaymentInformation"/>
[Serializable]
[ExcludeFromCodeCoverage]
public readonly record struct UpdateInvoiceRequestDto(
  [Required] string Name,
  [Required] string Description,
  InvoiceCategory Category,
  PaymentInformation PaymentInformation,
  Guid? MerchantReference,
  bool IsImportant,
  IDictionary<string, object>? AdditionalMetadata)
{
  /// <summary>
  /// Converts this DTO to an <see cref="Invoice"/> domain aggregate.
  /// </summary>
  /// <remarks>
  /// <para>
  /// <b>Identity Preservation:</b> The <paramref name="invoiceId"/> and
  /// <paramref name="userIdentifier"/> are required to preserve the invoice's
  /// identity during the update operation.
  /// </para>
  /// <para>
  /// <b>Metadata Handling:</b> Metadata values are stored as objects, allowing
  /// flexible serialization. Null metadata results in an empty metadata collection.
  /// </para>
  /// <para>
  /// <b>Merchant Reference:</b> A null <see cref="MerchantReference"/> is converted
  /// to <see cref="Guid.Empty"/> to indicate no merchant association.
  /// </para>
  /// </remarks>
  /// <param name="invoiceId">
  /// The existing invoice identifier to preserve. Must match an existing invoice.
  /// </param>
  /// <param name="userIdentifier">
  /// The owner's user identifier. Used for authorization and partitioning.
  /// </param>
  /// <returns>
  /// A fully populated <see cref="Invoice"/> instance ready for persistence.
  /// </returns>
  public Invoice ToInvoice(Guid invoiceId, Guid userIdentifier)
  {
    var invoice = new Invoice
    {
      id = invoiceId,
      UserIdentifier = userIdentifier,
      Name = Name,
      Description = Description,
      Category = Category,
      PaymentInformation = PaymentInformation,
      MerchantReference = MerchantReference ?? Guid.Empty,
      IsImportant = IsImportant,
    };

    if (AdditionalMetadata is not null)
    {
      foreach (var (key, value) in AdditionalMetadata)
      {
        invoice.AdditionalMetadata[key] = value;
      }
    }

    return invoice;
  }
}
