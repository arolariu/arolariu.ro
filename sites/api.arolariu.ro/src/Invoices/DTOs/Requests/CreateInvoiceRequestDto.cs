namespace arolariu.Backend.Domain.Invoices.DTOs.Requests;

using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.Diagnostics.CodeAnalysis;

using arolariu.Backend.Domain.Invoices.DDD.AggregatorRoots.Invoices;

using Microsoft.AspNetCore.Http;

/// <summary>
/// Represents the minimal client request required to persist a new invoice artifact.
/// </summary>
/// <remarks>
/// The initial write stores the owning partition, the primary receipt scan, and optional client metadata only.
/// Invoice details, products, merchant data, classifications, and other enrichment are added by later analysis or
/// explicit update requests.
/// </remarks>
/// <param name="UserIdentifier">The user partition identifier supplied by the client.</param>
/// <param name="InitialScan">The primary receipt scan already uploaded by the client.</param>
/// <param name="AdditionalMetadata">Optional client metadata to persist with the initial invoice artifact.</param>
[Serializable]
[ExcludeFromCodeCoverage]
public readonly record struct CreateInvoiceRequestDto(
  [Required] Guid UserIdentifier,
  [Required] InvoiceScan? InitialScan,
  IDictionary<string, object>? AdditionalMetadata)
{
  /// <summary>Maps the minimal request into a new invoice aggregate.</summary>
  /// <returns>A new invoice containing the supplied owner, initial scan, and metadata.</returns>
  /// <exception cref="BadHttpRequestException">Thrown when <see cref="UserIdentifier"/> is empty.</exception>
  public Invoice ToInvoice()
  {
    if (UserIdentifier == Guid.Empty)
    {
      throw new BadHttpRequestException("User identifier is required.");
    }

    var invoice = new Invoice
    {
      id = Guid.CreateVersion7(),
      UserIdentifier = UserIdentifier,
      CreatedAt = DateTime.UtcNow,
      CreatedBy = UserIdentifier,
      Scans =
      [
        InitialScan ?? throw new BadHttpRequestException("Initial scan is required."),
      ],
    };

    if (AdditionalMetadata is not null)
    {
      foreach ((string key, object value) in AdditionalMetadata)
      {
        invoice.AdditionalMetadata[key] = value?.ToString() ?? string.Empty;
      }
    }

    invoice.PerformUpdate(UserIdentifier);
    return invoice;
  }
}
