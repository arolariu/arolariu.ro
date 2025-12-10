namespace arolariu.Backend.Domain.Invoices.DTOs.Requests;

using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.Diagnostics.CodeAnalysis;

using arolariu.Backend.Domain.Invoices.DDD.AggregatorRoots.Invoices;

/// <summary>
/// Data transfer object for creating a new invoice.
/// </summary>
/// <remarks>
/// <para><b>Purpose:</b> Captures the minimal required data to create a new invoice in the system.</para>
/// <para><b>Conversion:</b> Use <see cref="ToInvoice"/> to convert to the domain <see cref="Invoice"/> aggregate.</para>
/// <para><b>Initial Scan:</b> At least one scan (receipt image) is required to create an invoice.</para>
/// </remarks>
/// <param name="UserIdentifier">The owner's user identifier.</param>
/// <param name="InitialScan">The initial scan (receipt image) for the invoice.</param>
/// <param name="Metadata">Optional metadata key-value pairs.</param>
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
  /// <returns>A new <see cref="Invoice"/> instance with sentinel defaults and the provided values.</returns>
  public Invoice ToInvoice()
  {
    Invoice invoice = Invoice.Default();
    invoice.UserIdentifier = UserIdentifier;
    invoice.Scans.Add(InitialScan);

    if (Metadata is not null)
    {
      foreach (var (key, value) in Metadata)
      {
        string valueAsString = value.ToString() ?? string.Empty;
        invoice.AdditionalMetadata.Add(key, valueAsString);
      }
    }

    return invoice;
  }
}
