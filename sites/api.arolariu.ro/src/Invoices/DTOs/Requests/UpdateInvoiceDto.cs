namespace arolariu.Backend.Domain.Invoices.DTOs.Requests;

using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.Diagnostics.CodeAnalysis;

using arolariu.Backend.Domain.Invoices.DDD.AggregatorRoots.Invoices;
using arolariu.Backend.Domain.Invoices.DDD.ValueObjects;

/// <summary>
/// Data transfer object for full invoice update operations (PUT semantics).
/// </summary>
/// <remarks>
/// <para><b>Purpose:</b> Replaces the entire invoice resource with the provided values. All fields are required or have explicit defaults.</para>
/// <para><b>Conversion:</b> Use <see cref="ToInvoice(Guid, Guid)"/> to convert to the domain <see cref="Invoice"/> aggregate.</para>
/// <para><b>Validation:</b> Required fields are enforced via <see cref="RequiredAttribute"/>. Business validation occurs in the service layer.</para>
/// </remarks>
/// <param name="Name">The invoice name or title.</param>
/// <param name="Description">A detailed description of the invoice.</param>
/// <param name="Category">The invoice category classification.</param>
/// <param name="PaymentInformation">Payment details including currency, total amount, and tax.</param>
/// <param name="MerchantReference">Optional reference to an associated merchant.</param>
/// <param name="IsImportant">Flag indicating if the invoice is marked as important.</param>
/// <param name="AdditionalMetadata">Extensible key-value metadata for the invoice.</param>
[Serializable]
[ExcludeFromCodeCoverage]
public readonly record struct UpdateInvoiceDto(
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
  /// <param name="invoiceId">The existing invoice identifier to preserve.</param>
  /// <param name="userIdentifier">The owner's user identifier.</param>
  /// <returns>A fully populated <see cref="Invoice"/> instance ready for persistence.</returns>
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
